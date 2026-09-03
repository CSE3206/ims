/**
 * Drizzle ORM client, bound to Neon over plain TCP (node-postgres driver).
 *
 * We use the `Pool` from @neondatabase/serverless rather than `neon()` HTTP
 * because the HTTP driver cannot run interactive transactions, and receiving a
 * purchase order / fulfilling a sales order must be transactional.
 *
 * Import `db` anywhere you need the database:
 *
 *   import { db } from '../db/index.js';
 *   import { products } from '../db/schema.js';
 *   const rows = await db.select().from(products);
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Node has no global WebSocket before v22; the Neon pool needs one.
neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: env.databaseUrl });

export const db = drizzle(pool, { schema, logger: env.nodeEnv === 'development' });

export { schema };

/** Simple round-trip used by GET /api/health. */
export async function pingDatabase() {
  const { rows } = await pool.query('select 1 as ok');
  return rows[0]?.ok === 1;
}
