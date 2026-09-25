# Inventory Management System

A full-stack inventory system for a small warehouse: track products, buy stock
in from suppliers, sell it out to customers, and keep a complete audit trail of
every unit that moves.

Built for **CSE3206** by a team of three, using a branch-per-feature Git
workflow.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM + drizzle-kit |
| Auth | JWT + bcrypt, three roles |
| Validation | Zod |

## Quick start

```bash
npm run install:all              # install backend + frontend
cp backend/.env.example backend/.env    # then fill in DATABASE_URL + JWT_SECRET
npm run db:push                  # create the tables
npm run db:seed                  # load demo data

npm run dev:backend              # terminal 1 → http://localhost:4000
npm run dev:frontend             # terminal 2 → http://localhost:5173
```

Sign in with any of:

| Email | Password | Role |
|-------|----------|------|
| `evan@ims.local` | `password123` | admin |
| `najmul@ims.local` | `password123` | manager |
| `rukaiya@ims.local` | `password123` | staff |

Full instructions and troubleshooting: **[docs/SETUP.md](docs/SETUP.md)**

## What it does

**Catalogue** — products with SKU, category, supplier, cost and selling price,
unit, and a reorder level. Search by name or SKU, filter by category, supplier
or low stock, sort and paginate.

**Purchasing** — raise a multi-line purchase order against a supplier, send it,
then receive it. Receiving adds every line to stock in one transaction and
updates each product's cost price to what was actually paid.

**Sales** — raise a sales order, confirm it (which checks availability), then
fulfil it. Fulfilling deducts the stock.

**Stock ledger** — every change to a quantity is recorded with a signed amount,
the resulting balance, a reason, a document reference and who did it. Manual
stock in / stock out and a stock-take adjustment are available for anything that
happens outside an order.

**Dashboard & reports** — total stock value, low-stock and out-of-stock counts,
revenue, value by category, recent movements. Inventory valuation, top products
and daily stock flow, each exportable as CSV.

**Users & roles** — `staff` record stock and sell; `manager` also manage master
data and purchasing; `admin` also manage users and delete records. Enforced on
the server, not just hidden in the UI.

## The one rule that holds it together

> `products.quantity` is written **only** by `stock.service.js → applyMovement()`,
> and every write appends a row to `stock_movements`.

That is why the stock level and the audit trail can never drift apart, and why
receiving a six-line purchase order either fully happens or does not happen at
all. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-stock-rule).

## Document lifecycles

```
Purchase order (stock IN)          Sales order (stock OUT)

   draft                              draft
     │ mark ordered                     │ confirm  ← availability check
     ▼                                  ▼
   ordered                            confirmed
     │ receive  ★                       │ fulfil  ★
     ▼                                  ▼
   received                           fulfilled

   ★ = the only steps that change stock
```

## Team

| Member | Branch | Owns |
|--------|--------|------|
| **Evan** (Integration Lead) | `feature/auth-catalog` | Auth, users, categories, products |
| **Najmul** | `feature/purchasing` | Suppliers, purchase orders, goods receipt |
| **Rukaiya** | `feature/inventory-reports` | Stock ledger, sales orders, dashboard, reports |

Each member owns their slice **end to end** — database tables, API, and the
React pages on top. Full task lists, file ownership and the shared-file rules:
**[docs/TEAM.md](docs/TEAM.md)**

## Git workflow

```
main                    ← protected, release only. Merged by Evan.
 └── develop            ← integration. All feature PRs land here.
      ├── feature/auth-catalog        (Evan)
      ├── feature/purchasing          (Najmul)
      └── feature/inventory-reports   (Rukaiya)
```

Nobody commits to `main` or `develop` directly, nobody merges their own PR, and
every PR needs one approval. Evan merges into `develop` and `main`; Najmul
merges Evan's PRs. Branch setup, daily loop, commit conventions, the PR
template and a conflict-resolution walkthrough are in
**[docs/WORKFLOW.md](docs/WORKFLOW.md)**.

Create the branches once, after the first push:

```bash
./scripts/create-feature-branches.sh
```

## Documentation

| Document | What is in it |
|----------|---------------|
| [docs/SETUP.md](docs/SETUP.md) | Install, run, deploy, troubleshoot |
| [docs/TEAM.md](docs/TEAM.md) | Who builds what, file ownership, shared contracts |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Branching, PRs, reviews, who merges, conflicts |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How a request flows through the code |
| [docs/API.md](docs/API.md) | Every endpoint, with curl examples |
| [docs/DATABASE.md](docs/DATABASE.md) | Tables, relationships, design decisions |
| [docs/lab-report/Lab2_Project_Design_Report_Group10.docx](docs/lab-report/Lab2_Project_Design_Report_Group10.docx) | Lab 2 Project Design Report (Word): requirements, process model, MVP design, features of each branch, GitHub collaboration evidence |

## Repository layout

```
inventory-management-system/
├── backend/            Express API — routes, services, Drizzle schema
├── frontend/           React app — pages, components, API client
├── docs/               Team, workflow and technical documentation
├── scripts/            Branch setup helper
└── package.json        Root scripts that drive both projects
```

## Security note

`backend/.env` holds the database password and JWT secret, and is git-ignored.
Share credentials through the group chat, never in a commit. If one is
committed by accident, rotate it in the Neon console — removing the line in a
later commit does not remove it from the repository's history.

## License

Coursework — educational use.
