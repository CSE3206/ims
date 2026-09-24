# Team assignments

Three members, three **vertical feature slices**. Each member owns their feature
end to end — database tables, API routes, service logic, and the React pages
that use them. Nobody is "the frontend person" or "the backend person", so
everyone touches the whole stack and everyone has something to demo.

| Role | Member | Branch | Feature area |
|------|--------|--------|--------------|
| Integration Lead | **Evan** | `feature/auth-catalog` | Authentication, users & product catalogue |
| Developer | **Najmul** | `feature/purchasing` | Suppliers & purchase orders (stock in) |
| Developer | **Rukaiya** | `feature/inventory-reports` | Stock ledger, sales orders (stock out), dashboard & reports |

Fill in the GitHub usernames before the first push:

| Member | GitHub username | Email |
|--------|-----------------|-------|
| Evan | | Mathew2004 |
| Najmul | | NAJMUL-NAHID |
| Rukaiya | | Ummey-Rukaiya |

---

## Member 1 — Evan · Authentication & Catalogue

**Branch:** `feature/auth-catalog`
**Why this slice:** everything else references products and needs a signed-in
user, so this is the foundation. Evan is also Integration Lead (see
[WORKFLOW.md](WORKFLOW.md)).

### Files you own

| Layer | Files |
|-------|-------|
| Database | `backend/src/db/schema.js` → **Section 1** (`users`, `categories`, `products`) |
| API | `backend/src/routes/auth.routes.js`, `users.routes.js`, `categories.routes.js`, `products.routes.js` |
| Services | `backend/src/services/auth.service.js`, `category.service.js`, `product.service.js` |
| Middleware | `backend/src/middleware/auth.js` (JWT + roles) |
| UI | `frontend/src/pages/Login.jsx`, `Products.jsx`, `Categories.jsx`, `Users.jsx` |
| UI | `frontend/src/context/AuthContext.jsx`, `frontend/src/components/ProtectedRoute.jsx` |
| Docs | `docs/API.md` — auth, users, categories, products sections |

### Your tasks

1. **Auth** — register, login, `GET /me`, JWT signing, bcrypt hashing.
2. **Roles** — `admin` / `manager` / `staff`, enforced by `requireRole()`.
3. **Categories** — CRUD, with a live product count per category.
4. **Products** — CRUD plus search, category/supplier filter, low-stock filter,
   sorting and pagination.
5. **User admin** — admin-only screen to add users, change roles, disable accounts.
6. Keep `products.quantity` read-only in your update path — stock is Rukaiya's
   ledger, and writing it directly would break the audit trail.

### Do not take

- Supplier CRUD (Najmul) — you may *reference* `supplierId` on a product.
- Anything that writes stock (Rukaiya) — call her `applyMovement()` instead.

### Suggested commits

```
feat(auth): add JWT login and bcrypt password hashing
feat(auth): enforce admin/manager/staff route permissions
feat(catalog): add product search, filter and pagination
feat(catalog): category CRUD with product counts
docs(api): document auth and product endpoints
```

---

## Member 2 — Najmul · Suppliers & Purchasing

**Branch:** `feature/purchasing`
**Why this slice:** it is the "stock in" half of the business, and it is the
first real consumer of Evan's product catalogue and Rukaiya's stock ledger.

### Files you own

| Layer | Files |
|-------|-------|
| Database | `backend/src/db/schema.js` → **Section 2** (`suppliers`, `purchase_orders`, `purchase_order_items`) |
| API | `backend/src/routes/suppliers.routes.js`, `purchaseOrders.routes.js` |
| Services | `backend/src/services/supplier.service.js`, `purchasing.service.js` |
| Utils | `backend/src/utils/documentNumber.js` (PO/SO numbering) |
| UI | `frontend/src/pages/Suppliers.jsx`, `PurchaseOrders.jsx` |
| Docs | `docs/API.md` — suppliers and purchase-order sections |

### Your tasks

1. **Suppliers** — CRUD with contact details and a product count.
2. **Purchase orders** — create a multi-line draft against a supplier, with
   auto-generated numbers (`PO-2026-0001`).
3. **Status flow** — `draft → ordered → received`, plus `cancelled`. Each
   transition is its own endpoint so it can enforce its own rules.
4. **Goods receipt** — `POST /purchase-orders/:id/receive` adds every line to
   stock **in one transaction** by calling `applyMovement()`, and updates each
   product's cost price to what you actually paid.
5. **Order detail drawer** — line items, totals, and the action buttons.
6. Guard the illegal transitions: a received order cannot be received twice or
   cancelled.

### Do not take

- Product CRUD (Evan) — you read products to fill line items, not edit them.
- `stock.service.js` (Rukaiya) — you *call* `applyMovement()`, you do not change it.

### Suggested commits

```
feat(suppliers): supplier CRUD with contact details
feat(purchasing): create multi-line purchase orders
feat(purchasing): receive goods and update stock transactionally
fix(purchasing): block receiving an already-received order
docs(api): document purchase order status transitions
```

---

## Member 3 — Rukaiya · Inventory, Sales & Reporting

**Branch:** `feature/inventory-reports`
**Why this slice:** the stock ledger is the heart of an inventory system, and
the dashboard is what the demo opens on.

### Files you own

| Layer | Files |
|-------|-------|
| Database | `backend/src/db/schema.js` → **Section 3** (`stock_movements`, `sales_orders`, `sales_order_items`) |
| API | `backend/src/routes/stock.routes.js`, `sales.routes.js`, `reports.routes.js` |
| Services | `backend/src/services/stock.service.js`, `sales.service.js`, `report.service.js` |
| UI | `frontend/src/pages/Dashboard.jsx`, `StockMovements.jsx`, `SalesOrders.jsx`, `Reports.jsx` |
| Docs | `docs/API.md` — stock, sales and reports sections |

### Your tasks

1. **Stock ledger** — `applyMovement()` is the single writer of
   `products.quantity`. It locks the product row (`SELECT … FOR UPDATE`),
   updates the total, and appends an immutable `stock_movements` row.
   **Both other members depend on this**, so land it early.
2. **Manual stock actions** — stock in, stock out, and a stock-take adjustment
   that derives the delta from a counted quantity.
3. **Sales orders** — `draft → confirmed → fulfilled`, plus `cancelled`.
   Confirming checks availability; fulfilling deducts stock.
4. **Dashboard** — stock value, low-stock count, revenue, recent movements, and
   value by category.
5. **Reports** — inventory valuation, top products, daily stock flow; each with
   `?format=csv` export.
6. Never let stock go negative except on a deliberate adjustment.

### Do not take

- Purchase orders (Najmul) — his receive flow calls your `applyMovement()`.
- Product or category CRUD (Evan).

### Suggested commits

```
feat(stock): add transactional stock ledger with row locking
feat(stock): manual stock in/out and stock-take adjustment
feat(sales): sales order lifecycle with availability checks
feat(reports): dashboard metrics and category breakdown
feat(reports): CSV export for valuation and top products
```

---

## Shared files — handle with care

These are touched by more than one person. **Announce in the group chat before
you push a change to them**, and keep your edit inside your own marked section.

| File | Why it is shared | Rule |
|------|------------------|------|
| `backend/src/db/schema.js` | All tables live here | Stay inside your `SECTION n` block |
| `backend/src/routes/index.js` | Mounts every router | Add your one line, touch nothing else |
| `backend/src/validators/schemas.js` | All Zod schemas | Stay inside your marked section |
| `frontend/src/App.jsx` | Route table | Add your `<Route>`, leave the rest |
| `frontend/src/services/api.js` | Endpoint map | Add your own group only |
| `frontend/src/components/ui.jsx` | Shared primitives | Extend, never restyle someone else's |
| `frontend/src/components/LineItemEditor.jsx` | Najmul + Rukaiya both use it | Agree changes between the two of you |
| `frontend/src/styles/index.css` | Global styles | Append new rules; do not rewrite existing ones |

---

## Contracts nobody breaks alone

Changing any of these needs all three members to agree, because it breaks the
other two slices.

**API response envelope**

```jsonc
// list endpoints
{ "data": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 16, "totalPages": 1 } }
// single record
{ "data": { ... } }
// errors
{ "error": { "message": "…", "details": [ { "field": "sku", "message": "…" } ] } }
```

**The stock rule** — `products.quantity` is written *only* by
`stock.service.js → applyMovement()`. Every change leaves a `stock_movements`
row behind. If the ledger and the quantity ever disagree, that is a bug.

**Roles** — `admin` > `manager` > `staff`. Staff can record stock and raise
sales orders; managers additionally manage master data and purchase orders;
admins additionally manage users and delete records.

---

## Suggested build order

The dependencies run in one direction, so build in this order to avoid blocking
each other:

1. **Evan** lands auth + products first — the other two need a product to point at.
2. **Rukaiya** lands `stock.service.js` next — Najmul's receive flow calls it.
3. **Najmul** lands purchasing on top of both.
4. Everyone then works in parallel on their UI pages.

While you wait for a dependency, work against the seeded data
(`npm run db:seed`) — it already contains products, suppliers and movements.
