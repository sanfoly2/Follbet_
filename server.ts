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

import requestIp from 'request-ip';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configuração para permitir CORS e JSON
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestIp.mw());

  // API Routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/games', gameRoutes);
  apiRouter.use('/pix', pixRoutes);

  // Health check providing IP
  apiRouter.get('/health', (req, res) => {
    const clientIp = req.clientIp;
    res.json({ status: 'ok', ip: clientIp });
  });
  
  // External proxy fallback if path not found in local API
  apiRouter.use('/external', async (req, res) => {
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
      res.status(500).json({ error: 'Erro ao conectar ao servidor backend externo' });
    }
  });

  app.use('/api', apiRouter);

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
    // Usamos process.cwd() para garantir que o caminho comece da raiz do projeto
    let distPath = path.join(process.cwd(), 'dist');

    // Se o processo já estiver rodando de dentro da pasta dist (comum em alguns setups de build),
    // ajustamos o caminho para não duplicar /dist/dist
    if (process.cwd().endsWith('dist') || __dirname.endsWith('dist')) {
      distPath = process.cwd();
    }
    
    console.log(`Verificando pasta dist em: ${distPath}`);
    
    // Serve os arquivos estáticos da pasta dist
    app.use(express.static(distPath));

    // Fallback para SPA (Single Page Application)
    // Qualquer rota que não seja capturada pelas APIs acima servirá o index.html
    app.get('*', (req, res) => {
      // Evita loops infinitos ou servir index.html para chamadas de API que falharam
      if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`Rodando em modo PRODUÇÃO servindo: ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
