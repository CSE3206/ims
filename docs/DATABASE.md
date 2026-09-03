# Database

Postgres, hosted on [Neon](https://neon.tech). One shared database for all three
members — there is no local Postgres to install.

Schema lives in `backend/src/db/schema.js` and is the single source of truth.

## Commands

```bash
npm run db:push      # diff schema.js against Neon and apply the difference
npm run db:seed      # wipe and reload demo data
npm run db:studio    # browse the tables in a web UI
npm run db:generate  # write a versioned SQL migration into backend/drizzle/
```

`db:push` is what the team uses day to day. `db:generate` + `db:migrate` is the
production-style flow if your marker asks to see migration files.

> **Only one person runs `db:push` at a time.** It is a shared database, so
> announce it before you push a schema change.

## Entity relationships

```
                    ┌───────────┐
                    │   users   │
                    └─────┬─────┘
                created_by│ user_id
        ┌─────────────────┼──────────────────┐
        │                 │                  │
┌───────▼────────┐        │        ┌─────────▼──────┐
│ purchase_orders│        │        │  sales_orders  │
└───────┬────────┘        │        └────────┬───────┘
        │ 1:N             │                 │ 1:N
┌───────▼────────────┐    │    ┌────────────▼────────┐
│purchase_order_items│    │    │  sales_order_items  │
└───────┬────────────┘    │    └────────────┬────────┘
        │                 │                 │
        │   product_id    │    product_id   │
        └────────────►┌───┴────────┐◄───────┘
                      │  products  │
                      └──┬──┬───┬──┘
         category_id ┌───┘  │   └───┐ supplier_id
                     │      │       │
            ┌────────▼──┐   │   ┌───▼───────┐
            │categories │   │   │ suppliers │
            └───────────┘   │   └─────┬─────┘
                            │         │ supplier_id
                   product_id│        └──────────► purchase_orders
                  ┌─────────▼────────┐
                  │ stock_movements  │  ← append-only ledger
                  └──────────────────┘
```

## Tables

### `users` — *Evan*

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, `defaultRandom()` |
| `name` | varchar(120) | |
| `email` | varchar(160) | **unique**, stored lowercase |
| `password_hash` | varchar(255) | bcrypt, cost 10 — never returned by the API |
| `role` | enum | `admin` \| `manager` \| `staff`, default `staff` |
| `is_active` | boolean | default `true`; inactive users cannot log in |
| `created_at` / `updated_at` | timestamptz | |

### `categories` — *Evan*

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar(120) | **unique** |
| `description` | text | nullable |

### `products` — *Evan*

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `sku` | varchar(64) | **unique**, uppercased on write |
| `name` | varchar(200) | |
| `description` | text | nullable |
| `category_id` | uuid → `categories.id` | `ON DELETE SET NULL` |
| `supplier_id` | uuid → `suppliers.id` | `ON DELETE SET NULL` |
| `unit` | varchar(24) | `pcs`, `box`, `kg`… |
| `cost_price` | numeric(12,2) | updated when a purchase order is received |
| `selling_price` | numeric(12,2) | |
| `quantity` | integer | **only `applyMovement()` writes this** |
| `reorder_level` | integer | low-stock threshold, default 10 |
| `is_active` | boolean | |

Indexes: unique on `sku`; plain on `category_id`, `supplier_id`.

### `suppliers` — *Najmul*

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar(160) | **unique** |
| `contact_person`, `email`, `phone` | varchar | all nullable |
| `address` | text | nullable |
| `is_active` | boolean | |

### `purchase_orders` — *Najmul*

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `po_number` | varchar(32) | **unique**, e.g. `PO-2026-0003` |
| `supplier_id` | uuid → `suppliers.id` | `ON DELETE RESTRICT` — history is protected |
| `status` | enum | `draft` \| `ordered` \| `received` \| `cancelled` |
| `expected_at`, `received_at` | timestamptz | nullable |
| `total` | numeric(14,2) | computed from the line items |
| `created_by` | uuid → `users.id` | `ON DELETE SET NULL` |

### `purchase_order_items` — *Najmul*

| Column | Type | Notes |
|--------|------|-------|
| `purchase_order_id` | uuid → `purchase_orders.id` | `ON DELETE CASCADE` |
| `product_id` | uuid → `products.id` | `ON DELETE RESTRICT` |
| `quantity` | integer | |
| `unit_cost` | numeric(12,2) | |

### `stock_movements` — *Rukaiya*

The audit trail. **Append-only** — rows are never updated or deleted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `product_id` | uuid → `products.id` | `ON DELETE CASCADE` |
| `type` | enum | `in` \| `out` \| `adjustment` |
| `quantity` | integer | **signed**: `+50` received, `-10` sold |
| `quantity_after` | integer | running balance after this movement |
| `reason` | varchar(200) | human explanation |
| `reference` | varchar(64) | `PO-2026-0003`, `SO-2026-0005`, `INIT`, `ADJUST` |
| `user_id` | uuid → `users.id` | who did it |

Indexes on `product_id` and `created_at` — the two ways the ledger is read.

### `sales_orders` / `sales_order_items` — *Rukaiya*

Mirror the purchase tables. `so_number` is unique (`SO-2026-0005`), status is
`draft` \| `confirmed` \| `fulfilled` \| `cancelled`, and items carry
`unit_price` instead of `unit_cost`.

## Design decisions worth explaining in a viva

**Why store `products.quantity` at all, instead of summing the ledger?**
Because every product list, search and dashboard would otherwise need an
aggregate over the whole movement history. The quantity is a cached running
total; `quantity_after` on each movement lets you verify it at any time.

**Why `numeric` for money?** `float` cannot represent `0.10` exactly, and money
errors compound. Postgres returns `numeric` to the driver as a **string** to
preserve precision, which is why the code writes `'880.00'` rather than `880`
and the frontend wraps values in `Number()` before arithmetic.

**Why `SELECT … FOR UPDATE` in `applyMovement()`?** Without the row lock, two
concurrent sales of the last unit both read `quantity = 1`, both pass the check,
and both write `0` — one unit sold twice. The lock serialises them so the second
one sees `0` and is rejected.

**Why `ON DELETE RESTRICT` on order line items?** Deleting a product that
appears on a historical order would silently corrupt that order's totals.
Deactivate the product (`is_active = false`) instead.

**Why `ON DELETE SET NULL` for a product's category?** Losing a category should
not lose the products in it — they simply become "Uncategorised".

## Connection

`backend/.env`:

```
DATABASE_URL="postgresql://<user>:<password>@<host>.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Use the **pooled** connection string (the host contains `-pooler`). The code
connects with `Pool` from `@neondatabase/serverless` over WebSockets rather than
the HTTP `neon()` driver, because the HTTP driver cannot run the interactive
transactions that goods receipt and order fulfilment depend on.

`.env` is git-ignored. Share the real credentials through the group chat, never
through a commit. If a password does end up in a commit, rotate it in the Neon
console — deleting the line in a later commit does not remove it from history.
