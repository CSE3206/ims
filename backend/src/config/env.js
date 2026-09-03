/**
 * Centralised environment access. Import this instead of touching
 * `process.env` directly so a missing variable fails loudly at boot
 * instead of mysteriously at request time.
 */
import 'dotenv/config';

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Copy backend/.env.example to backend/.env and fill it in.`,
    );
  }
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  get isProduction() {
    return this.nodeEnv === 'production';
  },
};
