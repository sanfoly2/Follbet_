import express from "express";
import jwt from "jsonwebtoken";
import { users } from "./auth";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Middleware to protect game routes
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
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

router.post("/slot", (req: any, res: any) => {
  const { bet } = req.body;
  const user = users.find(u => u.id === req.userId);

  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  if (bet <= 0 || user.balance < bet) {
    return res.status(400).json({ error: "Saldo insuficiente ou aposta inválida" });
  }

  const symbols = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
  const result = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  let multiplier = 0;
  if (result[0] === result[1] && result[1] === result[2]) {
    // Jackpot
    multiplier = result[0] === '7️⃣' ? 50 : 10;
  } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
    multiplier = 2;
  }

  const winAmount = bet * multiplier;
  user.balance = user.balance - bet + winAmount;

  const historyEntry = {
    game: 'Slot',
    bet,
    result: result.join(' '),
    win: winAmount,
    date: new Date().toISOString()
  };
  user.history.unshift(historyEntry);

  res.json({
    result,
    win: winAmount > 0,
    winAmount,
    newBalance: user.balance
  });
});

router.post("/color", (req: any, res: any) => {
  const { bet, color } = req.body; // color: 'red' | 'black'
  const user = users.find(u => u.id === req.userId);

  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  if (bet <= 0 || user.balance < bet) {
    return res.status(400).json({ error: "Saldo insuficiente ou aposta inválida" });
  }

  const winningColor = Math.random() > 0.5 ? 'red' : 'black';
  const isWin = color === winningColor;
  const winAmount = isWin ? bet * 2 : 0;

  user.balance = user.balance - bet + winAmount;

  const historyEntry = {
    game: 'Color Game',
    bet,
    result: winningColor,
    win: winAmount,
    date: new Date().toISOString()
  };
  user.history.unshift(historyEntry);

  res.json({
    winningColor,
    isWin,
    winAmount,
    newBalance: user.balance
  });
});

router.post("/deposit", (req: any, res: any) => {
    const { amount } = req.body;
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    
    user.balance += Number(amount);
    res.json({ message: "Depósito realizado", newBalance: user.balance });
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
