# Dev Plan — Consolidate the Expenses Module (retire System B)

**Status:** proposed, not started
**Author:** drafted 2026-08-24
**Goal:** one expense system per branch, and a P&L that actually counts expenses.

---

## 1. Why this is needed

FoodPark currently has **two independent expense systems**. They write to different
tables and neither knows the other exists.

| | **System A** (keep) | **System B** (retire) |
|---|---|---|
| Table | `expenses` | `branch_expenses` |
| API | `/api/expenses` | `/api/branches/expenses` |
| UI | **Expenses** page (sidebar) | `ExpensesPanel` inside Branch Management |
| Who can use it | admin **+ manager** | **admin only** |
| Categories | seeded list of 10, plus any used before | fixed 7-value SQL enum |
| Extra fields | `payment_mode`, `reference`, `notes`, `updated_at` | none |
| Branch scoping | automatic via `scopeBranch` | manual `branch_id` query param |
| **Counted in P&L** | **no** | **yes** |

### The live bug

`GET /branches/pl-report` computes expenses from `branch_expenses`
(`backend/routes/branches.js:403`), but the Expenses page writes to `expenses`.

Consequence: **every expense a manager records is invisible to P&L.** Gross profit
and margin are overstated. Both consumers of that endpoint show the wrong number —
`frontend/src/pages/Branches.js:476` and `frontend/src/pages/Reports.js:1638`.

A branch with ৳450,000 revenue and ৳180,000 of expenses entered through the
Expenses page reports ৳450,000 profit at a 100% margin. A near-100% margin is the
symptom to look for.

### Why System A is the survivor

- Managers can use it; System B is admin-only, so the people who actually know the
  branch's costs cannot enter them.
- `router.use(scopeBranch)` means a non-admin is hard-locked to their own branch and
  fails closed (`scopedBranchId = -1`) if unassigned — a manager cannot see another
  branch's spending.
- It already carries `payment_mode`, `reference` and `notes`, which are needed to
  reconcile spending against bank and cash records.
- Its UI is complete: `frontend/src/pages/Expenses.js`, 308 lines, list + filters +
  summary + create/edit/delete.

---

## 2. Scope

### In scope
- Migrate existing `branch_expenses` rows into `expenses`.
- Repoint the P&L expense query at `expenses`.
- Remove System B's endpoints, UI panel, and boot patch.
- Close the admin-without-a-branch gap (see §5).

### Explicitly out of scope
- Changing the P&L revenue side. It reads `orders` and is correct.
- Changing who may view P&L (currently admin-only) — see §7, open question.
- Any new expense features (recurring expenses, approvals, budgets, attachments).

---

## 3. Every touchpoint

`branch_expenses` appears in exactly six places. There are no others.

| File | Line | What it does | Action |
|---|---|---|---|
| `backend/server.js` | 648–649 | boot patch creating the table | remove after migration verified |
| `backend/routes/branches.js` | 331 | `GET /branches/expenses` list | delete route |
| `backend/routes/branches.js` | 351 | `POST /branches/expenses` insert | delete route |
| `backend/routes/branches.js` | 362 | `DELETE /branches/expenses/:id` | delete route |
| `backend/routes/branches.js` | 405 | **P&L expense subtotal** | **repoint to `expenses`** |
| `frontend/src/pages/Branches.js` | 353–465 | `ExpensesPanel` component (~113 lines) | delete component + its toggle button (line 82–84) and render site (line 230) |

---

## 4. Migration

### 4.1 Category mapping

System B stores a lowercase enum; System A uses a Title-Case seeded list
(`backend/routes/expenses.js:9`). Map on the way across:

| `branch_expenses` | → `expenses` |
|---|---|
| `rent` | `Rent` |
| `utilities` | `Utilities` |
| `salaries` | `Salary` |
| `supplies` | `Supplies` |
| `maintenance` | `Maintenance` |
| `marketing` | `Marketing` |
| `other` | `Other` |

Unmapped values fall back to `Other` rather than being dropped.

### 4.2 Field mapping

| `expenses` column | source | notes |
|---|---|---|
| `branch_id`, `amount`, `description`, `expense_date`, `created_by` | direct copy | |
| `category` | mapped per §4.1 | |
| `payment_mode` | `'cash'` | System B has no equivalent; cash is the safe default |
| `reference`, `notes` | `NULL` | |
| `description` | `COALESCE(be.description, 'Migrated expense')` | System B allows NULL, System A requires NOT NULL |

### 4.3 Ordering and safety

1. **Dry run first.** Count rows per branch and total amount. Report before writing.
2. **Idempotency.** Migration must be safe to re-run. Tag migrated rows (e.g. a
   `reference` value of `MIGRATED-B-<id>`) and skip any already present.
3. **Back up before writing.** `mysqldump` of `branch_expenses` and `expenses`.
4. Migrate, then re-count both tables and confirm the totals match.
5. **Only then** repoint P&L and delete System B.

Do not delete `branch_expenses` in the same step as the migration. Leave the table
in place for at least one reporting cycle so the old numbers can be checked.

---

## 5. Known gap this creates

System B lets an admin post an expense to **any** branch via a `branch_id` parameter.
System A derives the branch from `scopeBranch`, and for an admin that comes from the
`X-Branch-Id` header. With no branch selected, `scopedBranchId` is `null` and both
`GET /expenses` and `POST /expenses` return **`400 Branch required`**
(`backend/routes/expenses.js:28` and `:87`).

So after retiring System B, an admin must select a branch before recording or viewing
expenses. Two options:

- **(a) Accept it.** Admins already use a branch selector; this is consistent with the
  rest of the app. No code change.
- **(b) Allow an explicit `branch_id` override for admins** on `/api/expenses`, so an
  admin can record for any branch without switching context. Small change, keeps
  parity with what System B could do.

**Recommendation: (b)** — it preserves an ability that exists today, and losing it
would be a regression rather than a simplification.

---

## 6. Steps

1. **Inspect production.** Row counts and totals in both tables, per branch. Read-only.
   This decides whether the migration is trivial or needs care.
2. **Back up** both tables.
3. **Write the migration** as a script with a `--dry-run` default, printing per-branch
   counts and totals. Run dry, review, then run for real.
4. **Repoint P&L** — `branches.js:403`, `FROM branch_expenses` → `FROM expenses`.
   Same columns, so it is a one-word change.
5. **Verify P&L** against a known branch and date range: the new figure should equal
   old `branch_expenses` total + existing `expenses` total.
6. **Admin branch override** per §5(b).
7. **Remove System B**: three routes in `branches.js`, `ExpensesPanel` and its toggle
   in `Branches.js`.
8. **Drop the boot patch** in `server.js:648`. Leave the table itself until a
   reporting cycle has passed, then drop separately.

Steps 1–5 deliver the whole benefit. 6–8 are cleanup and can follow later.

---

## 7. Open questions

1. **Is there real data in both tables on production?** Determines whether this is a
   merge or a straight cutover. Needs a read-only count first.
2. **Should managers see P&L?** It is admin-only today. A manager who can record
   expenses arguably ought to see their own branch's profit — but not other branches'.
   Out of scope unless decided otherwise.
3. **"Gross profit" is mislabelled.** The report subtracts operating expenses from
   revenue, which is nearer *net* profit; gross profit conventionally means revenue
   minus cost of goods sold. Worth renaming while touching this code, since the figure
   may be shown to an accountant.

---

## 8. Risk

**P&L numbers will drop when this lands.** That is the fix working — expenses that
were being ignored start counting. Anyone reading those reports should be told before
it deploys, or a sudden fall in reported profit will look like a new bug.

**Financial records are involved.** Every write step needs a backup first and a dry run
before it.
