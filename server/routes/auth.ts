import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// In-memory "database" for simulation
const users: any[] = [];

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "Usuário já existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      balance: 1000, // Initial balance
      history: []
    };

    users.push(newUser);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true });

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      balance: newUser.balance,
      history: newUser.history
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao registrar usuário" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true });

    res.json({
      id: user.id,
      email: user.email,
      balance: user.balance,
      history: user.history
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

router.get("/user", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Não autenticado" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.find(u => u.id === decoded.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    res.json({
      id: user.id,
      email: user.email,
      balance: user.balance,
      history: user.history
    });
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Sessão encerrada" });
});

// Helper for other routes to access users (In a real app, this would be a DB)
export { users };
export default router;
