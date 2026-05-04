import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CpuChipIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  QrCodeIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleStackIcon,
  ServerStackIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// ─── Module definitions ────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'inventory',
    letter: 'A',
    icon: CpuChipIcon,
    color: 'sky',
    title: 'Inventory Management',
    tagline: 'Ingredient master · Recipe BOM · FIFO/WAC valuation · Waste · Expiry · Reorder automation',
    tables: [
      'ingredients', 'ingredient_categories', 'warehouse_locations',
      'stock_ledgers', 'stock_transactions', 'recipes', 'recipe_details',
      'recipe_sub_recipes', 'waste_entries', 'stock_adjustments',
      'stock_adjustment_lines', 'stock_transfers', 'stock_transfer_lines',
      'expiry_tracking',
    ],
    apiGroups: [
      { group: 'Ingredient Master', endpoints: ['GET /ingredients', 'POST /ingredients', 'PUT /ingredients/:id', 'DELETE /ingredients/:id'] },
      { group: 'Stock Ledger', endpoints: ['GET /stock/current', 'GET /stock/ledger', 'POST /stock/physical-count', 'POST /stock/finalize-count'] },
      { group: 'Recipe / BOM', endpoints: ['GET /recipes', 'POST /recipes', 'PUT /recipes/:id', 'GET /recipes/:id/cost', 'POST /recipes/:id/clone'] },
      { group: 'Adjustments & Waste', endpoints: ['POST /adjustments', 'POST /adjustments/:id/approve', 'POST /waste', 'POST /waste/:id/approve'] },
      { group: 'Transfers & Expiry', endpoints: ['POST /transfers', 'PATCH /transfers/:id/status', 'GET /expiry/near-expiry', 'GET /alerts/low-stock'] },
    ],
    logic: [
      'Order close → BOM recipe lookup → SERIALIZABLE transaction stock deduction',
      'FIFO batch deduction: oldest expiry consumed first, cost tracked per batch',
      'WAC cost = total_inventory_value ÷ total_qty, updated on every purchase receipt',
      'Reorder trigger: quantity_on_hand ≤ reorder_point → auto-draft PO for supplier',
      'Waste approval workflow: pending → admin review → COGS posting → stock deduction',
      'Circular sub-recipe reference (A→B→A) detected and blocked on save',
    ],
    integrations: [
      { module: 'Orders', detail: 'BOM deduction on order close; reservation on pending' },
      { module: 'Purchase', detail: 'GRN receipt adds stock with batch + expiry' },
      { module: 'Accounting', detail: 'COGS Dr / Inventory Cr journal on deduction' },
      { module: 'Multi-Branch', detail: 'Stock transfer workflow between branch warehouses' },
    ],
    kpis: ['Stock Turnover Ratio', 'Days Inventory Outstanding (DIO)', 'Waste % of COGS', 'Recipe Cost vs Selling Price Margin'],
    scale: 'stock_transactions partitioned monthly; Redis cache for ingredient master; batch inserts for mass deductions',
  },
  {
    id: 'purchase',
    letter: 'B',
    icon: BuildingStorefrontIcon,
    color: 'violet',
    title: 'Purchase Management',
    tagline: 'PO lifecycle · Goods receiving · 3-way match · Invoice tracking · Purchase returns · Landed cost',
    tables: [
      'purchase_orders', 'purchase_order_lines', 'goods_receiving_notes',
      'goods_receiving_lines', 'purchase_invoices', 'three_way_match',
      'purchase_returns', 'purchase_return_lines',
    ],
    apiGroups: [
      { group: 'Purchase Orders', endpoints: ['POST /po', 'GET /po', 'GET /po/:id', 'POST /po/:id/confirm', 'POST /po/:id/cancel', 'POST /po/auto-create'] },
      { group: 'Goods Receiving', endpoints: ['POST /grn', 'GET /grn/:id', 'POST /grn/:id/complete', 'POST /grn/:id/lines'] },
      { group: 'Invoice & Match', endpoints: ['POST /invoice', 'GET /invoice', 'PATCH /invoice/:id/status', 'POST /match', 'POST /match/:id/resolve'] },
      { group: 'Returns', endpoints: ['POST /return', 'GET /return/:id', 'POST /return/:id/approve', 'POST /return/:id/reject'] },
    ],
    logic: [
      'Auto-create PO: low-stock alert groups items by preferred supplier → draft PO',
      'PO confirmation locks edits and generates sequential PO-YYYY-XXXXX number',
      'GRN over-delivery (received > ordered) flagged as variance, requires approval',
      'Three-way match: PO qty = GRN qty = Invoice qty + price within 2% tolerance',
      'Perfect match → auto-approve; variance > threshold → hold for dispute workflow',
      'Purchase return reverses stock ledger and creates debit note on supplier ledger',
    ],
    integrations: [
      { module: 'Inventory', detail: 'GRN receipt adds stock with batch/expiry tracking' },
      { module: 'Supplier', detail: 'PO links to supplier; invoice updates ledger balance' },
      { module: 'Accounting', detail: 'AP journal on invoice approval; Dr Inventory Cr AP' },
      { module: 'Reports', detail: 'Spend analytics, aging, supplier performance feeds' },
    ],
    kpis: ['PO Fulfilment Rate', 'Invoice Match Rate', 'Purchase Return Rate', 'Supplier On-Time Delivery %'],
    scale: 'purchase_orders indexed by (supplier_id, po_date); background job for auto-PO generation; async PDF generation',
  },
  {
    id: 'supplier',
    letter: 'C',
    icon: TruckIcon,
    color: 'amber',
    title: 'Supplier Management',
    tagline: 'Supplier CRM · Ledger · AP aging · Performance scoring · ABC segmentation',
    tables: [
      'suppliers', 'supplier_contacts', 'supplier_bank_accounts',
      'supplier_documents', 'supplier_ledger_entries', 'supplier_payments',
      'supplier_performance_scores',
    ],
    apiGroups: [
      { group: 'Supplier Master', endpoints: ['GET /suppliers', 'POST /suppliers', 'PUT /suppliers/:id', 'POST /suppliers/:id/blacklist'] },
      { group: 'Ledger & Payments', endpoints: ['GET /suppliers/:id/ledger', 'POST /suppliers/:id/payment', 'GET /suppliers/payables'] },
      { group: 'Performance', endpoints: ['GET /suppliers/:id/performance', 'GET /suppliers/segments', 'GET /suppliers/abc'] },
    ],
    logic: [
      'Running balance = SUM(invoices) - SUM(payments) + SUM(debit notes)',
      'AP aging buckets: current, 1-30, 31-60, 61-90, 90+ days overdue',
      'Performance score = weighted(on-time delivery, quality, price compliance)',
      'ABC: A = top 20% suppliers by spend (80% of total); B = next 30% (15%); C = rest',
      'Auto-reclassification runs monthly; blocked supplier prevents new PO creation',
      'Early-payment discount applies net amount for eligible NET-2/10 terms',
    ],
    integrations: [
      { module: 'Purchase', detail: 'All POs and invoices update supplier ledger' },
      { module: 'Accounting', detail: 'AP payable balance syncs to general ledger' },
      { module: 'Inventory', detail: 'Preferred supplier assignment on ingredients' },
      { module: 'Reports', detail: 'Spend analytics, ABC classification, aging reports' },
    ],
    kpis: ['Average On-Time Delivery Score', 'Total AP Outstanding', 'Return Rate by Supplier', 'Top-10 Suppliers by Spend'],
    scale: 'Supplier ledger indexed by (supplier_id, created_at DESC); aging computed in SQL with date arithmetic',
  },
  {
    id: 'crm',
    letter: 'D',
    icon: UserGroupIcon,
    color: 'rose',
    title: 'Customer CRM & Loyalty',
    tagline: 'Customer profiles · Loyalty points · Tier engine · Coupon engine · RFM · CLV · Cohort · Feedback',
    tables: [
      'customers', 'loyalty_accounts', 'loyalty_transactions', 'loyalty_tiers',
      'customer_tier_memberships', 'coupons', 'coupon_usages',
      'customer_rfm_scores', 'customer_feedback',
    ],
    apiGroups: [
      { group: 'Customer Master', endpoints: ['GET /customers', 'POST /customers', 'PUT /customers/:id', 'POST /customers/merge'] },
      { group: 'Loyalty & Tiers', endpoints: ['GET /loyalty/:customer_id', 'POST /loyalty/earn', 'POST /loyalty/redeem', 'GET /tiers'] },
      { group: 'Coupons', endpoints: ['POST /coupons', 'GET /coupons', 'POST /coupons/validate', 'GET /coupons/:id/usage'] },
      { group: 'Analytics', endpoints: ['GET /rfm', 'GET /clv', 'GET /cohorts', 'GET /feedback', 'POST /feedback/:id/reply'] },
    ],
    logic: [
      'Point earn = floor(order_total × earn_rate / 100); excludes delivery fee + tax',
      'Tier upgrade triggers when cumulative spend crosses threshold; downgrade at review period',
      'Tier multiplier (Gold = 2×) applied at point-earn calculation on order close',
      'Coupon validation: type, expiry, usage limit, min order, category restriction, stackability',
      'RFM scoring: quintile 1-5 per dimension from order history; composite = R+F+M',
      'CLV = AOV × Purchase Frequency × Avg Customer Lifespan (rolling 12 months)',
    ],
    integrations: [
      { module: 'Orders', detail: 'Point earn on close; coupon deduction from bill total' },
      { module: 'QR Ordering', detail: 'Customer identified by phone at QR checkout' },
      { module: 'Reports', detail: 'RFM, CLV, cohort, feedback dashboards' },
      { module: 'Accounting', detail: 'Loyalty redemption reduces revenue; coupon as discount line' },
    ],
    kpis: ['Active Loyalty Members', 'Average CLV', 'Redemption Rate %', 'Customer Retention Rate', 'NPS from Feedback'],
    scale: 'RFM batch-computed nightly; cohort matrix cached in Redis; customer search on (phone, email) B-tree index',
  },
  {
    id: 'expense',
    letter: 'E',
    icon: CurrencyDollarIcon,
    color: 'orange',
    title: 'Expense Management',
    tagline: 'Operational expenses · Category hierarchy · Approval workflow · Recurring · Budget vs actual',
    tables: [
      'expense_categories', 'expenses', 'expense_line_items',
      'expense_approvals', 'recurring_expense_templates', 'expense_budgets',
    ],
    apiGroups: [
      { group: 'Expense Entry', endpoints: ['POST /expenses', 'GET /expenses', 'PUT /expenses/:id', 'POST /expenses/:id/submit'] },
      { group: 'Approval', endpoints: ['POST /expenses/:id/approve', 'POST /expenses/:id/reject', 'POST /expenses/bulk-approve'] },
      { group: 'Recurring & Budget', endpoints: ['POST /recurring', 'GET /recurring', 'PATCH /recurring/:id/pause', 'GET /budgets', 'PUT /budgets/:id'] },
    ],
    logic: [
      'Approval threshold: expenses below configured amount auto-approve on submit',
      'Escalation: unapproved expenses after N days escalate to senior manager',
      'Recurring engine generates draft expenses on due_date via scheduled job',
      'Budget alert fires when category spend reaches 80% then 100% of monthly budget',
      'Closed-period guard: expenses cannot be posted to a locked accounting period',
      'Tax-deductible flag captures input VAT claim amount for VAT return calculation',
    ],
    integrations: [
      { module: 'Accounting', detail: 'Approved expense → Dr Expense Cr AP/Cash journal' },
      { module: 'Reports', detail: 'Budget vs actual, expense trend, category analysis' },
      { module: 'Users', detail: 'Approval workflow maps to manager role hierarchy' },
      { module: 'Multi-Branch', detail: 'Expense scoped to branch; central view aggregates' },
    ],
    kpis: ['Total Operating Expenses', 'Expense vs Budget Variance %', 'Pending Approval Queue Size', 'Top-5 Expense Categories'],
    scale: 'Recurring job runs as cron at midnight; expense table partitioned by branch_id + month',
  },
  {
    id: 'accounting',
    letter: 'F',
    icon: BanknotesIcon,
    color: 'emerald',
    title: 'Accounting Module',
    tagline: 'Double-entry ledger · COA · Bank reconciliation · VAT returns · P&L · Balance Sheet · Period close',
    tables: [
      'chart_of_accounts', 'accounting_periods', 'journal_entries',
      'journal_lines', 'bank_accounts', 'bank_statements',
      'bank_reconciliations', 'vat_periods',
    ],
    apiGroups: [
      { group: 'Chart of Accounts', endpoints: ['GET /coa', 'POST /coa', 'PUT /coa/:id', 'GET /coa/:id/balance'] },
      { group: 'Journal Engine', endpoints: ['POST /journal', 'GET /journal', 'POST /journal/:id/reverse', 'GET /trial-balance'] },
      { group: 'Bank & VAT', endpoints: ['POST /bank-recon', 'GET /bank-recon/:id/matches', 'GET /vat/:period_id', 'POST /vat/:period_id/lock'] },
      { group: 'Reports & Periods', endpoints: ['GET /reports/pl', 'GET /reports/balance-sheet', 'GET /reports/cash-flow', 'POST /periods/:id/close', 'POST /periods/:id/reopen'] },
    ],
    logic: [
      'All financial events auto-post double-entry: Dr and Cr must balance or transaction rolls back',
      'Auto-journal on order close: Dr Cash/AR, Cr Sales Revenue, Cr VAT Payable',
      'Auto-journal on expense approval: Dr Expense Account, Cr AP or Cash',
      'VAT payable = Output VAT (from orders) - Input VAT (from approved invoices)',
      'Period close checklist: journals posted, bank reconciled, VAT filed → hard lock',
      'Year-end: retained earnings journal transfers P&L net to equity account',
    ],
    integrations: [
      { module: 'Orders', detail: 'Revenue + VAT journal on order close' },
      { module: 'Purchase', detail: 'AP journal on invoice approval; payment clears AP' },
      { module: 'Expense', detail: 'Expense approval triggers GL posting' },
      { module: 'HR/Payroll', detail: 'Payroll run posts salary expense journal to GL' },
    ],
    kpis: ['Gross Profit Margin %', 'Net Profit %', 'VAT Payable Balance', 'AR Days Outstanding', 'AP Days Outstanding'],
    scale: 'journal_lines indexed by (account_id, period); trial balance materialised view refreshed on journal post',
  },
  {
    id: 'hr',
    letter: 'G',
    icon: ClipboardDocumentCheckIcon,
    color: 'teal',
    title: 'Staff Attendance & Payroll',
    tagline: 'Shift scheduling · Clock-in/out · Overtime · Payroll run · Tips distribution · Payslips',
    tables: [
      'shifts', 'shift_assignments', 'attendance_records', 'leave_requests',
      'overtime_requests', 'payroll_runs', 'payroll_lines',
      'payroll_deductions', 'tips_distributions',
    ],
    apiGroups: [
      { group: 'Shifts & Attendance', endpoints: ['POST /shifts', 'POST /shifts/:id/assign', 'POST /attendance/clock-in', 'POST /attendance/clock-out', 'GET /attendance/summary'] },
      { group: 'Overtime & Leave', endpoints: ['POST /overtime', 'POST /overtime/:id/approve', 'POST /leave', 'POST /leave/:id/approve'] },
      { group: 'Payroll', endpoints: ['POST /payroll/run', 'GET /payroll/runs/:id', 'POST /payroll/runs/:id/process', 'POST /payroll/runs/:id/lock', 'GET /payroll/payslip/:staff_id'] },
      { group: 'Tips & Commission', endpoints: ['POST /tips/distribute', 'GET /commissions/:rider_id', 'GET /commissions/monthly'] },
    ],
    logic: [
      'Late: clock-in > shift_start + grace_period → flag with minutes_late value',
      'OT = MAX(0, worked_minutes - scheduled_minutes); capped by daily/weekly threshold',
      'OT multiplier: 1.5× weekday, 2.0× holiday; applied per configured public holiday calendar',
      'Gross pay = base + OT + allowances + tips + commissions + bonuses',
      'Net pay = gross - income_tax - pension - other_deductions',
      'Payroll process posts salary GL journal and generates bank transfer file',
    ],
    integrations: [
      { module: 'Accounting', detail: 'Payroll run → salary expense journal to GL' },
      { module: 'Delivery Fleet', detail: 'Rider commissions pulled into payroll gross' },
      { module: 'Users', detail: 'Staff profiles are shared users with HR role' },
      { module: 'Reports', detail: 'Attendance, payroll variance, labour cost % reports' },
    ],
    kpis: ['Labour Cost %', 'Absenteeism Rate', 'OT Hours per Period', 'Average Tips per Waiter', 'On-Time Payroll Rate'],
    scale: 'attendance_records indexed by (user_id, clock_in DESC); payroll run async with progress streaming',
  },
  {
    id: 'qr',
    letter: 'H',
    icon: QrCodeIcon,
    color: 'indigo',
    title: 'QR Ordering System',
    tagline: 'Per-table signed QR · Self-order mobile menu · Cart → KDS → Track → Pay → Feedback',
    tables: [
      'qr_codes', 'qr_sessions', 'qr_carts', 'qr_cart_items',
    ],
    apiGroups: [
      { group: 'QR Management', endpoints: ['POST /qr/generate', 'POST /qr/batch-generate', 'POST /qr/:table_id/reissue', 'GET /qr/sessions/active'] },
      { group: 'Customer Menu', endpoints: ['GET /qr/:token/menu', 'GET /qr/:session/cart', 'POST /qr/:session/cart/add', 'DELETE /qr/:session/cart/:item_id'] },
      { group: 'Order & Payment', endpoints: ['POST /qr/:session/place-order', 'POST /qr/:session/request-bill', 'POST /qr/:session/pay', 'GET /qr/:session/status'] },
      { group: 'Feedback', endpoints: ['POST /qr/:session/feedback', 'GET /qr/:session/history'] },
    ],
    logic: [
      'QR URL = HMAC-signed token(table_id, issued_at, secret); re-issue invalidates old token',
      'Session created on first scan; multiple customers at same table share one session',
      'Place order creates order record + sends kitchen_queue entries → KDS via Socket.IO',
      'Request-bill freezes cart; waiter notified; no further add-to-cart allowed',
      'Cash payment triggers waiter notification; card payment via payment gateway webhook',
      'Session inactivity timeout (configurable) gracefully closes session',
    ],
    integrations: [
      { module: 'Tables', detail: 'QR session linked to table; table marked occupied on first order' },
      { module: 'Orders', detail: 'QR place-order creates standard order in orders table' },
      { module: 'Kitchen', detail: 'Order items sent to KDS via Socket.IO room' },
      { module: 'CRM', detail: 'Phone capture at payment creates/matches customer profile' },
    ],
    kpis: ['QR Order Adoption Rate %', 'Avg Cart Value (QR vs Staff)', 'QR Session Completion Rate', 'Avg Items per QR Order'],
    scale: 'qr_sessions TTL in Redis; Socket.IO room per table; stateless customer-facing menu served from CDN',
  },
  {
    id: 'fleet',
    letter: 'I',
    icon: TruckIcon,
    color: 'cyan',
    title: 'Delivery Fleet Management',
    tagline: 'Rider profiles · Zone mapping · Auto-assignment engine · GPS tracking · Commission & payout',
    tables: [
      'riders', 'delivery_zones', 'delivery_zone_polygons',
      'rider_assignments', 'rider_location_updates', 'rider_commissions',
    ],
    apiGroups: [
      { group: 'Riders', endpoints: ['GET /fleet/riders', 'POST /fleet/riders', 'PUT /fleet/riders/:id', 'PATCH /fleet/riders/:id/status'] },
      { group: 'Zones', endpoints: ['GET /fleet/zones', 'POST /fleet/zones', 'POST /fleet/zones/:id/polygon', 'GET /fleet/zones/check-point'] },
      { group: 'Assignment', endpoints: ['POST /fleet/assign', 'POST /fleet/assign/:id/accept', 'POST /fleet/assign/:id/reject', 'PATCH /fleet/assign/:id/status'] },
      { group: 'Tracking & Commission', endpoints: ['POST /fleet/location', 'GET /fleet/tracking/live', 'GET /fleet/commissions/:rider_id/monthly', 'POST /fleet/commissions/:rider_id/dispute'] },
    ],
    logic: [
      'Auto-assign: rank available riders in matching zone by current_load ASC, rating DESC',
      'Rejection by rider → re-queue with retry count; block rider assignment after max retries',
      'Zone check: delivery address point-in-polygon test against delivery_zone_polygons',
      'GPS location stored as ring buffer (last N points) in Redis for live tracking',
      'Base commission = per-delivery rate; bonus triggers when monthly count > target',
      'Commission statement aggregated monthly → synced to payroll module gross',
    ],
    integrations: [
      { module: 'Delivery/Orders', detail: 'Assignment linked to delivery_details record' },
      { module: 'HR/Payroll', detail: 'Monthly commissions pulled into payroll gross pay' },
      { module: 'Maps API', detail: 'Zone polygon rendering; ETA estimation from GPS' },
      { module: 'CRM', detail: 'Rider rating from customer post-delivery feedback' },
    ],
    kpis: ['Avg Delivery Time', 'On-Time Delivery Rate %', 'Rider Utilisation Rate', 'Failed Delivery Rate %', 'Avg Customer Rating per Rider'],
    scale: 'Rider GPS in Redis (GEORADIUSBYMEMBER); assignment events via message queue; zone polygon cached per branch',
  },
  {
    id: 'reservation',
    letter: 'J',
    icon: CalendarDaysIcon,
    color: 'fuchsia',
    title: 'Advanced Reservation System',
    tagline: 'Floor map editor · Booking engine · Deposit system · Waitlist · Auto-allocation · Analytics',
    tables: [
      'floor_plans', 'floor_plan_sections', 'floor_plan_tables',
      'reservation_bookings', 'reservation_deposits', 'reservation_reminders',
      'waitlist_entries',
    ],
    apiGroups: [
      { group: 'Floor Map', endpoints: ['GET /reservations/floor-plan', 'POST /reservations/floor-plan/tables', 'PUT /reservations/floor-plan/tables/:id', 'GET /reservations/floor-plan/live'] },
      { group: 'Booking Engine', endpoints: ['POST /reservations/book', 'GET /reservations/availability', 'PUT /reservations/:id', 'POST /reservations/:id/confirm', 'POST /reservations/:id/cancel', 'POST /reservations/:id/seat'] },
      { group: 'Deposits', endpoints: ['POST /reservations/:id/deposit/request', 'POST /reservations/:id/deposit/confirm', 'POST /reservations/:id/deposit/refund'] },
      { group: 'Waitlist', endpoints: ['POST /reservations/waitlist', 'PATCH /reservations/waitlist/:id/notify', 'DELETE /reservations/waitlist/:id'] },
    ],
    logic: [
      'Double-booking: query overlapping time slots = (start < req_end AND end > req_start)',
      'Turn-time: slot availability = table_free_at > requested_time + avg_turn_duration',
      'Auto-allocation: match party_size ≤ table_capacity; prioritise exact-fit tables',
      'Deposit: required when party_size > threshold or event_type = private_dining',
      'Refund policy: 100% if cancelled before cut-off; 50% within window; 0% after / no-show',
      'Waitlist auto-notify: cancellation triggers sequential notification with N-minute response window',
    ],
    integrations: [
      { module: 'Tables', detail: 'Reservation seats map to physical tables; live floor status sync' },
      { module: 'Orders', detail: 'Seat action creates dine-in order linked to reservation' },
      { module: 'CRM', detail: 'Customer profile attached to booking; loyalty tier noted' },
      { module: 'Billing', detail: 'Deposit collected upfront; deducted from final bill on checkout' },
    ],
    kpis: ['No-Show Rate %', 'Cancellation Rate %', 'Avg Table Turn Time', 'Reservation Conversion Rate', 'Deposit Collection Rate'],
    scale: 'Availability query cached with 30-second TTL in Redis; floor map state via Socket.IO room per branch',
  },
  {
    id: 'branch',
    letter: 'K',
    icon: GlobeAltIcon,
    color: 'slate',
    title: 'Multi-Branch Management',
    tagline: 'Branch isolation · Centralized dashboard · Inter-branch stock transfers · Consolidated P&L · Branch reports',
    tables: [
      'branches', 'branch_settings', 'branch_menu_overrides',
      'branch_pricing_overrides',
    ],
    apiGroups: [
      { group: 'Branch Admin', endpoints: ['GET /branches', 'POST /branches', 'PUT /branches/:id', 'PATCH /branches/:id/status', 'GET /branches/:id/settings', 'PUT /branches/:id/settings'] },
      { group: 'Central Dashboard', endpoints: ['GET /branches/dashboard', 'GET /branches/reports/consolidated', 'GET /branches/reports/comparison'] },
      { group: 'Menu & Pricing', endpoints: ['POST /branches/:id/menu-overrides', 'POST /branches/:id/pricing-overrides', 'GET /branches/:id/menu'] },
    ],
    logic: [
      'branch_id column on every resource table; all API queries WHERE branch_id = req.user.branch_id',
      'Central admin: no branch_id filter; branch manager: hard-scoped to own branch_id',
      'Socket.IO room isolation: events emitted to branch-specific room only',
      'Inter-branch transfer: deduct source stock_ledger, add target, post inter-branch GL entries',
      'Consolidated P&L: UNION ALL branch revenue/expense journals; eliminate intra-company transactions',
      'Branch-level pricing: price lookup order = branch_pricing_overrides → menu_items.price',
    ],
    integrations: [
      { module: 'All Modules', detail: 'Every module scoped by branch_id; central admin sees all' },
      { module: 'Inventory', detail: 'Stock transfers between branch warehouse_locations' },
      { module: 'Accounting', detail: 'Consolidated P&L with intra-branch elimination' },
      { module: 'Reports', detail: 'Branch comparison, ranking, and drill-down dashboards' },
    ],
    kpis: ['Revenue by Branch', 'Avg Check per Branch', 'Order Volume Comparison', 'Food Cost % per Branch', 'Inter-Branch Transfer Value'],
    scale: 'Row-level security (Postgres RLS) enforces branch isolation; read replicas per region for central dashboards',
  },
  {
    id: 'bi',
    letter: 'L',
    icon: ChartBarIcon,
    color: 'lime',
    title: 'Business Intelligence',
    tagline: 'Peak-hour heatmap · Menu engineering matrix · Customer cohort · Demand forecasting · Profitability waterfall',
    tables: [
      'bi_forecasts', 'bi_forecast_lines',
      'menu_engineering_cache', 'peak_hour_cache',
    ],
    apiGroups: [
      { group: 'Peak-Hour Analytics', endpoints: ['GET /bi/peak-hours/heatmap', 'GET /bi/peak-hours/staffing-recommendation'] },
      { group: 'Menu Engineering', endpoints: ['GET /bi/menu-engineering/matrix', 'GET /bi/menu-engineering/:item_id/trend', 'POST /bi/menu-engineering/export'] },
      { group: 'Cohort & CLV', endpoints: ['GET /bi/cohorts', 'GET /bi/clv/trend', 'GET /bi/retention-matrix'] },
      { group: 'Forecasting', endpoints: ['GET /bi/forecast/7-day', 'GET /bi/forecast/30-day', 'GET /bi/forecast/ingredients', 'POST /bi/forecast/holiday-override'] },
      { group: 'Profitability', endpoints: ['GET /bi/profitability/overview', 'GET /bi/profitability/by-category', 'GET /bi/profitability/waterfall', 'GET /bi/break-even'] },
    ],
    logic: [
      'Menu Engineering quadrants: Stars (hi pop + hi margin), Ploughhorses (hi/lo), Puzzles (lo/hi), Dogs (lo/lo)',
      'Contribution margin = (selling_price - food_cost) × quantity_sold for period',
      'Demand forecast: rolling 8-week avg + trend coefficient + day-of-week seasonality factor',
      'Forecast ingredient demand: predicted_orders × BOM quantities → auto draft reorder suggestions',
      'EBITDA waterfall: Revenue → Gross Profit → EBITDA with each cost layer as step',
      'Break-even: total_fixed_costs ÷ weighted_average_contribution_margin_per_cover',
    ],
    integrations: [
      { module: 'Orders', detail: 'All closed orders feed demand, revenue, and menu analytics' },
      { module: 'Inventory', detail: 'Food cost from recipe BOM; stock turnover from ledger' },
      { module: 'CRM', detail: 'Customer cohort grouped from loyalty + order history' },
      { module: 'HR', detail: 'Labour cost % from payroll data vs revenue' },
    ],
    kpis: ['Revenue per Available Seat Hour (RevPASH)', 'Food Cost %', 'Labour Cost %', 'EBITDA %', 'Forecast Accuracy (MAPE %)'],
    scale: 'BI aggregates computed by nightly batch; materialised views for 12-month trends; ClickHouse for 100+ branch analytics',
  },
];

// ─── Integration map ─────────────────────────────────────────────────────────
const INTEGRATION_FLOWS = [
  { from: 'Orders', to: 'Inventory', label: 'BOM deduction on close' },
  { from: 'Orders', to: 'Accounting', label: 'Revenue + VAT journal' },
  { from: 'Orders', to: 'CRM', label: 'Points earn + tier check' },
  { from: 'Orders', to: 'QR Ordering', label: 'Shared order model' },
  { from: 'Purchase', to: 'Inventory', label: 'GRN adds stock + batch' },
  { from: 'Purchase', to: 'Accounting', label: 'AP journal on invoice approval' },
  { from: 'Purchase', to: 'Supplier', label: 'PO + payment updates ledger' },
  { from: 'HR/Payroll', to: 'Accounting', label: 'Salary expense GL journal' },
  { from: 'Fleet', to: 'HR/Payroll', label: 'Rider commissions → gross pay' },
  { from: 'Expense', to: 'Accounting', label: 'Approval → GL posting' },
  { from: 'Reservation', to: 'Orders', label: 'Seat → dine-in order create' },
  { from: 'BI', to: 'All Modules', label: 'Read-only analytics aggregation' },
  { from: 'Multi-Branch', to: 'All Modules', label: 'branch_id isolation + consolidation' },
];

// ─── Color map ────────────────────────────────────────────────────────────────
const COLOR = {
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     icon: 'bg-sky-100 text-sky-600',     badge: 'bg-sky-100 text-sky-700'     },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-700'   },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    icon: 'bg-rose-100 text-rose-600',   badge: 'bg-rose-100 text-rose-700'     },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-700',    icon: 'bg-teal-100 text-teal-600',   badge: 'bg-teal-100 text-teal-700'     },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    icon: 'bg-cyan-100 text-cyan-600',   badge: 'bg-cyan-100 text-cyan-700'     },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', icon: 'bg-fuchsia-100 text-fuchsia-600', badge: 'bg-fuchsia-100 text-fuchsia-700' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   icon: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-700'   },
  lime:    { bg: 'bg-lime-50',    border: 'border-lime-200',    text: 'text-lime-700',    icon: 'bg-lime-100 text-lime-600',   badge: 'bg-lime-100 text-lime-700'     },
};

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────
const TABS = ['Schema', 'API', 'Logic', 'Integrations', 'KPIs & Scale'];

// ─── Module Card ─────────────────────────────────────────────────────────────
function ModuleCard({ mod }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('Schema');
  const c = COLOR[mod.color];
  const totalEndpoints = mod.apiGroups.reduce((s, g) => s + g.endpoints.length, 0);

  return (
    <div className={`rounded-2xl border ${c.border} ${open ? c.bg : 'bg-white'} transition-colors overflow-hidden`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
            <span className="text-xs font-black">{mod.letter}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-base font-black ${c.text}`}>{mod.title}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>PLANNED</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{mod.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-xs text-slate-400"><span className="font-bold text-slate-600">{mod.tables.length}</span> tables</span>
            <span className="text-xs text-slate-400"><span className="font-bold text-slate-600">{totalEndpoints}</span> endpoints</span>
          </div>
          {open
            ? <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            : <ChevronRightIcon className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-200">
          {/* Tab bar */}
          <div className="flex gap-1 px-5 pt-3 pb-0 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${
                  tab === t
                    ? `${c.text} border-current bg-white`
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="bg-white/80 px-5 py-4 space-y-4">

            {/* SCHEMA TAB */}
            {tab === 'Schema' && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <CircleStackIcon className="h-3.5 w-3.5 inline mr-1" />{mod.tables.length} Database Tables
                </p>
                <div className="flex flex-wrap gap-2">
                  {mod.tables.map(t => (
                    <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${c.border} ${c.badge}`}>
                      <CircleStackIcon className="h-3 w-3" />{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* API TAB */}
            {tab === 'API' && (
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  <ServerStackIcon className="h-3.5 w-3.5 inline mr-1" />{totalEndpoints} REST Endpoints
                </p>
                {mod.apiGroups.map(g => (
                  <div key={g.group}>
                    <p className={`text-xs font-bold mb-1.5 ${c.text}`}>{g.group}</p>
                    <div className="space-y-1">
                      {g.endpoints.map(ep => {
                        const [method, ...rest] = ep.split(' ');
                        const methodColor = method === 'GET' ? 'text-emerald-700 bg-emerald-50' : method === 'POST' ? 'text-sky-700 bg-sky-50' : method === 'PUT' || method === 'PATCH' ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
                        return (
                          <div key={ep} className="flex items-center gap-2 text-xs">
                            <span className={`font-black px-1.5 py-0.5 rounded text-xs w-12 text-center ${methodColor}`}>{method}</span>
                            <code className="font-mono text-slate-600">/api/{mod.id}{rest.join(' ')}</code>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LOGIC TAB */}
            {tab === 'Logic' && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <BoltIcon className="h-3.5 w-3.5 inline mr-1" />Core Business Rules
                </p>
                <ul className="space-y-2">
                  {mod.logic.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className={`h-5 w-5 rounded-full text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${c.icon}`}>{i + 1}</span>
                      <span className="leading-snug">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* INTEGRATIONS TAB */}
            {tab === 'Integrations' && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <ArrowsRightLeftIcon className="h-3.5 w-3.5 inline mr-1" />Integration Points
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {mod.integrations.map(int => (
                    <div key={int.module} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                      <p className={`text-xs font-black mb-0.5 ${c.text}`}>{int.module}</p>
                      <p className="text-xs text-slate-600 leading-snug">{int.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPIs TAB */}
            {tab === 'KPIs & Scale' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">KPIs & Reports</p>
                  <div className="flex flex-wrap gap-2">
                    {mod.kpis.map(k => (
                      <span key={k} className={`px-3 py-1 rounded-full text-xs font-semibold border ${c.border} ${c.badge}`}>{k}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Scalability Notes</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-200">{mod.scale}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function QaLinkedPage() {
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [filterColor, setFilterColor] = useState(null);

  const totalTables    = MODULES.reduce((s, m) => s + m.tables.length, 0);
  const totalEndpoints = MODULES.reduce((s, m) => s + m.apiGroups.reduce((ss, g) => ss + g.endpoints.length, 0), 0);
  const totalLogic     = MODULES.reduce((s, m) => s + m.logic.length, 0);

  const displayModules = filterColor ? MODULES.filter(m => m.color === filterColor) : MODULES;

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200">
                <ShieldCheckIcon className="h-3.5 w-3.5" /> ERP Architecture Blueprint — v1.0
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                PLANNED
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-800">FoodPark Enterprise ERP</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              12 enterprise modules designed for production-grade restaurant operations. Full database schema,
              REST API surface, business logic, integration points, and scalability patterns.
              Designed to complement the existing core order/kitchen/billing/auth system.
            </p>
          </div>
          <Link to="/qa-guide" className="btn btn-secondary shrink-0 text-sm">
            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1.5" /> QA Guide
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'New Modules',         val: 12,              color: 'text-sky-700' },
            { label: 'New DB Tables',        val: `${totalTables}+`, color: 'text-violet-700' },
            { label: 'API Endpoints',        val: `${totalEndpoints}+`, color: 'text-emerald-700' },
            { label: 'Business Rules',       val: `${totalLogic}+`, color: 'text-amber-700' },
            { label: 'Integration Flows',    val: INTEGRATION_FLOWS.length, color: 'text-rose-700' },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tech Stack ────────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tech Stack & Patterns</p>
        <div className="flex flex-wrap gap-2">
          {[
            'React 18 + Tailwind CSS', 'Node.js + Express', 'PostgreSQL 15',
            'Socket.IO real-time', 'JWT + httpOnly Cookies', 'Prisma ORM',
            'Redis (cache + GPS)', 'Bull / BullMQ (jobs)', 'S3-compatible (uploads)',
            'Row-Level Security (RLS)', 'FIFO/WAC stock valuation', 'Double-entry accounting',
            'SERIALIZABLE transactions', 'RBAC (role-based access)', 'Audit log on all financials',
          ].map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">{tag}</span>
          ))}
        </div>
      </div>

      {/* ── Scale tiers ───────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { tier: '1 Restaurant',  color: 'emerald', desc: 'Single PostgreSQL instance. All modules on one server. In-process Socket.IO. Redis optional for session cache.' },
          { tier: '10 Branches',   color: 'sky',     desc: 'Read replicas for BI/reports. Redis required for GPS + QR sessions. Async job queue (BullMQ). Socket.IO cluster with Redis adapter.' },
          { tier: '100 Branches',  color: 'violet',  desc: 'Multi-region Postgres with logical replication. Per-region read clusters. Kafka for stock/order events. ClickHouse for BI aggregations. CDN for QR menus.' },
        ].map(s => (
          <div key={s.tier} className={`rounded-2xl border border-${s.color}-200 bg-${s.color}-50 p-4`}>
            <p className={`text-sm font-black text-${s.color}-700 mb-1`}>{s.tier}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Integration flows ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowIntegrations(o => !o)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <ArrowsRightLeftIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Cross-Module Integration Map</h2>
              <p className="text-xs text-slate-500">{INTEGRATION_FLOWS.length} critical data flows between modules</p>
            </div>
          </div>
          {showIntegrations ? <ChevronDownIcon className="h-5 w-5 text-slate-400" /> : <ChevronRightIcon className="h-5 w-5 text-slate-400" />}
        </button>
        {showIntegrations && (
          <div className="border-t border-slate-200 px-5 py-4">
            <div className="grid sm:grid-cols-2 gap-2">
              {INTEGRATION_FLOWS.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                  <span className="text-xs font-black text-sky-700 whitespace-nowrap">{f.from}</span>
                  <ArrowsRightLeftIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-black text-emerald-700 whitespace-nowrap">{f.to}</span>
                  <span className="text-xs text-slate-500 hidden sm:block">— {f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Module filter ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filter:</span>
        <button
          type="button"
          onClick={() => setFilterColor(null)}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${!filterColor ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-400'}`}
        >
          All 12 Modules
        </button>
        {[
          { label: 'Operations',  colors: ['sky', 'violet', 'amber'] },
          { label: 'Finance',     colors: ['emerald', 'orange', 'rose'] },
          { label: 'People',      colors: ['teal', 'cyan', 'fuchsia'] },
          { label: 'Intelligence',colors: ['indigo', 'slate', 'lime'] },
        ].map(grp => (
          <span key={grp.label} className="text-xs text-slate-400 font-semibold">
            {grp.label}:{' '}
            {grp.colors.map(col => {
              const mod = MODULES.find(m => m.color === col);
              if (!mod) return null;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => setFilterColor(filterColor === col ? null : col)}
                  className={`mr-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${filterColor === col ? `${COLOR[col].badge} border-current` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                >
                  {mod.letter}
                </button>
              );
            })}
          </span>
        ))}
      </div>

      {/* ── Module cards ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {displayModules.map(mod => (
          <ModuleCard key={mod.id} mod={mod} />
        ))}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="card p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold text-slate-700">Design Principles</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {['RBAC on every endpoint', 'Audit log on all financials', 'Transaction-safe DB ops', 'Soft deletes only', 'branch_id isolation', 'No client-trusted totals'].map(p => (
              <span key={p} className="text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-medium">{p}</span>
            ))}
          </div>
        </div>
        <Link to="/qa-guide" className="btn btn-secondary text-sm whitespace-nowrap">
          Open QA Guide →
        </Link>
      </div>

    </div>
  );
}
