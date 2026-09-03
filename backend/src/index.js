/** Server entry point. `npm run dev` in backend/. */
import { createApp } from './app.js';
import { env } from './config/env.js';
import { pingDatabase, pool } from './db/index.js';

const app = createApp();

const server = app.listen(env.port, async () => {
  console.log(`\n  Inventory Management System API`);
  console.log(`  ▸ http://localhost:${env.port}/api/health`);
  console.log(`  ▸ env: ${env.nodeEnv}`);

  try {
    await pingDatabase();
    console.log('  ▸ database: connected\n');
  } catch (error) {
    console.error('  ▸ database: FAILED —', error.message, '\n');
  }
});

// Let Neon close its sockets cleanly so nodemon/--watch restarts are quiet.
const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
