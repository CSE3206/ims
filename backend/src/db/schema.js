/**
 * Drizzle ORM schema — the single source of truth for the database.
 *
 * OWNERSHIP: this file is SHARED. Everybody's tables live here, so it is the
 * most likely place for a merge conflict. Rules agreed by the team:
 *   1. Keep your tables inside your own clearly-marked section below.
 *   2. Never reformat or reorder someone else's section.
 *   3. Schema changes are announced in the group chat before you push.
 * See docs/TEAM.md for the full ownership map.
 *
 * Apply changes to Neon with:  npm run db:push
 */
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ===========================================================================
 * ENUMS — shared vocabulary. Adding a value is a team decision.
 * ========================================================================= */

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'staff']);
export const poStatusEnum = pgEnum('po_status', ['draft', 'ordered', 'received', 'cancelled']);
export const soStatusEnum = pgEnum('so_status', ['draft', 'confirmed', 'fulfilled', 'cancelled']);
export const movementTypeEnum = pgEnum('movement_type', ['in', 'out', 'adjustment']);

/* ===========================================================================
 * SECTION 1 — Evan  (auth, users, categories, products)
 * Branch: feature/auth-catalog
 * ========================================================================= */

/* ===========================================================================
 * SECTION 2 — Najmul  (suppliers, purchase orders, goods receipt)
 * Branch: feature/purchasing
 * ========================================================================= */

/* ===========================================================================
 * SECTION 3 — Rukaiya  (stock ledger, sales / stock-out, reporting)
 * Branch: feature/inventory-reports
 * ========================================================================= */

/* ===========================================================================
 * RELATIONS — lets us use db.query.<table>.findMany({ with: { ... } })
 * ========================================================================= */

