# 🍽️ FoodPark — Full Feature List

> **Stack:** Node.js / Express · MySQL · React 18 · Socket.IO · Tailwind CSS  
> **Last updated:** May 2026 — v2.0 (12-module ERP edition)

---

## 1. Core Order Management
- ✅ Three order types: Dine-in, Delivery, Takeaway
- ✅ Order lifecycle: `pending → preparing → ready → done` (or `cancelled`)
- ✅ Add / remove items mid-order with automatic total recalculation
- ✅ Enforced status-machine transitions (no skipping states)
- ✅ Auto-generated order numbers `ORDYYMMDD####` with collision-retry
- ✅ Full modifications history — audit trail of every change
- ✅ Per-order and per-item special instructions

## 2. Billing & Payments
- ✅ Bill print locks the order against further edits
- ✅ Admin bill-unlock to correct fat-finger mistakes
- ✅ Payment methods: Cash, Card, bKash, Nagad
- ✅ Last-4 digits stored for card / wallet transactions
- ✅ Order auto-completes on full payment
- ✅ Per-order discount application at bill time
- ✅ Paginated receipt history (admin)
- ✅ Payment-method breakdown reports

## 3. Pricing & Totals
- ✅ Per-item VAT rates (default 5 %)
- ✅ 10 % service charge on dine-in only
- ✅ Configurable delivery fee per order
- ✅ Promotional / override pricing per menu item
- ✅ All totals recalculated live on every cart change

## 4. Kitchen Display System (KDS)
- ✅ Real-time order queue for kitchen staff
- ✅ Item-level status: `queued → preparing → ready → cancelled`
- ✅ Priority flags: Normal / High / Urgent
- ✅ Elapsed-time display per item
- ✅ Orders grouped with table / customer context
- ✅ 30-second auto-refresh polling
- ✅ Filter by status (queued / preparing / ready)

## 5. Table Management
- ✅ Visual grid organised by 7 sections (Big House, Small House, AC Chad, AC Room, RB Garden, Garden, Lake Side)
- ✅ Status: `available → occupied → reserved`
- ✅ Capacity 1–20 seats, colour-coded availability
- ✅ Today's occupancy stats widget
- ✅ Admin CRUD — create / edit / delete tables

## 6. Reservations
- ✅ Bookings with date, time, party size, special requests
- ✅ Time-window enforcement: 10:00–23:00
- ✅ Status: `pending → confirmed → completed / cancelled`
- ✅ Link reservations to pre-orders (`pre_order_id`)
- ✅ Today's reservations dashboard widget
- ✅ No-show tracking via status history

## 7. Delivery Management
- ✅ Customer address, phone, advance / due amounts
- ✅ Proper TIME columns for order time and target delivery time
- ✅ Pipeline: `pending → assigned → picked_up → delivered`
- ✅ Advance payment tracking (partial or full)
- ✅ Delivery reports: revenue, completion rate, efficiency

## 8. Menu Management
- ✅ Category CRUD with display-order control
- ✅ Food items: name, description, price, promo price, VAT rate, prep time
- ✅ Availability toggle per item
- ✅ Category badges / icons
- ✅ Full admin CRUD

## 9. User & Role Management
- ✅ Three roles: Admin, Waiter, Kitchen
- ✅ Role-based route guards + feature visibility
- ✅ Activate / deactivate users
- ✅ bcrypt password hashing, 6-char minimum
- ✅ Search by username, email, phone
- ✅ Self-service profile edits

## 10. Dashboard
- ✅ Live KPIs: today's revenue, order count, active tables, kitchen queue length
- ✅ Trend indicators (% vs yesterday)
- ✅ Order status distribution chart
- ✅ Order type distribution (dine-in / delivery / takeaway)
- ✅ Recent orders list
- ✅ Kitchen workload widget
- ✅ Table occupancy widget
- ✅ Top-selling items & categories (7-day rolling)
- ✅ Drill-down from any stat to underlying orders

## 11. Reports & Analytics
- ✅ Sales reports: daily / weekly / monthly revenue
- ✅ Menu performance: items & categories by quantity sold
- ✅ Staff performance: orders per waiter, completion times
- ✅ Delivery analytics: completion rate, efficiency, revenue
- ✅ Cancellation reports: reasons, frequency, financial impact
- ✅ Custom date-range filtering
- ✅ Summary totals: revenue, VAT, service charge, discounts

## 12. System Settings
- ✅ Key-value config: restaurant name, address, phone, currency
- ✅ Pricing knobs: VAT %, service charge %, delivery fee
- ✅ Type validation: number / boolean / string / JSON
- ✅ Editable toggle to lock individual settings
- ✅ Admin-only access protection
- ✅ Settings grouped by category

## 13. Security & Audit
- ✅ JWT access tokens (15 min) + refresh tokens (7 days)
- ✅ Role-based authorization on every API route
- ✅ bcrypt password hashing
- ✅ Token blacklist with `INSERT IGNORE` (no crash on duplicate JTI)
- ✅ Session table — revoke all sessions on logout
- ✅ Audit log: user, action, old value, new value, IP, timestamp
- ✅ CORS: localhost-only in dev, env-configured in prod
- ✅ Rate limiting middleware (memory store in dev)
- ✅ Order locking — bill-printed orders block modifications

## 14. Real-Time (Socket.IO)
- ✅ Live notifications: new orders, status changes, table updates
- ✅ Kitchen item status changes broadcast instantly
- ✅ Room-based broadcasting (roles / tables / orders)
- ✅ Exponential back-off reconnect (max 5 attempts)
- ✅ Connection status indicator in the UI

## 15. Frontend UX
- ✅ Responsive layout: mobile / tablet / desktop (Tailwind CSS)
- ✅ Lazy-loaded page chunks (React.lazy + Suspense)
- ✅ React Query: 5-min stale / 10-min cache
- ✅ Client-side + server-side form validation
- ✅ Error boundaries with graceful fallback UI
- ✅ Loading spinners and skeleton screens
- ✅ Toast notifications (success / error / info)
- ✅ Modal dialogs for order creation, payment, edits
- ✅ Sortable, filterable, paginated data tables
- ✅ Recharts: sales bar charts, pie charts, performance bars
- ✅ URL-based tab routing on all ERP module pages (deep-linkable)

---

## 16. ERP — Inventory Management (`/inventory`)
- ✅ Inventory dashboard: stock value, low-stock count, expiry alerts
- ✅ Ingredient master: CRUD with unit, category, reorder point
- ✅ Recipe / BOM builder: link menu items to raw ingredients with quantities
- ✅ Stock ledger: every movement logged with reason and user
- ✅ Physical count sessions: draft → in-progress → completed with variance report
- ✅ Waste & expiry tracking: batch-level expiry dates, waste reasons
- ✅ Reorder alerts: automatic flag when stock drops below threshold

## 17. ERP — Purchase Orders (`/purchase`)
- ✅ Full PO lifecycle: draft → submitted → approved → received → invoiced
- ✅ Goods receiving notes (GRN) linked to POs
- ✅ **3-Way Match**: PO qty / price vs GRN qty vs supplier invoice — flags qty-variance and price-variance
- ✅ Supplier invoice management against GRNs
- ✅ Purchase returns with reason tracking
- ✅ **Landed Cost allocation**: freight + customs + handling spread across GRN lines by weight / value / qty

## 18. ERP — Supplier Management (`/suppliers`)
- ✅ Supplier directory with contact, payment terms, lead time
- ✅ Accounts-payable ledger per supplier
- ✅ Payables aging buckets: current / 30 / 60 / 90+ days
- ✅ Delivery performance scorecard (on-time %, quality score)
- ✅ **ABC Segmentation**: classify suppliers by annual spend — strategic (A), preferred (B), routine (C)

## 19. ERP — CRM & Loyalty (`/crm`)
- ✅ Customer directory with order history and contact info
- ✅ Loyalty tier engine: Bronze / Silver / Gold / Platinum thresholds
- ✅ Points earn / redeem rules per tier
- ✅ Coupon & promo code management with usage tracking
- ✅ RFM segmentation: Champions, Loyal, At-Risk, Lost, New
- ✅ **CLV & Cohort analysis**: avg lifetime value, purchase frequency, cohort retention heatmap (month-on-month)
- ✅ Customer feedback collection and manager-alert on low scores

## 20. ERP — Expense Management (`/expenses`)
- ✅ Expense entry with category, vendor, amount, receipt upload flag
- ✅ Approval queue: submit → pending → approved / rejected
- ✅ Recurring expense scheduler (weekly / monthly / annual)
- ✅ Budget vs actual comparison by category and period

## 21. ERP — Accounting (`/accounting`)
- ✅ Double-entry journal entries with debit / credit validation
- ✅ Chart of accounts with type (asset / liability / equity / income / expense)
- ✅ Bank reconciliation: match bank statement lines to journal entries
- ✅ VAT summary report: output, input, net payable
- ✅ P&L report: revenue, COGS, gross profit, net profit
- ✅ **Period close checklist**: 8-step month-end checklist (reconcile, post adjustments, lock period, generate reports)

## 22. ERP — HR & Payroll (`/hr`)
- ✅ Shift scheduling: weekly shift grid per employee
- ✅ Attendance log: clock-in / clock-out with late / absent flags
- ✅ Overtime calculation: 1.5× rate for hours over 8/day
- ✅ Payroll run: gross pay, deductions, net pay per employee
- ✅ **Tips & commissions**: rider delivery commission, FOH tip-pool split, performance bonuses
- ✅ Payslip generation per employee (PDF-ready)

## 23. ERP — QR Ordering (`/qr-ordering`)
- ✅ QR code generation per table with download
- ✅ Active session monitor: table, items ordered, session duration
- ✅ **Cart & payment view**: live cart totals, VAT breakdown, payment method, awaiting-checkout queue
- ✅ **Order status & feedback**: real-time order stage (preparing / ready / served), star-rating collection per order
- ✅ Self-ordering analytics: sessions, orders, revenue by day

## 24. ERP — Fleet & Delivery (`/fleet`)
- ✅ Rider directory: contact, zone, vehicle, commission rate
- ✅ Delivery zone management with radius and fee override
- ✅ Assignment board: match open delivery orders to available riders
- ✅ **Live tracking dashboard**: active riders grid with status badges and ETA table
- ✅ Commission reports: deliveries, base pay, bonuses per rider

## 25. ERP — Advanced Reservations (`/advanced-reservations`)
- ✅ Interactive floor-map view: drag-and-drop table assignment
- ✅ Booking engine: availability check, party-size matching, confirmation flow
- ✅ Deposit management: collect and track pre-paid deposits
- ✅ Waitlist queue with auto-notify on table availability
- ✅ Reservation analytics: covers, no-show rate, peak-time heatmap

## 26. ERP — Branch Management (`/branches`)
- ✅ Multi-branch overview: revenue, orders, occupancy per branch
- ✅ Branch setup: name, address, timezone, working hours
- ✅ Inter-branch stock transfers with approval workflow
- ✅ **Data isolation controls**: role-scoping table, per-branch API access rules, Socket.IO room isolation status
- ✅ Comparative report: side-by-side KPIs across all branches

## 27. ERP — Business Intelligence (`/bi`)
- ✅ Peak-hours heatmap: covers × hour-of-day × day-of-week
- ✅ Menu engineering matrix: Stars / Plowhorses / Puzzles / Dogs (margin vs popularity)
- ✅ Customer cohort retention matrix
- ✅ Demand forecast: 7-day and 30-day revenue projections
- ✅ Profitability breakdown: revenue, COGS, labour, overhead, net margin per branch

---

## Developer Experience
- ✅ `.env.example` with all required variables documented
- ✅ `database/schema.sql` — complete DDL for all tables
- ✅ `backend/scripts/migrate.js` and `seed.js` for one-command setup
- ✅ Structured API error responses with machine-readable `code` fields
- ✅ DB helper supports operator objects (`$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$like`)
- ✅ `INSERT IGNORE` helper for idempotent upsert-style inserts
- ✅ QA Guide page (`/qa-guide`) — 80+ linked test suites with direct deep-link navigation to each ERP sub-section
- ✅ ERP Architecture doc (`ERP-ARCHITECTURE.md`) — 3 000-line design reference

---

## Known Gaps / Roadmap
| # | Item | Priority |
|---|------|----------|
| 1 | Real backend API for all 12 ERP modules (currently mock data) | High |
| 2 | Unit + integration test suite (Jest / Supertest) | High |
| 3 | Advance payment enforcement on delivery orders | Medium |
| 4 | Per-item VAT alignment between orders and reports | Medium |
| 5 | Form-state preservation across navigation | Low |
| 6 | Settings numeric-type server validation | Low |
| 7 | Mobile PWA / push notifications | Low |


---

## **Tech Stack**
- **Backend**: Node.js + Express
- **Frontend**: React 18 + Tailwind CSS
- **Database**: MySQL 5.7+
- **Real-time**: Socket.IO
- **Caching**: react-query
- **Routing**: react-router-dom v6
- **Charts**: Recharts
- **Authentication**: JWT with httpOnly cookies

---

## **Quick Start**

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure DB credentials
node server.js        # Runs on port 5000
```

### Frontend
```bash
cd frontend
npm install
npm start             # Dev server on port 3000
# or
npm run build && npx serve -s build -l 4002  # Production
```

### Database
```bash
mysql -u root -p foodpark < database/schema.sql
```

---

**Last Updated**: May 4, 2026  
**Version**: 1.0 (All 7 Critical + 12 Medium + 9 Low priority fixes deployed)
