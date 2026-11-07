import { createApp } from './app.js';
import { createDatabase } from './database.js';

const database = createDatabase();
const app = createApp({ database });
const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`API de automóveis disponível em http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
