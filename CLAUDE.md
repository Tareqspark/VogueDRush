# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FoodPark: a multi-branch restaurant POS/ERP. Express + MySQL backend, React 18 (Create React App) frontend, and a thin Capacitor Android wrapper for Sunmi V2 Pro handheld terminals. It is used in Bangladesh: the currency is ৳ and payment modes are cash/card/bkash/nagad.

## Commands

```bash
# Backend (port 5000)
cd backend && npm install
npm run dev                      # nodemon server.js
npm run migrate                  # loads database/schema.sql, but ONLY if the DB has zero tables
npm run seed                     # scripts/seed.js: base menu + admin, skipped if food_items is non-empty
node scripts/seed-data.js        # idempotent demo data across all branches
node --check routes/foo.js       # syntax check (there is no linter config)

# Frontend (port 3000, CRA dev server proxies /api to :5000)
cd frontend && npm install
npm start
CI=false npm run build           # same command CI runs; ESLint warnings don't fail it, compile errors do

# Mobile wrapper (only needed for native/plugin changes)
cd mobile && npm run sync        # cap sync android, then build the APK from mobile/android
```

There are **no tests**. `jest`/`supertest` (backend) and `react-scripts test` (frontend) are wired up, but there are no test files. To check a change, build the frontend and run `node --check` on the backend files you touched.

## Deployment: pushing to `main` deploys to production

`.github/workflows/deploy.yml` runs on every push to `main`:

1. Builds the frontend in CI.
2. SSHes to the droplet (`/var/www/foodpark`), runs `git pull`, then `npm ci --omit=dev` in `backend/`.
3. Uploads the fresh build with scp.
4. Runs `pm2 reload foodpark-api`, reloads nginx, and health-checks `/health`. If the health check fails, it rolls back the frontend build.

Things to know:
- `frontend/build/` is tracked in git, but the tracked copy is stale. CI builds a fresh one and the deploy replaces it, so don't rebuild or commit it.
- The Android app loads the live site (`mobile/capacitor.config.json` → `server.url`). A frontend deploy reaches the terminals immediately. Only native or plugin changes need a new APK; bump `versionCode`/`versionName` in `mobile/android/app/build.gradle` when you build one.
- `reset-data.yml` and `seed-data.yml` are manual workflows that act on the **production** DB (they require typing `YES`). `POST /api/admin/reset-data` and `POST /api/admin/clear-orders` in `server.js` are also destructive. Never trigger any of these without explicit confirmation.
- Keep `.idea/` out of commits.

## Backend architecture

### Request pipeline (`backend/server.js`)
The middleware runs in this order: CORS, helmet, the general rate limiter on `/api/`, cookie-parser, then JSON parsing. Each router is mounted with `authenticateToken` applied at mount time. Exceptions: `/api/auth`, `/api/branches` (its GET is public because the login flow uses it) and `/api/inventory-transfers` handle auth themselves. Socket.IO lives in the same file. Routes reach it with `req.app.get('io')`.

### Schema changes go in the boot patches, not just `schema.sql`
`database/schema.sql` only runs on an empty database (via `migrate.js`), so existing databases never pick up edits to it. Instead, `server.js` runs a list of idempotent `patch(label, sql)` calls on every startup inside `server.listen`. Errors 1050, 1060, 1061 and 1091 (already exists / already dropped) are treated as "already applied". Every later table (ingredients, suppliers, POs, GRNs, expenses, recipes, waste_logs, …) is created this way. To add a column or table, append a patch there.

Production runs **MySQL 8.0** (checked 2026-10-04; older code comments say 5.7). MySQL has no `ADD COLUMN IF NOT EXISTS` in either version, which is why the patches catch the duplicate errors instead. DELETE/UPDATE statements also can't use a subquery on their own target table (error 1093): select the IDs first, then delete by ID, as the branch-isolation cleanup does. `database/schema_v2_erp_extension.sql` (the 20 "Phase 2" ERP modules) is not referenced by any code. It was applied by hand.

### DB helpers (`backend/config/database.js`)
- `query(sql, params)` returns the rows directly, not `[rows, fields]`. It uses `pool.query`, so `IN (?)` with an array works.
- `transaction(cb)` and `transactionWithIsolation(cb, level)` pass `cb` a raw mysql2 connection. Its `connection.query()` returns `[rows, fields]`, so destructure it.
- `findOne` and `findMany` accept Mongo-style operators (`$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$like`, `$in`, and `null` for `IS NULL`). `update` and `remove` support plain equality only.
- Table and column names are interpolated unescaped. Pick fields explicitly; don't spread `req.body` into `insert` or `update`.

### Roles and branch scoping (`backend/middleware/auth.js`)
- The roles are `admin`, `manager`, `waiter` and `kitchen`. Gate routes with `requireRole([...])` / `requireAdmin`.
- `scopeBranch` sets `req.scopedBranchId`:
  - **admin**: the `X-Branch-Id` header, or `null`, meaning all branches.
  - **any other role with a branch**: their `users.branch_id`, and the header is ignored.
  - **non-admin with no branch**: `-1`, so queries fail closed and return nothing.
- Branch-aware routes use `router.use(scopeBranch)` (or apply it per route) and filter on `req.scopedBranchId`. They must handle `null` for admins; `expenses.js` returns 400 "Branch required". Never take a manager's branch from the query string or body.
- Each branch is a standalone café that owns its own menu, tables, reservations, ingredients and suppliers. Per-branch overrides live in `branch_item_prices` and `branch_menu_overrides`.
- Many ERP Phase 2 routers (catering, banquet, marketing, …) are admin-only and not branch-scoped.

### Conventions in route files
- Handlers use inline `try { … } catch (e) { res.status(500).json({ error: e.message }) }`, and errors go out as `{ error: '...' }`. The frontend reads `err.response.data.error`. The global `errorHandler` (which sends `{ success:false, error:{code,message} }`) only sees errors thrown past a handler.
- Audit logging is explicit: call `logManualAudit(userId, action, table, recordId, old, new, req.ip, ua)`. The `logAudit` middleware is imported but never mounted.
- Money settings come from `system_settings` (`vat_percentage`, `service_charge_percentage`, `delivery_fee`). Read them with `??`, not `||`, so a configured `0` survives. Service charge applies to dine-in only.

### Order flow (`backend/routes/orders.js`)
`POST /orders` runs in a SERIALIZABLE transaction. It locks the table (`FOR UPDATE`) and marks it occupied, checks and decrements `food_inventory`, computes totals server-side, and inserts `order_items` plus one `kitchen_queue` row per item.

`resolveOrderBranch` picks the branch:
- Non-admins always book to their own branch.
- Admins use `branch_id` or `X-Branch-Id`. With neither, a dine-in order takes its table's branch.

The table and every item must belong to that branch.

Every path that writes `order_items` prices through `priceItem`: branch override, then promotional price, then list price. That's the same rule as the menu's `effective_price`. The client copy of the rule is `frontend/src/utils/price.js`.

`POST /orders/backdate` records a past sale in one transaction, including stock deduction. The order is flagged `is_backdated` and stores `backdate_reason` and `backdated_by`. `created_at` holds the sale time (which reports key on); `backdate_entered_at` holds when it was typed in. `waiter_id` is whoever served. Managers are limited by the `backdate_manager_max_days` setting. It retries up to 3 times on an `order_number` collision. The order status enum is `pending, preparing, ready, done, cancelled, hold`. When an order is billed (`POST /:id/bill`) or fully paid (`POST /:id/payments`), `deductRecipeStock` runs in the background without blocking the response. It writes BOM deductions to `ingredients` and `stock_ledger`.

### Sockets
The server assigns rooms on connect with `roomsFor(user)` from `backend/utils/socketRooms.js`. The client can't choose them.
- `kitchen:<branchId>`: admin, manager, waiter and kitchen staff.
- `floor:<branchId>`: admin, manager and waiter.
- Admins join `kitchen:all` and `floor:all` instead of a single branch. Every socket also joins `all-users`.

To send a branch's event, use `io.to(branchRooms('kitchen', order.branch_id))`. Most other events still use `io.emit`, which broadcasts to every branch.

## Frontend architecture

- **Routing:** `frontend/src/App.js` lazy-loads every page and wraps each route in `<ProtectedRoute requiredRole={...}><Layout>…`. Sidebar entries and their `roles` arrays live separately in `components/Layout/Sidebar.js`. A new page needs both, and its role gates should match the backend's `requireRole`.
- **API calls:** use `const { api } = useAuth()` (from `contexts/AuthContext.js`). That axios instance attaches the Bearer token and the `X-Branch-Id` of the selected branch (stored in localStorage as `selectedBranch`). It also queues concurrent 401s behind a single `/auth/refresh`, because refresh tokens rotate. Some pages wrap calls in React Query; others call `api` directly in effects.
- **Styling:** Tailwind. The theme tokens are named `dark-*` but describe a **light** sky-blue/lemon palette (`tailwind.config.js`). The README's "dark theme with orange accents" is out of date.
- **Sunmi terminals:** screens are **360px wide**. Layouts must fit without horizontal scroll (see the comments in `index.css`, `Orders.js`, `Kitchen.js`, `Dashboard.js`).
- **Printing:** `utils/receipt.js` has one data layer, `buildReceiptData`, and two renderers. On a Sunmi device it prints natively through `window.Capacitor.Plugins.SunmiPrinter` (58mm roll, 32 characters per line). In a browser it opens a print popup. `utils/menuPrint.js` prints the A4 menu book.
- **WebView limits:** inside the Android WebView, `window.open` and `<a download>` don't work, so file exports are desktop-only.

## Docs in the repo

- `devplan.md` is the **current** working plan (consolidating the expenses module: P&L in `branches.js` still reads the legacy `branch_expenses` table instead of `expenses`).
- `ERP-ARCHITECTURE.md` is an aspirational design that even names PostgreSQL. `FEATURES.md` and `QA-GUIDE.md` date from May 2026. Don't treat any of these as a description of the current code.
