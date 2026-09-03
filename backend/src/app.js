/**
 * Express application wiring. Kept separate from index.js so tests can import
 * the app without opening a port.
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Same-origin/curl requests arrive with no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.get('/', (_req, res) =>
    res.json({ name: 'Inventory Management System API', version: '1.0.0', docs: '/api/health' }),
  );

  app.use('/api', apiRoutes);

  // Order matters: 404 first, then the error formatter.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
