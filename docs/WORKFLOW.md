# Git workflow

This project is marked on **process** as much as on features. Follow this
document and keep the evidence: branch names, pull requests, review comments,
conflict resolutions, and a readable commit history.

## Branch model

```
main                    ← protected. Only ever receives merges from develop.
 └── develop            ← integration branch. All feature PRs target this.
      ├── feature/auth-catalog        (Evan)
      ├── feature/purchasing          (Najmul)
      └── feature/inventory-reports   (Rukaiya)
```

| Branch | Owner | Purpose |
|--------|-------|---------|
| `main` | Evan (Integration Lead) | Stable, demo-ready. Tagged for each submission. |
| `develop` | Evan | Where the three features come together. May briefly break. |
| `feature/auth-catalog` | Evan | Auth, users, categories, products |
| `feature/purchasing` | Najmul | Suppliers, purchase orders, goods receipt |
| `feature/inventory-reports` | Rukaiya | Stock ledger, sales orders, dashboard, reports |

Extra short-lived branches are fine when something does not belong to your
feature: `fix/<slug>`, `docs/<slug>`, `chore/<slug>`. Branch them from
`develop` and PR them back into `develop`.

**Nobody commits directly to `main` or `develop`.** Everything arrives by pull
request.

---

## Who merges what

| Pull request | Reviewed by | Merged by |
|--------------|-------------|-----------|
| `feature/auth-catalog` → `develop` | Najmul | **Najmul** (Evan may not merge his own) |
| `feature/purchasing` → `develop` | Rukaiya | **Evan** |
| `feature/inventory-reports` → `develop` | Evan | **Evan** |
| `develop` → `main` | Najmul **and** Rukaiya | **Evan** |
| `fix/*`, `docs/*` → `develop` | Any one other member | **Evan** |

The rules behind that table:

1. **One approval before any merge.** No self-merging, ever — including the
   Integration Lead, whose PRs Najmul merges.
2. **Evan is Integration Lead.** He merges into `develop` and is the only person
   who merges into `main`.
3. **Najmul is deputy.** If Evan is unavailable for more than a day, Najmul
   merges in his place and says so in the PR.
4. **The author resolves their own conflicts**, on their own branch, before the
   PR is merged. The merger never fixes someone else's conflict silently.
5. **`main` is release-only.** `develop → main` happens at milestones, and Evan
   tags it (`v0.1`, `v0.2`, `v1.0-final`).

---

## One-time setup

```bash
git clone <repo-url>
cd inventory-management-system

# install everything
npm run install:all

# backend environment
cp backend/.env.example backend/.env
#   → paste the Neon DATABASE_URL and pick a JWT_SECRET

# create the tables and demo data (once, by Evan)
npm run db:push
npm run db:seed
```

Create the branches — Evan does this once, right after the first push of `main`:

```bash
./scripts/create-feature-branches.sh
```

Or by hand:

```bash
git checkout main
git checkout -b develop
git push -u origin develop

git checkout -b feature/auth-catalog        && git push -u origin feature/auth-catalog
git checkout develop
git checkout -b feature/purchasing          && git push -u origin feature/purchasing
git checkout develop
git checkout -b feature/inventory-reports   && git push -u origin feature/inventory-reports
git checkout develop
```

Then each member works only on their own branch:

```bash
git checkout feature/<yours>
```

---

## Daily loop

```bash
# 1. Start from the latest integration branch
git checkout develop
git pull origin develop

git checkout feature/<yours>
git merge develop            # keep up to date; resolve conflicts here, early

# 2. Work in small, focused commits
git add backend/src/services/product.service.js
git commit -m "feat(catalog): add low-stock filter to product list"

# 3. Push
git push -u origin HEAD

# 4. Open a PR: feature/<yours> → develop
```

Merge `develop` into your branch **daily**. A conflict found today is five
minutes; the same conflict found in submission week is an evening.

> The team uses **merge**, not rebase, on shared branches. Rebasing a branch
> your teammates have already pulled rewrites history they have. If you want to
> tidy your own unpushed commits, `git rebase -i` is fine — but never rebase
> anything already pushed.

---

## Commit messages

Conventional Commits — `type(scope): short imperative description`.

```
feat(catalog): add product search and pagination
feat(purchasing): receive goods and update stock transactionally
fix(stock): prevent negative quantity on manual stock out
refactor(api): extract shared pagination helper
docs(team): assign feature branches
style(ui): align table column headers
chore(deps): add drizzle-kit
test(sales): cover oversell rejection
```

| Type | Use for |
|------|---------|
| `feat` | New user-visible behaviour |
| `fix` | Bug fix |
| `refactor` | Restructuring with no behaviour change |
| `docs` | Documentation only |
| `style` | Formatting/CSS, no logic |
| `chore` | Dependencies, config, scripts |
| `test` | Tests |

Scopes in this project: `auth`, `catalog`, `suppliers`, `purchasing`, `stock`,
`sales`, `reports`, `ui`, `db`, `api`.

**Commit often.** Three commits a week per person looks like nobody worked.
Small commits also make conflicts far easier to resolve.

---

## Pull request checklist

Title: same format as a commit — `feat(purchasing): goods receipt flow`.

```markdown
## What this adds
One paragraph. What can a user now do that they could not before?

## Files touched
- backend/src/services/purchasing.service.js
- frontend/src/pages/PurchaseOrders.jsx

## How I tested it
```bash
curl -X POST localhost:4000/api/purchase-orders/<id>/receive \
  -H "Authorization: Bearer $TOKEN"
# → status "received", product quantity +50, one stock_movements row
```

## Shared files touched
- [ ] `db/schema.js`  - [ ] `routes/index.js`  - [ ] `App.jsx`
- [ ] `api.js`        - [ ] `index.css`        - [ ] none

## Checklist
- [ ] Merged latest `develop` into my branch
- [ ] `npm run dev` starts with no errors, both apps
- [ ] `npm run build --prefix frontend` succeeds
- [ ] I tested every endpoint I changed
- [ ] I did not write `products.quantity` outside the stock service
```

Reviewers: leave at least one substantive comment. "LGTM" on a 400-line diff is
not a review, and it shows in the history.

---

## Resolving a merge conflict

Conflicts in this project will almost always be in `db/schema.js`,
`routes/index.js`, `api.js` or `App.jsx` — files where all three of you add
lines near each other.

```bash
git checkout feature/<yours>
git merge develop
# → CONFLICT (content): Merge conflict in backend/src/db/schema.js
```

Open the file. You will see:

```js
<<<<<<< HEAD
// your version
=======
// what is already on develop
>>>>>>> develop
```

Almost always the answer is **keep both** — you added your table, they added
theirs. Delete the three marker lines and leave both blocks.

```bash
# after fixing every conflicted file
git add backend/src/db/schema.js
git commit                    # git writes the merge message for you
npm run dev --prefix backend  # ALWAYS verify before pushing a merge
git push
```

Useful commands:

```bash
git status                  # which files are still conflicted
git diff --name-only --diff-filter=U
git merge --abort           # start the merge over
git log --oneline --graph --all --decorate   # see the branch shape
```

**Never** resolve a conflict by deleting a teammate's code to make the error go
away. If you cannot tell which version is right, ask them — that is the whole
point of the exercise.

---

## Release to `main`

At each milestone, Evan:

```bash
git checkout develop
git pull origin develop
npm run install:all
npm run build --prefix frontend    # must succeed
# smoke-test login, create a product, receive a PO, fulfil an SO

# open PR: develop → main, get both approvals, merge
git checkout main
git pull origin main
git tag -a v1.0 -m "Submission build"
git push origin v1.0
```

---

## Evidence to keep for marking

- `git log --oneline --graph --all` screenshot showing three parallel branches
  merging into `develop`
- At least one PR per member, with a real review comment on it
- At least one screenshot of a resolved merge conflict
- The commit history showing steady work, not one giant commit each
