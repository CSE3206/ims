# How the project works

## The idea in one paragraph

The system tracks physical goods through a warehouse. Stock arrives on a
**purchase order** from a supplier, sits in the **product catalogue** as a
quantity, and leaves on a **sales order** to a customer. Every single change to
that quantity is written to an append-only **stock movement ledger**, so at any
moment you can answer both "how many do we have?" and "why is it that number?".

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI | React 18 + Vite | Fast dev server, no build config to maintain |
| Routing | react-router-dom 6 | Standard SPA routing |
| API | Express 4 | Small, familiar, easy to read in a viva |
| ORM | Drizzle ORM | SQL-shaped query builder — you can see the SQL you are writing |
| Database | Neon (serverless Postgres) | Managed, free tier, shared by all three members |
| Auth | JWT (`jsonwebtoken`) + bcrypt | Stateless; no session store to run |
| Validation | Zod | One schema validates and coerces each request |

No CSS framework and no state-management library. Everything is plain CSS with
custom properties and React's own `useState` / `useContext`, so the whole team
can read every line.

## Repository layout

```
inventory-management-system/
├── backend/
│   ├── drizzle.config.js        drizzle-kit config (push / generate / studio)
│   ├── .env                     secrets — git-ignored
│   └── src/
│       ├── index.js             server entry: listen + graceful shutdown
│       ├── app.js               Express wiring: cors, json, routes, errors
│       ├── config/env.js        env vars, validated once at boot
│       ├── db/
│       │   ├── schema.js        ALL tables, enums and relations
│       │   ├── index.js         Drizzle client over a Neon pool
│       │   └── seed.js          demo data
│       ├── middleware/
│       │   ├── auth.js          requireAuth, requireRole, signToken
│       │   ├── validate.js      Zod → 400 with per-field details
│       │   └── error.js         404 + central error formatter
│       ├── validators/schemas.js  every Zod request schema
│       ├── routes/              one router per resource (HTTP only)
│       ├── services/            business logic + all database access
│       └── utils/               ApiError, asyncHandler, numbering, money
│
├── frontend/
│   ├── vite.config.js           dev server + /api proxy
│   └── src/
│       ├── main.jsx             providers: Router → Toast → Auth → App
│       ├── App.jsx              route table
│       ├── context/             AuthContext, ToastContext
│       ├── hooks/useFetch.js    data fetching with cancellation + reload
│       ├── services/api.js      the ONLY place fetch() is called
│       ├── services/format.js   currency / date / CSV download helpers
│       ├── components/          Layout, DataTable, Modal, ui primitives
│       ├── pages/               one page per route
│       └── styles/index.css     the whole stylesheet
│
├── docs/                        you are here
└── scripts/                     branch helper
```

## Request lifecycle

Follow one click all the way down — "Receive goods" on a purchase order:

```
PurchaseOrders.jsx
  └─ api.purchaseOrders.receive(id)          frontend/src/services/api.js
       └─ POST /api/purchase-orders/:id/receive
            │  Authorization: Bearer <jwt>
            ▼
       app.js                cors → express.json → morgan
            ▼
       routes/index.js       mounts /purchase-orders
            ▼
       purchaseOrders.routes.js
            ├─ requireAuth              verifies the JWT → req.user
            ├─ requireRole(...)         checks the role
            ├─ validate({ params })     Zod checks the uuid
            └─ asyncHandler(handler)    catches rejected promises
            ▼
       services/purchasing.service.js
            └─ receivePurchaseOrder(id, userId)
                 └─ db.transaction(async tx => {
                      for each line item:
                        applyMovement(tx, …)   ← services/stock.service.js
                          ├─ SELECT … FOR UPDATE      lock the product row
                          ├─ UPDATE products SET quantity = …
                          └─ INSERT INTO stock_movements …
                        UPDATE products SET cost_price = …
                      UPDATE purchase_orders SET status = 'received'
                    })
            ▼
       { "data": { …order… } }  →  toast + list refresh
```

If anything inside that transaction throws — a deleted product, a constraint
violation — Postgres rolls the whole thing back. You never end up with half the
lines received.

## The layer rules

**Routes** speak HTTP and nothing else: check auth, validate input, call one
service function, send the result. No SQL, no business rules.

**Services** hold the business logic and are the only code that touches the
database. They throw `ApiError` with a status; they never see `req` or `res`.

**Middleware** handles the cross-cutting concerns: who are you, is this input
valid, and how do errors become JSON.

That split is what makes the three-way feature split work — Najmul can call
`applyMovement()` from Rukaiya's service without either of them touching the
other's routes.

## The stock rule

This is the single most important invariant in the system:

> `products.quantity` is written **only** by `stock.service.js → applyMovement()`,
> and every write appends a row to `stock_movements`.

Three things depend on it:

- `applyMovement()` takes a **transaction handle**, so a caller can batch many
  movements atomically (a purchase order with six lines is one transaction).
- It locks the product row with `SELECT … FOR UPDATE` before reading the current
  quantity, so two people selling the last item at the same moment cannot both
  succeed.
- It refuses to take stock below zero unless `allowNegative` is set — which only
  the stock-take adjustment does.

`product.service.js → updateProduct()` deliberately **drops** any `quantity`
field in its payload for the same reason.

## Document lifecycles

```
Purchase order (stock IN)          Sales order (stock OUT)

   draft                              draft
     │ POST /:id/order                  │ POST /:id/confirm   ← availability check
     ▼                                  ▼
   ordered                            confirmed
     │ POST /:id/receive  ★             │ POST /:id/fulfil  ★
     ▼                                  ▼
   received                           fulfilled

   ★ = the only steps that change stock
   Either can go to `cancelled` before the ★ step; neither can after it.
```

Reversing a completed document is deliberately *not* a status change — you take
the return in as a stock movement, so the ledger records what physically
happened rather than quietly rewriting history.

## Authentication and roles

Login returns a JWT containing `{ sub: userId, email, role }`. The frontend
stores it in `localStorage` and `services/api.js` attaches it to every request.
A 401 anywhere clears the token and bounces the user to `/login`.

| Role | Can do |
|------|--------|
| `staff` | Read everything; record stock in/out; create and fulfil sales orders; receive purchase orders |
| `manager` | …plus create/edit products, categories, suppliers, purchase orders; stock-take adjustments |
| `admin` | …plus delete records and manage user accounts |

Roles are enforced **server-side** by `requireRole()`. The frontend also hides
buttons the current role cannot use (`useAuth().canManage`), but that is a
convenience, not the security boundary.

## Frontend data flow

There is no Redux. Each page owns its own state:

```jsx
const [filters, setFilters] = useState({ search: '', page: 1 });
const { data, loading, error, reload } = useFetch(
  () => api.products.list(filters),
  [filters.search, filters.page],     // refetch when these change
);
```

`useFetch` handles the three states every list needs (loading, error, data),
cancels stale responses so a fast typist does not see older results overwrite
newer ones, and exposes `reload()` to call after a create or delete.

Two contexts wrap the app: `AuthContext` (who is signed in) and `ToastContext`
(feedback after every action).

## Error handling

One shape, everywhere:

```jsonc
{ "error": { "message": "Not enough stock to confirm this order",
             "details": [ { "field": "STO-4003", "message": "wanted 999, only 50 in stock" } ] } }
```

`ApiError` carries the status. `middleware/error.js` also translates raw
Postgres codes — `23505` (unique violation) becomes a 409, `23503` (foreign key)
becomes a 400 — so the user reads "That value already exists" instead of a
stack trace. On the client, `ApiClientError` carries `status` and `details`, and
`<ErrorNote>` renders the per-field messages under the form.

## Why Drizzle

Drizzle queries look like the SQL they generate, which matters for a course
project you have to explain:

```js
await db.select({ id: products.id, name: products.name })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(lte(products.quantity, products.reorderLevel))
        .orderBy(asc(products.quantity));
```

There is no code generation step and no separate schema language — `schema.js`
is plain JavaScript, and `npm run db:push` diffs it against Neon and applies the
difference.

## Where to change things

| I want to… | Touch |
|-----------|-------|
| Add a column | `db/schema.js`, then `npm run db:push` |
| Add an endpoint | `routes/<x>.routes.js` + `services/<x>.service.js` + `validators/schemas.js` |
| Add a page | `pages/<X>.jsx`, register in `App.jsx`, link in `components/Layout.jsx` |
| Change how stock moves | `services/stock.service.js` — and tell the team |
| Change colours/spacing | the custom properties at the top of `styles/index.css` |
| Add a report | `services/report.service.js` + a tab in `pages/Reports.jsx` |
