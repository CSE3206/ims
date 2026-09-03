import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit configuration.
 *
 *   npm run db:push      push schema.js straight to Neon (what we use in class)
 *   npm run db:generate  write a versioned SQL migration into ./drizzle
 *   npm run db:migrate   apply generated migrations
 *   npm run db:studio    browse the database in the browser
 */
export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
