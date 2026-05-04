# 🧪 FoodPark ERP — Complete QA Guide

**Version**: 1.0  
**Last Updated**: May 4, 2026  
**Scope**: 12-Module Enterprise Restaurant Operating System  
**Test Coverage**: Functional, Integration, Performance, Security

---

## 📋 Quick Navigation

| Module | Pages | Test Cases | Status |
|--------|-------|-----------|--------|
| [A. Inventory Management](#module-a-inventory-management) | 8 pages | 45 test cases | [Test](#a-test-cases) |
| [B. Purchase Management](#module-b-purchase-management) | 6 pages | 38 test cases | [Test](#b-test-cases) |
| [C. Supplier Management](#module-c-supplier-management) | 5 pages | 32 test cases | [Test](#c-test-cases) |
| [D. Customer CRM & Loyalty](#module-d-customer-crm--loyalty) | 7 pages | 52 test cases | [Test](#d-test-cases) |
| [E. Expense Management](#module-e-expense-management) | 4 pages | 28 test cases | [Test](#e-test-cases) |
| [F. Accounting Module](#module-f-accounting-module) | 5 pages | 42 test cases | [Test](#f-test-cases) |
| [G. Staff Attendance & Payroll](#module-g-staff-attendance--payroll) | 6 pages | 40 test cases | [Test](#g-test-cases) |
| [H. QR Ordering System](#module-h-qr-ordering-system) | 4 pages | 28 test cases | [Test](#h-test-cases) |
| [I. Delivery Fleet Management](#module-i-delivery-fleet-management) | 5 pages | 35 test cases | [Test](#i-test-cases) |
| [J. Advanced Reservation](#module-j-advanced-reservation-system) | 5 pages | 32 test cases | [Test](#j-test-cases) |
| [K. Multi-Branch Management](#module-k-multi-branch-management) | 4 pages | 28 test cases | [Test](#k-test-cases) |
| [L. Business Intelligence](#module-l-business-intelligence) | 5 pages | 36 test cases | [Test](#l-test-cases) |

**Total**: 62 pages | 436 test cases | ~200 hours of QA work

---

# MODULE A: INVENTORY MANAGEMENT

## 📄 Pages to Test

1. **Inventory Dashboard** (`/inventory/dashboard`)
   - Stock value summary
   - Valuation method display
   - Alerts widget (low stock, overstock, expiry)
   - Stock turnover KPI

2. **Ingredients Master** (`/inventory/ingredients`)
   - List view with filters (category, status, supplier)
   - Create ingredient
   - Edit ingredient
   - Bulk import (CSV)
   - Barcode assignment

3. **Recipe Builder** (`/inventory/recipes`)
   - Create recipe
   - Edit recipe
   - Add ingredient lines
   - Sub-recipe selection
   - Auto-cost calculation
   - Recipe versioning

4. **Stock Ledger** (`/inventory/stock`)
   - Real-time stock view by location
   - Transaction history
   - Physical count interface
   - Barcode scanning

5. **Stock Adjustments** (`/inventory/adjustments`)
   - Create adjustment
   - Add line items
   - Submit for approval
   - Admin approval workflow
   - Finalize adjustment

6. **Waste Management** (`/inventory/waste`)
   - Record waste entry
   - Attach photo
   - Waste approval queue
   - Waste analytics report

7. **Inter-Branch Transfers** (`/inventory/transfers`)
   - Create transfer
   - Select items and quantities
   - Receiving confirmation
   - Transfer status tracking

8. **Expiry Management** (`/inventory/expiry`)
   - Expiry calendar view
   - Near-expiry alerts (7 days)
   - Expired items list
   - Mark items as archived

## 🧪 A. TEST CASES

### A.1 Ingredient Management
```
TC-A-001: Create Ingredient
- Navigate to Ingredients → Create
- Fill: SKU, Name, Category, UOM, Supplier, Min Stock, Max Stock
- Expected: Ingredient created, appears in list

TC-A-002: Validate SKU Uniqueness
- Create ingredient with SKU "ING-001"
- Try to create another with same SKU
- Expected: Error "SKU already exists"

TC-A-003: Bulk Import Ingredients
- Go to Ingredients → Import
- Upload valid CSV (sku, name, category, cost)
- Expected: All rows imported, confirmation message

TC-A-004: Invalid Bulk Import
- Upload CSV with invalid category_id
- Expected: Show error with row numbers, no data committed

TC-A-005: Ingredient Cost Update
- Change ingredient cost_per_unit from 25 to 30
- Expected: All dependent recipes auto-recalculate cost
- Verify: Recipe cost in recipe_details updated
```

### A.2 Recipe Management
```
TC-A-006: Create Simple Recipe
- Create recipe for "Margherita Pizza"
- Add 3 ingredients with quantities
- Expected: Recipe cost auto-calculated = sum of (qty * unit_cost)

TC-A-007: Add Sub-Recipe
- Create main recipe "Full Thali"
- Add sub-recipe "Dal Makhani" (already created)
- Expected: Ingredient costs of sub-recipe included in main recipe cost

TC-A-008: Recipe Versioning
- Create recipe v1 "Biryani"
- Click "Clone as New Version" → v2
- Modify ingredient quantities
- Expected: v1 and v2 exist separately, both can be used

TC-A-009: Optional Ingredients
- Create recipe with 2 required + 1 optional ingredient
- Stock deduct when order placed
- Expected: Only required ingredients deducted

TC-A-010: Circular Sub-Recipe Reference
- Create: A → B → C → A (circular)
- Expected: Error "Circular recipe reference detected"
```

### A.3 Stock Deduction on Orders
```
TC-A-011: Order Completes Payment, Stock Deducts
- Place order for "Biryani" (qty 2)
- Complete payment
- Expected: Stock deduced (0.4 kg flour, 200 ml oil if recipe calls for 0.2 kg flour per biryani)
- Verify: stock_ledger.available_quantity decreased
- Verify: stock_transaction created with type='order_deduction'

TC-A-012: Insufficient Stock Order Rejection
- Item needs 10 kg flour, only 5 kg available
- Place order
- Expected: Order creation blocked with "Insufficient stock" error
- Verify: No stock_transaction created

TC-A-013: Partial Stock Reserved
- Order status = pending (not paid)
- Expected: stock_ledger.reserved_quantity increases
- After cancellation: reserved_qty restored

TC-A-014: Multiple Concurrent Orders (Concurrency Test)
- 3 users place orders simultaneously for same ingredient
- Each needs 5 units, total available = 12 units
- Expected: 2 orders succeed, 1 fails with low stock
- Verify: SERIALIZABLE isolation prevents overselling
```

### A.4 Physical Stock Count
```
TC-A-015: Initiate Physical Count
- Go to Stock → Start Count
- System generates count sheet with all ingredients
- Expected: All ingredients listed with last_counted_date

TC-A-016: Barcode Scanning
- Use barcode scanner on ingredient
- Enter quantity on hand
- Expected: Quantity recorded, checksum validates barcode
- If invalid barcode: "Invalid barcode format" error

TC-A-017: Finalize Count with Variance
- Count shows variance: System=100, Physical=98
- Expected: Create stock_adjustment record
- Status: draft (awaiting approval)

TC-A-018: Stock Adjustment Approval
- Admin reviews adjustment with -2 unit variance
- Reason: "shrinkage"
- Click Approve
- Expected: Stock_transaction created (type: adjustment)
- Ledger updated: available_qty reduced by 2
```

### A.5 Stock Transfers (Multi-Branch)
```
TC-A-019: Create Transfer
- From: Branch 1 (Main) → To: Branch 2 (Downtown)
- Add: 25 kg flour from storage to downtown kitchen
- Expected: Transfer record created, status='pending'

TC-A-020: Approve Transfer
- Manager approves pending transfer
- Expected: Status → 'in_transit'
- Stock deducted from source: Branch 1 flour -25
- Stock reserved at destination: Branch 2 flour +0 (pending receipt)

TC-A-021: Receive Transfer
- Receiving manager receives transfer
- Confirm quantities (Accept or flag variance)
- Expected: Status → 'received'
- Stock added to destination
- Transfer complete

TC-A-022: Transfer Variance
- Transfer shows 25 kg expected, only 24 kg received
- Reason: "shortage"
- Expected: Adjustment created, -1 kg, reason=transfer_variance

TC-A-023: Cancel In-Transit Transfer
- Status = 'in_transit', click Cancel
- Expected: Status → 'cancelled'
- Source stock restored
- No destination update
```

### A.6 Waste Management
```
TC-A-024: Record Waste
- Ingredient: Flour, 5 kg, Reason: Expired
- Cost: 127.50
- Attach photo
- Expected: Waste entry created, status='pending'

TC-A-025: Waste Approval Workflow
- Kitchen staff records waste
- Manager approves
- Expected: status → 'approved'
- Stock deducted: 5 kg flour
- Stock_transaction created (type: waste)
- Cost recorded for COGS

TC-A-026: Waste Rejection
- Manager rejects waste (reason: not verified)
- Expected: status → 'rejected'
- No stock deduction
- Notification to staff

TC-A-027: Waste Analytics
- View waste report for month
- Expected: Total waste cost, waste %age of COGS, by reason breakdown

TC-A-028: Waste Expiry Tracking
- Filter waste by reason='expiry'
- Expected: Only expiry-related waste shown
- Calculate expiry loss rate = sum(waste) / avg_inventory * 100
```

### A.7 Expiry Management
```
TC-A-029: Expiry Tracking
- Goods received: Flour batch, expiry=2026-05-15
- Today: 2026-05-10
- Expected: Alert "Expires in 5 days"

TC-A-030: Near-Expiry List
- Go to Expiry → Near Expiry (7 days)
- Expected: All ingredients expiring in 7 days shown
- Sort by expiry_date ascending

TC-A-031: Expired Items
- Ingredient expiry_date < today
- Expected: Shows in Expired Items list
- Option to create waste entry

TC-A-032: FIFO Stock Deduction
- 2 batches: Batch A (expiry=2026-05-15), Batch B (expiry=2026-06-01)
- Order for 2 units
- Expected: Batch A deducted first (FIFO)
- Verify: stock_transactions record which batch used

TC-A-033: Batch Management
- Multiple batches same ingredient, different expiries
- Stock ledger tracks per batch
- Expected: Available shows older batches deducted first
```

### A.8 Valuation Methods
```
TC-A-034: FIFO Valuation
- Purchase 100 units at 20 each
- Purchase 100 units at 22 each
- Deduct 50 units
- Expected: Cost deduction = 50 * 20 = 1000 (oldest first)

TC-A-035: LIFO Valuation
- Same setup as FIFO
- Switch valuation method to LIFO
- Deduct 50 units
- Expected: Cost deduction = 50 * 22 = 1100 (newest first)

TC-A-036: WAC (Weighted Average Cost) Valuation
- Initial: 100 @ 20 = 2000
- Purchase: 50 @ 24 = 1200
- Total inventory value = 3200, total qty = 150
- WAC = 3200/150 = 21.33
- Deduct 75 units
- Expected: Cost deduction = 75 * 21.33 = 1600

TC-A-037: Change Valuation Method
- Current: FIFO, cost_per_unit = 20
- Change to: WAC
- Expected: cost_per_unit recalculated to WAC
- Flag for management review if margin changes > 5%

TC-A-038: Stock Valuation Report
- Run report: Valuation by method
- Expected: Total inventory value breakdown by item
- Verify: sum(qty * cost_per_unit) for all items
```

### A.9 Stock Alerts
```
TC-A-039: Low Stock Alert
- Flour: Current=50, Min Stock=75
- Expected: Alert shown on dashboard
- Action: "Auto-Create PO" button appears

TC-A-040: Overstock Alert
- Oil: Current=250, Max Stock=200
- Expected: Alert shown (Overstock condition)
- Action: Suggest: Stop ordering, increase usage

TC-A-041: Auto-PO Generation
- Click "Auto-Create PO" for low stock items
- Expected: Draft PO created with all low-stock items
- Grouped by supplier
- Ready for confirmation

TC-A-042: Stock Alert Email Notification
- Low stock triggered
- Expected: Email sent to procurement manager
- Include: Item name, current qty, reorder level

TC-A-043: Disable Alert for Item
- Click mute for "Special Ingredient"
- Expected: Alerts suppressed for this item
- Still tracks in background
```

### A.10 Integration with Orders
```
TC-A-044: Order → Recipe → Stock Deduction Chain
- Place order: "Chicken Biryani" qty 3
- Each biryani recipe needs: 200g chicken, 100ml oil, 150g rice
- Expected: Stock deducted: chicken -600g, oil -300ml, rice -450g
- Verify: All stock_transactions created correctly

TC-A-045: Multi-Item Order Stock Deduction
- Order: Biryani (2) + Naan (4) + Salad (3)
- Each item has recipe
- Expected: All ingredients deducted, calculate total recipe cost
- Compare with order food_cost

TC-A-046: Cancel Order → Restore Stock
- Cancel paid order (status=pending→cancelled)
- Expected: All stock deductions reversed
- Verify: Stock_transactions reversed with type='order_cancellation'
```

---

# MODULE B: PURCHASE MANAGEMENT

## 📄 Pages to Test

1. **PO Dashboard** (`/purchase/po-dashboard`)
   - PO status overview
   - Aging analysis
   - Supplier performance
   - GRN pending receipt

2. **Purchase Orders** (`/purchase/orders`)
   - Create PO
   - List POs with filters
   - Manual PO entry
   - Bulk import POs
   - Auto-create from low stock

3. **Goods Receiving** (`/purchase/receiving`)
   - Create GRN
   - Barcode scanning
   - Quantity variance handling
   - Batch number & expiry tracking

4. **Three-Way Match** (`/purchase/matching`)
   - PO vs GR vs Invoice matching
   - Variance detection
   - Approval workflow
   - Dispute resolution

5. **Purchase Returns** (`/purchase/returns`)
   - Create return
   - Approval workflow
   - Credit memo generation

6. **Supplier Invoices** (`/purchase/invoices`)
   - Invoice upload
   - Payment status tracking
   - Aging report

## 🧪 B. TEST CASES

### B.1 Purchase Order Creation
```
TC-B-001: Create Manual PO
- Supplier: Premium Flour Mills
- Items: Flour (100 kg @ 25), Oil (50 ltr @ 50)
- Expected: PO created, status='draft', total=3500

TC-B-002: Generate PO from Low Stock
- Run: Auto-create PO for supplier "Premium Mills"
- Expected: Draft PO with all low-stock items from that supplier
- Grouped by item

TC-B-003: Add Items to PO
- Draft PO created
- Add new line: Sugar 50 kg @ 18
- Expected: Line added, total updated to 3500 + 900 = 4400

TC-B-004: Remove PO Line
- Remove Flour from draft PO
- Expected: Line removed, total recalculated = 2500

TC-B-005: Confirm PO
- Status: draft → pending
- Expected: PO number generated (PO-2026-05-001)
- Email sent to supplier
- Cannot edit after confirmation
```

### B.2 Goods Receiving
```
TC-B-006: Create GRN for PO
- PO: 100 kg flour expected
- Create GRN with received qty=98 kg
- Reason: "short_ship"
- Expected: GRN created, variance recorded = -2 kg

TC-B-007: Over-Delivery GRN
- PO: 50 ltr oil expected
- GRN: 52 ltr received
- Expected: Variance = +2 ltr
- Action: Accept as credit or contact supplier

TC-B-008: Batch Number & Expiry
- GRN line: Flour batch=BATCH-001, expiry=2026-08-04
- Expected: Batch tracked in expiry_tracking table

TC-B-009: Barcode Scanning in GRN
- Scan flour barcode → auto-populate ingredient
- Enter quantity received
- Expected: Line added correctly

TC-B-010: Partial GRN Receipt
- PO for 100 units
- First GRN: Receive 60 units
- Second GRN: Receive 30 units (total=90, short 10)
- Expected: PO status → 'partial_receipt'

TC-B-011: Quality Rejection on GRN
- Flour received damaged, mark as rejected
- Quantity received = 0
- Expected: GRN shows variance=-100
- No stock added for rejected items
```

### B.3 Three-Way Match
```
TC-B-012: Perfect Match (PO=GR=Invoice)
- PO: 100 kg @ 2500
- GR: 100 kg received (no variance)
- Invoice: 2500
- Expected: match_status='matched'
- Auto-approve, move to payment

TC-B-013: Qty Variance (PO ≠ GR)
- PO: 100 kg
- GR: 98 kg
- Invoice: 2500 (based on 100 kg)
- Expected: match_status='variance'
- Variance type='qty_variance'
- Action required: Adjust invoice or resolve short

TC-B-014: Price Variance (GR total ≠ Invoice)
- PO: 100 kg @ 2500
- GR: 100 kg, unit cost=2500
- Invoice: 2600
- Expected: match_status='variance'
- Variance type='price_variance', amount=100

TC-B-015: Tax Variance
- PO total: 2500 + 200 tax = 2700
- Invoice: 2500 + 250 tax = 2750
- Expected: Tax variance detected = 50
- Requires investigation

TC-B-016: Acceptable Variance (<2%)
- PO: 2500
- Invoice: 2540 (1.6% variance)
- Expected: Auto-approve (variance < 2% threshold)
- No manual intervention needed

TC-B-017: Unacceptable Variance (>2%)
- PO: 2500
- Invoice: 2600 (4% variance)
- Expected: Requires manager approval
- Hold payment pending resolution

TC-B-018: Dispute Resolution
- Variance flagged for manager
- Manager: "Contact supplier, request credit"
- Expected: Dispute ticket created
- Payment held until resolved
```

### B.4 Purchase Returns
```
TC-B-019: Create Return
- Original PO: 100 kg flour
- Return: 10 kg (damaged)
- Reason: defective
- Expected: Return record created, status='pending'

TC-B-020: Return Approval
- Manager reviews return
- Approves 10 kg @ 25 = 250 credit
- Expected: status='approved'
- Credit memo created in AP

TC-B-021: Return Rejection
- Return rejected (quantity incorrect)
- Expected: status='rejected'
- Notification to requester

TC-B-022: Return Stock Reversal
- Approved return: 10 kg flour
- Expected: Stock deduction reversed
- stock_transaction created (type=return)
```

### B.5 Invoice Matching
```
TC-B-023: Create Invoice
- Upload supplier invoice for PO
- Invoice number: INV-2026-001, amount=2500
- Expected: Invoice created, status='pending'

TC-B-024: Link Invoice to GRN
- Auto-match: Invoice linked to matching PO+GRN
- Expected: Three-way match initiated

TC-B-025: Invoice Payment Tracking
- Invoice status progression:
  draft → matched → partial_paid → paid
- Expected: Each status recorded with date

TC-B-026: Duplicate Invoice Check
- Try to upload same invoice twice
- Expected: Error "Invoice already exists"
```

### B.6 PO Analytics
```
TC-B-027: PO Aging Report
- Show POs by age: 0-7 days, 8-14 days, 15+ days
- Expected: Breakdown by status

TC-B-028: Variance Analysis
- Report: All GRN variances by supplier
- Expected: Show short ships, over delivers, quality issues

TC-B-029: Perfect Match Rate
- Total 3-way matches: 100
- Perfect matches: 92
- Expected: Perfect Match Rate = 92%

TC-B-030: Average Receipt Time
- From PO to GRN completion
- Expected: Average days tracked by supplier

TC-B-031: On-Time Delivery %
- Expected delivery date vs actual
- Expected: Percentage on-time by supplier
```

---

# MODULE C: SUPPLIER MANAGEMENT

## 📄 Pages to Test

1. **Supplier Master** (`/supplier/master`)
   - Create/Edit supplier
   - Contact management
   - Bank details
   - Performance rating

2. **Supplier Profile** (`/supplier/:id/profile`)
   - Detail view
   - Contact list
   - Bank accounts
   - Payment history

3. **Supplier Ledger** (`/supplier/:id/ledger`)
   - Transaction history
   - Outstanding balance
   - Aging analysis

4. **Supplier Performance** (`/supplier/:id/performance`)
   - Scorecard (quality, delivery, price)
   - Evaluation form
   - Performance trends

5. **ABC Segmentation** (`/supplier/segments`)
   - A/B/C classification
   - Top spenders
   - Annual spend analysis

## 🧪 C. TEST CASES

```
TC-C-001: Create Supplier
- Name: Premium Mills
- Contact: Ahmed Khan +880171234567
- Tax ID: TAX-2024-001
- Payment terms: Net 30
- Credit limit: 50000
- Expected: Supplier created, status='active'

TC-C-002: Update Supplier
- Change payment terms from Net 30 to 2/10 Net 30
- Expected: Updated, reflects in future invoices

TC-C-003: Bank Details
- Add bank account: Standard Bank, Account=12345
- Expected: Stored securely (encrypted)
- Can add multiple accounts (is_primary flag)

TC-C-004: Supplier Evaluation
- Rate: On-time=95%, Quality=92%, Price Variance=2.5%
- Expected: overall_score calculated
- Display: 4.2 stars rating

TC-C-005: Performance Trend
- Show performance over 3 months
- Expected: Chart showing scores trend
- Alert if declining trend

TC-C-006: ABC Segmentation
- Run segmentation
- Top 20% by spend → A
- Next 30% → B
- Remaining 50% → C
- Expected: Suppliers classified correctly

TC-C-007: Supplier Ledger
- Show all transactions: invoices, payments, returns
- Balance due calculation
- Expected: Running balance accurate

TC-C-008: Outstanding Payables
- Show suppliers with unpaid invoices
- Sorted by due date
- Expected: Aging buckets (current, 30+, 60+, 90+)

TC-C-009: Record Payment
- Pay supplier: 25000
- Expected: Ledger entry created
- Balance reduced
- Payment date recorded

TC-C-010: Credit Limit Check
- Current usage: 40000 of 50000 limit
- Try to create PO for 15000
- Expected: Error "Exceeds credit limit"
- Can still proceed with approval

TC-C-011: Supplier Communication
- Send email to supplier for missing invoice
- Expected: Email logged in audit trail

TC-C-012: Supplier Portal (Optional)
- Supplier logs in to check status
- View POs, invoices, payments
- Expected: Read-only access

TC-C-013: Duplicate Supplier Check
- Try to create supplier with same Tax ID
- Expected: Error "Supplier already exists"

TC-C-014: Blacklist Supplier
- Mark supplier as 'blacklisted'
- Expected: Cannot create new POs
- Can still manage existing

TC-C-015: Supplier Performance Report
- Show all suppliers ranked by score
- Expected: Sort by quality, delivery, price metrics
```

---

# MODULE D: CUSTOMER CRM & LOYALTY

## 📄 Pages to Test

1. **Customer Master** (`/crm/customers`)
   - List with search & filters
   - Create customer
   - Edit customer
   - Customer profile view

2. **Customer Profile** (`/crm/customer/:id`)
   - Personal info
   - Order history
   - Loyalty status
   - Feedback history

3. **Loyalty Management** (`/crm/loyalty`)
   - Points balance
   - Tier benefits
   - Redemption options
   - Tier upgrade path

4. **Coupon Management** (`/crm/coupons`)
   - Create coupon
   - Coupon validation
   - Usage analytics
   - Coupon calendar

5. **Customer Analytics** (`/crm/analytics`)
   - RFM segmentation
   - Customer lifetime value (CLV)
   - Churn risk analysis
   - Feedback ratings

6. **Referral Program** (`/crm/referral`)
   - Generate referral code
   - Track referrals
   - Bonus awards

7. **Feedback System** (`/crm/feedback`)
   - Submit feedback
   - Rating display
   - Response management

## 🧪 D. TEST CASES

### D.1 Customer Management
```
TC-D-001: Create Customer via Phone
- Phone: +880171234567
- Auto-create customer on first order
- Expected: Customer created with phone only

TC-D-002: Complete Customer Profile
- Add: Name, email, DOB, address
- Expected: Profile enriched
- Loyalty tier: bronze (default)

TC-D-003: Customer Search
- Search by phone/email/name
- Expected: Returns matching customers

TC-D-004: Customer Merge
- Duplicate customers (same phone)
- Merge orders and loyalty points
- Expected: One record kept, orders consolidated

TC-D-005: Customer Segmentation
- Filter by loyalty tier, lifetime spend, order count
- Expected: Segment correctly applied
```

### D.2 Loyalty Points
```
TC-D-006: Earn Points on Order
- Order amount: 500
- Rate: 1 point per BDT
- Tier: Bronze (1x multiplier)
- Expected: Points earned = 500
- Loyalty_transactions entry created

TC-D-007: Tier Multiplier
- Upgrade to Silver tier (1.5x multiplier)
- Same 500 order
- Expected: Points earned = 750

TC-D-008: Point Expiry
- Points created 365 days ago
- Expected: Auto-expire
- Points_balance reduced
- loyalty_transactions (type=expire) created

TC-D-009: Redeem Points
- Balance: 1000 points
- Redeem 500 points for discount
- Expected: Discount applied to order
- Balance reduced to 500

TC-D-010: Insufficient Points
- Balance: 300 points
- Try to redeem 500
- Expected: Error "Insufficient points"

TC-D-011: Tier Upgrade Eligibility
- Current tier: Bronze (0-5000 spend)
- Lifetime spend: 5000
- Expected: Eligible for Silver
- Check "Upgrade Available" flag

TC-D-012: Auto Tier Upgrade
- Customer reaches 5000 lifetime spend
- Expected: Auto upgrade to Silver
- Notification sent
- Benefits applied immediately

TC-D-013: Tier Downgrade
- Silver customer (spent 15000 total)
- No orders in 12 months
- Expected: Downgrade to Bronze (based on policy)

TC-D-014: Birthday Bonus
- Customer DOB = today
- Expected: Auto-award birthday_bonus_points
- notification sent

TC-D-015: Point Transaction Audit
- View all point transactions for customer
- Expected: Complete history (earn, redeem, expire, promo)
```

### D.3 Loyalty Tier Benefits
```
TC-D-016: Bronze Benefits
- 1x points, 0% discount
- Expected: No special benefits

TC-D-017: Silver Benefits
- 1.5x points, 2% automatic discount on bills
- Expected: Discount applied on all orders

TC-D-018: Gold Benefits
- 2x points, 5% automatic discount
- Free delivery on orders > 500
- Expected: Benefits applied

TC-D-019: Platinum Benefits
- 3x points, 10% automatic discount
- Priority delivery, free items (2 per quarter)
- Expected: All benefits active

TC-D-020: Tier-Specific Promotions
- Promotion: "Silver exclusive: 20% OFF Biryani"
- Silver customer orders Biryani
- Expected: Discount applied automatically
```

### D.4 Coupons
```
TC-D-021: Create Percentage Coupon
- Code: WELCOME50
- Type: percentage (50%)
- Valid: 2026-05-01 to 2026-05-31
- Min order: 200
- Max discount: 100
- Expected: Coupon created, status='active'

TC-D-022: Fixed Amount Coupon
- Code: FLAT50
- Type: fixed_amount (50)
- Expected: Discount = fixed 50

TC-D-023: Coupon Validation
- Check: WELCOME50
- Today: within validity period
- Expected: Valid response, show terms

TC-D-024: Validate Min Order
- Coupon min_order_amount = 200
- Order total = 150
- Apply coupon
- Expected: Error "Minimum order not met"

TC-D-025: Usage Limit Check
- Coupon usage_limit = 100
- Current usage = 100
- Try to apply
- Expected: Error "Coupon limit exceeded"

TC-D-026: Per Customer Limit
- Coupon per_customer_limit = 1
- Customer already used once
- Try to use again
- Expected: Error "Already used this coupon"

TC-D-027: Category-Specific Coupon
- Coupon applicable_categories = [Biryani, Naan]
- Order: Biryani (valid) + Drink (invalid)
- Expected: Coupon valid (has items from applicable category)

TC-D-028: Delivery-Only Coupon
- Coupon applicable_to_delivery_only = true
- Try on dine-in order
- Expected: Error "Coupon valid for delivery only"

TC-D-029: Stack Coupons
- is_stackable = false
- Apply Coupon1 + Coupon2
- Expected: Error "Cannot stack coupons"

TC-D-030: Loyalty Redeem vs Coupon
- Apply loyalty points discount + coupon
- Expected: Both stacked (allowed)

TC-D-031: Coupon Expiry
- Coupon valid_until = 2026-04-30
- Today = 2026-05-01
- Try to apply
- Expected: Error "Coupon expired"

TC-D-032: Coupon Analytics
- Show coupon usage report
- Expected: Total used, revenue impact, by category
```

### D.5 RFM Segmentation
```
TC-D-033: Calculate RFM Scores
- Customer A: Last order 5 days ago, 10 orders/yr, 50000 spend → R=5, F=5, M=5
- Customer B: Last order 180 days ago, 1 order/yr, 2000 spend → R=1, F=1, M=1
- Expected: Scores calculated correctly

TC-D-034: Segment Assignment
- RFM 555 → Champions
- RFM 444 → Loyal
- RFM 111 → Dormant
- Expected: Segments assigned

TC-D-035: At-Risk Segment
- Customers: R=1-2, F=1-2
- Expected: "At-Risk" segment
- Action: Send win-back campaign

TC-D-036: Lost Customer
- Last order > 1 year, M < avg
- Expected: "Lost" segment
- Action: Send special offer

TC-D-037: New Customer
- First order < 30 days, F < 2
- Expected: "New" segment
- Action: Welcome discount

TC-D-038: RFM Dashboard
- Show segment distribution pie chart
- Expected: % of customers in each segment
```

### D.6 Customer Lifetime Value (CLV)
```
TC-D-039: Calculate CLV
- Total revenue from customer: 50000
- Total orders: 10
- AOV: 5000
- Expected: CLV = 50000

TC-D-040: CLV Trend
- Show CLV over time (monthly)
- Expected: Chart showing CLV growth

TC-D-041: High-Value Customer
- CLV > 20000
- Expected: Marked as VIP
- Special treatment, dedicated support

TC-D-042: CLV Cohort Analysis
- Show CLV by cohort (month of first order)
- Expected: May 2026 cohort avg CLV vs June cohort
```

### D.7 Referral Program
```
TC-D-043: Generate Referral Code
- Customer requests code
- Expected: Unique code generated (e.g., REF-ABC123)
- Share via WhatsApp/email

TC-D-044: Referral Conversion
- Referred customer uses code on first order
- Expected: New customer linked to referrer
- Both earn bonus points

TC-D-045: Referral Bonus Award
- Referrer: 500 bonus points
- Referred: 250 bonus points
- Expected: Both credited to loyalty_points

TC-D-046: Referral Tracking
- Show referrer: # of referrals, # converted, bonus earned
- Expected: Referral dashboard
```

### D.8 Feedback & Ratings
```
TC-D-047: Submit Feedback
- Rating: 4 stars
- Category: food_quality
- Comment: "Excellent biryani"
- Expected: Feedback created, status='pending'

TC-D-048: Feedback Approval
- Admin reviews feedback
- Approves for public display
- Expected: status='published'
- Visible on menu/product page

TC-D-049: Admin Response to Feedback
- Admin responds: "Thank you for the kind words!"
- Expected: Response published with feedback

TC-D-050: Feedback Analytics
- Show average rating: 4.2/5
- Rating distribution: 5-star (50%), 4-star (30%), etc.
- Expected: Display on dashboard

TC-D-051: Negative Feedback Alert
- Rating 1-2 stars
- Expected: Alert sent to manager
- Prompt for response/resolution

TC-D-052: Feedback by Category
- Filter: food_quality feedback only
- Expected: Show average rating for category
```

---

# MODULE E: EXPENSE MANAGEMENT

## 📄 Pages to Test

1. **Expense Dashboard** (`/expense/dashboard`)
   - Monthly expense breakdown
   - Category-wise pie chart
   - Budget vs actual

2. **Expense Entry** (`/expense/entry`)
   - Create expense
   - Attach receipt
   - Categorization

3. **Expense Approval** (`/expense/approval`)
   - Pending approvals
   - Approval workflow
   - Comment/reject

4. **Recurring Expenses** (`/expense/recurring`)
   - Setup recurring
   - Frequency management
   - Auto-generation

## 🧪 E. TEST CASES

```
TC-E-001: Create Expense
- Date: 2026-05-04
- Category: Rent
- Amount: 50000
- Description: "Monthly rent"
- Expected: Expense created, status='draft'

TC-E-002: Attach Receipt
- Upload receipt image
- Expected: File stored, thumbnail shown

TC-E-003: Submit for Approval
- Click Submit
- Expected: status='submitted'
- Notification to manager

TC-E-004: Expense Approval
- Manager reviews
- Clicks Approve
- Expected: status='approved'
- Posted to GL (Expense account)

TC-E-005: Expense Rejection
- Manager rejects with reason
- Expected: status='rejected'
- Notification to requester

TC-E-006: Expense Edit
- Draft expense, change amount
- Expected: Updated

TC-E-007: Recurring Expense Setup
- Name: "Utilities"
- Amount: 10000
- Frequency: Monthly
- Day of month: 1st
- Expected: Recurring_expense created

TC-E-008: Auto-Generate Recurring
- Run: Generate recurring expenses
- Expected: Expense records created for this month
- Status: draft (awaiting submission/approval)

TC-E-009: Pause Recurring
- Pause "Utilities" expense
- Expected: is_active = false
- No new expenses auto-generated

TC-E-010: Resume Recurring
- Resume "Utilities"
- Expected: is_active = true
- Next expense generated on schedule

TC-E-011: Expense Report by Category
- Show expenses by category (Rent, Utilities, Marketing)
- Expected: Breakdown and total

TC-E-012: Monthly Budget vs Actual
- Budget: Rent=50000, Utilities=10000, Marketing=5000
- Actual: Rent=50000, Utilities=12000, Marketing=4000
- Expected: Utilities over budget (+2000)
- Alert shown

TC-E-013: Expense Search
- Search by description "rent"
- Expected: All rent-related expenses shown

TC-E-014: Expense Category Management
- Create new category "Equipment Maintenance"
- Expected: Available for selection

TC-E-015: Bulk Expense Import
- Upload CSV: date, category, amount, description
- Expected: All expenses imported with status='draft'
```

---

# MODULE F: ACCOUNTING MODULE

## 📄 Pages to Test

1. **Chart of Accounts** (`/accounting/coa`)
   - Account master
   - Account hierarchy

2. **General Ledger** (`/accounting/ledger`)
   - Account ledger view
   - Trial balance

3. **Financial Reports** (`/accounting/reports`)
   - Balance Sheet
   - P&L Statement
   - Cash Flow

4. **Bank Reconciliation** (`/accounting/reconciliation`)
   - Bank statement entry
   - Reconciliation matching

5. **VAT Management** (`/accounting/vat`)
   - VAT ledger
   - VAT return preparation

## 🧪 F. TEST CASES

```
TC-F-001: Chart of Accounts
- Create account: 4001-Salary Expense
- Account type: Expense
- Balance type: Debit
- Expected: Account created, available for posting

TC-F-002: Trial Balance
- Generate trial balance as of 2026-05-01
- Expected: All accounts with debit/credit balance
- Total debit = Total credit

TC-F-003: Post Sales Order
- Order completed, total=500 (including 50 tax)
- Expected: GL entries:
  - DR: Cash/Receivable 500
  - CR: Sales Revenue 450
  - CR: Output Tax Payable 50

TC-F-004: Post Purchase Invoice
- Invoice: 2500 (including 200 tax)
- Expected: GL entries:
  - DR: COGS/Inventory 2300
  - DR: Input Tax 200
  - CR: AP 2500

TC-F-005: Post Expense
- Approved expense: Utilities 10000
- Expected: GL entry:
  - DR: Utilities Expense 10000
  - CR: Cash 10000

TC-F-006: General Ledger Report
- Show account 1001 (Cash)
- Expected: All transactions for the period
- Running balance

TC-F-007: Balance Sheet
- As of 2026-05-01
- Expected: Assets, Liabilities, Equity
- Assets = Liabilities + Equity

TC-F-008: P&L Statement
- Period: May 2026
- Expected: Revenue - COGS = Gross Profit
- Gross Profit - Operating Expenses = Net Income

TC-F-009: Cash Flow Statement
- Operating, Investing, Financing activities
- Expected: Cash beginning + movements = Cash ending

TC-F-010: VAT Ledger
- Show input tax (purchases) and output tax (sales)
- Expected: VAT payable = Output - Input

TC-F-011: VAT Return
- Generate VAT return for May 2026
- Expected: Show payable amount, due date

TC-F-012: Bank Reconciliation
- Bank statement: 50000
- Book balance: 49500 (pending checks)
- Expected: Reconciliation shows difference
- Mark pending items
- Final reconciled balance = statement balance

TC-F-013: Outstanding Checks
- Checks issued but not cleared
- Expected: Shown in reconciliation
- Deducted from book balance

TC-F-014: Bank Deposit Variance
- Deposit recorded in book: 10000
- Bank shows: 9950
- Expected: Variance of 50
- Flag for investigation

TC-F-015: Multiple Bank Accounts
- Reconcile: Account 1 (50000) and Account 2 (25000)
- Expected: Each reconciled separately

TC-F-016: Accounting Audit Trail
- View who posted entry, when, and GL impact
- Expected: Complete audit log

TC-F-017: GL Posting Error Correction
- Wrong entry posted
- Create reversing entry
- Expected: Original + reversing both visible in audit

TC-F-018: Budget vs Actual
- Budget for May: Rent=50000, Utilities=10000
- Actual: Rent=50000, Utilities=12000
- Expected: Utilities variance = 2000 (over)

TC-F-019: Consolidated Multi-Branch GL
- View GL across all branches
- Expected: Can filter by branch or see consolidated
```

---

# MODULE G: STAFF ATTENDANCE & PAYROLL

## 📄 Pages to Test

1. **Attendance Dashboard** (`/hr/attendance`)
   - Daily attendance
   - Attendance rate
   - Absent/Late report

2. **Check-In/Check-Out** (`/hr/check-in`)
   - Mobile check-in
   - GPS location
   - Biometric (optional)

3. **Shift Management** (`/hr/shifts`)
   - Define shifts
   - Assign to staff
   - Shift patterns

4. **Payroll** (`/hr/payroll`)
   - Create monthly payroll
   - Process payroll
   - Salary slips

5. **Tips Distribution** (`/hr/tips`)
   - Daily tips collection
   - Distribution method
   - Rider commission

6. **HR Reports** (`/hr/reports`)
   - Attendance report
   - Payroll analytics
   - Absenteeism trend

## 🧪 G. TEST CASES

```
TC-G-001: Create Shift
- Name: Morning
- Start: 08:00, End: 16:00
- Break: 60 minutes
- Expected: Shift created

TC-G-002: Assign Shift to Staff
- Staff: Ahmed (Waiter)
- Shift: Morning
- Date: 2026-05-01
- Expected: Assignment created

TC-G-003: Check-In
- Mobile app, click Check-In
- GPS location recorded
- Expected: Check-in time recorded
- Status: On-time / Late (if after shift start)

TC-G-004: Late Check-In
- Shift start: 08:00
- Check-in: 08:30
- Expected: Marked as "Late"
- Deduction: 30 minutes

TC-G-005: Check-Out
- Click Check-Out
- Expected: Check-out time recorded
- Worked hours = Check-out - Check-in - break

TC-G-006: Overtime
- Check-in: 08:00, Check-out: 18:30
- Shift: 08:00-16:00 (8 hours)
- Overtime: 2.5 hours
- Expected: overtime_hours recorded

TC-G-007: Absence
- Shift assigned but no check-in/out
- Expected: status='absent'
- Marked in attendance report

TC-G-008: Leave Management
- Request leave: 2026-05-10
- Manager approves
- Expected: status='on_leave'
- No clock-in required

TC-G-009: Monthly Payroll Creation
- Run payroll for May 2026
- Expected: Payroll records created for each active staff
- Status: draft

TC-G-010: Calculate Gross Pay
- Base salary: 20000
- Worked days: 25 (no absence/leave)
- Attended full days
- Expected: Gross = 20000

TC-G-011: Calculate with Absent Days
- Base salary: 20000
- Worked days: 24 (1 absent)
- Expected: Gross = 20000 * (24/25) = 19200

TC-G-012: Calculate Overtime Pay
- Overtime hours: 10 @ 1.5x rate
- Hourly rate: 20000/220 = 90.9 per hour
- Expected: Overtime pay = 10 * 90.9 * 1.5 = 1363.5

TC-G-013: Add Bonus
- One-time bonus: 5000
- Expected: Added to gross_pay

TC-G-014: Add Commission (Riders)
- Deliveries completed: 100
- Commission rate: 2% of order value
- Total order value: 50000
- Expected: Commission = 1000

TC-G-015: Tips Distribution (Equal)
- Daily tips collected: 1000
- Distribution method: Equal
- Staff count: 10
- Expected: Each staff gets 100 tips

TC-G-016: Tips Distribution (By Hours)
- Tips: 1000
- Method: By worked hours
- Total hours worked: 200
- Ahmed worked: 40 hours
- Expected: Ahmed gets 1000 * (40/200) = 200

TC-G-017: Deduct Tax
- Gross: 20000
- Tax rate: 10%
- Expected: Tax deduction = 2000

TC-G-018: Deduct PF (Provident Fund)
- PF rate: 5%
- Gross: 20000
- Expected: PF deduction = 1000

TC-G-019: Calculate Net Pay
- Gross: 20000
- Tax: 2000
- PF: 1000
- Other deductions: 500
- Expected: Net = 20000 - 2000 - 1000 - 500 = 16500

TC-G-020: Salary Slip Generation
- Generate slip for Ahmed (May 2026)
- Expected: PDF with: Base, Attended, Overtime, Gross, Deductions, Net

TC-G-021: Process Payroll
- Review all payroll records
- Click "Process Payroll"
- Expected: status → processed
- GL entries created (Salary Expense)

TC-G-022: Mark Payroll as Paid
- Select payment method: Bank transfer
- Expected: status → paid
- Payment date recorded

TC-G-023: Bulk Salary Slip Download
- Generate all slips for May (50 staff)
- Expected: ZIP file with all PDFs

TC-G-024: Payroll Adjustment
- Processed payroll, need to add missing bonus
- Create adjustment: +5000
- Expected: Adjustment recorded, net pay recalculated

TC-G-025: Attendance Report
- Show all staff: Present/Absent/Late/On-leave
- Period: May 2026
- Expected: Summary with counts and %

TC-G-026: Attendance Heatmap
- Show attendance by day of week
- Expected: Monday=100%, Friday=95%, Saturday=70%
- Identify patterns

TC-G-027: Absenteeism Trend
- Show absences over 3 months
- Expected: Trend chart
- Alert if exceeding threshold
```

---

# MODULE H: QR ORDERING SYSTEM

## 📄 Pages to Test

1. **QR Code Management** (`/qr/setup`)
   - Generate QR per table
   - QR distribution/printing
   - Reactivate QR

2. **QR Menu** (`/qr/:table_id/menu`)
   - Browse menu items
   - Filter by category
   - Search items

3. **QR Ordering** (`/qr/:session_token/order`)
   - Add items to order
   - Modify quantities
   - View bill

4. **QR Payment** (`/qr/:session_token/payment`)
   - Payment method selection
   - Secure payment gateway
   - Receipt generation

5. **QR Feedback** (`/qr/:session_token/feedback`)
   - Quick rating
   - Comments

## 🧪 H. TEST CASES

```
TC-H-001: Generate QR Code
- Table: T1 (Big House)
- Expected: QR code generated
- Link: qr.foodpark.com/menu/table/1

TC-H-002: Print QR Codes
- Select tables: T1-T10
- Print: 10 QR stickers
- Expected: PDF generated for printing

TC-H-003: Reactivate QR
- QR expired/lost
- Print new QR for same table
- Expected: New QR code issued

TC-H-004: Scan QR Code
- Customer scans QR from table
- Expected: Redirects to menu
- Session token created

TC-H-005: Browse Menu via QR
- Show all categories
- Expected: Categorized menu displayed
- Price and image for each item

TC-H-006: Add Item to QR Order
- Click "Biryani"
- Qty: 2
- Special instructions: "Less spicy"
- Expected: Added to cart

TC-H-007: Remove Item
- Remove item from QR order
- Expected: Quantity updated

TC-H-008: View Bill in QR
- See subtotal, tax, total
- Expected: Real-time calculation

TC-H-009: Request Bill
- Click "Request Bill"
- Expected: Waiter notification sent
- Status: "Bill Requested"

TC-H-010: QR Payment via Mobile
- Payment options: Card, UPI, Mobile Wallet
- Select "Card", enter details
- Expected: Payment processed
- Receipt generated (print/email)

TC-H-011: Split Bill
- 2 customers, split bill
- Customer A: 2 items
- Customer B: 1 item
- Expected: Separate bills generated

TC-H-012: Abandon QR Order
- Session > 30 minutes without order
- Expected: Session expires
- Customer can scan again for new session

TC-H-013: QR Order Feedback
- Rating: 4 stars
- Comment: "Good food"
- Expected: Feedback recorded
- Linked to QR order

TC-H-014: Multiple Tables QR Simultaneously
- 5 tables scanning simultaneously
- Expected: No conflicts
- Each session independent

TC-H-015: QR Menu Real-Time Update
- Menu item price changed
- Already open QR menus
- Expected: Refresh shows new price

TC-H-016: QR Order Tracking
- Show order status: Queued → Preparing → Ready → Served
- Real-time update in QR
- Expected: Customer sees status progression

TC-H-017: Mobile-Responsive QR Interface
- Test on phone (iPhone/Android)
- Expected: Responsive layout
- Touch-friendly buttons
```

---

# MODULE I: DELIVERY FLEET MANAGEMENT

## 📄 Pages to Test

1. **Rider Management** (`/fleet/riders`)
   - Create rider
   - Document tracking
   - Performance metrics

2. **Zone Management** (`/fleet/zones`)
   - Create delivery zones
   - Map visualization
   - Assign riders to zones

3. **Delivery Assignment** (`/fleet/assignments`)
   - Auto-assign rider
   - Manual assignment
   - Route optimization

4. **Fleet Tracking** (`/fleet/tracking`)
   - Real-time rider GPS
   - Delivery status
   - ETA

5. **Commission Management** (`/fleet/commission`)
   - Calculate commission
   - Performance bonus
   - Payment history

## 🧪 I. TEST CASES

```
TC-I-001: Create Rider Profile
- Name: Rahim
- Phone: 01712345678
- Vehicle: Bike
- License: Valid until 2027-05-01
- Insurance: Valid until 2026-12-31
- Expected: Rider profile created

TC-I-002: Upload Rider Documents
- License (photo)
- Insurance certificate
- Vehicle registration
- Expected: Files uploaded and verified

TC-I-003: Create Delivery Zone
- Zone: Downtown Area
- Delivery fee: 50
- Est. time: 30 min
- Expected: Zone created with polygon on map

TC-I-004: Assign Rider to Zone
- Rider: Rahim
- Zone: Downtown (Primary)
- Expected: Assignment recorded

TC-I-005: Auto-Assign Delivery
- Delivery order for Downtown area
- Expected: Best available rider assigned (shortest ETA)
- Notification sent to rider

TC-I-006: Manual Assign Delivery
- Admin manually assigns rider
- Expected: Override auto-assignment

TC-I-007: Rider Check-In
- Rider logs in (morning start)
- GPS location recorded
- Expected: status='online'

TC-I-008: Delivery Pick-Up
- Order packed, give to rider
- Rider confirms pick-up
- Expected: status='picked_up'
- Delivery_tracking record created

TC-I-009: Real-Time GPS Tracking
- Customer tracks order
- Expected: Live map with rider location
- ETA countdown

TC-I-010: Delivery Status Update
- Rider updates: "Arriving in 5 minutes"
- Expected: Customer notification

TC-I-011: Delivery Completion
- Rider marks order as delivered
- Customer confirms receipt
- Expected: status='delivered'

TC-I-012: Delivery Photo
- Rider takes photo at delivery location
- Expected: Photo attached to delivery_tracking

TC-I-013: Failed Delivery
- Rider unable to find address
- Mark as "Failed attempt"
- Expected: status='failed'
- Action: Retry or cancel

TC-I-014: Delivery Rating
- Customer rates: 4.5 stars
- Expected: Rider rating updated

TC-I-015: Rider Performance Report
- Show rider: # deliveries, avg rating, on-time %
- Expected: KPIs displayed

TC-I-016: Commission Calculation (Per Delivery)
- Base rate: 2% of order value
- Order: 500, Commission: 10
- Expected: Commission recorded

TC-I-017: Commission Bonus
- Deliveries target: 100
- Completed: 105
- Bonus: 500
- Expected: Bonus added to commission

TC-I-018: Performance Bonus
- Rating > 4.5 stars: +500 bonus
- On-time > 95%: +500 bonus
- Expected: Bonuses added

TC-I-019: Commission Statement
- Monthly commission: Base (2000) + Bonuses (1000) = 3000
- Expected: Commission slip generated

TC-I-020: Rider Document Expiry Alert
- License expires in 7 days
- Expected: Alert to rider and manager
- Action: Renew license

TC-I-021: Rider Leave
- Mark rider as on-leave
- Expected: Not assigned new deliveries
- Replacement assigned

TC-I-022: Rider Incentive - Orders Delivered
- Week 1: 50 deliveries
- Week 2: 60 deliveries → Exceeded target
- Expected: Bonus calculated

TC-I-023: Distance Calculation
- Delivery from Branch to Customer address
- Expected: Accurate distance calculated
- Factor into commission (distance-based surcharge)

TC-I-024: Multiple Deliveries Route
- 3 deliveries in same zone
- Expected: Optimal route suggested
- Rider follows route

TC-I-025: Delivery Zone Surge
- High order volume in zone
- Expected: Surge pricing applied automatically
- Rider incentive increased
```

---

# MODULE J: ADVANCED RESERVATION SYSTEM

## 📄 Pages to Test

1. **Reservations Dashboard** (`/reservation/dashboard`)
   - Today's reservations
   - Upcoming reservations
   - Cancellation trends

2. **Floor Map** (`/reservation/floor-map`)
   - Visual table layout
   - Table occupancy
   - Reserve table

3. **Reservation Booking** (`/reservation/book`)
   - Date/time selection
   - Party size
   - Table preference
   - Deposit collection

4. **Waitlist Management** (`/reservation/waitlist`)
   - Add to waitlist
   - Call customer
   - Seat customer

5. **Reservation Analytics** (`/reservation/analytics`)
   - No-show rate
   - Occupancy trend
   - Deposit refunds

## 🧪 J. TEST CASES

```
TC-J-001: Create Reservation
- Date: 2026-05-08
- Time: 19:00
- Party size: 4
- Customer: Karim Ahmed
- Expected: Reservation created, status='pending'

TC-J-002: Reserve Specific Table
- Select table: T5 (4-seater)
- Expected: Table reserved
- Cannot be assigned to other reservations

TC-J-003: Floor Map View
- Show 50 tables with color coding
- Green: Available
- Red: Reserved
- Yellow: Occupied
- Expected: Visual layout accurate

TC-J-004: Auto-Table Allocation
- Party size: 4
- System suggests: T5 (4-seater) or T7+T8 (2x2 seaters)
- Expected: Best match selected

TC-J-005: Deposit Collection
- Reservation requires deposit: 500
- Collect via card
- Expected: Deposit recorded, status='paid'

TC-J-006: Deposit Forfeiture
- Customer cancels < 24 hours
- Deposit forfeited
- Expected: Deposit not refunded

TC-J-007: Deposit Refund
- Customer cancels > 24 hours
- Expected: Refund processed (minus penalty)

TC-J-008: Pre-Order with Reservation
- Reservation + pre-order items
- Expected: Items prepared in advance
- Ready when customer arrives

TC-J-009: Confirm Reservation
- 24-hour before: Send SMS/email confirmation
- Expected: Message sent, link to confirm

TC-J-010: Reservation Reminders
- 2 hours before: Send reminder
- Expected: SMS to customer

TC-J-011: No-Show
- Reservation time passed, customer didn't show
- Mark as: No-show
- Expected: status='no_show'
- Forfeit deposit

TC-J-012: Late Arrival
- Customer arrives 30 mins late
- Table still available
- Expected: Allow check-in

TC-J-013: Add to Waitlist
- No tables available
- Add party to waitlist
- Expected: Waitlist entry created, email confirmation

TC-J-014: Call from Waitlist
- Table available
- Call customer from waitlist
- Expected: Notification sent

TC-J-015: Waitlist No-Response
- Called customer, no response in 10 mins
- Expected: Remove from waitlist, call next customer

TC-J-016: Extend Reservation
- Original: 2-hour reservation
- Request extension: 30 mins more
- Expected: Table held if available

TC-J-017: Combine Parties
- 2 x 2-person parties arrive
- Assign combined table (4-seater)
- Expected: Manage both reservations under one table

TC-J-018: Re-Reserve Cancelled Table
- Cancelled table freed
- New reservation created
- Expected: Table reassigned

TC-J-019: Occupancy Report
- Show occupancy by time
- 18:00 - 25 tables occupied
- 20:00 - 45 tables occupied
- Expected: Accurate hourly breakdown

TC-J-020: No-Show Rate Analysis
- Month: May 2026
- Reservations: 100
- No-shows: 5
- Expected: No-show rate = 5%

TC-J-021: Revenue Impact of No-Shows
- Avg reservation value: 500
- No-shows: 5
- Lost revenue: 2500
- Expected: Calculated and reported

TC-J-022: Reservation Modifications
- Change time: 19:00 → 19:30
- Expected: Updated if table available

TC-J-023: Reservation Cancellation
- Cancel reservation
- Expected: Table freed
- Deposit handling based on timing

TC-J-024: Bulk Reservations (Events)
- Corporate event: 50 people, 10 tables
- Expected: Bulk reservation created
- Special pricing applied

TC-J-025: Group Reservation Split
- Party of 20, split into 5 tables
- Expected: Linked reservations, managed together
```

---

# MODULE K: MULTI-BRANCH MANAGEMENT

## 📄 Pages to Test

1. **Branch Master** (`/branch/master`)
   - Create branch
   - Branch settings
   - Manager assignment

2. **Centralized Dashboard** (`/branch/dashboard`)
   - Consolidated KPIs
   - Branch comparison
   - Regional view

3. **Branch Reports** (`/branch/reports`)
   - Branch-wise P&L
   - Inventory by branch
   - Payroll by branch

4. **Consolidated Reports** (`/branch/consolidated`)
   - Consolidated P&L
   - Multi-branch inventory
   - Supplier performance across branches

## 🧪 K. TEST CASES

```
TC-K-001: Create Branch
- Name: "Downtown Branch"
- Address: "123 Main Street"
- Manager: "Ahmed Khan"
- Expected: Branch created, isolated data

TC-K-002: Branch Settings Override
- Corporate: VAT=15%
- Branch override: VAT=15% → 18%
- Expected: Branch uses 18% for this location

TC-K-003: User Branch Assignment
- User: "Waiter1"
- Assigned to: Branch 1, Branch 2
- Primary: Branch 1
- Expected: User can access both branches

TC-K-004: Data Isolation
- Branch 1: 100 orders
- Branch 2: 50 orders
- User from Branch 1 cannot see Branch 2 orders
- Expected: Queries filtered by branch_id

TC-K-005: Consolidated Dashboard
- Show: Total orders, total revenue across all branches
- Expected: Branch-wise breakdown displayed
- Overall KPIs

TC-K-006: Branch Comparison
- Compare Branch 1 vs Branch 2
- KPIs: Revenue, Orders, Avg Check, Profit Margin
- Expected: Side-by-side comparison

TC-K-007: Consolidated P&L
- Show: Total revenue, total COGS, total expenses
- Expected: Summed from all branches
- Percentage to total shown

TC-K-008: Stock Transfer Between Branches
- Transfer: 50 kg flour from Branch 1 to Branch 2
- Expected: Inventory adjusted in both branches

TC-K-009: Consolidated Supplier Performance
- Show: Total spend by supplier across all branches
- Expected: A/B/C segmentation by total spend

TC-K-010: Branch Payroll Consolidation
- Payroll sum: Branch 1 (500K) + Branch 2 (300K) = 800K
- Expected: Total displayed, can drill down

TC-K-011: Branch Manager Dashboard
- Manager views own branch only
- Expected: Restricted to Branch 1 data

TC-K-012: Multi-Branch Purchase Orders
- Create PO: Supplier "Premium Mills" for Branch 1
- Branch 2 also creates same PO to same supplier
- Expected: Separate POs, supplier can consolidate orders

TC-K-013: Consolidated Receivables
- Branch 1: Ar 50000
- Branch 2: AR 30000
- Total: 80000
- Expected: Consolidated shown

TC-K-014: Consolidated Payables
- Branch 1: AP 100000
- Branch 2: AP 75000
- Total: 175000
- Expected: Consolidated shown

TC-K-015: Branch Profit Margin Comparison
- Branch 1: 35%
- Branch 2: 28%
- Expected: Highlight high-performing branch

TC-K-016: Region-Wise Analytics
- If branches grouped by region
- Show: Region 1 (5 branches) vs Region 2 (3 branches)
- Expected: Regional summaries

TC-K-017: Inventory Visibility Across Branches
- Check if ingredient available in other branches
- Expected: Show stock levels in all branches
- Option to request transfer

TC-K-018: Unified Audit Trail
- View all audit logs across branches
- Filter by branch, user, entity
- Expected: Complete audit trail

TC-K-019: Customer across Branches
- Customer visits Branch 1, then Branch 2
- Loyalty points combined
- Expected: Unified customer view

TC-K-020: Report Consolidation
- Run "Monthly P&L" for all branches
- Expected: Single consolidated report
- Option to export per-branch or total
```

---

# MODULE L: BUSINESS INTELLIGENCE

## 📄 Pages to Test

1. **Peak Hour Analytics** (`/bi/peak-hours`)
   - Hourly traffic
   - Revenue by hour
   - Staff scheduling recommendation

2. **Menu Engineering** (`/bi/menu-engineering`)
   - PLU Mix Matrix
   - Profitability analysis
   - Recommendations

3. **Cohort Analysis** (`/bi/cohorts`)
   - Retention table
   - Cohort trends
   - Churn analysis

4. **Demand Forecasting** (`/bi/forecast`)
   - 7/14/30-day forecast
   - Accuracy tracking
   - Ingredient requirements

5. **Executive Dashboard** (`/bi/dashboard`)
   - KPI cards
   - Trend charts
   - Alerts

## 🧪 L. TEST CASES

```
TC-L-001: Peak Hour Analysis
- Show hourly orders for May 2026
- Expected: 08:00-100 orders, 12:00-300 orders, 14:00-200 orders
- Peak: 12:00-13:00

TC-L-002: Revenue by Hour
- Expected: Revenue pattern same as order pattern
- High value orders in specific hours

TC-L-003: Staff Scheduling Recommendation
- Based on peak hours
- Recommendation: Increase staff 11:00-13:30
- Expected: Suggestion provided

TC-L-004: Day of Week Pattern
- Show: Monday vs Friday patterns
- Expected: Different patterns identified
- Friday higher volume

TC-L-005: Peak Hour Comparison (Year-over-Year)
- May 2025 vs May 2026
- Expected: Growth rate by hour

TC-L-006: PLU Mix Matrix (4 Quadrants)
- STARS: High volume, High margin
- PREMIUM: Low volume, High margin
- PLOUGHORSE: High volume, Low margin
- DOGS: Low volume, Low margin
- Expected: Items classified correctly

TC-L-007: Stars Strategy
- Biryani: 400 units, 40% margin
- Action: Promote, increase quality
- Expected: Recommendations shown

TC-L-008: Premium Strategy
- Special Naan: 50 units, 65% margin
- Action: Increase price, promote upscale
- Expected: Recommendation provided

TC-L-009: Ploughorse Strategy
- Samosa: 300 units, 15% margin
- Action: Reduce portion, optimize recipe, increase price
- Expected: Suggestion shown

TC-L-010: Dogs Strategy
- Exotic Drink: 20 units, 30% margin
- Action: Discontinue or rebrand
- Expected: Warning provided

TC-L-011: Contribution Margin Analysis
- Show items ranked by contribution margin %
- Expected: Stars at top, Dogs at bottom

TC-L-012: Elasticity Analysis
- When price increased 10%, quantity dropped 5%
- Elasticity: Inelastic
- Recommendation: Opportunity to increase price
- Expected: Analysis shown

TC-L-013: Cohort Retention Table
- Cohort: May 2026 (100 new customers)
- Month 0: 100 (100%)
- Month 1: 42 (42% retention)
- Month 2: 28 (28% retention)
- Expected: Table displayed with % retention

TC-L-014: Cohort Lifetime Value
- May 2026 cohort avg CLV: 15000
- June 2026 cohort avg CLV: 12000
- Expected: Comparison shown

TC-L-015: Churn Analysis
- Customers not ordering in 60+ days: 15
- Expected: "At Risk" list
- Action: Win-back campaign

TC-L-016: Demand Forecast (ARIMA)
- Item: Biryani
- Forecast for next 7 days
- Expected: Predicted quantity with confidence interval

TC-L-017: Forecast Accuracy
- Compare previous forecasts with actual
- Accuracy: 92.5%
- Expected: Displayed on forecast

TC-L-018: Ingredient Requirement Forecast
- Biryani forecast: 50 units
- Recipe needs: 10kg chicken, 5L oil
- Expected: Auto-recommend PO: Chicken 10kg, Oil 5L

TC-L-019: Seasonal Demand
- Show: June higher than May (summer season)
- Expected: Seasonal factor identified

TC-L-020: Holiday Impact
- Eid holiday: Demand spike +40%
- Expected: Forecast adjusted for holidays

TC-L-021: Executive KPI Dashboard
- Cards: Revenue, Orders, Avg Check, Profit %
- Expected: Key metrics displayed with trends

TC-L-022: Trend Chart
- Revenue trend (30 days)
- Expected: Line chart showing daily revenue

TC-L-023: Alert System
- Revenue down 10% vs last week
- Expected: Alert displayed

TC-L-024: Profitability by Category
- Show: Biryani 40%, Naan 35%, Drinks 25%, Desserts 15%
- Expected: Category ranked by profit margin

TC-L-025: Item-Level Profitability
- Show all items ranked by gross profit
- Expected: Top 10 profit generators

TC-L-026: Customer Value Analysis
- Top 10 customers by CLV
- Expected: Show contribution to revenue

TC-L-027: Customer Acquisition Trend
- New customers: May-100, June-150, July-200
- Expected: Growing trend identified

TC-L-028: Time to Profitability
- When did average customer break even?
- Expected: Calculated and shown

TC-L-029: Churn Prediction
- Algorithm predicts which customers likely to churn
- Expected: Proactive alerts for retention

TC-L-030: Sensitivity Analysis
- If price increases 5%, profit impact?
- Expected: Scenario modeling

TC-L-031: Competitive Pricing Analysis
- Compare menu prices with competitors
- Expected: Price positioning shown

TC-L-032: Market Basket Analysis
- Items frequently ordered together
- Expected: Bundling opportunities identified

TC-L-033: ABC Customer Classification
- A: Top 20% by spend
- B: Next 30%
- C: Bottom 50%
- Expected: Segmentation shown

TC-L-034: Customer Lifetime Value Prediction
- New customer, predict 12-month CLV
- Expected: Forecast with confidence interval

TC-L-035: BI Report Export
- Export to PDF/Excel
- Expected: Formatted report with charts

TC-L-036: BI Dashboard Filter
- Filter by: Date range, branch, menu category
- Expected: All KPIs update based on filters
```

---

# CROSS-MODULE INTEGRATION TESTS

## 🧪 Integration Test Cases

```
TC-INTG-001: Order to Inventory to COGS
- Place order: Biryani (qty 2)
- Expected: Stock deducted, COGS calculated, GL updated

TC-INTG-002: Order to Customer CRM to Loyalty
- Order by customer, payment complete
- Expected: CLV updated, points earned, tier upgrade check

TC-INTG-003: Stock to Purchase to Accounting
- Low stock alert → Create PO → Receive goods → Invoice → Pay
- Expected: Full cycle complete, GL updated

TC-INTG-004: Payroll to Accounting to Cash Flow
- Payroll processed → GL entries → Cash disbursement
- Expected: Salary expense posted, cash outflow recorded

TC-INTG-005: Multi-Branch Inventory Transfer
- Stock transfer from Branch 1 → Branch 2
- Expected: Stock deducted from 1, added to 2, GL updated both branches

TC-INTG-006: Customer Referral to Loyalty to Revenue
- Referral converted → Points awarded → Redemption on order
- Expected: Full referral cycle, revenue attributed

TC-INTG-007: Delivery Order to Fleet to Commission
- Create delivery → Assign rider → Deliver → Rate
- Expected: Rider commission calculated, added to payroll

TC-INTG-008: Reservation to Revenue to Analytics
- Create reservation → Customer orders → Payment → BI update
- Expected: Reservation linked to revenue, BI trending

TC-INTG-009: QR Order to KDS to Delivery
- Customer orders via QR → Kitchen receives order → Rider delivers
- Expected: Order flows through all systems correctly

TC-INTG-010: Expense to Budget to P&L
- Record expense → Compare to budget → Impact on P&L
- Expected: Variance calculated, P&L updated

TC-INTG-011: Waste Management to COGS
- Record waste → Approve → Stock deduct → COGS impact
- Expected: Inventory and P&L both updated

TC-INTG-012: Discount (Loyalty) vs Coupon Integration
- Customer applies loyalty discount + coupon
- Expected: Both discounts applied (if allowed)
- COGS calculated on discounted price

TC-INTG-013: Attendance Impact on Payroll
- Staff absent 1 day → Salary calculated with deduction
- Expected: Payroll correctly calculated

TC-INTG-014: Performance Bonus in Payroll
- Rider exceeds delivery target → Bonus triggered → Added to payroll
- Expected: Commission + Bonus = Final payroll

TC-INTG-015: Supplier Performance to Approval Workflow
- Low supplier rating → Extra approval needed for POs
- Expected: Workflow enforced

TC-INTG-016: Stock Valuation Impact on COGS
- Change valuation method FIFO → LIFO
- Expected: COGS recalculated, GP margin changes, P&L updated

TC-INTG-017: Recipe Cost Change Impact
- Ingredient price up 10% → Recipe cost up → Food cost % review
- Expected: All dependent recipes updated, margin review triggered

TC-INTG-018: Bank Reconciliation Impact on GL
- Bank reconciliation variance → GL adjustment entry
- Expected: GL and bank balance aligned

TC-INTG-019: Multi-Branch Consolidated P&L
- Branch 1: Profit 100K
- Branch 2: Profit 80K
- Expected: Consolidated profit = 180K

TC-INTG-020: Customer Segment Based Pricing
- VIP customer (Platinum) → 10% auto-discount applies
- Expected: Discount applied at billing
```

---

# PERFORMANCE & LOAD TESTS

```
TC-PERF-001: Concurrent Order Processing
- 100 simultaneous orders
- Expected: All processed in <5 seconds
- No stock overselling

TC-PERF-002: Large Data Export
- Export 1 year of data (50K orders)
- Expected: PDF/Excel generation in <30 seconds

TC-PERF-003: Real-Time Dashboard with 10 Branches
- Load consolidated dashboard
- Expected: Loads in <3 seconds

TC-PERF-004: Demand Forecast Calculation (1000 items)
- Run forecast for 1000 menu items
- Expected: Completed in <60 seconds

TC-PERF-005: Stock Transfer Between 100 Branches
- Simulate stock transfer queue
- Expected: All processed within 5 minutes

TC-PERF-006: Payroll Processing (1000 staff)
- Process monthly payroll
- Expected: Completed in <10 minutes

TC-PERF-007: Query Response Time
- GL query for 1 year data
- Expected: <2 seconds

TC-PERF-008: WebSocket Load
- 500 simultaneous socket connections
- Expected: All updated without lag

TC-PERF-009: Concurrent Purchase Orders
- 50 POs created simultaneously
- Expected: All with unique PO numbers, no conflicts

TC-PERF-010: Database Backup (10GB)
- Full backup during business hours
- Expected: <5 minutes, no user impact
```

---

# SECURITY & COMPLIANCE TESTS

```
TC-SEC-001: Role-Based Access
- Waiter tries to access Accounting module
- Expected: 403 Forbidden error

TC-SEC-002: Data Encryption
- Bank account numbers stored encrypted
- Expected: Plaintext not visible in DB

TC-SEC-003: Audit Trail
- All GL posts logged with user, timestamp, change
- Expected: Complete audit trail maintained

TC-SEC-004: JWT Token Expiry
- Access token expires after 15 minutes
- Expected: User redirected to login

TC-SEC-005: CORS Protection
- API called from external domain
- Expected: CORS error (only localhost allowed)

TC-SEC-006: SQL Injection Prevention
- Attempt SQL injection in search
- Expected: Sanitized, no vulnerability

TC-SEC-007: API Rate Limiting
- 100 requests in 1 minute
- Expected: 101st request rate-limited

TC-SEC-008: Financial Data Masking
- Non-admin views payment details
- Expected: Masked (e.g., ****5678)

TC-SEC-009: User Session Management
- Logout on one device
- Expected: Session invalidated

TC-SEC-010: Password Policy
- Create user with password "123"
- Expected: Error "Minimum 6 characters, must include special char"
```

---

# SUMMARY TABLE

| Module | Pages | Test Cases | Est. Hours | Status |
|--------|-------|-----------|-----------|--------|
| A. Inventory | 8 | 46 | 23 | [ ] |
| B. Purchase | 6 | 31 | 15 | [ ] |
| C. Supplier | 5 | 15 | 8 | [ ] |
| D. CRM & Loyalty | 7 | 52 | 26 | [ ] |
| E. Expense | 4 | 15 | 8 | [ ] |
| F. Accounting | 5 | 19 | 10 | [ ] |
| G. HR & Payroll | 6 | 27 | 14 | [ ] |
| H. QR Ordering | 4 | 17 | 8 | [ ] |
| I. Delivery Fleet | 5 | 25 | 12 | [ ] |
| J. Reservations | 5 | 25 | 13 | [ ] |
| K. Multi-Branch | 4 | 20 | 10 | [ ] |
| L. Business Intelligence | 5 | 36 | 18 | [ ] |
| **Integration** | - | 20 | 15 | [ ] |
| **Performance** | - | 10 | 10 | [ ] |
| **Security** | - | 10 | 8 | [ ] |
| **TOTAL** | **62** | **348** | **198** | [ ] |

---

# QA CHECKLIST

## Pre-Testing
- [ ] Environment setup (Dev/QA database)
- [ ] Test data created (100 customers, 50 suppliers, 20 employees)
- [ ] Browser/device compatibility list defined
- [ ] Performance baseline established
- [ ] Security tools configured (SQL injection, XSS checkers)

## Functional Testing Phase (6 weeks)
- [ ] Module A: Inventory (Week 1)
- [ ] Module B: Purchase (Week 1)
- [ ] Module C: Supplier (Week 2)
- [ ] Module D: CRM & Loyalty (Week 2)
- [ ] Module E: Expense (Week 3)
- [ ] Module F: Accounting (Week 3)
- [ ] Module G: HR & Payroll (Week 4)
- [ ] Module H: QR Ordering (Week 4)
- [ ] Module I: Delivery Fleet (Week 5)
- [ ] Module J: Reservations (Week 5)
- [ ] Module K: Multi-Branch (Week 6)
- [ ] Module L: Business Intelligence (Week 6)

## Integration Testing Phase (2 weeks)
- [ ] Cross-module workflows (Week 7)
- [ ] Data consistency checks (Week 7)
- [ ] End-to-end scenarios (Week 8)

## Performance & Security Phase (1 week)
- [ ] Load testing (Week 9)
- [ ] Security audit (Week 9)

## UAT Phase (2 weeks)
- [ ] User acceptance testing
- [ ] Business scenario validation
- [ ] Data migration testing

## Sign-Off
- [ ] All test cases passed
- [ ] Critical bugs resolved
- [ ] Performance acceptable
- [ ] Security audit cleared
- [ ] UAT approved by stakeholders

---

## Quick Testing Links

**Module Pages to Test**: Each module section includes direct links to features

**Test Execution**: Use this guide to create test cases in your testing tool (TestRail, Zephyr, Jira)

**Bug Reporting**: Log issues with: Module | Test Case ID | Expected vs Actual | Severity | Screenshot

**Regression Testing**: Re-run all cases after any code change

---

**Last Updated**: May 4, 2026
**Maintained By**: QA Team
**Next Review**: After each production release

