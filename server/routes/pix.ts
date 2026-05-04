import express from "express";
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { users } from "./auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Configuração do Mercado Pago
// No Render, configure a variável de ambiente: MP_ACCESS_TOKEN
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

router.post("/", async (req, res) => {
  try {
    const { amount } = req.body;
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }

    if (!amount || Number(amount) < 1) {
      return res.status(400).json({ error: "O valor mínimo para depósito é R$ 1,00" });
    }

    // Identifica o usuário pelo token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const payment = new Payment(client);

    const paymentBody = {
      transaction_amount: Number(amount),
      description: 'Depósito em Foll Bet',
      payment_method_id: 'pix',
      payer: {
        email: user.email,
        // O Mercado Pago pode requerer nome se não for sandbox, mas para PIX o email costuma bastar
        first_name: user.email.split('@')[0],
      },
      // Chave de idempotência para evitar duplicidade em retribuições rápidas
      metadata: {
        user_id: user.id
      }
    };

    const result = await payment.create({ 
      body: paymentBody,
      requestOptions: { idempotencyKey: `pix-${user.id}-${Date.now()}` }
    });

    const transactionData = result.point_of_interaction?.transaction_data;

    res.json({
      payment_id: result.id,
      ticket_url: transactionData?.ticket_url, // Link do pagamento (opcional para o usuário)
      qr_code: transactionData?.qr_code,       // Código Copia e Cola
      qr_code_base64: transactionData?.qr_code_base64, // Imagem do QR Code em Base64
      amount: amount,
      status: result.status
    });

  } catch (error: any) {
    console.error("Erro Mercado Pago:", error.message);
    const errorDetails = error.response?.data || error.message;
    res.status(500).json({ 
      error: "Erro ao processar pagamento via Mercado Pago", 
      details: errorDetails 
    });
  }
});

export default router;
