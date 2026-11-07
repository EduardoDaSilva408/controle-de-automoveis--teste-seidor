import express from 'express';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './database.js';
import { createAutomoveisRouter } from './routes/automoveis.js';
import { createMotoristasRouter } from './routes/motoristas.js';
import { createUtilizacoesRouter } from './routes/utilizacoes.js';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

export function createApp({ database = createDatabase() } = {}) {
  const app = express();

  app.use(express.json());
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.use('/api/automoveis', createAutomoveisRouter(database));
  app.use('/api/motoristas', createMotoristasRouter(database));
  app.use('/api/utilizacoes', createUtilizacoesRouter(database));
  app.use(express.static(publicDirectory));
  app.use((_request, response) => {
    response.status(404).json({ erro: 'Rota não encontrada.' });
  });
  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({ erro: 'O corpo da requisição deve conter um JSON válido.' });
    }

    console.error(error);
    return response.status(500).json({ erro: 'Erro interno do servidor.' });
  });

  return app;
}
