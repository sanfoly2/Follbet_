import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// Routes
import authRoutes from './server/routes/auth.js';
import pixRoutes from './server/routes/pix.js';
import gameRoutes from './server/routes/games.js';

// Configuração para ES Modules no Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configuração para permitir CORS e JSON
  app.use(express.json());
  app.use(cookieParser());

  // Proxy route for ALL external calls to Render (Pix, Check Payment, etc)
  // This avoids CORS issues while keeping the logic on the existing Render backend
  app.use('/api/external', async (req, res) => {
    // req.url contains the path after /api/external
    // If the call is /api/external/pix, req.url is /pix
    const targetUrl = `https://follbet.onrender.com${req.url}`;
    
    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        res.status(response.status).send(text);
      }
    } catch (error) {
      console.error('Proxy Error:', error);
      res.status(500).json({ error: 'Erro ao conectar ao servidor backend (Render)' });
    }
  });

  // Auth and Game Routes (Local)
  app.use('/auth', authRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/', authRoutes);

  // Rota de saúde para o Render
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Configuração do Vite ou Arquivos Estáticos
  if (process.env.NODE_ENV !== 'production') {
    // Ambiente de Desenvolvimento
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Rodando em modo DESENVOLVIMENTO com Vite middleware');
  } else {
    // Ambiente de Produção (Render / Linux)
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));

    // Fallback para SPA (Single Page Application)
    // No Render, isso garante que ao dar F5 em /profile, o servidor retorne o index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Rodando em modo PRODUÇÃO servindo /dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
