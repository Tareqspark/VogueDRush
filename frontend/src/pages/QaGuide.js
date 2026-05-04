import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  QrCodeIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

// ─── Suite → nearest real app route ──────────────────────────────────────────
const SUITE_LINKS = {
  'inv-dashboard':         '/',
  'inv-ingredient-master': '/menu',
  'inv-recipe-bom':        '/menu',
  'inv-stock-ledger':      '/reports',
  'inv-physical-count':    '/reports',
  'inv-waste':             '/reports',
  'inv-expiry-batch':      '/menu',
  'inv-alerts-reorder':    '/',
  'po-lifecycle':          '/menu',
  'po-grn':                '/menu',
  'po-3way-match':         '/reports',
  'po-returns':            '/menu',
  'po-invoice':            '/reports',
  'po-landed-cost':        '/reports',
  'sup-master':            '/users',
  'sup-ledger':            '/reports',
  'sup-payables-aging':    '/reports',
  'sup-performance':       '/reports',
  'sup-abc':               '/reports',
  'crm-customer-master':   '/users',
  'crm-loyalty-account':   '/users',
  'crm-tier-engine':       '/users',
  'crm-coupon-engine':     '/orders',
  'crm-rfm':               '/reports',
  'crm-clv-cohort':        '/reports',
  'crm-feedback':          '/reports',
  'exp-entry':             '/reports',
  'exp-approval':          '/reports',
  'exp-recurring':         '/reports',
  'exp-budget':            '/reports',
  'acc-coa':               '/reports',
  'acc-journal':           '/reports',
  'acc-bank-recon':        '/reports',
  'acc-vat':               '/reports',
  'acc-pl-bs':             '/reports',
  'acc-period-close':      '/reports',
  'hr-shifts':             '/users',
  'hr-attendance':         '/users',
  'hr-overtime':           '/users',
  'hr-payroll-run':        '/reports',
  'hr-tips':               '/reports',
  'hr-payroll-reports':    '/reports',
  'qr-setup':              '/tables',
  'qr-menu-session':       '/orders',
  'qr-cart-payment':       '/orders',
  'qr-tracking-feedback':  '/reports',
  'fleet-rider':           '/delivery',
  'fleet-zones':           '/delivery',
  'fleet-assignment':      '/delivery',
  'fleet-tracking':        '/delivery',
  'fleet-commission':      '/reports',
  'res-floor-map':         '/reservations',
  'res-booking-engine':    '/reservations',
  'res-deposit':           '/reservations',
  'res-waitlist':          '/reservations',
  'res-analytics':         '/reports',
  'branch-setup':          '/settings',
  'branch-isolation':      '/settings',
  'branch-transfer':       '/reports',
  'branch-central-dash':   '/',
  'bi-peak-hour':          '/reports',
  'bi-menu-engineering':   '/menu',
  'bi-cohort':             '/reports',
  'bi-forecast':           '/reports',
  'bi-profitability':      '/reports',
  'int-order-cogs':        '/orders',
  'int-purchase-pay':      '/menu',
  'int-ops-payroll':       '/delivery',
  'int-loyalty-flow':      '/orders',
  'core-auth':             '/settings',
  'core-orders':           '/orders',
  'core-kitchen':          '/kitchen',
  'core-tables':           '/tables',
  'core-reservations':     '/reservations',
  'core-delivery':         '/delivery',
  'core-menu':             '/menu',
  'core-users':            '/users',
  'core-reports':          '/reports',
  'core-settings':         '/settings',
  'perf-concurrency':      '/',
  'perf-reporting':        '/reports',
  'sec-rbac':              '/settings',
  'sec-api':               '/settings',
};

const SECTION_ICONS = {
  inventory:   CpuChipIcon,
  purchase:    BuildingStorefrontIcon,
  supplier:    TruckIcon,
  crm:         UserGroupIcon,
  expense:     CurrencyDollarIcon,
  accounting:  BanknotesIcon,
  hr:          ClipboardDocumentCheckIcon,
  qr:          QrCodeIcon,
  fleet:       TruckIcon,
  reservation: CalendarDaysIcon,
  branch:      GlobeAltIcon,
  bi:          ChartBarIcon,
  core:        WrenchScrewdriverIcon,
  integration: ShieldCheckIcon,
  performance: ChartBarIcon,
  security:    ShieldCheckIcon,
};

const S = { READY: 'READY', PLANNED: 'PLANNED', IN_PROGRESS: 'IN PROGRESS' };

const QA_SECTIONS = [
  // ── 0 · Core System ────────────────────────────────────────────────────────
  {
    id: 'core-modules',
    icon: 'core',
    title: '0 · Core System — Regression Suite',
    subtitle: '10 suites · 62 test cases · Auth, Orders, Kitchen, Tables, Delivery, Menu, Users, Reports, Settings, Reservations',
    suites: [
      {
        id: 'core-auth',
        title: 'Auth & Session Security',
        subtitle: '/login  ·  JWT + refresh-token lifecycle',
        status: S.READY,
        checks: [
          'Login with valid admin credentials returns 200 with access + refresh tokens',
          'Login with wrong password returns 401 with generic error (no field leakage)',
          'Expired access token returns 401; client silently refreshes with refresh token',
          'After logout, reusing the old refresh token returns 403',
          'Failed login ×5 triggers account lock or rate-limit response',
          'Admin can create new user; duplicate username/email blocked with 409',
          'Role-restricted page redirects correctly for waiter and kitchen roles',
        ],
      },
      {
        id: 'core-orders',
        title: 'Order Lifecycle — Dine-In / Takeaway / Delivery',
        subtitle: '/orders  ·  create → modify → pay → close',
        status: S.READY,
        checks: [
          'Create dine-in order assigns table, sets status open, timestamps correctly',
          'Add item recalculates subtotal + VAT + service charge in real time',
          'Remove item triggers kitchen cancel notification via Socket.IO',
          'Apply VAT exemption overrides default rate and is recorded on invoice',
          'Pay with cash closes order, prints receipt payload, releases table',
          'Pay with card split tender records both partial amounts summing to total',
          'Refund reverses payment, creates credit note, reopens for review',
          'Order audit trail records actor, action, old value, new value, timestamp',
          'Concurrent order creation for same table is serialised correctly',
        ],
      },
      {
        id: 'core-kitchen',
        title: 'Kitchen Display System',
        subtitle: '/kitchen  ·  real-time ticket flow',
        status: S.READY,
        checks: [
          'New order item appears on KDS within 1 s of placement via Socket.IO',
          'Mark item ready removes it from active queue and notifies waiter',
          'Station filter shows only assigned item categories',
          'Priority flag on rush order renders visual highlight on KDS ticket',
          'Void item updates order total and creates audit entry',
          'Kitchen recall displays last N completed tickets without data loss',
        ],
      },
      {
        id: 'core-tables',
        title: 'Table & Floor Management',
        subtitle: '/tables  ·  status, merge, split',
        status: S.READY,
        checks: [
          'Available table turns occupied on order open; reverts on close',
          'Reserved table cannot be seated without manager override',
          'Table merge combines bills correctly with correct item attribution',
          'Table split separates items to two bills summing to original total',
          'Table status updates propagate to all connected clients within 1 s',
        ],
      },
      {
        id: 'core-reservations',
        title: 'Reservation Management',
        subtitle: '/reservations  ·  book, confirm, seat, no-show',
        status: S.READY,
        checks: [
          'Booking for past date/time is rejected with clear validation error',
          'Double-booking same table + same slot is blocked with conflict message',
          'Confirmation notification triggers on save',
          'Marking no-show releases table and records status with timestamp',
          'Walk-in converts reservation to seated order with one click',
          'Reservation list filters by date, status, and party size correctly',
        ],
      },
      {
        id: 'core-delivery',
        title: 'Delivery Order Flow',
        subtitle: '/delivery  ·  assign, dispatch, complete',
        status: S.READY,
        checks: [
          'Delivery order requires valid address; blank address blocked',
          'Assign rider changes status to dispatched and timestamps dispatch_at',
          'Rider delivered action closes order and records delivered_at',
          'Failed delivery prompts reason selection and creates retry path',
          'Delivery fee applies correctly based on distance/zone setting',
          'Real-time status updates for ops team via socket',
        ],
      },
      {
        id: 'core-menu',
        title: 'Menu & Item Management',
        subtitle: '/menu  ·  categories, items, modifiers, pricing',
        status: S.READY,
        checks: [
          'Create category with image uploads and saves correctly',
          'Create item with price, tax class, and modifiers',
          'Modifier group with min/max selection rules enforced at POS',
          "Mark item 86'd hides it from ordering screens instantly",
          'Duplicate item SKU is blocked at save',
          'Price change takes effect immediately on new orders',
          'Menu import via CSV adds items, skips duplicates, and reports row errors',
        ],
      },
      {
        id: 'core-users',
        title: 'User Management & RBAC',
        subtitle: '/users  ·  roles, permissions, audit',
        status: S.READY,
        checks: [
          'Create admin user grants access to all management screens',
          'Create waiter user blocks /menu, /users, /reports, /settings',
          'Password reset flow emails link and expires it after 30 minutes',
          'Deactivate user invalidates all active sessions immediately',
          'Audit log records every login, logout, and permission-sensitive action',
        ],
      },
      {
        id: 'core-reports',
        title: 'Reports & Analytics',
        subtitle: '/reports  ·  sales, revenue, VAT',
        status: S.READY,
        checks: [
          'Daily sales report totals match sum of all closed orders for that date',
          'VAT summary segregates taxable and exempt amounts correctly',
          'Export to CSV/PDF produces file with correct data and column headers',
          'Date range filter returns only orders within inclusive start–end range',
          'Revenue chart renders with correct data points for selected period',
        ],
      },
      {
        id: 'core-settings',
        title: 'System Configuration',
        subtitle: '/settings  ·  VAT, service charge, printer, currency',
        status: S.READY,
        checks: [
          'VAT rate change persists and applied to all new orders immediately',
          'Service charge toggle enables/disables the line item on new orders',
          'Currency symbol change reflects on all money display components',
          'Receipt template customisation saves header/footer text correctly',
          'System timezone change updates all timestamp displays',
        ],
      },
    ],
  },

  // ── 1 · Inventory Management ────────────────────────────────────────────────
  {
    id: 'inventory-management',
    icon: 'inventory',
    title: '1 · Inventory Management',
    subtitle: '8 suites · 57 test cases · Ingredients, BOM, FIFO/WAC, Waste, Expiry, Reorder',
    suites: [
      {
        id: 'inv-dashboard',
        title: 'Inventory Dashboard & KPIs',
        subtitle: '/inventory/dashboard',
        status: S.PLANNED,
        checks: [
          'Total stock value widget uses selected valuation method (FIFO / LIFO / WAC)',
          'Low-stock count badge reflects number of ingredients below reorder point',
          'Near-expiry alert count covers batches expiring within configured threshold days',
          'Stock turnover KPI = COGS ÷ Average Inventory for selected period',
          'Top-10 consumed ingredients chart matches deduction ledger for that period',
          'Valuation method change in settings recalculates dashboard value immediately',
          'Dashboard data refreshes on socket event when stock transactions occur',
        ],
      },
      {
        id: 'inv-ingredient-master',
        title: 'Ingredient Master (SKU, UOM, Supplier)',
        subtitle: '/inventory/ingredients',
        status: S.PLANNED,
        checks: [
          'Create ingredient with unique SKU, UOM, category, and min/max stock levels',
          'Duplicate SKU is blocked at save with 409 conflict response',
          'Edit ingredient updates all BOM references without breaking recipes',
          'Bulk CSV import: valid rows create/update; invalid rows report line errors',
          'Barcode assignment generates or accepts EAN-13; scan lookup resolves ingredient',
          'Delete ingredient with active recipe BOM is blocked with dependency error',
          'Ingredient list filters by category, supplier, and stock status correctly',
          'UOM conversion (kg→g, L→mL) stores conversion factor and applies on transactions',
        ],
      },
      {
        id: 'inv-recipe-bom',
        title: 'Recipe / BOM Builder',
        subtitle: '/inventory/recipes',
        status: S.PLANNED,
        checks: [
          'Create recipe with multiple ingredient lines; quantity and UOM saved per line',
          'Sub-recipe inclusion rolls up cost through parent recipe (nested BOM)',
          'Circular reference in sub-recipe (A→B→A) is detected and blocked',
          'Auto-cost calculates from current ingredient WAC and updates on price change',
          'Portion yield % applies correctly to gross ingredient quantity',
          'Recipe version clone creates new version without overwriting the active one',
          'Link recipe to menu item so order deduction auto-fires against this BOM',
          'Cost delta alert triggers when BOM cost deviation exceeds configured % threshold',
        ],
      },
      {
        id: 'inv-stock-ledger',
        title: 'Stock Ledger, Transactions & Adjustments',
        subtitle: '/inventory/ledger  ·  /inventory/adjustments',
        status: S.PLANNED,
        checks: [
          'Order completion fires deduction transaction against each recipe ingredient',
          'Deduction respects FIFO batch order: oldest expiry consumed first',
          'Purchase receipt fires addition transaction with batch/lot and expiry date',
          'Manual adjustment records reason, quantity delta, and supervisor approval',
          'Negative stock is blocked unless allow-overselling flag is set',
          'Transaction ledger shows running balance; spot-check 10 entries manually',
          'Adjustment approval workflow: staff submits, supervisor approves/rejects',
          'Audit trail on every ledger entry: user, timestamp, type, before/after qty',
        ],
      },
      {
        id: 'inv-physical-count',
        title: 'Physical Count & Variance',
        subtitle: '/inventory/physical-count',
        status: S.PLANNED,
        checks: [
          'Initiate count creates draft snapshot of expected quantities at that moment',
          'Scan-to-count mode resolves barcode to ingredient and increments counted qty',
          'Variance report shows +/- difference between system and physical count per item',
          'Submit count creates adjustment transactions for all variance lines',
          'Partial count locks counted items; remaining items stay in draft',
          'Historical count records are retained for audit comparison',
        ],
      },
      {
        id: 'inv-waste',
        title: 'Waste & Shrinkage Management',
        subtitle: '/inventory/waste',
        status: S.PLANNED,
        checks: [
          'Log waste with ingredient, quantity, reason code, and optional photo',
          'Waste deducts from stock ledger immediately on approval',
          'Waste cost = quantity × current WAC; posts to waste expense account in GL',
          'Daily waste summary shows top-5 wasted items and total cost by category',
          'Waste trend chart shows week-over-week and month-over-month patterns',
          'Manager can reject waste log; creates exception record for review',
          'Bulk waste import from CSV for historical data migration',
        ],
      },
      {
        id: 'inv-expiry-batch',
        title: 'Expiry & Batch Tracking',
        subtitle: '/inventory/expiry  ·  /inventory/batches',
        status: S.PLANNED,
        checks: [
          'Receive goods with batch/lot number, manufacture date, and expiry date',
          'Near-expiry list shows all batches expiring within N days (configurable)',
          'Expired batches are flagged and require disposal action before removal',
          'FIFO deduction always consumes the batch closest to expiry first',
          'Batch history trace shows: received → deducted → disposed chain',
          'Batch recall: search by lot number returns all orders that consumed it',
          'Expiry notification sends alert to store manager on configured days-before',
        ],
      },
      {
        id: 'inv-alerts-reorder',
        title: 'Stock Alerts & Reorder Automation',
        subtitle: '/inventory/alerts  ·  /inventory/reorder',
        status: S.PLANNED,
        checks: [
          'Low-stock alert fires when quantity_on_hand ≤ reorder_point',
          'Overstock alert fires when quantity_on_hand ≥ max_stock_level',
          'Auto-reorder creates draft PO for configured supplier when low-stock triggers',
          'Alert notification shows in dashboard badge and optionally sends email/SMS',
          'Snooze alert for N days prevents re-notification for configured period',
          'Reorder quantity = EOQ formula or fixed quantity depending on setting',
          'Alert history log shows triggered/resolved timestamps for trend analysis',
        ],
      },
    ],
  },

  // ── 2 · Purchase Management ─────────────────────────────────────────────────
  {
    id: 'purchase-management',
    icon: 'purchase',
    title: '2 · Purchase Management',
    subtitle: '6 suites · 45 test cases · PO → GRN → Invoice → 3-Way Match → Payment',
    suites: [
      {
        id: 'po-lifecycle',
        title: 'Purchase Order Lifecycle',
        subtitle: '/purchase/orders  ·  draft → confirmed → fulfilled',
        status: S.PLANNED,
        checks: [
          'Create draft PO: select supplier, add line items with unit cost and quantity',
          'Line total = unit_cost × quantity; grand total sums all lines + tax correctly',
          'Confirm PO locks edits and generates sequential PO number (PO-YYYY-XXXX)',
          'Auto-create PO from low-stock trigger groups items by preferred supplier',
          'Edit draft PO allows add/remove/qty change with live total recalculation',
          'Cancel confirmed PO requires manager role and reason; creates cancel audit',
          'Email PO to supplier generates PDF attachment with all line items',
          'Duplicate PO lines for same ingredient are flagged with warning',
        ],
      },
      {
        id: 'po-grn',
        title: 'Goods Receiving Note (GRN)',
        subtitle: '/purchase/receiving',
        status: S.PLANNED,
        checks: [
          'Create GRN against confirmed PO; only open POs appear in dropdown',
          'Received quantity updates stock ledger immediately with batch/expiry info',
          'Over-delivery (received > ordered) flagged as variance; requires approval',
          'Short-shipment (received < ordered) marks PO as partial_receipt',
          'GRN with barcode scan resolves PO line and prefills quantity entry',
          'Quality rejection on GRN line reduces accepted quantity with rejection reason',
          'GRN PDF contains PO reference, items, quantities, batch numbers, receiver sig',
          'Partial GRN followed by second GRN completes PO and updates status to fulfilled',
        ],
      },
      {
        id: 'po-3way-match',
        title: 'Three-Way Invoice Matching (PO ↔ GRN ↔ Invoice)',
        subtitle: '/purchase/matching',
        status: S.PLANNED,
        checks: [
          'Perfect match (PO qty = GRN qty = Invoice qty, same price) auto-approves',
          'Quantity variance > threshold holds invoice for manual review',
          'Price variance > configured % flags discrepancy with delta amount shown',
          'Tax discrepancy on invoice vs PO is itemised and highlighted',
          'Partial invoice matching against multiple GRNs calculates correctly',
          'Auto-approve threshold: variances below 2% are approved automatically',
          'Dispute workflow creates exception ticket; payment stays on hold until resolved',
          'Match history shows: match date, variance amounts, approver, resolution notes',
        ],
      },
      {
        id: 'po-returns',
        title: 'Purchase Returns & Credit Notes',
        subtitle: '/purchase/returns',
        status: S.PLANNED,
        checks: [
          'Create return against GRN line with quantity and reason (damaged/wrong/expired)',
          'Approved return reverses stock deduction in ledger',
          'Return creates debit note against supplier ledger',
          'Partial return updates net received quantity correctly',
          'Return reason analytics shows top return reasons over time',
          'Supplier credit note import reconciles against pending return',
        ],
      },
      {
        id: 'po-invoice',
        title: 'Supplier Invoice Processing',
        subtitle: '/purchase/invoices',
        status: S.PLANNED,
        checks: [
          'Upload invoice PDF/image and extract or enter details manually',
          'Invoice must reference a valid PO or GRN; unlinked invoice blocked',
          'Duplicate invoice number for same supplier is blocked with 409',
          'Invoice status moves: draft → matched → approved → paid with timestamps',
          'Outstanding invoice aging: 0-30, 31-60, 61-90, 90+ days buckets',
          'Schedule payment: sets payment_due_date and appears in payment calendar',
          'Post payment: marks invoice paid, updates supplier ledger, records GL entry',
        ],
      },
      {
        id: 'po-landed-cost',
        title: 'Landed Cost & Cost Allocation',
        subtitle: '/purchase/landed-cost',
        status: S.PLANNED,
        checks: [
          'Add freight, customs, and handling fees to a GRN',
          'Landed cost allocates to GRN lines by quantity, weight, or value method',
          'Allocated cost updates effective unit cost used for stock valuation',
          'Landed cost posted to correct GL account (freight expense vs inventory)',
          'Landed cost variance report shows freight % of total purchase by supplier',
        ],
      },
    ],
  },

  // ── 3 · Supplier Management ─────────────────────────────────────────────────
  {
    id: 'supplier-management',
    icon: 'supplier',
    title: '3 · Supplier Management',
    subtitle: '5 suites · 35 test cases · Profile, Ledger, Aging, Performance, ABC',
    suites: [
      {
        id: 'sup-master',
        title: 'Supplier Master & Onboarding',
        subtitle: '/suppliers  ·  /suppliers/:id',
        status: S.PLANNED,
        checks: [
          'Create supplier: legal name, trade name, Tax/VAT ID, address, contact persons',
          'Duplicate Tax ID blocked with validation error',
          'Add multiple bank accounts; mark one as primary for payment',
          'Attach documents (trade license, VAT certificate) with expiry reminders',
          'Blacklist supplier: blocks new PO creation with clear blocked-status banner',
          'Approved supplier list: only approved suppliers appear in PO dropdown',
          'Payment terms (NET-7, NET-30, COD) saved and auto-applied to invoices',
        ],
      },
      {
        id: 'sup-ledger',
        title: 'Supplier Ledger & Transaction History',
        subtitle: '/suppliers/:id/ledger',
        status: S.PLANNED,
        checks: [
          'Ledger shows POs, GRNs, invoices, payments, and credit notes in order',
          'Running balance = sum of all invoices - payments + debit notes',
          'Filter ledger by date range, transaction type, and amount bracket',
          'Export ledger to CSV/PDF for audit',
          'Drill-down on any ledger line opens the source document',
          'Reconciliation status flag: matched vs unmatched line items',
        ],
      },
      {
        id: 'sup-payables-aging',
        title: 'Accounts Payable & Aging',
        subtitle: '/suppliers/payables',
        status: S.PLANNED,
        checks: [
          'AP aging buckets: current, 1-30, 31-60, 61-90, 90+ days overdue',
          'Total overdue amount matches sum of all unpaid invoices past due date',
          'Aging report exports with supplier name, invoice numbers, and amounts',
          'Payment run: select multiple invoices, generate batch payment file',
          'Early-payment discount shows net amount after discount for eligible terms',
          'Interest on overdue payables calculates at configured daily rate',
        ],
      },
      {
        id: 'sup-performance',
        title: 'Supplier Performance Scoring',
        subtitle: '/suppliers/:id/performance',
        status: S.PLANNED,
        checks: [
          'On-time delivery score = (on-time deliveries ÷ total deliveries) × 100',
          'Quality score = (accepted qty ÷ received qty) × 100',
          'Price compliance score = (PO price matched invoices ÷ total invoices) × 100',
          'Composite score = weighted average of delivery, quality, and price scores',
          'Performance trend chart shows monthly score over last 12 months',
          'Scorecard exports as PDF for supplier review meeting',
          'Low-score alert flags supplier for review when composite < threshold',
        ],
      },
      {
        id: 'sup-abc',
        title: 'ABC Segmentation & Analytics',
        subtitle: '/suppliers/segments',
        status: S.PLANNED,
        checks: [
          'A-class = top 20% of suppliers by spend (cumulative 80% of total spend)',
          'B-class = next 30% of suppliers (cumulative 15% of spend)',
          'C-class = bottom 50% of suppliers (remaining 5% of spend)',
          'Reclassification runs automatically monthly or on demand',
          'Segment filter on supplier list shows only A / B / C suppliers',
          'Annual spend ranking table with YoY growth % per supplier',
        ],
      },
    ],
  },

  // ── 4 · Customer CRM & Loyalty ──────────────────────────────────────────────
  {
    id: 'customer-crm',
    icon: 'crm',
    title: '4 · Customer CRM & Loyalty',
    subtitle: '7 suites · 52 test cases · Profiles, Points, Tiers, Coupons, RFM, CLV, Feedback',
    suites: [
      {
        id: 'crm-customer-master',
        title: 'Customer Master & Profile',
        subtitle: '/crm/customers  ·  /crm/customers/:id',
        status: S.PLANNED,
        checks: [
          'Customer auto-creates from first phone/QR order with phone as unique key',
          'Manual create: name, phone, email, birthday, dietary preference saved',
          'Search by phone, email, or name returns exact and fuzzy matches',
          'Duplicate customer merge consolidates order history, points, and coupons',
          'Order history tab shows all past orders with amounts and dates',
          'GDPR-style data anonymisation: replace personal data with hashed values',
          'Customer notes field for staff to record preferences (e.g., allergies)',
        ],
      },
      {
        id: 'crm-loyalty-account',
        title: 'Loyalty Account & Points Engine',
        subtitle: '/crm/loyalty',
        status: S.PLANNED,
        checks: [
          'Point earn on order = order_total × (earn_rate / 100), rounded down',
          'Minimum order threshold for point earn enforced correctly',
          'Excluded categories (alcohol, delivery fee) do not earn points',
          'Redemption: 100 points = configured currency value; deducted at checkout',
          'Insufficient balance on redemption returns validation error',
          'Point transaction history shows earn/redeem/expire with order references',
          'Points balance updated in real time on order completion',
          'Retroactive point award: admin can credit points with audit reason',
        ],
      },
      {
        id: 'crm-tier-engine',
        title: 'Tier Progression & Benefits',
        subtitle: '/crm/tiers',
        status: S.PLANNED,
        checks: [
          'Tiers (Bronze, Silver, Gold, Platinum) defined with spend thresholds',
          'Upgrade triggers when cumulative spend or points cross tier threshold',
          'Tier upgrade notification sent to customer with new benefits summary',
          'Downgrade applies at configured review period (monthly/quarterly/annually)',
          'Tier earn multiplier (Gold = 2× points) applies correctly at checkout',
          'Tier benefits (free item, priority reservation) enforced at POS',
          'Manual tier override by admin creates audit record with reason',
        ],
      },
      {
        id: 'crm-coupon-engine',
        title: 'Coupon & Discount Engine',
        subtitle: '/crm/coupons',
        status: S.PLANNED,
        checks: [
          'Create coupon: type (%, fixed, BOGO), value, validity window, usage limits',
          'Minimum order amount gate blocks coupon if order is below threshold',
          'Per-customer usage limit: customer cannot use same coupon twice if limit=1',
          'Category restriction: coupon valid only on main courses, not beverages',
          'Delivery-only coupon blocked on dine-in order and vice versa',
          'Stackability flag: if non-stackable, second coupon application is blocked',
          'Expired coupon returns clear error with expiry date shown',
          'Usage analytics: times used, total discount given, revenue impact',
        ],
      },
      {
        id: 'crm-rfm',
        title: 'RFM Segmentation',
        subtitle: '/crm/rfm',
        status: S.PLANNED,
        checks: [
          'RFM scores from order history: Recency (days since last), Frequency, Monetary',
          'Quintile scoring assigns 1-5 to each dimension; composite = R+F+M',
          'Champions (high R, F, M) vs At-Risk (low R, high F/M) segments identified',
          'Segment membership updates on each order cycle (daily batch or real-time)',
          'Segment filter on customer list returns correct customer count',
          'RFM export: customer list with R, F, M scores and segment label',
          'Campaign targeting: send promotion to specific RFM segment',
        ],
      },
      {
        id: 'crm-clv-cohort',
        title: 'Customer Lifetime Value & Cohort Analytics',
        subtitle: '/crm/clv  ·  /crm/cohorts',
        status: S.PLANNED,
        checks: [
          'CLV = Average Order Value × Purchase Frequency × Customer Lifespan',
          'CLV trend chart shows monthly CLV trajectory per cohort',
          'Cohort retention matrix: % of month-1 customers returning in month N',
          'Cohort grouped by first-visit month; retention shown in heat-map table',
          'High-CLV customer flag in customer list for targeted retention',
          'Churned customer detection: no order in last N days (configurable)',
        ],
      },
      {
        id: 'crm-feedback',
        title: 'Feedback, Ratings & Reputation',
        subtitle: '/crm/feedback',
        status: S.PLANNED,
        checks: [
          'Post-order feedback link sent via SMS/email after order closes',
          'Rating scale 1-5 saved with category (food, service, ambience, delivery)',
          'Low-rating (1-2) feedback triggers manager alert notification',
          'Moderation workflow: pending → published / rejected with reason',
          'Average rating on dashboard; drilldown shows per-category breakdown',
          'Feedback export: CSV with order ref, rating, category, comment, date',
          'Public reply by manager recorded and associated with feedback entry',
        ],
      },
    ],
  },

  // ── 5 · Expense Management ──────────────────────────────────────────────────
  {
    id: 'expense-management',
    icon: 'expense',
    title: '5 · Expense Management',
    subtitle: '4 suites · 30 test cases · Capture, Approval, Recurring, Budget vs Actual',
    suites: [
      {
        id: 'exp-entry',
        title: 'Expense Capture & Categories',
        subtitle: '/expenses/entry',
        status: S.PLANNED,
        checks: [
          'Create expense: date, category, amount (with currency), description, branch',
          'Receipt upload stores image/PDF; preview renders in record detail',
          'Mandatory fields enforced: category, amount > 0, date not in closed period',
          'Expense category hierarchy: Utilities → Electricity, Utilities → Water etc.',
          'Tax-deductible flag affects VAT input claim calculation',
          'Edit expense in draft state only; submitted/approved expenses read-only',
          'Bulk import via CSV with row-level validation and error reporting',
        ],
      },
      {
        id: 'exp-approval',
        title: 'Approval Workflow',
        subtitle: '/expenses/approval',
        status: S.PLANNED,
        checks: [
          'Submit expense moves status draft → submitted; manager notified',
          'Manager approve moves status to approved; GL posting triggered',
          'Manager reject requires reason; expense returns to draft with rejection note',
          'Approval threshold: expenses below configured amount auto-approve',
          'Escalation: unapproved expenses after N days escalate to senior manager',
          'Approval trail: each status change records actor, timestamp, and comment',
          'Bulk approve: manager can approve multiple expenses in one action',
        ],
      },
      {
        id: 'exp-recurring',
        title: 'Recurring Expense Engine',
        subtitle: '/expenses/recurring',
        status: S.PLANNED,
        checks: [
          'Define recurring template: frequency (daily/weekly/monthly), amount, category',
          'Schedule generates draft expense entries automatically on due date',
          'Pause recurring stops generation without deleting template',
          'Resume recurring restarts from next scheduled date',
          'Edit recurring template: future entries update; past entries unchanged',
          'Delete recurring confirms and shows count of upcoming entries cancelled',
        ],
      },
      {
        id: 'exp-budget',
        title: 'Budget vs Actual & Analytics',
        subtitle: '/expenses/budget',
        status: S.PLANNED,
        checks: [
          'Define monthly budget per expense category',
          'Budget vs actual widget shows spend %, with red flag when > 100%',
          'Overspend alert notifies manager when category exceeds budget',
          'Year-to-date expense chart by category shows spend trend',
          'Export expense report: date range, category breakdown, approval status',
          'Top-5 expense categories pie chart matches underlying transaction data',
        ],
      },
    ],
  },

  // ── 6 · Accounting Module ───────────────────────────────────────────────────
  {
    id: 'accounting-module',
    icon: 'accounting',
    title: '6 · Accounting Module',
    subtitle: '6 suites · 46 test cases · COA, Double-Entry, Bank Recon, VAT, P&L, Period Close',
    suites: [
      {
        id: 'acc-coa',
        title: 'Chart of Accounts',
        subtitle: '/accounting/coa',
        status: S.PLANNED,
        checks: [
          'COA supports: Asset, Liability, Equity, Revenue, Expense account types',
          'Account hierarchy: 4-digit group code → sub-accounts (e.g., 4100 → 4110)',
          'System accounts (Sales Revenue, COGS, AP, AR) cannot be deleted',
          'Create custom account: code, name, type, normal balance (Dr/Cr)',
          'Duplicate account code blocked with validation error',
          'Inactive account hidden from entry dropdowns but retained in history',
          'COA export to Excel/CSV includes code, name, type, and current balance',
        ],
      },
      {
        id: 'acc-journal',
        title: 'Journal Entry Engine (Double-Entry)',
        subtitle: '/accounting/journal',
        status: S.PLANNED,
        checks: [
          'Manual journal: debit lines and credit lines must balance (sum Dr = sum Cr)',
          'Unbalanced journal entry blocked at save with balance difference shown',
          'Auto-journal on order close: Dr Cash/AR, Cr Revenue, Cr Tax Payable',
          'Auto-journal on expense approval: Dr Expense account, Cr AP/Cash',
          'Reverse journal creates equal and opposite entries with reference to original',
          'Trial balance after journals: total debits = total credits at all times',
          'Audit trail: each journal entry records preparer, approver, timestamp',
          'Post to closed period blocked; requires period re-open with manager auth',
        ],
      },
      {
        id: 'acc-bank-recon',
        title: 'Bank Reconciliation',
        subtitle: '/accounting/bank-reconciliation',
        status: S.PLANNED,
        checks: [
          'Upload bank statement CSV; system maps entries to GL cash transactions',
          'Auto-match: identical date + amount pairs matched automatically',
          'Manual match: user can match statement line to one or more GL entries',
          'Outstanding items (in books, not in statement) listed separately',
          'Deposits in transit (in statement, not yet in books) shown clearly',
          'Reconciliation closing balance = statement closing balance when complete',
          'Reconciliation PDF report signed off and archived for audit',
        ],
      },
      {
        id: 'acc-vat',
        title: 'VAT Ledger & Tax Returns',
        subtitle: '/accounting/vat',
        status: S.PLANNED,
        checks: [
          'Output VAT (collected on sales) aggregated from all closed orders by period',
          'Input VAT (paid on purchases) aggregated from approved invoices',
          'VAT payable = Output VAT - Input VAT for the period',
          'VAT return summary shows by rate (standard, reduced, zero) with amounts',
          'Exempt and zero-rated sales correctly excluded from VAT payable calculation',
          'Export VAT return in required format (CSV, Excel)',
          'VAT period lock prevents changes to closed VAT periods without admin override',
        ],
      },
      {
        id: 'acc-pl-bs',
        title: 'P&L, Balance Sheet & Cash Flow',
        subtitle: '/accounting/reports',
        status: S.PLANNED,
        checks: [
          'P&L: Gross Profit = Revenue - COGS; Net Profit = Gross - Operating Expenses',
          'Balance Sheet: Total Assets = Total Liabilities + Total Equity (always balanced)',
          'Cash Flow: Operating, Investing, Financing activities separated correctly',
          'Comparative P&L: current period vs prior period with % variance column',
          'Branch filter: individual branch P&L and consolidated view both supported',
          'Export all financial reports to PDF and Excel with proper formatting',
          'Data as-of-date: reports can be generated for any historical date',
        ],
      },
      {
        id: 'acc-period-close',
        title: 'Period Close & Year-End',
        subtitle: '/accounting/periods',
        status: S.PLANNED,
        checks: [
          'Month-end close checklist: all journals posted, bank reconciled, VAT filed',
          'Soft close: prevents new transactions but allows adjustments',
          'Hard close: fully locks period; requires admin to re-open',
          'Year-end: retained earnings journal transfers P&L balance to equity',
          'Carry-forward: opening balances for new year generated from prior year close',
          'Period close audit log records who closed, when, and any overrides used',
        ],
      },
    ],
  },

  // ── 7 · Staff Attendance & Payroll ──────────────────────────────────────────
  {
    id: 'staff-attendance-payroll',
    icon: 'hr',
    title: '7 · Staff Attendance & Payroll',
    subtitle: '6 suites · 44 test cases · Shifts, Clock-In, Overtime, Payroll Run, Tips, Payslips',
    suites: [
      {
        id: 'hr-shifts',
        title: 'Shift Scheduling',
        subtitle: '/hr/shifts',
        status: S.PLANNED,
        checks: [
          'Create shift: name, start time, end time, break duration, branch assignment',
          'Assign staff to shift for specific date range or recurring pattern',
          'Schedule conflict (same staff, two overlapping shifts) is blocked with error',
          'Copy-week feature duplicates shift assignments to next week',
          'Staff self-view of upcoming shifts on profile/schedule screen',
          'Unassigned shift slots shown in management schedule view',
        ],
      },
      {
        id: 'hr-attendance',
        title: 'Attendance & Clock-In / Clock-Out',
        subtitle: '/hr/attendance  ·  /hr/clock',
        status: S.PLANNED,
        checks: [
          'Clock-in via PIN/card/biometric records timestamp and matched shift',
          'Late clock-in (> grace period) flagged as late with minutes late recorded',
          'Absent (no clock-in by shift start + N minutes) automatically marked absent',
          'GPS metadata attached to clock-in for delivery rider verification',
          'Clock-out records worked_minutes = clock_out - clock_in - break_minutes',
          'Manual attendance correction by admin creates audit entry with original values',
          'Monthly attendance summary: present, absent, late, leave days per staff',
        ],
      },
      {
        id: 'hr-overtime',
        title: 'Overtime Calculation',
        subtitle: '/hr/overtime',
        status: S.PLANNED,
        checks: [
          'Overtime = worked_minutes - scheduled_minutes when positive',
          'Daily OT cap: hours beyond configured daily limit classified as OT',
          'Weekly OT threshold: total hours beyond configured weekly limit triggers OT rate',
          'OT multiplier (1.5×, 2×) applied correctly for weekday vs holiday OT',
          'Public holiday work adds correct premium rate on top of regular pay',
          'OT approval workflow: staff claims → manager approves before payroll',
          'OT report shows per-staff OT hours and cost for payroll review',
        ],
      },
      {
        id: 'hr-payroll-run',
        title: 'Payroll Run & Gross / Net Calculation',
        subtitle: '/hr/payroll',
        status: S.PLANNED,
        checks: [
          'Payroll run initiated for specific month; draft records created for all active staff',
          'Gross pay = base salary + OT pay + allowances + bonuses + commissions',
          'Deductions = income tax + pension/PF + other configured deductions',
          'Net pay = gross - deductions; verified against payslip total',
          'Process payroll posts salary expense journal entries to GL',
          'Bank transfer file generated in standard CSV format for bulk payment',
          'Payroll lock: processed payroll cannot be edited; requires reversal workflow',
          'Payroll variance report: compare current month vs prior month per staff',
        ],
      },
      {
        id: 'hr-tips',
        title: 'Tips & Commission Distribution',
        subtitle: '/hr/tips  ·  /hr/commissions',
        status: S.PLANNED,
        checks: [
          'Tip pool distribution method: equal split, hours-weighted, or orders-weighted',
          'Individual tip assignment: customer tips specific waiter directly',
          'Rider delivery commission = configured rate per delivery or % of order value',
          'Bonus rules: top-performer bonus triggers when sales target met',
          'Tips and commissions merged into payroll gross pay correctly',
          'Commission statement per rider shows delivery count, value, and commission total',
        ],
      },
      {
        id: 'hr-payroll-reports',
        title: 'Payroll Reports & Payslips',
        subtitle: '/hr/payslips  ·  /hr/reports',
        status: S.PLANNED,
        checks: [
          'Individual payslip PDF contains all earnings, deductions, and net pay',
          'YTD payslip accumulates gross and tax year-to-date correctly',
          'Payroll summary report: total gross, deductions, net by department',
          'Staff attendance report: present, absent, late, OT hours per period',
          'Salary slip emailed to staff on payroll process with PDF attachment',
          'Payroll GL reconciliation: posted journal totals match payroll run totals',
        ],
      },
    ],
  },

  // ── 8 · QR Ordering System ──────────────────────────────────────────────────
  {
    id: 'qr-ordering-system',
    icon: 'qr',
    title: '8 · QR Ordering System',
    subtitle: '4 suites · 30 test cases · Setup, Self-Order Menu, Cart/Pay, Status & Feedback',
    suites: [
      {
        id: 'qr-setup',
        title: 'QR Code Management & Setup',
        subtitle: '/qr/setup  ·  /qr/codes',
        status: S.PLANNED,
        checks: [
          'Generate unique QR per table; QR encodes signed URL with table_id + token',
          'Batch print generates printable A4/tent-card PDF for all tables',
          'Re-issue QR invalidates previous token (old QR must not open session)',
          'Branded QR: embed restaurant logo and colours in QR print template',
          'QR scan redirects to mobile-optimised menu URL for that table',
          'Admin dashboard shows which tables have active QR sessions',
        ],
      },
      {
        id: 'qr-menu-session',
        title: 'Customer-Facing Menu & Session',
        subtitle: '/qr/:table_id/menu',
        status: S.PLANNED,
        checks: [
          'Scan creates anonymous session_token; session linked to table_id',
          'Menu renders category tabs, item cards with images, prices, and allergen info',
          "Items marked 86'd show as unavailable and cannot be added",
          'Modifier selection modal enforces min/max group rules before add-to-cart',
          'Session timeout expires the QR session safely after configured inactivity',
          'Multiple customers at same table share the same session/cart',
          'Language switcher changes menu language instantly (if multi-language enabled)',
        ],
      },
      {
        id: 'qr-cart-payment',
        title: 'Cart Management, Bill & Payment',
        subtitle: '/qr/:session/cart  ·  /qr/:session/payment',
        status: S.PLANNED,
        checks: [
          'Add/remove/update quantity in cart; subtotal, VAT, and total recalculate',
          'Place order sends ticket to kitchen KDS and creates order in backend',
          'Request bill notifies waiter and freezes cart from further changes',
          'Bill shows itemised list with VAT breakdown and service charge',
          'Mobile payment (card) processes and marks order paid',
          'Cash payment option triggers waiter notification to collect payment',
          'Payment confirmation shows receipt with order number and thank-you message',
          'Failed payment restores order to awaiting_payment state without data loss',
        ],
      },
      {
        id: 'qr-tracking-feedback',
        title: 'Order Status Tracking & Feedback',
        subtitle: '/qr/:session/status  ·  /qr/:session/feedback',
        status: S.PLANNED,
        checks: [
          'Status timeline shows: ordered → preparing → ready → served in real time',
          'Socket.IO update pushes kitchen status to customer screen without refresh',
          'Post-payment feedback prompt appears automatically after order close',
          'Rating 1-5 stars per category (food, service, ambience) captured',
          'Feedback comment saved with order and session references',
          'Customer can re-order from history in same session',
        ],
      },
    ],
  },

  // ── 9 · Delivery Fleet Management ──────────────────────────────────────────
  {
    id: 'delivery-fleet',
    icon: 'fleet',
    title: '9 · Delivery Fleet Management',
    subtitle: '5 suites · 38 test cases · Riders, Zones, Assignment, Tracking, Commissions',
    suites: [
      {
        id: 'fleet-rider',
        title: 'Rider Onboarding & Profile',
        subtitle: '/fleet/riders',
        status: S.PLANNED,
        checks: [
          'Create rider profile: name, phone, vehicle type, license, insurance expiry',
          'License and insurance expiry alerts fire N days before expiration',
          'Rider status: active, on_shift, on_delivery, off_shift, suspended',
          'Document upload: license scan, insurance certificate stored securely',
          'Suspended rider blocked from assignment with clear status message',
          'Rider rating history shows customer feedback scores per delivery',
          'Bank account for commission payout stored and masked for display',
        ],
      },
      {
        id: 'fleet-zones',
        title: 'Delivery Zone & Pricing Setup',
        subtitle: '/fleet/zones',
        status: S.PLANNED,
        checks: [
          'Define zone by radius (km) or polygon boundary on map',
          'Zone-based delivery fee: flat fee or per-km rate configured per zone',
          'Zone ETA estimate: configured average delivery time shown to customer',
          'Order destination must fall within at least one active zone',
          'Multiple zones can overlap; highest-priority zone fee applies',
          'Zone disable flag immediately stops new orders from selecting that zone',
        ],
      },
      {
        id: 'fleet-assignment',
        title: 'Order Assignment Engine',
        subtitle: '/fleet/assignments',
        status: S.PLANNED,
        checks: [
          'Auto-assign: selects available rider in matching zone with lowest current load',
          'Manual override: manager reassigns to specific rider with reason',
          'Rejection by rider: order re-queued for reassignment; max retries configurable',
          'Assignment notification sent to rider (in-app/push/SMS)',
          'Simultaneous assignment: same order cannot be assigned to two riders',
          'Assignment history: timestamps of assignment, acceptance, rejection',
        ],
      },
      {
        id: 'fleet-tracking',
        title: 'Live Delivery Tracking',
        subtitle: '/fleet/tracking',
        status: S.PLANNED,
        checks: [
          'Rider status transitions: assigned → picked_up → in_transit → delivered',
          'GPS location updates every N seconds from rider app to Socket.IO',
          'Ops dashboard map shows all active deliveries with rider positions',
          'Customer status page shows estimated ETA based on last GPS ping',
          'Failed delivery: rider records reason (no answer, wrong address, closed)',
          'Delivery SLA alert: order approaching max delivery time threshold',
        ],
      },
      {
        id: 'fleet-commission',
        title: 'Rider Commission & Payout',
        subtitle: '/fleet/commissions',
        status: S.PLANNED,
        checks: [
          'Base commission = configured rate per completed delivery',
          'Value-based commission = % of order value for high-value orders',
          'Performance bonus triggers when monthly deliveries exceed target',
          'Rating bonus: average customer rating ≥ threshold adds bonus per delivery',
          'Monthly commission statement: delivery count, base, bonuses, total payable',
          'Commission syncs into HR payroll module for net-pay calculation',
          'Dispute mechanism: rider can flag incorrect commission with evidence',
        ],
      },
    ],
  },

  // ── 10 · Advanced Reservation System ────────────────────────────────────────
  {
    id: 'advanced-reservation',
    icon: 'reservation',
    title: '10 · Advanced Reservation System',
    subtitle: '5 suites · 36 test cases · Floor Map, Booking, Deposits, Waitlist, Analytics',
    suites: [
      {
        id: 'res-floor-map',
        title: 'Floor Map & Table Allocation Setup',
        subtitle: '/reservations/floor-map',
        status: S.PLANNED,
        checks: [
          'Drag-and-drop floor editor positions tables with shape, capacity, and section',
          'Table states: available, reserved, seated, blocked shown in distinct colours',
          'Auto-allocation suggests best-fit table for party size with preference notes',
          'Specific table request by customer blocks that slot from other bookings',
          'Combination tables: adjacent tables can be merged for large-party booking',
          'Floor map view syncs with live POS table status in real time',
        ],
      },
      {
        id: 'res-booking-engine',
        title: 'Booking Engine & Confirmation Flow',
        subtitle: '/reservations/book',
        status: S.PLANNED,
        checks: [
          'Web/phone booking: date, time, party size, dietary preferences, special requests',
          'Double-booking detection: same table + overlapping time slot blocked',
          'Availability check accounts for turn-time (e.g., 90-min slot per booking)',
          'Confirmation: auto-email/SMS with booking reference, date, party size, map link',
          'Modification: change date/time/size; availability re-checked',
          'Cancellation: releases table, notifies customer, creates cancellation record',
          'Walk-in conversion: walk-in guests converted to seated order in one action',
          'Group booking (> configured size) routed for manual approval',
        ],
      },
      {
        id: 'res-deposit',
        title: 'Deposit Booking & Refund Policy',
        subtitle: '/reservations/deposits',
        status: S.PLANNED,
        checks: [
          'Deposit rule: required for party sizes above N or booking value above threshold',
          'Deposit payment via card/link; pending status until payment confirmed',
          'Full refund if cancelled before cut-off date/time (configurable)',
          'Partial refund (50%) if cancelled within late-cancellation window',
          'No refund (forfeit) if no-show or cancel after deadline',
          'Deposit deducted from final bill at checkout automatically',
          'Deposit reconciliation report: collected, forfeited, refunded, pending',
        ],
      },
      {
        id: 'res-waitlist',
        title: 'Waitlist Management',
        subtitle: '/reservations/waitlist',
        status: S.PLANNED,
        checks: [
          'Add to waitlist when no availability; position and estimated wait shown',
          'Auto-notify next waitlist entry when cancellation creates a slot',
          'No-response within N minutes removes entry and notifies next in queue',
          'Waitlist position updates in real time as queue moves',
          'Walk-in waitlist entry created from hostess screen quickly',
          'Waitlist analytics: average wait time, conversion rate, no-response rate',
        ],
      },
      {
        id: 'res-analytics',
        title: 'Reservation Analytics & Revenue Impact',
        subtitle: '/reservations/analytics',
        status: S.PLANNED,
        checks: [
          'No-show rate = (no_shows / total reservations) × 100 for period',
          'Cancellation rate and average notice period calculated for period',
          'Peak booking hours heatmap shows demand by day-of-week × time-of-day',
          'Average covers per booking by section and day type (weekday/weekend)',
          'Revenue impact: estimated lost revenue from no-shows at average spend',
          'Conversion funnel: inquiries → confirmed → seated → completed',
        ],
      },
    ],
  },

  // ── 11 · Multi-Branch Management ────────────────────────────────────────────
  {
    id: 'multi-branch',
    icon: 'branch',
    title: '11 · Multi-Branch Management',
    subtitle: '4 suites · 28 test cases · Setup, Isolation, Transfers, Central Dashboard',
    suites: [
      {
        id: 'branch-setup',
        title: 'Branch Setup & Configuration',
        subtitle: '/branches  ·  /branches/:id/settings',
        status: S.PLANNED,
        checks: [
          'Create branch: name, address, phone, manager assignment, currency, timezone',
          'Branch-specific VAT rate overrides global default correctly',
          'Menu visibility: items can be enabled/disabled per branch',
          'Branch-level pricing override: same item can have different price per branch',
          'Branch code (prefix) used on order numbers (e.g., B01-ORD-1234)',
          'Deactivate branch: hides from active dashboards but retains all historical data',
        ],
      },
      {
        id: 'branch-isolation',
        title: 'Data Isolation & Role Scoping',
        subtitle: '/branches/:id  ·  RBAC per branch',
        status: S.PLANNED,
        checks: [
          'Branch-scoped user can only see and create records for their branch',
          'Cross-branch data access blocked at API level with 403 response',
          'Central admin can view all branches; branch manager sees only own branch',
          'Audit log records branch_id on every transaction for traceability',
          'Report filter by branch returns data isolated to that branch exactly',
          "Socket.IO room isolation: branch A staff don't receive branch B events",
        ],
      },
      {
        id: 'branch-transfer',
        title: 'Inter-Branch Stock Transfer',
        subtitle: '/branches/transfers',
        status: S.PLANNED,
        checks: [
          'Request transfer: source branch, destination branch, items, quantities',
          'Dispatch transfer: reduces source branch stock immediately',
          'Receive transfer: increases destination branch stock on acceptance',
          'Variance on receive: items rejected/short creates variance record',
          'In-transit status visible on both source and destination dashboards',
          'Transfer audit trail: requested_by, dispatched_by, received_by, timestamps',
          'Transfer value posts inter-branch GL entries to keep accounts balanced',
        ],
      },
      {
        id: 'branch-central-dash',
        title: 'Centralized KPI Dashboard & Consolidation',
        subtitle: '/branches/dashboard  ·  /branches/reports',
        status: S.PLANNED,
        checks: [
          'Central dashboard aggregates revenue, orders, covers across all branches',
          'Branch comparison cards: revenue, avg check, order count side-by-side',
          'Consolidated P&L sums all branch P&Ls; intra-branch eliminations applied',
          'Branch ranking table: sortable by revenue, growth %, average check',
          'Drill-down: click branch card to navigate to branch-specific dashboard',
          'Global date range filter applies consistently to all consolidated metrics',
          'Export consolidated report to Excel with per-branch breakdown sheets',
        ],
      },
    ],
  },

  // ── 12 · Business Intelligence ──────────────────────────────────────────────
  {
    id: 'business-intelligence',
    icon: 'bi',
    title: '12 · Business Intelligence',
    subtitle: '5 suites · 37 test cases · Peak Hour, Menu Engineering, Cohorts, Forecasting, Profitability',
    suites: [
      {
        id: 'bi-peak-hour',
        title: 'Peak-Hour & Demand Analytics',
        subtitle: '/bi/peak-hours',
        status: S.PLANNED,
        checks: [
          'Heatmap: order volume by hour-of-day × day-of-week over selected period',
          'Peak-hour windows identified with top-3 busiest slots highlighted',
          'Revenue per hour chart matches aggregated order totals for that hour',
          'Covers per hour shows capacity utilisation vs available seats',
          'YoY peak-hour comparison shows demand growth or shift in patterns',
          'Staffing recommendation aligns suggested headcount with demand curve',
          'Holiday and special event tagging shows their impact on demand patterns',
        ],
      },
      {
        id: 'bi-menu-engineering',
        title: 'Menu Engineering Matrix (PLU Mix)',
        subtitle: '/bi/menu-engineering',
        status: S.PLANNED,
        checks: [
          'Stars (high popularity, high margin) correctly identified in quadrant chart',
          'Ploughhorses (high popularity, low margin) flagged for price review',
          'Puzzles (low popularity, high margin) flagged for promotion recommendation',
          'Dogs (low popularity, low margin) flagged for menu removal',
          'Contribution margin per item = (selling price - food cost) × sales volume',
          'Category filter allows matrix view per section (starters, mains)',
          'Time-period comparison: matrix for current vs prior period shows PLU migration',
          'Export matrix to Excel with all items, quadrant labels, and underlying metrics',
        ],
      },
      {
        id: 'bi-cohort',
        title: 'Customer Cohort & Retention Analysis',
        subtitle: '/bi/cohorts',
        status: S.PLANNED,
        checks: [
          'Cohort groups customers by first-visit month',
          'Retention % for month N = (active cohort customers in month N) / cohort size',
          'Heat-map table shows retention matrix with colour intensity by % value',
          'Average revenue per cohort member tracked over 12 months post-acquisition',
          'Payback period: months until CAC is recovered from cohort revenue',
          'Export cohort data as CSV for further analysis',
        ],
      },
      {
        id: 'bi-forecast',
        title: 'Demand Forecasting',
        subtitle: '/bi/forecast',
        status: S.PLANNED,
        checks: [
          '7-day forecast generated using rolling average + trend + seasonality factors',
          '14-day and 30-day forecasts available with widening confidence intervals',
          'Forecast accuracy (MAPE) calculated by comparing predictions vs actuals',
          'Holiday override: predicted uplift/downturn applied for known event dates',
          'Ingredient demand forecast derived from predicted order volumes × BOM quantities',
          'Forecast vs actual chart overlays to visualise model performance',
          'Confidence band (upper/lower) rendered on forecast chart',
        ],
      },
      {
        id: 'bi-profitability',
        title: 'Profitability & Margin Analysis',
        subtitle: '/bi/profitability',
        status: S.PLANNED,
        checks: [
          'Gross margin % = (Revenue - Food Cost) / Revenue × 100 per category and total',
          'Food cost % by category; colour-coded against target (green/amber/red)',
          'Labour cost % = total payroll / revenue × 100; trended by month',
          'EBITDA waterfall chart: Revenue → Gross Profit → EBITDA with each cost layer',
          'Item-level profitability: sorted by contribution margin descending',
          'Break-even analysis: fixed costs / weighted average contribution margin',
          'Profitability by day-part: breakfast, lunch, dinner, late-night compared',
        ],
      },
    ],
  },

  // ── 13 · Cross-Module Integration ───────────────────────────────────────────
  {
    id: 'integration-tests',
    icon: 'integration',
    title: '13 · Cross-Module Integration Tests',
    subtitle: '4 suites · 28 test cases · Order→Inventory→GL · Purchase→Pay · Ops→Payroll · Loyalty',
    suites: [
      {
        id: 'int-order-cogs',
        title: 'Order → Inventory Deduction → GL Posting',
        subtitle: 'Orders → Inventory → Accounting — end-to-end',
        status: S.PLANNED,
        checks: [
          'Order item close triggers BOM recipe deduction for each ordered item',
          'Stock ledger balance decreases by exact BOM quantities after order close',
          'COGS journal posts to GL: Dr COGS account, Cr Inventory account',
          'Revenue journal posts: Dr Cash/AR, Cr Sales Revenue, Cr Tax Payable',
          'Order cancellation reverses both stock deduction and GL postings',
          'Partial cancellation reverses only the cancelled item lines',
          'Low-stock alert fires if post-deduction qty falls below reorder point',
        ],
      },
      {
        id: 'int-purchase-pay',
        title: 'Purchase → GRN → Match → GL → Supplier Payment',
        subtitle: 'Purchase → Inventory → AP → Accounting — end-to-end',
        status: S.PLANNED,
        checks: [
          'PO confirmed → GRN received → stock ledger increases correctly',
          'Invoice uploaded → 3-way match triggered automatically',
          'Perfect match → invoice approved → AP journal posts (Dr Inventory, Cr AP)',
          'Payment processed → AP cleared (Dr AP, Cr Cash) → supplier ledger updated',
          'Supplier balance reduces by payment amount immediately',
          'Discrepancy on 3-way match holds invoice and prevents AP posting',
          'Return approved → stock reverses → debit note posts to supplier ledger',
        ],
      },
      {
        id: 'int-ops-payroll',
        title: 'Attendance + Delivery Commission → Payroll',
        subtitle: 'HR Attendance → OT → Commissions → Payroll GL',
        status: S.PLANNED,
        checks: [
          'Approved OT hours feed into payroll gross pay calculation correctly',
          'Approved rider commissions for the month merged into payroll totals',
          'Payroll run gross = base + OT + commissions + tips within rounding tolerance',
          'Salary expense GL journal matches payroll run totals exactly',
          'Net pay = gross - deductions; bank transfer file contains correct amounts',
          'Payroll GL reversal (if error) correctly unwinds all GL entries',
        ],
      },
      {
        id: 'int-loyalty-flow',
        title: 'Order → Points Earn → Tier Check → Redemption',
        subtitle: 'Orders → CRM Loyalty → Tier Engine — end-to-end',
        status: S.PLANNED,
        checks: [
          'Order close credits correct points to customer loyalty account',
          'Points earn excludes delivery fee and tax from base calculation',
          'Cumulative spend triggers tier upgrade at configured threshold',
          'Tier upgrade notification fires on same request that triggered the upgrade',
          'Redemption at next order reduces bill and deducts points atomically',
          'Redemption does not incorrectly change VAT base per configured setting',
          'CLV updates after each order completion within batch or real-time window',
        ],
      },
    ],
  },

  // ── 14 · Performance & Load Testing ────────────────────────────────────────
  {
    id: 'performance-tests',
    icon: 'performance',
    title: '14 · Performance & Load Testing',
    subtitle: '2 suites · 14 test cases · Concurrency, Throughput, Latency, Heavy Batch Jobs',
    suites: [
      {
        id: 'perf-concurrency',
        title: 'Concurrency & Throughput',
        subtitle: 'Concurrent orders, stock deductions, dashboard loads',
        status: S.PLANNED,
        checks: [
          '100 simultaneous order creates complete without errors or deadlocks',
          'Concurrent stock deductions do not oversell (race condition test)',
          'Consolidated dashboard loads in < 3 s with 12 months of data',
          'WebSocket room stays stable with 200 concurrent clients connected',
          'API p95 latency < 300 ms under 50 concurrent users on core routes',
          'Database connection pool does not exhaust under peak load',
          'Queue-backed jobs do not degrade user-facing API latency',
        ],
      },
      {
        id: 'perf-reporting',
        title: 'Heavy Job & Reporting Performance',
        subtitle: 'Exports, Payroll, Forecasting, Backup workloads',
        status: S.PLANNED,
        checks: [
          'Full inventory export (10,000 items) completes in < 30 s',
          'Monthly payroll run for 200 staff completes in < 60 s',
          '12-month P&L report generation completes in < 10 s',
          'Demand forecast job for full menu (500 items × 30 days) completes in < 120 s',
          'Database backup job completes without blocking write queries',
          'Large CSV import (5,000 rows) processes all rows with per-row error reporting',
          'Email batch (1,000 payslips) queued and dispatched without timeout',
        ],
      },
    ],
  },

  // ── 15 · Security & Compliance ──────────────────────────────────────────────
  {
    id: 'security-tests',
    icon: 'security',
    title: '15 · Security & Compliance',
    subtitle: '2 suites · 14 test cases · RBAC, Session, OWASP Top 10, Encryption, Audit',
    suites: [
      {
        id: 'sec-rbac',
        title: 'RBAC, Session & Access Control',
        subtitle: 'Role isolation, token lifecycle, privilege escalation prevention',
        status: S.READY,
        checks: [
          'Waiter JWT cannot access /api/users, /api/reports, /api/settings (returns 403)',
          'Kitchen JWT limited to kitchen and orders endpoints only',
          'JWT expiry enforced; server rejects token after exp claim passes',
          'Refresh token bound to device fingerprint; replay from different IP rejected',
          'Privilege escalation attempt (crafted JWT with role=admin) returns 403',
          'Inactive user JWT invalidated immediately on account deactivation',
          'Concurrent session limit enforced (max N sessions per user) if configured',
        ],
      },
      {
        id: 'sec-api',
        title: 'API & Data Security (OWASP Top 10)',
        subtitle: 'Injection, XSS, CORS, Rate-limiting, Encryption, Audit',
        status: S.READY,
        checks: [
          'SQL injection payloads in all input fields are neutralised (parameterised queries)',
          'XSS payload in order notes/customer name stored safely and rendered escaped',
          'CORS header allows only configured origins; wildcard blocked in production',
          'Rate limiter returns 429 after N requests per window from same IP',
          'Sensitive fields (bank account, NI number) stored encrypted at rest',
          'All API responses strip internal error details in production mode',
          'Audit trail captures: actor, IP address, action, entity, before/after, timestamp',
        ],
      },
    ],
  },
];

// ─── State builders ───────────────────────────────────────────────────────────
const buildInitialChecks = () => {
  const r = {};
  QA_SECTIONS.forEach((sec) =>
    sec.suites.forEach((suite) =>
      suite.checks.forEach((_, idx) => { r[`${sec.id}|${suite.id}|${idx}`] = false; })
    )
  );
  return r;
};

const STATUS_STYLE = {
  [S.READY]:       'bg-emerald-100 text-emerald-700',
  [S.PLANNED]:     'bg-amber-100 text-amber-700',
  [S.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function QaGuide() {
  const navigate = useNavigate();

  const [openSections, setOpenSections] = useState(() => {
    const r = {};
    QA_SECTIONS.forEach((sec, i) => { r[sec.id] = i === 0; });
    return r;
  });
  const [openSuites, setOpenSuites] = useState(() => {
    const r = {};
    QA_SECTIONS.forEach((sec, si) =>
      sec.suites.forEach((suite, ti) => { r[suite.id] = si === 0 && ti === 0; })
    );
    return r;
  });
  const [checked, setChecked] = useState(buildInitialChecks);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const overall = useMemo(() => {
    const vals = Object.values(checked);
    return { completed: vals.filter(Boolean).length, total: vals.length };
  }, [checked]);

  const pct = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0;

  const filteredSections = useMemo(() => {
    if (filterStatus === 'ALL') return QA_SECTIONS;
    return QA_SECTIONS.map((sec) => ({
      ...sec,
      suites: sec.suites.filter((s) => s.status === filterStatus),
    })).filter((sec) => sec.suites.length > 0);
  }, [filterStatus]);

  const getSuiteProg = (sec, suite) => {
    const done = suite.checks.filter((_, i) => checked[`${sec.id}|${suite.id}|${i}`]).length;
    return { done, total: suite.checks.length };
  };

  const handleTestClick = (suite) => {
    const link = SUITE_LINKS[suite.id];
    if (link) navigate(link);
    else setOpenSuites((p) => ({ ...p, [suite.id]: !p[suite.id] }));
  };

  return (
    <div className="animate-fade-in space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Checks', val: overall.total,                        color: 'text-slate-800' },
          { label: 'Completed',    val: overall.completed,                    color: 'text-emerald-600' },
          { label: 'Remaining',    val: overall.total - overall.completed,    color: 'text-amber-600' },
          { label: 'Progress',     val: pct + '%',                            color: 'text-sky-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">Overall QA Progress — FoodPark ERP (16 Modules)</span>
          <span className="text-sm font-bold text-sky-700">{pct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
            style={{ width: pct + '%' }}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filter:</span>
        {['ALL', S.READY, S.PLANNED, S.IN_PROGRESS].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterStatus(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              filterStatus === f
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-sky-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Section list */}
      <div className="rounded-2xl border border-slate-200 bg-slate-100/85 overflow-hidden">
        {filteredSections.map((sec) => {
          const IconComp = SECTION_ICONS[sec.icon] || ShieldCheckIcon;
          const allKeys = sec.suites.flatMap((s) =>
            s.checks.map((_, i) => `${sec.id}|${s.id}|${i}`)
          );
          const secDone = allKeys.filter((k) => checked[k]).length;

          return (
            <div key={sec.id} className="border-b border-slate-200 last:border-b-0">
              {/* Section header */}
              <button
                type="button"
                onClick={() => setOpenSections((p) => ({ ...p, [sec.id]: !p[sec.id] }))}
                className="w-full px-6 py-5 flex items-start justify-between text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 leading-tight">{sec.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{sec.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs font-bold text-slate-400">{secDone}/{allKeys.length}</span>
                  {openSections[sec.id]
                    ? <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    : <ChevronRightIcon className="h-5 w-5 text-slate-400" />}
                </div>
              </button>

              {/* Suites */}
              {openSections[sec.id] && (
                <div className="bg-white/50 border-t border-slate-200">
                  {sec.suites.map((suite) => {
                    const { done, total } = getSuiteProg(sec, suite);
                    const suiteLink = SUITE_LINKS[suite.id];
                    return (
                      <div key={suite.id} className="border-b border-slate-200 last:border-b-0 bg-slate-50/60">
                        <div className="px-6 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-6 w-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center shrink-0">
                              <CheckCircleIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-black text-slate-800">{suite.title}</h3>
                                <span className={`inline-flex items-center rounded-full text-xs font-bold px-2 py-0.5 tracking-wide ${STATUS_STYLE[suite.status] || STATUS_STYLE[S.PLANNED]}`}>
                                  {suite.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{suite.subtitle}</p>
                              {suiteLink && (
                                <div className="mt-1">
                                  <Link
                                    to={suiteLink}
                                    className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                                  >
                                    <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                    {suiteLink}
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-slate-400">{done}/{total}</span>
                            <button
                              type="button"
                              onClick={() => handleTestClick(suite)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-700 text-xs font-bold hover:bg-sky-200 transition-colors"
                            >
                              Test <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenSuites((p) => ({ ...p, [suite.id]: !p[suite.id] }))}
                              className="h-6 w-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center"
                            >
                              {openSuites[suite.id]
                                ? <ChevronDownIcon className="h-4 w-4" />
                                : <ChevronRightIcon className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {openSuites[suite.id] && (
                          <div className="px-6 pb-4 pt-1 bg-white border-t border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                              Checklist — {suite.checks.length} cases
                            </p>
                            <div className="space-y-1.5">
                              {suite.checks.map((item, idx) => {
                                const key = `${sec.id}|${suite.id}|${idx}`;
                                const isChecked = checked[key];
                                return (
                                  <label key={key} className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setChecked((p) => ({ ...p, [key]: !p[key] }))
                                      }
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 shrink-0"
                                    />
                                    <span className={`leading-snug ${isChecked ? 'line-through text-slate-400' : 'group-hover:text-slate-900'}`}>
                                      {item}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
