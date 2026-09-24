#!/usr/bin/env node
/**
 * Team split helper.
 *
 * The first commit (`init proj`, 71f19f4) put the whole codebase on main in one
 * go. To give every member a real, reviewable history for their own slice, the
 * develop branch was reduced to a shared scaffold and each member re-lands
 * their slice on their own feature branch, one focused commit at a time,
 * under their own git identity.
 *
 * Every commit this script makes is authored by whoever runs it, at the time
 * they run it. It never sets a different author or date.
 *
 *   node scripts/team-split.mjs status            progress of every member
 *   node scripts/team-split.mjs <member> --list   show your planned commits
 *   node scripts/team-split.mjs <member>          make your NEXT commit
 *   node scripts/team-split.mjs <member> --all    make all remaining commits
 *   node scripts/team-split.mjs resolve           fix conflicts in shared files
 *                                                 after `git merge develop`
 *   node scripts/team-split.mjs verify            compare the tree with 71f19f4
 *
 * <member> is one of: evan, najmul, rukaiya.  See docs/TEAM.md for ownership.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const REF = '71f19f4';
const SELF = 'scripts/team-split.mjs';

/* --------------------------------------------------------------------------
 * Shared files: each chunk is a line range (1-based, inclusive) in the REF
 * version. Lines outside every chunk are the scaffold everyone starts from.
 * ------------------------------------------------------------------------ */
const SCHEMA = 'backend/src/db/schema.js';
const ROUTES = 'backend/src/routes/index.js';
const VALIDATORS = 'backend/src/validators/schemas.js';
const APP = 'frontend/src/App.jsx';
const API = 'frontend/src/services/api.js';
const API_DOC = 'docs/API.md';

const CHUNKS = {
  [SCHEMA]: {
    users: [[42, 56]],
    categories: [[57, 68]],
    products: [[69, 95]],
    suppliers: [[101, 116]],
    purchaseOrders: [[117, 140]],
    purchaseOrderItems: [[141, 156]],
    stockMovements: [[162, 184]],
    salesOrders: [[185, 205]],
    salesOrderItems: [[206, 221]],
    categoriesRel: [[226, 229]],
    suppliersRel: [[230, 234]],
    productsRel: [[235, 240]],
    purchaseOrdersRel: [[241, 246]],
    purchaseOrderItemsRel: [[247, 254]],
    salesOrdersRel: [[255, 259]],
    salesOrderItemsRel: [[260, 267]],
    stockMovementsRel: [[268, 271]],
  },
  [ROUTES]: {
    auth: [[9, 9], [29, 29]],
    users: [[10, 10], [30, 30]],
    categories: [[11, 11], [31, 31]],
    products: [[12, 12], [32, 32]],
    suppliers: [[13, 13], [35, 35]],
    purchaseOrders: [[14, 14], [36, 36]],
    stock: [[15, 15], [39, 39]],
    sales: [[16, 16], [40, 40]],
    reports: [[17, 17], [41, 41]],
  },
  [VALIDATORS]: {
    auth: [[21, 39]],
    categories: [[40, 44]],
    products: [[45, 72]],
    suppliers: [[75, 85]],
    purchaseOrders: [[86, 105]],
    stock: [[108, 128]],
    sales: [[129, 147]],
    reports: [[148, 152]],
  },
  [APP]: {
    login: [[9, 9], [23, 24]],
    dashboard: [[10, 10], [33, 33]],
    products: [[11, 11], [34, 34]],
    categories: [[12, 12], [35, 35]],
    suppliers: [[13, 13], [38, 38]],
    purchaseOrders: [[14, 14], [39, 39]],
    salesOrders: [[15, 15], [42, 42]],
    stock: [[16, 16], [43, 43]],
    reports: [[17, 17], [44, 44]],
    users: [[18, 18], [47, 54]],
  },
  [API]: {
    evan: [[81, 105]],
    suppliers: [[108, 114]],
    purchaseOrders: [[115, 123]],
    stock: [[126, 131]],
    salesOrders: [[132, 139]],
    reports: [[140, 146]],
  },
  [API_DOC]: {
    auth: [[50, 78]],
    users: [[79, 89]],
    categories: [[90, 107]],
    products: [[108, 153]],
    suppliers: [[154, 171]],
    purchaseOrders: [[172, 216]],
    stock: [[217, 265]],
    sales: [[266, 294]],
    reports: [[295, 321]],
  },
};

/* --------------------------------------------------------------------------
 * Planned commits per member. `files` are restored whole from REF; `chunks`
 * are { file: [chunkId, ...] } added into shared files.
 * ------------------------------------------------------------------------ */
const PLAN = {
  evan: {
    branch: 'feature/auth-catalog',
    steps: [
      {
        message: 'feat(auth): add users table and JWT middleware with roles',
        files: ['backend/src/middleware/auth.js'],
        chunks: { [SCHEMA]: ['users'] },
      },
      {
        message: 'feat(auth): add JWT login and bcrypt password hashing',
        files: ['backend/src/services/auth.service.js', 'backend/src/routes/auth.routes.js'],
        chunks: { [VALIDATORS]: ['auth'], [ROUTES]: ['auth'] },
      },
      {
        message: 'feat(auth): admin-only user management endpoints',
        files: ['backend/src/routes/users.routes.js'],
        chunks: { [ROUTES]: ['users'] },
      },
      {
        message: 'feat(catalog): category CRUD with product counts',
        files: ['backend/src/services/category.service.js', 'backend/src/routes/categories.routes.js'],
        chunks: {
          [SCHEMA]: ['categories', 'categoriesRel'],
          [VALIDATORS]: ['categories'],
          [ROUTES]: ['categories'],
        },
      },
      {
        message: 'feat(catalog): add product search, filter and pagination',
        files: ['backend/src/services/product.service.js', 'backend/src/routes/products.routes.js'],
        chunks: {
          [SCHEMA]: ['products', 'productsRel'],
          [VALIDATORS]: ['products'],
          [ROUTES]: ['products'],
        },
      },
      {
        message: 'feat(ui): login page, auth context and protected routes',
        files: [
          'frontend/src/context/AuthContext.jsx',
          'frontend/src/components/ProtectedRoute.jsx',
          'frontend/src/pages/Login.jsx',
        ],
        chunks: { [API]: ['evan'], [APP]: ['login'] },
      },
      {
        message: 'feat(ui): products and categories pages',
        files: ['frontend/src/pages/Products.jsx', 'frontend/src/pages/Categories.jsx'],
        chunks: { [APP]: ['products', 'categories'] },
      },
      {
        message: 'feat(ui): admin screen to manage users and roles',
        files: ['frontend/src/pages/Users.jsx'],
        chunks: { [APP]: ['users'] },
      },
      {
        message: 'docs(api): document auth, user, category and product endpoints',
        files: [],
        chunks: { [API_DOC]: ['auth', 'users', 'categories', 'products'] },
      },
    ],
  },

  najmul: {
    branch: 'feature/purchasing',
    steps: [
      {
        message: 'feat(suppliers): add suppliers table and supplier service',
        files: ['backend/src/services/supplier.service.js'],
        chunks: { [SCHEMA]: ['suppliers', 'suppliersRel'] },
      },
      {
        message: 'feat(suppliers): supplier CRUD with contact details',
        files: ['backend/src/routes/suppliers.routes.js'],
        chunks: { [VALIDATORS]: ['suppliers'], [ROUTES]: ['suppliers'] },
      },
      {
        message: 'feat(purchasing): add purchase order and line item tables',
        files: [],
        chunks: {
          [SCHEMA]: [
            'purchaseOrders',
            'purchaseOrderItems',
            'purchaseOrdersRel',
            'purchaseOrderItemsRel',
          ],
        },
      },
      {
        message: 'feat(purchasing): create, order, receive and cancel purchase orders',
        files: ['backend/src/services/purchasing.service.js', 'backend/src/routes/purchaseOrders.routes.js'],
        chunks: { [VALIDATORS]: ['purchaseOrders'], [ROUTES]: ['purchaseOrders'] },
      },
      {
        message: 'feat(ui): suppliers page',
        files: ['frontend/src/pages/Suppliers.jsx'],
        chunks: { [API]: ['suppliers'], [APP]: ['suppliers'] },
      },
      {
        message: 'feat(ui): purchase orders page with detail drawer',
        files: ['frontend/src/pages/PurchaseOrders.jsx'],
        chunks: { [API]: ['purchaseOrders'], [APP]: ['purchaseOrders'] },
      },
      {
        message: 'docs(api): document supplier and purchase order endpoints',
        files: [],
        chunks: { [API_DOC]: ['suppliers', 'purchaseOrders'] },
      },
    ],
  },

  rukaiya: {
    branch: 'feature/inventory-reports',
    steps: [
      {
        message: 'feat(stock): add stock_movements ledger table',
        files: [],
        chunks: { [SCHEMA]: ['stockMovements', 'stockMovementsRel'] },
      },
      {
        message: 'feat(stock): add transactional stock ledger with row locking',
        files: ['backend/src/services/stock.service.js'],
        chunks: {},
      },
      {
        message: 'feat(stock): manual stock in/out and stock-take adjustment',
        files: ['backend/src/routes/stock.routes.js'],
        chunks: { [VALIDATORS]: ['stock'], [ROUTES]: ['stock'] },
      },
      {
        message: 'feat(sales): sales order lifecycle with availability checks',
        files: ['backend/src/services/sales.service.js', 'backend/src/routes/sales.routes.js'],
        chunks: {
          [SCHEMA]: ['salesOrders', 'salesOrderItems', 'salesOrdersRel', 'salesOrderItemsRel'],
          [VALIDATORS]: ['sales'],
          [ROUTES]: ['sales'],
        },
      },
      {
        message: 'feat(reports): dashboard metrics and CSV exports',
        files: ['backend/src/services/report.service.js', 'backend/src/routes/reports.routes.js'],
        chunks: { [VALIDATORS]: ['reports'], [ROUTES]: ['reports'] },
      },
      {
        message: 'feat(ui): dashboard and stock movements pages',
        files: ['frontend/src/pages/Dashboard.jsx', 'frontend/src/pages/StockMovements.jsx'],
        chunks: { [API]: ['stock', 'reports'], [APP]: ['dashboard', 'stock'] },
      },
      {
        message: 'feat(ui): sales orders and reports pages',
        files: ['frontend/src/pages/SalesOrders.jsx', 'frontend/src/pages/Reports.jsx'],
        chunks: { [API]: ['salesOrders'], [APP]: ['salesOrders', 'reports'] },
      },
      {
        message: 'docs(api): document stock, sales and report endpoints',
        files: [],
        chunks: { [API_DOC]: ['stock', 'sales', 'reports'] },
      },
    ],
  },

  // Integration work done by the lead once all three features are on develop.
  integration: {
    branch: 'chore/seed-data',
    owner: 'evan',
    steps: [
      {
        message: 'chore(db): seed demo data across all modules',
        files: ['backend/src/db/seed.js'],
        chunks: {},
      },
    ],
  },
};

/* --------------------------------------------------------------------------
 * git + file helpers
 * ------------------------------------------------------------------------ */
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const gitOk = (...args) => {
  try {
    git(...args);
    return true;
  } catch {
    return false;
  }
};

const refCache = new Map();
function refText(path) {
  if (!refCache.has(path)) {
    refCache.set(path, execFileSync('git', ['show', `${REF}:${path}`], { encoding: 'utf8' }));
  }
  return refCache.get(path);
}
const refLines = (path) => refText(path).split('\n');
const readOrNull = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);
const CONFLICT_MARKER = /^(<{7}|={7}|>{7}|\|{7})( |$)/;

/** First non-blank line of a chunk: used to tell whether it is already present. */
function chunkSignatures(path, id) {
  const lines = refLines(path);
  return CHUNKS[path][id].map(([start, end]) =>
    lines.slice(start - 1, end).find((l) => l.trim() !== ''),
  );
}

function presentChunks(path) {
  const text = readOrNull(path);
  if (text === null) return new Set();
  const lines = new Set(text.split('\n').filter((l) => !CONFLICT_MARKER.test(l)));
  return new Set(
    Object.keys(CHUNKS[path]).filter((id) => chunkSignatures(path, id).every((s) => lines.has(s))),
  );
}

/** Rebuild a shared file from REF, keeping the scaffold plus the given chunks. */
function renderShared(path, enabled) {
  const drop = new Set();
  for (const [id, ranges] of Object.entries(CHUNKS[path])) {
    if (enabled.has(id)) continue;
    for (const [start, end] of ranges) for (let n = start; n <= end; n++) drop.add(n);
  }
  const out = refLines(path).filter((_, i) => !drop.has(i + 1));
  writeFileSync(path, out.join('\n'));
}

function restoreWhole(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, refText(path));
}

function stepDone(step) {
  const filesOk = step.files.every((f) => readOrNull(f) === refText(f));
  const chunksOk = Object.entries(step.chunks).every(([path, ids]) => {
    const have = presentChunks(path);
    return ids.every((id) => have.has(id));
  });
  return filesOk && chunksOk;
}

function allOwnedFiles() {
  return Object.values(PLAN).flatMap((m) => m.steps.flatMap((s) => s.files));
}

function die(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function checkRepo() {
  if (!gitOk('rev-parse', '--git-dir')) die('Run this from inside the repository.');
  if (!gitOk('cat-file', '-e', `${REF}^{commit}`)) {
    die(`Reference commit ${REF} not found. Run: git fetch origin`);
  }
  process.chdir(git('rev-parse', '--show-toplevel'));
}

/* --------------------------------------------------------------------------
 * commands
 * ------------------------------------------------------------------------ */
function runMember(name, { all, list, force }) {
  const member = PLAN[name];
  const steps = member.steps;

  if (list) {
    console.log(`\nPlanned commits for ${name} on ${member.branch}:\n`);
    steps.forEach((s, i) => console.log(`  ${stepDone(s) ? '✔' : '·'} ${i + 1}. ${s.message}`));
    console.log();
    return;
  }

  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== member.branch) {
    die(`You are on '${branch}'. Switch first:\n    git checkout ${member.branch}`);
  }
  if (git('status', '--porcelain', '--untracked-files=no')) {
    die('You have uncommitted changes. Commit or stash them first.');
  }

  // Guard against running someone else's slice from the wrong account.
  const who = `${git('config', 'user.name')} <${git('config', 'user.email')}>`;
  const scaffoldAuthor = git('log', '-1', '--format=%ae', '--fixed-strings', '--grep=chore(team): reduce develop');
  const owner = member.owner || name;
  if (!force && owner !== 'evan' && scaffoldAuthor && git('config', 'user.email') === scaffoldAuthor) {
    die(
      `Your git identity (${who}) is the Integration Lead's.\n` +
        `  ${name}'s commits must be made by ${name}, from ${name}'s own machine and account.`,
    );
  }

  const pending = steps.filter((s) => !stepDone(s));
  if (!pending.length) {
    console.log(`\n✔ All of ${name}'s commits are done. Push and open your PR:\n    git push -u origin ${member.branch}\n`);
    return;
  }

  console.log(`\nCommitting as ${who} on ${member.branch}\n`);
  for (const step of all ? pending : pending.slice(0, 1)) {
    const touched = [...step.files];
    step.files.forEach(restoreWhole);
    for (const [path, ids] of Object.entries(step.chunks)) {
      renderShared(path, new Set([...presentChunks(path), ...ids]));
      touched.push(path);
    }
    git('add', '--', ...touched);
    git('commit', '-q', '-m', step.message);
    console.log(`  ✔ ${git('log', '-1', '--format=%h')} ${step.message}`);
  }

  const left = steps.filter((s) => !stepDone(s)).length;
  console.log(left ? `\n${left} commit(s) left. Run the same command again when you are ready.\n` : `\n✔ Done. Push and open your PR:\n    git push -u origin ${member.branch}\n`);
}

function scaffold() {
  if (git('status', '--porcelain', '--untracked-files=no')) die('Working tree not clean.');
  for (const f of allOwnedFiles()) rmSync(f, { force: true });
  for (const path of Object.keys(CHUNKS)) renderShared(path, new Set());
  git('add', '-A', '--', 'backend', 'frontend', 'docs', SELF);
  console.log('Scaffold written. Review with `git status`, then commit.');
}

function resolve() {
  const conflicted = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  if (!conflicted.length) return console.log('\nNo conflicted files.\n');
  for (const path of conflicted) {
    if (!CHUNKS[path]) {
      console.log(`  ! ${path} is not a shared file this script knows. Resolve it by hand.`);
      continue;
    }
    // "Keep both": every section present on either side stays, in the agreed order.
    renderShared(path, presentChunks(path));
    git('add', '--', path);
    console.log(`  ✔ ${path} resolved (kept both sides)`);
  }
  console.log('\nCheck the result, run the app, then:  git commit\n');
}

function status() {
  for (const [name, member] of Object.entries(PLAN)) {
    const done = member.steps.filter(stepDone).length;
    console.log(`  ${name.padEnd(12)} ${done}/${member.steps.length}  (${member.branch})`);
  }
}

function verify() {
  const diff = git('diff', '--stat', REF, '--', '.', `:(exclude)${SELF}`, ':(exclude)docs/TEAM.md');
  console.log(diff ? `Differences from ${REF}:\n${diff}` : `✔ Tree matches ${REF} (ignoring this script and docs/TEAM.md).`);
}

/* --------------------------------------------------------------------------
 * main
 * ------------------------------------------------------------------------ */
const [command, ...rest] = process.argv.slice(2);
const flags = { all: rest.includes('--all'), list: rest.includes('--list'), force: rest.includes('--force') };

checkRepo();

if (PLAN[command]) runMember(command, flags);
else if (command === 'scaffold') scaffold();
else if (command === 'resolve') resolve();
else if (command === 'status') status();
else if (command === 'verify') verify();
else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(command ? 1 : 0);
}
