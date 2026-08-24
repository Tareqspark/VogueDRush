# Dev Plan — Expense Module

**Status:** Phase 0 done · Phase 1 ready to start
**Updated:** 2026-08-24
**Goal:** one expense system per branch, counted correctly in P&L, trustworthy enough
to run a branch from.

---

## 0. What is already true

Verified against production on 2026-08-24, not assumed.

### Both expense tables are empty

```
branch_expenses    0 rows    0.00
expenses           0 rows    0.00
orders_all         0 rows    0.00
```

**This removes the migration entirely.** The earlier draft of this plan was built
around moving live financial records — dry runs, category mapping, idempotency tags,
backups, keeping the old table for a reporting cycle. None of that is needed. There is
nothing to move and nothing to lose.

### System A already does most of the job

`expenses` table · `/api/expenses` · `frontend/src/pages/Expenses.js` (308 lines)

Already working:

- Full CRUD — create, edit, delete, list
- Fields: date, amount, category, description, `payment_mode`, `reference`, `notes`
- Category input is a datalist: 10 seeded values plus every category used before
  (`backend/routes/expenses.js:9`, `:12`)
- Filters by date range and category
- `GET /summary` — totals per category plus a grand total
- `router.use(scopeBranch)` — non-admins are hard-locked to their own branch and
  **fail closed** (`scopedBranchId = -1`) when unassigned
- Writes restricted to admin + manager

### Manager P&L access — shipped

Commit `e7f571c`. `/branches/pl-report` now accepts admin or manager; a manager's
branch comes from `req.user.branch_id`, never the query string, so another `branch_id`
cannot widen what they see. Branch pickers are hidden for non-admins in both P&L views.

### System B still exists and still owns P&L

`branch_expenses` · `/api/branches/expenses` · `ExpensesPanel` in `Branches.js`

Admin-only, fixed 7-value enum, no payment mode or reference. **P&L reads this table**
(`backend/routes/branches.js:403`), which is why expenses recorded in the Expenses page
do not appear in profit figures.

---

## Phase 1 — Make it correct

The whole point. Small, and now risk-free because both tables are empty.

### 1.1 Repoint P&L at `expenses`

`backend/routes/branches.js:403` — `FROM branch_expenses` → `FROM expenses`.
Both tables expose `branch_id`, `category`, `amount`, `expense_date`, so the surrounding
query is unchanged.

**Acceptance:** record an expense in the Expenses page, open P&L for that branch and
date range, see it in `total_expenses` and in `expenses_by_category`.

### 1.2 Let admins record for a chosen branch

`scopeBranch` gives admins `scopedBranchId = null` unless an `X-Branch-Id` header is
set, and both `GET /expenses` (`:28`) and `POST /expenses` (`:87`) then return
**400 Branch required**. System B let an admin post to any branch via a parameter;
losing that is a regression.

Accept an optional `branch_id` in body/query **for admins only**, falling back to
`scopedBranchId`. Non-admins keep ignoring it entirely.

**Acceptance:** an admin with no branch selected can list and create expenses by naming
a branch; a manager passing `branch_id` for another branch still only touches their own.

### 1.3 Retire System B

| File | Lines | Action |
|---|---|---|
| `backend/routes/branches.js` | 331, 351, 362 | delete the three `/expenses` routes |
| `frontend/src/pages/Branches.js` | 353–465 | delete `ExpensesPanel` |
| `frontend/src/pages/Branches.js` | 82–84, 230 | delete its toggle button and render site |
| `backend/server.js` | 648–649 | delete the `branch_expenses` boot patch |

Drop the `branch_expenses` table in a separate follow-up, not in this change.

**Acceptance:** no reference to `branch_expenses` remains outside the dropped patch;
Branch Management shows P&L and Transfers only.

---

## Phase 2 — Make it trustworthy

Worth doing before real money is recorded, not after.

### 2.1 Category discipline

Free text invites `Utilities` / `utility` / `Electric Bill` as three separate categories,
which quietly ruins category reporting — the exact thing an expense module exists for.
System B's enum prevented this but was too rigid.

Middle ground: keep the seeded list as the primary picker, allow a new category only
through an explicit "add category" action, and normalise on save (trim, title-case).

**Acceptance:** typing `utilities` and `Utilities` produces one category, not two.

### 2.2 Audit fields

`expenses` records `created_by` but not who last edited or deleted. For a table that
represents money leaving the business, an edit with no author is a gap.

Add `updated_by`, and log deletes through the existing `logManualAudit` helper.

### 2.3 Server-side validation

`POST /expenses` checks presence and `amount > 0` only. Add: no future `expense_date`
beyond today, a sane upper bound on amount, and a description length limit.

---

## Phase 3 — Make it useful

Only after Phases 1–2. Each is independently valuable; none is required for correctness.

- **Recurring expenses.** Rent, salaries and utilities repeat monthly. Entering them by
  hand every month guarantees they will eventually be missed — and a missed expense
  silently overstates profit. Highest-value item in this phase.
- **CSV export.** Accountants want the raw rows. Note the WebView caveat: `<a download>`
  does nothing inside the Android shell, so this is a desktop-only affordance.
- **Budget vs actual.** A monthly budget per category, shown against actual on the
  Expenses page and in P&L.
- **Receipt attachments.** Needs file storage; heaviest item and the least urgent.

---

## Sequencing and effort

| Phase | Work | Risk |
|---|---|---|
| 1.1 Repoint P&L | one word | none — both tables empty |
| 1.2 Admin branch override | one endpoint, both handlers | low |
| 1.3 Retire System B | delete ~120 lines across 3 files | low |
| 2.1 Category discipline | UI + normalise on save | low |
| 2.2 Audit fields | one column + audit calls | low, needs a boot patch |
| 2.3 Validation | a few checks | none |
| 3.x | each independent | medium |

**Phase 1 is one sitting** and delivers the entire correctness benefit. Do it as a
single commit so P&L and the expense source change together.

---

## Risks

**Low, and this is unusual — take advantage of it.** Both expense tables and the orders
table are empty, so Phase 1 cannot corrupt or lose anything. The same change against a
populated database would need backups, a dry run, and a reporting cycle of overlap.
Doing it now costs almost nothing.

**P&L will show zeros until trading resumes.** Revenue comes from `orders`, which is
also empty. Zero profit after Phase 1 is correct, not a bug.

**One naming issue to fix while here.** The report calls its result `gross_profit`, but
it subtracts operating expenses from revenue — closer to *net* or operating profit.
Gross profit conventionally means revenue minus cost of goods sold. Worth renaming
before the figure is shown to an accountant.

---

## Open question

**Should managers see P&L for expenses only, or full revenue too?** Currently they see
the whole report for their branch — revenue, expenses, profit, margin. That matches
"a manager runs the branch like its owner". Flagged only so it is a deliberate choice
rather than an accident.
