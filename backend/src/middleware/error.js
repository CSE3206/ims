/**
 * 404 + central error handler. Registered last in app.js so every thrown
 * ApiError, Zod failure, or Postgres error becomes a consistent JSON body:
 *
 *   { "error": { "message": "...", "details": [...] } }
 */
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars -- Express identifies this by arity.
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // Postgres unique-violation → 409 instead of a confusing 500.
  if (err.code === '23505') {
    status = 409;
    message = 'That value already exists (unique constraint violated)';
  }
  // Foreign-key violation → the client referenced something that is gone.
  if (err.code === '23503') {
    status = 400;
    message = 'Referenced record does not exist, or is still in use';
  }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    error: {
      message,
      ...(err instanceof ApiError && err.details ? { details: err.details } : {}),
      ...(env.isProduction || status < 500 ? {} : { stack: err.stack }),
    },
  });
}
