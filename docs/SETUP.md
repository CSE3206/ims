# Setup guide

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18 or newer | `node -v` |
| npm | 9 or newer | `npm -v` |
| Git | any recent | `git --version` |

No local Postgres needed — the database is hosted on Neon.

## First run

```bash
git clone <repo-url>
cd inventory-management-system

# 1. install backend + frontend dependencies
npm run install:all

# 2. create the backend environment file
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

```ini
DATABASE_URL="postgresql://…@ep-….neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="a-long-random-string"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
# 3. create the tables (ONE person does this, once)
npm run db:push

# 4. load demo data
npm run db:seed
```

## Running it

Two terminals:

```bash
# terminal 1 — API on http://localhost:4000
npm run dev:backend

# terminal 2 — UI on http://localhost:5173
npm run dev:frontend
```

Open <http://localhost:5173> and sign in.

| Email | Password | Role |
|-------|----------|------|
| `evan@ims.local` | `password123` | admin |
| `najmul@ims.local` | `password123` | manager |
| `rukaiya@ims.local` | `password123` | staff |

The login screen has one-click buttons for all three.

## Handy commands

From the repository root:

| Command | Does |
|---------|------|
| `npm run install:all` | Install both projects |
| `npm run dev:backend` | API with file watching |
| `npm run dev:frontend` | Vite dev server |
| `npm run db:push` | Apply `schema.js` to Neon |
| `npm run db:seed` | Reset to demo data |
| `npm run db:studio` | Browse the database in a browser |
| `npm run build` | Production build of the frontend |
| `npm run setup` | install + push + seed, in one go |

## Troubleshooting

**`Missing environment variable DATABASE_URL`**
`backend/.env` does not exist or is empty. Copy it from `.env.example`.

**`Port 5173 is in use, trying another one...`**
Another Vite project is already running. Vite moves to 5174 and prints the real
URL — use whatever it printed. If you want 5173 back, stop the other project
(`lsof -ti tcp:5173 | xargs kill`).

**`Port 4000 already in use`**
```bash
lsof -ti tcp:4000 | xargs kill
```
Or set a different `PORT` in `backend/.env` — then update the proxy target in
`frontend/vite.config.js` to match.

**Login works but every other request 401s**
The token expired (7 days). Sign out and back in. If it persists, `JWT_SECRET`
changed since the token was issued.

**`relation "products" does not exist`**
Nobody has run `npm run db:push` against this database yet.

**Frontend loads but every call fails with a network error**
The API is not running, or it is on a different port than the proxy expects.
Check `curl localhost:4000/api/health` and `frontend/vite.config.js`.

**`npm run db:push` says it will drop a column**
Someone else changed `schema.js`. Pull `develop` first, then push. Never
accept a destructive change you did not intend — it is a shared database.

**Seed fails with a foreign-key error**
Something references a row the seed is trying to delete. Run it again; if it
persists, drop and recreate the tables with `npm run db:push --force`.

## Deploying (optional)

The backend is a plain Express app and the frontend a static bundle, so any
host works. On Render / Railway / Fly:

**Backend** — root `backend/`, build `npm install`, start `npm start`.
Environment: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, and
`CORS_ORIGIN` set to the deployed frontend URL.

**Frontend** — root `frontend/`, build `npm run build`, publish `dist/`.
Set `VITE_API_URL` to the deployed API's `/api` URL. Add a rewrite of
`/* → /index.html` so client-side routes work on refresh.
