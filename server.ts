import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import requestIp from "request-ip";
import authRoutes from "./server/routes/auth";
import gameRoutes from "./server/routes/games";

dotenv.config();

const __dirname = path.resolve();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());
  app.use(requestIp.mw());

  // IP verification helper middleware
  app.use((req, res, next) => {
    const clientIp = (req as any).clientIp;
    (req as any).ipAddress = clientIp;
    next();
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/games", gameRoutes);

  // Health check & IP check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      ip: (req as any).ipAddress,
      serverTime: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
