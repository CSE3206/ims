# API reference

Base URL: `http://localhost:4000/api`

Every endpoint except `/health`, `/auth/register` and `/auth/login` requires:

```
Authorization: Bearer <token>
```

## Response shapes

```jsonc
// list endpoints
{ "data": [ … ], "pagination": { "page": 1, "limit": 20, "total": 16, "totalPages": 1 } }

// single record
{ "data": { … } }

// error
{ "error": { "message": "…", "details": [ { "field": "sku", "message": "…" } ] } }
```

| Status | Meaning |
|--------|---------|
| 200 / 201 | Success |
| 400 | Validation failed, or an illegal state transition |
| 401 | Missing or expired token |
| 403 | Signed in, but the role is not allowed |
| 404 | No such record |
| 409 | Unique constraint (duplicate SKU, email, supplier name) |

Role column below: **S** = staff, **M** = manager, **A** = admin.

---

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | none |

```bash
curl localhost:4000/api/health
# {"status":"ok","database":"up","time":"2026-09-03T07:37:48.309Z"}
```

---

## Auth — *Evan*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | none | Create an account (bootstraps the first admin) |
| POST | `/auth/login` | none | Exchange credentials for a JWT |
| GET | `/auth/me` | S | The current user |

```bash
curl -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"evan@ims.local","password":"password123"}'
```
```jsonc
{ "user": { "id": "6de64f2b-…", "name": "Evan", "email": "evan@ims.local",
            "role": "admin", "isActive": true },
  "token": "eyJhbGciOiJIUzI1NiIs…" }
```

Save it for the examples below:

```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"evan@ims.local","password":"password123"}' | jq -r .token)
```

**Register body**

```jsonc
{ "name": "Rukaiya",               // required, 2–120 characters
  "email": "rukaiya@ims.local",    // required, stored lowercased, unique
  "password": "password123",       // required, 6–100 characters
  "role": "staff" }                // admin | manager | staff, default staff
```

`register` and `login` both return `{ user, token }`. Tokens last `JWT_EXPIRES_IN`
(default 7 days); the frontend stores the token and sends it on every request.

```bash
curl -H "Authorization: Bearer $TOKEN" localhost:4000/api/auth/me
# {"user":{"id":"6de64f2b-…","name":"Evan","email":"evan@ims.local","role":"admin",…}}
```

**Errors**

| Case | Status | Message |
|------|--------|---------|
| Unknown email **or** wrong password | 401 | `Invalid email or password` — same text for both, so the API does not reveal which emails exist |
| Account deactivated by an admin | 403 | `This account has been deactivated` |
| Email already registered | 409 | `An account with that email already exists` |
| No token / bad token | 401 | `Missing Bearer token` / `Invalid or expired token` |

---

## Users — *Evan* (admin only)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/users` | A | All users |
| POST | `/users` | A | Create a user |
| PATCH | `/users/:id` | A | Change name, role, password or active flag |
| DELETE | `/users/:id` | A | Delete (you cannot delete yourself) |

`POST /users` takes the same body as `/auth/register` and returns `{ data: user }`
without a token. The password hash is never included in any response.

**Update body** — send only the fields you are changing:

```jsonc
{ "name": "Najmul Islam",
  "role": "manager",       // admin | manager | staff
  "isActive": false,       // a real boolean, not "false"
  "password": "newpass1" } // 6–100 characters, re-hashed with bcrypt
```

```bash
# promote a user to manager
curl -X PATCH localhost:4000/api/users/<id> -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"manager"}'
```

A manager or staff token gets `403 Requires role: admin` on every `/users` route.

---

## Categories — *Evan*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/categories` | S | All categories, each with `productCount` |
| GET | `/categories/:id` | S | One category |
| POST | `/categories` | M | Create |
| PATCH | `/categories/:id` | M | Update |
| DELETE | `/categories/:id` | M | Delete — its products become uncategorised |

```bash
curl -X POST localhost:4000/api/categories -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Monitors","description":"Displays and panels"}'
```

| Field | Rules |
|-------|-------|
| `name` | required on create, 2–120 characters, unique — a duplicate returns 409 |
| `description` | optional, up to 1000 characters, may be `null` |

`PATCH` accepts either field on its own. `productCount` in the list counts every
product in the category, active or not.

---

## Products — *Evan*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/products` | S | Search / filter / sort / paginate |
| GET | `/products/low-stock` | S | Everything at or below its reorder level |
| GET | `/products/:id` | S | One product with category and supplier names |
| POST | `/products` | M | Create (an opening `quantity` writes a stock movement) |
| PATCH | `/products/:id` | M | Update — **`quantity` is ignored here** |
| DELETE | `/products/:id` | A | Delete |

**Query parameters for `GET /products`**

| Name | Type | Default | Notes |
|------|------|---------|-------|
| `search` | string | — | Matches name or SKU, case-insensitive |
| `categoryId` | uuid | — | |
| `supplierId` | uuid | — | |
| `lowStock` | `true`/`false` | — | `quantity <= reorderLevel` |
| `page` | int | 1 | |
| `limit` | int | 20 | max 200 |
| `sort` | enum | `name` | `name`, `sku`, `quantity`, `sellingPrice`, `createdAt` |
| `order` | enum | `asc` | `asc`, `desc` |

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "localhost:4000/api/products?search=laptop&lowStock=true&sort=quantity&order=asc"
```

**Create body**

```jsonc
{ "sku": "MON-6001",            // required, uppercased, unique
  "name": "27\" IPS Monitor",   // required
  "description": null,
  "categoryId": "uuid | null",
  "supplierId": "uuid | null",
  "unit": "pcs",
  "costPrice": 18000,
  "sellingPrice": 23500,
  "quantity": 12,               // opening stock, create only
  "reorderLevel": 5 }
```

On create, anything left out gets a default: `unit` `"pcs"`, prices `0`,
`quantity` `0`, `reorderLevel` `10`, `isActive` `true`. Numbers may be sent as
strings (form inputs) and are converted. Prices come back as strings, e.g.
`"23500.00"`, because they are stored as `numeric(12,2)`.

**Update body** — a partial: only the fields you send are changed, and nothing
is reset to its default. `quantity` is dropped; change stock through
[`/stock`](#stock--rukaiya) so the ledger records it.

```bash
curl -X PATCH localhost:4000/api/products/<id> -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"sellingPrice":24500,"reorderLevel":8}'
```

Deleting a product that appears on any purchase or sales order line returns
`400 Referenced record does not exist, or is still in use`. A product with no
order lines is deleted together with its stock movements, so prefer
`isActive: false` to hide a product that has history.

---

## Suppliers — *Najmul*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/suppliers` | S | Paginated list with `productCount`; search and filter supported |
| GET | `/suppliers/:id` | S | One supplier |
| POST | `/suppliers` | M | Create |
| PATCH | `/suppliers/:id` | M | Update |
| DELETE | `/suppliers/:id` | A | Blocked (400) if the supplier has purchase orders |

**Query parameters for `GET /suppliers`**

| Name | Type | Default | Notes |
|------|------|---------|-------|
| `search` | string | — | Matches name, email or contact person |
| `isActive` | `true`/`false` | — | Filter by active status |
| `page` | int | 1 | |
| `limit` | int | 50 | max 200 |

```bash
curl -X POST localhost:4000/api/suppliers -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Delta Traders","contactPerson":"Karim","email":"sales@delta.example","phone":"+880 1700 000000"}'
```

---

## Purchase orders — *Najmul*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/purchase-orders` | S | `?status=`, `?supplierId=`, `?page=`, `?limit=` |
| GET | `/purchase-orders/:id` | S | Order with supplier and expanded line items |
| POST | `/purchase-orders` | M | Create a draft; number is generated |
| PATCH | `/purchase-orders/:id` | M | Edit a draft — supplier, notes, and/or line items |
| POST | `/purchase-orders/:id/order` | M | `draft → ordered` |
| POST | `/purchase-orders/:id/receive` | S | `draft`\|`ordered` → `received` — **adds stock** |
| POST | `/purchase-orders/:id/cancel` | M | `draft`\|`ordered` → `cancelled` |
| DELETE | `/purchase-orders/:id` | A | Only `draft` or `cancelled` |

### Status transition rules

| From | Allowed transitions | Blocked | Notes |
|------|---------------------|---------|-------|
| `draft` | `ordered`, `received`, `cancelled` | — | Can also be edited or deleted |
| `ordered` | `received`, `cancelled` | edit, delete | Order is with the supplier |
| `received` | — | all | Terminal state; stock has been added |
| `cancelled` | — | all except delete | Terminal state; can be deleted for cleanup |

**Create body**

```jsonc
{ "supplierId": "uuid",           // required
  "expectedAt": "2026-09-20",     // optional
  "notes": "Quarterly restock",
  "items": [                      // at least one
    { "productId": "uuid", "quantity": 50, "unitCost": 880 }
  ] }
```

**Update body** (PATCH — draft only, all fields optional)

```jsonc
{ "supplierId": "uuid",           // change supplier
  "expectedAt": "2026-10-01",     // change expected date
  "notes": "Updated notes",
  "items": [                      // replaces ALL line items
    { "productId": "uuid", "quantity": 100, "unitCost": 900 }
  ] }
```

The number (`PO-2026-0003`) and `total` are calculated server-side.

**Receiving** runs in one transaction: every line calls `applyMovement()` to add
stock and write a ledger row, and each product's `costPrice` is updated to the
`unitCost` actually paid.

```bash
# create → order → receive
PO=$(curl -s -X POST localhost:4000/api/purchase-orders -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"supplierId":"'$SUPPLIER_ID'","items":[{"productId":"'$PRODUCT_ID'","quantity":50,"unitCost":880}]}' \
  | jq -r .data.id)

curl -X POST localhost:4000/api/purchase-orders/$PO/order   -H "Authorization: Bearer $TOKEN"
curl -X POST localhost:4000/api/purchase-orders/$PO/receive -H "Authorization: Bearer $TOKEN"

# receiving twice is rejected:
# {"error":{"message":"This order has already been received or cancelled — a received order cannot be received again"}}
```

---

## Stock — *Rukaiya*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/stock/movements` | S | The ledger, newest first |
| POST | `/stock/in` | S | Add stock outside a purchase order |
| POST | `/stock/out` | S | Remove stock outside a sales order |
| POST | `/stock/adjust` | M | Stock-take: set the counted quantity |

**Query parameters for `GET /stock/movements`**

| Name | Notes |
|------|-------|
| `productId` | uuid |
| `type` | `in` \| `out` \| `adjustment` |
| `from`, `to` | ISO date bounds on `createdAt` |
| `page`, `limit` | limit defaults to 50, max 200 |

**Bodies**

```jsonc
// POST /stock/in  and  /stock/out
{ "productId": "uuid", "quantity": 12, "reason": "Damaged in transit", "reference": "RTN-04" }

// POST /stock/adjust — send what you COUNTED, not the difference
{ "productId": "uuid", "countedQuantity": 42, "reason": "Monthly stock take" }
```

`quantity` in a movement row is **signed**: `+50` received, `-10` sold.
`quantityAfter` is the running balance, so the ledger reconciles on its own.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "localhost:4000/api/stock/movements?productId=$PRODUCT_ID"
```
```
adjustment     2 -> 42    ADJUST        Monthly stock take
out          -10 -> 40    SO-2026-0005  Sold on SO-2026-0005
in            50 -> 50    PO-2026-0003  Received on PO-2026-0003
```

Taking stock below zero returns 400:

```
{"error":{"message":"Not enough stock for STO-4003: have 5, need 20"}}
```

---

## Sales orders — *Rukaiya*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/sales-orders` | S | `?status=`, `?page=`, `?limit=` |
| GET | `/sales-orders/:id` | S | Order with expanded line items and live stock |
| POST | `/sales-orders` | S | Create a draft; number generated |
| POST | `/sales-orders/:id/confirm` | S | `draft → confirmed` — checks availability |
| POST | `/sales-orders/:id/fulfil` | S | `confirmed → fulfilled` — **removes stock** |
| POST | `/sales-orders/:id/cancel` | M | `draft`\|`confirmed` → `cancelled` |

**Create body**

```jsonc
{ "customerName": "Meridian Corporate Services",   // required
  "customerEmail": "procurement@meridian.example",
  "notes": null,
  "items": [ { "productId": "uuid", "quantity": 3, "unitPrice": 69500 } ] }
```

Confirming an order you cannot supply returns a per-line breakdown:

```jsonc
{ "error": { "message": "Not enough stock to confirm this order",
             "details": [ { "field": "STO-4003", "message": "wanted 999, only 50 in stock" } ] } }
```

---

## Reports — *Rukaiya*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/reports/dashboard` | S | Every dashboard widget in one response |
| GET | `/reports/valuation` | S | Per-product stock value at cost |
| GET | `/reports/stock-flow` | S | Units in vs out per day; `?from=&to=` |
| GET | `/reports/top-products` | S | Best sellers — fulfilled orders only |

All three of the latter accept **`?format=csv`** and return a downloadable file.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "localhost:4000/api/reports/valuation?format=csv" -o valuation.csv
```

**`GET /reports/dashboard`**

```jsonc
{ "metrics": { "productCount": 16, "totalUnits": 753, "stockValue": "3727660.00",
               "lowStockCount": 4, "outOfStockCount": 0, "supplierCount": 3,
               "categoryCount": 5, "openPurchaseOrders": 1, "openSalesOrders": 3,
               "fulfilledRevenue": "223500.00" },
  "lowStock":        [ { "sku": "…", "quantity": 4, "reorderLevel": 6, … } ],
  "recentMovements": [ { "sku": "…", "type": "in", "quantity": 50, … } ],
  "stockByCategory": [ { "category": "Laptops", "units": 36, "value": "2386000.00" } ] }
```
