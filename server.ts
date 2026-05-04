import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// Configuração para ES Modules no Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON
  app.use(express.json());

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
    const distPath = path.join(process.cwd(), 'dist');
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
