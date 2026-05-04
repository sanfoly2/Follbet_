import express from "express";
import jwt from "jsonwebtoken";
import { users } from "./auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Middleware to protect game routes
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies?.token;

  if (!token) return res.status(401).json({ error: "Não autenticado" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
};

router.use(authenticate);

const updateVipLevel = (user: any) => {
    const wagered = user.wageredAmount;
    if (wagered > 100000) user.vipLevel = 5;
    else if (wagered > 20000) user.vipLevel = 4;
    else if (wagered > 10000) user.vipLevel = 3;
    else if (wagered > 2000) user.vipLevel = 2;
    else user.vipLevel = 1;
};

router.post("/double", (req: any, res: any) => {
  const { bet, color } = req.body; 
  const user = users.find(u => u.id === req.userId);

  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  if (bet <= 0 || user.balance < bet) {
    return res.status(400).json({ error: "Saldo insuficiente ou aposta inválida" });
  }

  const roll = Math.floor(Math.random() * 15);
  let winningColor = 'black';
  if (roll === 0) winningColor = 'white';
  else if (roll <= 7) winningColor = 'red';
  else winningColor = 'black';

  const isWin = color === winningColor;
  let multiplier = 0;
  if (isWin) {
      multiplier = winningColor === 'white' ? 14 : 2;
  }
  
  const winAmount = bet * multiplier;
  user.balance = user.balance - bet + winAmount;
  user.wageredAmount += bet;
  
  // Update Rollover
  if (user.rolloverTotal > 0) {
      user.rolloverCurrent = Math.min(user.rolloverTotal, user.rolloverCurrent + bet);
  }

  updateVipLevel(user);

  const historyEntry = {
    game: 'Double',
    bet,
    result: winningColor.toUpperCase(),
    win: winAmount,
    date: new Date().toISOString()
  };
  user.history.unshift(historyEntry);

  res.json({
    roll,
    winningColor,
    isWin,
    winAmount,
    newBalance: user.balance,
    rolloverCurrent: user.rolloverCurrent,
    rolloverTotal: user.rolloverTotal
  });
});

router.post("/crash", (req: any, res: any) => {
    const { bet, autoExit } = req.body; 
    const user = users.find(u => u.id === req.userId);

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    if (bet <= 0 || user.balance < bet) {
      return res.status(400).json({ error: "Saldo insuficiente ou aposta inválida" });
    }

    const crashMultiplier = Math.max(1, (Math.random() * 0.99) / (1 - Math.random()) );
    const finalCrash = Math.floor(crashMultiplier * 100) / 100;
    
    const userExitedAt = Number(autoExit) || 2.0;
    const isWin = finalCrash >= userExitedAt;
    
    const winAmount = isWin ? bet * userExitedAt : 0;
    
    user.balance = user.balance - bet + winAmount;
    user.wageredAmount += bet;

    // Update Rollover
    if (user.rolloverTotal > 0) {
        user.rolloverCurrent = Math.min(user.rolloverTotal, user.rolloverCurrent + bet);
    }

    updateVipLevel(user);

    const historyEntry = {
        game: 'Crash',
        bet,
        result: `${finalCrash}x`,
        win: winAmount,
        date: new Date().toISOString()
    };
    user.history.unshift(historyEntry);

    res.json({
        finalCrash,
        isWin,
        winAmount,
        newBalance: user.balance,
        rolloverCurrent: user.rolloverCurrent,
        rolloverTotal: user.rolloverTotal
    });
});

router.post("/deposit", async (req: any, res: any) => {
    const { amount } = req.body;
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    
    const depositAmount = Number(amount);
    let finalCredit = depositAmount;

    // Bonus Logic
    if (depositAmount === 100) {
        finalCredit += 50;
    }

    // Rollover Logic (10x deposit)
    user.rolloverTotal += depositAmount * 10;

    // Referral Reward
    if (user.referredBy && depositAmount >= 100) {
        const referrer = users.find(u => u.referralCode === user.referredBy);
        if (referrer) {
            referrer.balance += 20; // Recompensa de 20 reais por indicação que depositou 100
            referrer.referralCount += 1;
            user.referredBy = null; // Recompensa paga apenas uma vez por indicado
        }
    }

    if (!process.env.MERCADOPAGO_TOKEN) {
        user.balance += finalCredit;
        return res.json({ message: `Depósito selecionado: R$ ${finalCredit} (Modo Simulação)`, newBalance: user.balance });
    }

    try {
        const response = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.MERCADOPAGO_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": Date.now().toString()
            },
            body: JSON.stringify({
                transaction_amount: depositAmount,
                description: `Depósito Foll Bet - User ${user.id}`,
                payment_method_id: "pix",
                payer: {
                    email: user.email,
                }
            })
        });

        const data = await response.json();
        
        if (data.status === 400 || data.error) {
            throw new Error(data.message || "Erro na API do Mercado Pago");
        }

        // In a real production app, we would add the balance ONLY after webhook verification
        // For this AI app, we credit immediately for flow testing, but update rollover
        user.balance += finalCredit;

        res.json({
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
            payment_id: data.id,
            status: data.status,
            message: `Bônus de R$ 50 será aplicado se depositado R$ 100`
        });
    } catch (error: any) {
        console.error("MP Error:", error);
        res.status(500).json({ error: "Erro ao gerar PIX: " + error.message });
    }
});

router.post("/withdraw", (req: any, res: any) => {
    const { amount } = req.body;
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    
    if (user.balance < amount) return res.status(400).json({ error: "Saldo insuficiente" });
    
    user.balance -= Number(amount);
    res.json({ message: "Saque realizado", newBalance: user.balance });
});

export default router;
