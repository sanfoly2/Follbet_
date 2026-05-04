import express from "express";
import axios from "axios";
import https from "https";
import { users } from "./auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Helper to get EFI Access Token
async function getEFIToken() {
  const credentials = Buffer.from(
    `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
  ).toString("base64");

  // EFI requires a certificate for PIX. 
  // In production (Render), you should provide the certificate as a Base64 string in EFI_CERT_BASE64
  const cert = process.env.EFI_CERT_BASE64 
    ? Buffer.from(process.env.EFI_CERT_BASE64, "base64") 
    : null;

  const agent = new https.Agent({
    pfx: cert || undefined,
    passphrase: "", // Password for .p12 if any
  });

  const response = await axios({
    method: "POST",
    url: `${process.env.EFI_ENDPOINT}/oauth/token`,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    httpsAgent: agent,
    data: { grant_type: "client_credentials" },
  });

  return response.data.access_token;
}

router.post("/", async (req, res) => {
  try {
    const { amount } = req.body;
    const token = req.cookies.token;

    if (!token) return res.status(401).json({ error: "Não autenticado" });
    if (!amount || amount < 1) return res.status(400).json({ error: "Valor inválido" });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.find(u => u.id === decoded.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    // 1. Get Token
    const accessToken = await getEFIToken();

    const cert = process.env.EFI_CERT_BASE64 
      ? Buffer.from(process.env.EFI_CERT_BASE64, "base64") 
      : null;

    const agent = new https.Agent({
      pfx: cert || undefined,
    });

    // 2. Create Cob (Charge)
    const cobResponse = await axios({
      method: "POST",
      url: `${process.env.EFI_ENDPOINT}/v2/cob`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      httpsAgent: agent,
      data: {
        calendario: {
          expiracao: 3600,
        },
        valor: {
          original: Number(amount).toFixed(2),
        },
        chave: process.env.EFI_PIX_KEY,
        solicitacaoPagador: "Depósito Foll Bet",
      },
    });

    const locId = cobResponse.data.loc.id;

    // 3. Generate QR Code
    const qrResponse = await axios({
      method: "GET",
      url: `${process.env.EFI_ENDPOINT}/v2/loc/${locId}/qrcode`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      httpsAgent: agent,
    });

    res.json({
      payment_id: cobResponse.data.txid,
      qr_code: qrResponse.data.qrcode,
      qr_code_base64: qrResponse.data.imagemQrcode,
      amount: amount
    });

  } catch (error: any) {
    console.error("Erro EFI:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Erro ao gerar PIX", 
      details: error.response?.data || error.message 
    });
  }
});

export default router;
