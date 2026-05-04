# 🏢 FoodPark Enterprise ERP Architecture

**Version**: 1.0  
**Status**: Production-Ready Design  
**Scope**: 12-Module Enterprise Restaurant Operating System  
**Tech Stack**: React 18 + Node.js/Express + PostgreSQL + Socket.IO  
**Design Pattern**: Multi-tenant ready, RBAC, Audit-logged, Transaction-safe

---

## 📋 Table of Contents

1. [Module A: Inventory Management](#module-a-inventory-management)
2. [Module B: Purchase Management](#module-b-purchase-management)
3. [Module C: Supplier Management](#module-c-supplier-management)
4. [Module D: Customer CRM & Loyalty](#module-d-customer-crm--loyalty)
5. [Module E: Expense Management](#module-e-expense-management)
6. [Module F: Accounting Module](#module-f-accounting-module)
7. [Module G: Staff Attendance & Payroll](#module-g-staff-attendance--payroll)
8. [Module H: QR Ordering System](#module-h-qr-ordering-system)
9. [Module I: Delivery Fleet Management](#module-i-delivery-fleet-management)
10. [Module J: Advanced Reservation System](#module-j-advanced-reservation-system)
11. [Module K: Multi-Branch Management](#module-k-multi-branch-management)
12. [Module L: Business Intelligence](#module-l-business-intelligence)
13. [QA Guide](#qa-guide)

---

# MODULE A: INVENTORY MANAGEMENT

## 🎯 FEATURES

**Core Capabilities:**
- Ingredient master with SKU tracking
- Recipe/BOM (Bill of Materials) with sub-recipes
- Real-time stock deduction per order
- Stock transfers between branches
- Waste & expiry tracking
- Automated stock alerts
- Valuation methods (FIFO, LIFO, WAC)
- Multi-warehouse locations
- Barcode scanning

**Workflows:**
```
Order → Item → Recipe BOM → Stock Deduction → Alert if Low
Purchase Receipt → Stock Add → Valuation Update
Waste Entry → Stock Deduction + Cost Calculation
Transfer → Source Location -X → Dest Location +X
```

## 📊 DATABASE SCHEMA

### Core Tables

```sql
-- Ingredient Master
CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_of_measure VARCHAR(20) NOT NULL, -- kg, ltr, pieces, dozen
  category_id INT NOT NULL,
  supplier_id INT,
  min_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_stock DECIMAL(12,2),
  reorder_level DECIMAL(12,2) NOT NULL,
  reorder_qty DECIMAL(12,2) NOT NULL,
  cost_per_unit DECIMAL(12,4) NOT NULL,
  current_valuation_method VARCHAR(20) DEFAULT 'WAC', -- FIFO, LIFO, WAC
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (category_id) REFERENCES ingredient_categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  INDEX idx_branch_sku (branch_id, sku),
  INDEX idx_category (category_id)
);

-- Stock Ledger (Real-time inventory)
CREATE TABLE stock_ledgers (
  id SERIAL PRIMARY KEY,
  ingredient_id INT NOT NULL,
  warehouse_location_id INT NOT NULL,
  current_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(12,2) NOT NULL DEFAULT 0, -- reserved orders excluded
  reserved_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  last_counted_at TIMESTAMP,
  last_counted_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(id),
  UNIQUE (ingredient_id, warehouse_location_id),
  INDEX idx_ingredient (ingredient_id)
);

-- Stock Transactions (Audit trail)
CREATE TABLE stock_transactions (
  id SERIAL PRIMARY KEY,
  ingredient_id INT NOT NULL,
  warehouse_location_id INT NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- purchase, order_deduction, adjustment, waste, transfer, return
  quantity_change DECIMAL(12,2) NOT NULL,
  cost_per_unit DECIMAL(12,4),
  total_cost DECIMAL(14,2),
  reference_type VARCHAR(50), -- order_id, purchase_order_id, waste_entry_id
  reference_id INT,
  notes TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_ingredient_type (ingredient_id, transaction_type),
  INDEX idx_reference (reference_type, reference_id),
  INDEX idx_created (created_at DESC)
);

-- Recipe/BOM
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  food_item_id INT NOT NULL,
  recipe_name VARCHAR(255) NOT NULL,
  yield_quantity DECIMAL(12,2) NOT NULL,
  yield_unit VARCHAR(20) NOT NULL,
  recipe_cost DECIMAL(14,4) NOT NULL, -- auto-calculated
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  effective_date DATE NOT NULL,
  discontinued_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (food_item_id) REFERENCES food_items(id),
  INDEX idx_branch_food (branch_id, food_item_id)
);

-- Recipe Details (BOM Lines)
CREATE TABLE recipe_details (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity_required DECIMAL(12,4) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  INDEX idx_recipe (recipe_id)
);

-- Sub-Recipes (for composite items)
CREATE TABLE recipe_sub_recipes (
  id SERIAL PRIMARY KEY,
  parent_recipe_id INT NOT NULL,
  child_recipe_id INT NOT NULL,
  quantity_required DECIMAL(12,4) NOT NULL,
  sequence INT,
  FOREIGN KEY (parent_recipe_id) REFERENCES recipes(id),
  FOREIGN KEY (child_recipe_id) REFERENCES recipes(id),
  INDEX idx_parent (parent_recipe_id)
);

-- Warehouse Locations
CREATE TABLE warehouse_locations (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  location_name VARCHAR(100) NOT NULL,
  location_type VARCHAR(50) DEFAULT 'storage', -- storage, cold_storage, dry_store, kitchen
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  UNIQUE (branch_id, location_name)
);

-- Stock Waste & Adjustment
CREATE TABLE waste_entries (
  id SERIAL PRIMARY KEY,
  ingredient_id INT NOT NULL,
  warehouse_location_id INT NOT NULL,
  quantity_wasted DECIMAL(12,2) NOT NULL,
  waste_reason VARCHAR(100) NOT NULL, -- expiry, damage, theft, spillage, quality
  cost_of_waste DECIMAL(14,2) NOT NULL,
  notes TEXT,
  photo_url VARCHAR(500),
  approved_by INT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_ingredient (ingredient_id),
  INDEX idx_status (status)
);

-- Stock Adjustments
CREATE TABLE stock_adjustments (
  id SERIAL PRIMARY KEY,
  adjustment_date DATE NOT NULL,
  branch_id INT NOT NULL,
  adjustment_reason VARCHAR(100) NOT NULL, -- physical_count, correction, shrinkage
  total_adjustment_cost DECIMAL(14,2),
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved
  created_by INT NOT NULL,
  submitted_by INT,
  approved_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Stock Adjustment Lines
CREATE TABLE stock_adjustment_lines (
  id SERIAL PRIMARY KEY,
  adjustment_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  warehouse_location_id INT NOT NULL,
  quantity_before DECIMAL(12,2),
  quantity_after DECIMAL(12,2),
  quantity_variance DECIMAL(12,2),
  FOREIGN KEY (adjustment_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(id)
);

-- Stock Transfers
CREATE TABLE stock_transfers (
  id SERIAL PRIMARY KEY,
  from_branch_id INT NOT NULL,
  to_branch_id INT NOT NULL,
  from_location_id INT NOT NULL,
  to_location_id INT NOT NULL,
  transfer_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_transit, received, cancelled
  created_by INT NOT NULL,
  approved_by INT,
  received_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  received_at TIMESTAMP,
  FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  FOREIGN KEY (to_branch_id) REFERENCES branches(id),
  FOREIGN KEY (from_location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (to_location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

-- Stock Transfer Lines
CREATE TABLE stock_transfer_lines (
  id SERIAL PRIMARY KEY,
  transfer_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity_transferred DECIMAL(12,2) NOT NULL,
  quantity_received DECIMAL(12,2),
  unit_cost DECIMAL(12,4),
  FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- Expiry Tracking
CREATE TABLE expiry_tracking (
  id SERIAL PRIMARY KEY,
  ingredient_id INT NOT NULL,
  warehouse_location_id INT NOT NULL,
  batch_number VARCHAR(100),
  purchase_date DATE,
  expiry_date DATE NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(id),
  INDEX idx_expiry (expiry_date),
  INDEX idx_ingredient (ingredient_id)
);

-- Ingredient Categories
CREATE TABLE ingredient_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_category_id INT,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (parent_category_id) REFERENCES ingredient_categories(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/inventory.js

// ===== INGREDIENT MANAGEMENT =====
GET    /api/inventory/ingredients              // List with filters
GET    /api/inventory/ingredients/:id          // Get single
POST   /api/inventory/ingredients              // Create
PUT    /api/inventory/ingredients/:id          // Update
DELETE /api/inventory/ingredients/:id          // Soft delete

// ===== STOCK LEDGER =====
GET    /api/inventory/stock/current            // Real-time stock by warehouse
GET    /api/inventory/stock/ledger             // Stock transaction history
POST   /api/inventory/stock/physical-count     // Start count
POST   /api/inventory/stock/finalize-count     // Finalize count

// ===== RECIPES/BOM =====
GET    /api/inventory/recipes                  // List recipes
POST   /api/inventory/recipes                  // Create recipe
PUT    /api/inventory/recipes/:id              // Update recipe
GET    /api/inventory/recipes/:id/cost         // Calculate recipe cost
POST   /api/inventory/recipes/:id/clone        // Clone with version
DELETE /api/inventory/recipes/:id              // Archive recipe

// ===== STOCK ADJUSTMENTS =====
POST   /api/inventory/adjustments              // Create adjustment
GET    /api/inventory/adjustments/:id          // Get adjustment
POST   /api/inventory/adjustments/:id/lines    // Add lines
POST   /api/inventory/adjustments/:id/submit   // Submit for approval
POST   /api/inventory/adjustments/:id/approve  // Approve (Admin)
POST   /api/inventory/adjustments/:id/reject   // Reject (Admin)

// ===== WASTE MANAGEMENT =====
POST   /api/inventory/waste                    // Record waste
GET    /api/inventory/waste                    // List waste
POST   /api/inventory/waste/:id/approve        // Approve waste
GET    /api/inventory/waste/report/monthly     // Monthly waste report

// ===== TRANSFERS =====
POST   /api/inventory/transfers                // Create transfer
GET    /api/inventory/transfers/:id            // Get transfer
PATCH  /api/inventory/transfers/:id/status     // Update status (pending→in_transit→received)
GET    /api/inventory/transfers                // List transfers

// ===== EXPIRY ALERTS =====
GET    /api/inventory/expiry/near-expiry       // Items expiring in 7 days
GET    /api/inventory/expiry/expired           // Expired items
POST   /api/inventory/expiry/:id/archive       // Mark as handled

// ===== STOCK ALERTS =====
GET    /api/inventory/alerts/low-stock         // Below min_stock
GET    /api/inventory/alerts/overstock         // Above max_stock
POST   /api/inventory/alerts/auto-po           // Create PO for low items
```

### Request/Response Examples

```javascript
// Create Ingredient
POST /api/inventory/ingredients
{
  "sku": "ING-FLOUR-001",
  "name": "All-Purpose Flour",
  "category_id": 5,
  "unit_of_measure": "kg",
  "supplier_id": 3,
  "min_stock": 50,
  "max_stock": 200,
  "reorder_level": 75,
  "reorder_qty": 100,
  "cost_per_unit": 25.50
}

Response: 201
{
  "id": 42,
  "sku": "ING-FLOUR-001",
  "name": "All-Purpose Flour",
  "current_stock": 0,
  "unit_cost": 25.50,
  "status": "active"
}

// Create Recipe
POST /api/inventory/recipes
{
  "food_item_id": 8,
  "recipe_name": "Margherita Pizza",
  "yield_quantity": 1,
  "yield_unit": "pieces",
  "effective_date": "2026-05-01",
  "ingredients": [
    { "ingredient_id": 42, "quantity_required": 0.2, "unit_of_measure": "kg" },
    { "ingredient_id": 15, "quantity_required": 100, "unit_of_measure": "ml" }
  ]
}

Response: 201
{
  "id": 12,
  "recipe_name": "Margherita Pizza",
  "recipe_cost": 85.50,
  "ingredient_count": 2,
  "status": "active"
}

// Stock Deduction on Order
POST /api/inventory/stock/deduct-for-order
{
  "order_id": 501,
  "items": [
    { "food_item_id": 8, "quantity": 2 }
  ]
}

Response: 200
{
  "deductions": [
    {
      "ingredient_id": 42,
      "quantity_deducted": 0.4,
      "remaining_stock": 149.6,
      "below_reorder": false
    }
  ],
  "total_cost": 171
}

// Record Waste
POST /api/inventory/waste
{
  "ingredient_id": 42,
  "warehouse_location_id": 2,
  "quantity_wasted": 5,
  "waste_reason": "expiry",
  "cost_of_waste": 127.50,
  "notes": "Expired on 2026-05-03"
}

Response: 201
{
  "id": 18,
  "status": "pending",
  "approval_required": true,
  "created_at": "2026-05-04T10:15:00Z"
}

// Stock Transfer
POST /api/inventory/transfers
{
  "from_branch_id": 1,
  "to_branch_id": 2,
  "from_location_id": 1,
  "to_location_id": 3,
  "transfer_date": "2026-05-05",
  "lines": [
    { "ingredient_id": 42, "quantity_transferred": 25 }
  ]
}

Response: 201
{
  "id": 5,
  "status": "pending",
  "from_branch": "Main Branch",
  "to_branch": "Downtown Branch"
}
```

## ⚙️ BUSINESS LOGIC

### Stock Deduction Workflow
```javascript
// When order completes payment:
1. Find recipes for each order item
2. For each recipe detail:
   - Lookup ingredient stock
   - Check available_quantity >= required_qty
   - If insufficient: REJECT order with "Low Stock" error
   - If sufficient: Create stock_transaction (type: order_deduction)
3. Update stock_ledger: available_quantity -= qty, reserved_qty -= qty
4. Calculate weighted cost deduction
5. Check if below reorder_level → Auto-create PO alert
6. Emit socket event: "stock_updated" with new levels
```

### Recipe Cost Calculation
```javascript
// Auto-calculate on recipe save/update:
recipe_cost = SUM(
  ingredient.quantity_required * ingredient.cost_per_unit
  FOR EACH ingredient IN recipe.ingredients
)

// When ingredient cost changes:
- Update all dependent recipes
- Recalculate menu item food_cost %
- Flag for profit margin review if margin < 30%
```

### Waste Approval
```javascript
waste_entry.status = 'pending'
// Admin reviews
IF approved:
  - Create stock_transaction (type: waste)
  - Deduct from stock_ledger
  - Record in cost_of_goods_sold
  - Update ingredient.cost_per_unit if FIFO
ELSE IF rejected:
  - Notify user with rejection reason
  - Don't deduct stock
```

### Stock Valuation Methods
```javascript
// FIFO: First In, First Out
- Deduct oldest batch first
- Use oldest batch's cost_per_unit

// LIFO: Last In, First Out
- Deduct newest batch first
- Use newest batch's cost_per_unit

// WAC: Weighted Average Cost
- cost_per_unit = (total_inventory_value) / (total_qty)
- Update on every purchase
```

### Transfer Status Flow
```
pending → (admin approve) → in_transit → (receiving location receive) → received
         → (admin reject) → cancelled
```

## 🎨 UI STRUCTURE

**Pages:**
- `/inventory/dashboard` — Stock levels, alerts, valuation
- `/inventory/ingredients` — Master data CRUD, bulk import
- `/inventory/recipes` — Recipe builder, cost analysis, versioning
- `/inventory/stock` — Real-time ledger, physical count, adjustments
- `/inventory/waste` — Waste tracking, approval workflow
- `/inventory/transfers` — Inter-branch transfers
- `/inventory/expiry` — Expiry calendar, alerts
- `/inventory/alerts` — Low stock, overstock, reorder

**Components:**
- `<RecipeBuilder>` — Drag-drop ingredient selection with auto-cost calc
- `<StockCounter>` — Barcode scanning, real-time count interface
- `<TransferModal>` — Multi-line transfer with receiving confirmation
- `<ExpiryChart>` — Calendar heatmap showing expiry dates
- `<StockLevelGauge>` — Visual min/reorder/max levels

## 📈 REPORTS & KPIs

**Inventory Reports:**
- Stock Valuation Report (FIFO/LIFO/WAC)
- Stock Movement Report (by ingredient, date range)
- Waste Report (by reason, cost, trend)
- Recipe Cost Analysis (margin %, trending costs)
- Expiry Risk Report
- Stock Turnover (COGS ÷ avg inventory)
- Inventory Aging

**KPIs:**
- Days of Inventory Outstanding (DIO)
- Stock Turnover Ratio
- Gross Profit Margin (by recipe)
- Waste % of COGS
- Expiry Loss Rate

## 🔗 INTEGRATION POINTS

### With Orders
```javascript
// On order finalization:
- Deduct recipe ingredients from stock
- Update reserved_qty if order pending
- Check stock availability before order confirmation
- Calculate order food_cost from recipe_cost

// On order cancellation:
- Restore reserved stock to available
- Reverse stock_transaction
```

### With Purchasing
```javascript
// On purchase receipt:
- Add received qty to stock_ledger
- Create stock_transaction (type: purchase)
- Update cost_per_unit (for valuation)
- Match batch_number with expiry_date
- Update COGS
```

### With Reports
```javascript
// Real-time dashboard:
- Total inventory value (SUM all stock_ledger * cost_per_unit)
- Stock-to-sales ratio
- Inventory days outstanding
```

### With Multi-Branch
```javascript
// Stock transfer between branches:
- Deduct from source branch stock_ledger
- Add to destination branch stock_ledger
- Track transfer status through workflow
```

## 🚨 EDGE CASES

1. **Fractional Stock** — Ingredients used in grams but purchased in kg
   - Solution: Normalize UOM on deduction using conversion_factor table

2. **Batch Expiry** — Multiple batches same ingredient, different expiry dates
   - Solution: Track batch_number in expiry_tracking, deduct oldest first (FIFO)

3. **Recipe Cascades** — Sub-recipes within recipes
   - Solution: Recursive resolution of recipe_sub_recipes table

4. **Concurrent Orders** — Multiple orders deducting same ingredient
   - Solution: Use SERIALIZABLE transaction isolation on stock_ledger update

5. **Waste Without Approval** — Kitchen staff record waste without owner approval
   - Solution: status='pending', audit log, admin approval required before COGS impact

6. **Zero Quantity Orders** — Customer removes all items, completes payment
   - Solution: Order total becomes 0, no stock deduction, mark as edge case

7. **Ingredient Discontinuation** — Stop using ingredient but stock remains
   - Solution: Mark ingredient as inactive, maintain historical transactions

## 📈 SCALABILITY NOTES

**1-10 Branches:**
- Single PostgreSQL database with branch_id isolation
- Stock_ledger indexed by (ingredient_id, warehouse_location_id)
- Transfer queue in memory or Redis

**10-100 Branches:**
- Implement read replicas for reporting queries
- Cache ingredient master in Redis with TTL 1hr
- Async stock adjustment processing with message queue
- Stock_transactions table partitioned by date (monthly)
- Use batch inserts for waste entries

**100+ Branches:**
- Multi-region PostgreSQL with replication
- Stock_ledger denormalized for fast reads
- Kafka queue for stock transactions
- Real-time analytics via ClickHouse
- CDN for bulk ingredient masters

---

# MODULE B: PURCHASE MANAGEMENT

## 🎯 FEATURES

**Core Capabilities:**
- Purchase order creation from low-stock alerts
- Manual PO entry
- Multiple items per PO
- Goods receiving (GR) with quantity variance
- Invoice matching (PO-GR-Invoice reconciliation)
- Payment tracking
- Purchase returns
- Supplier performance metrics
- Multi-currency support

## 📊 DATABASE SCHEMA

```sql
-- Purchase Orders
CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INT NOT NULL,
  po_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending, confirmed, partial_receipt, received, cancelled
  total_amount DECIMAL(14,2),
  total_tax DECIMAL(14,2),
  total_cost DECIMAL(14,2),
  notes TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_po_number (po_number),
  INDEX idx_supplier_date (supplier_id, po_date)
);

-- PO Line Items
CREATE TABLE purchase_order_lines (
  id SERIAL PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity_ordered DECIMAL(12,2) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(14,2), -- auto-calculated
  received_quantity DECIMAL(12,2) DEFAULT 0,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- Goods Receiving
CREATE TABLE goods_receiving_notes (
  id SERIAL PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  gr_number VARCHAR(50) UNIQUE NOT NULL,
  receipt_date DATE NOT NULL,
  received_by INT NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, completed, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (received_by) REFERENCES users(id),
  INDEX idx_gr_number (gr_number)
);

-- GR Line Items (with quantity variance)
CREATE TABLE goods_receiving_lines (
  id SERIAL PRIMARY KEY,
  grn_id INT NOT NULL,
  purchase_order_line_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity_expected DECIMAL(12,2) NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL,
  quantity_variance DECIMAL(12,2), -- received - expected
  variance_reason VARCHAR(100), -- damaged, short_ship, over_ship, quality_reject
  warehouse_location_id INT NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  FOREIGN KEY (grn_id) REFERENCES goods_receiving_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_order_line_id) REFERENCES purchase_order_lines(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(id)
);

-- Purchase Invoice (Supplier Invoice)
CREATE TABLE purchase_invoices (
  id SERIAL PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  supplier_id INT NOT NULL,
  invoice_amount DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2),
  total_due DECIMAL(14,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, matched, partial_paid, paid, disputed
  payment_terms VARCHAR(100), -- Net 30, 2/10 Net 30
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  UNIQUE (supplier_id, invoice_number),
  INDEX idx_invoice_date (invoice_date)
);

-- Three-Way Match (PO-GR-Invoice)
CREATE TABLE three_way_match (
  id SERIAL PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  grn_id INT,
  purchase_invoice_id INT,
  po_total DECIMAL(14,2),
  gr_total DECIMAL(14,2),
  invoice_total DECIMAL(14,2),
  match_status VARCHAR(50) DEFAULT 'pending', -- pending, matched, variance, dispute
  variance_type VARCHAR(100), -- qty_variance, price_variance, tax_variance
  variance_amount DECIMAL(14,2),
  matched_at TIMESTAMP,
  matched_by INT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (grn_id) REFERENCES goods_receiving_notes(id),
  FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id),
  FOREIGN KEY (matched_by) REFERENCES users(id)
);

-- Purchase Returns
CREATE TABLE purchase_returns (
  id SERIAL PRIMARY KEY,
  original_po_id INT NOT NULL,
  return_date DATE NOT NULL,
  reason VARCHAR(100) NOT NULL, -- defective, not_as_ordered, expired, quality
  total_return_amount DECIMAL(14,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, received
  created_by INT NOT NULL,
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  FOREIGN KEY (original_po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Return Lines
CREATE TABLE purchase_return_lines (
  id SERIAL PRIMARY KEY,
  return_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity_returned DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  return_amount DECIMAL(14,2),
  FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/purchase.js

// ===== PURCHASE ORDERS =====
POST   /api/purchase/po                       // Create PO
GET    /api/purchase/po                       // List POs with filters
GET    /api/purchase/po/:id                   // Get PO details
PUT    /api/purchase/po/:id                   // Update PO (draft only)
POST   /api/purchase/po/:id/confirm           // Confirm PO
POST   /api/purchase/po/:id/cancel            // Cancel PO
POST   /api/purchase/po/auto-create           // Auto-create from low stock

// ===== GOODS RECEIVING =====
POST   /api/purchase/grn                      // Create GRN
GET    /api/purchase/grn/:id                  // Get GRN
POST   /api/purchase/grn/:id/complete         // Complete receipt
POST   /api/purchase/grn/:id/lines            // Add/edit lines

// ===== THREE-WAY MATCH =====
POST   /api/purchase/match                    // Trigger 3-way match
GET    /api/purchase/match/:po_id             // Get match status
POST   /api/purchase/match/:id/resolve        // Resolve variance

// ===== PURCHASE INVOICES =====
POST   /api/purchase/invoice                  // Create invoice
GET    /api/purchase/invoice                  // List invoices
PATCH  /api/purchase/invoice/:id/status       // Update status

// ===== PURCHASE RETURNS =====
POST   /api/purchase/return                   // Create return
GET    /api/purchase/return/:id               // Get return
POST   /api/purchase/return/:id/approve       // Approve return
POST   /api/purchase/return/:id/reject        // Reject return
```

### Request/Response Examples

```javascript
// Auto-Create PO from Low Stock
POST /api/purchase/po/auto-create
{
  "branch_id": 1,
  "supplier_id": 3
}

Response: 201
{
  "po_id": 45,
  "po_number": "PO-2026-05-001",
  "items": [
    {
      "ingredient_id": 42,
      "quantity_ordered": 100,
      "current_stock": 15,
      "reorder_level": 75
    }
  ],
  "total": 2550.50,
  "status": "draft"
}

// Create Goods Receiving
POST /api/purchase/grn
{
  "purchase_order_id": 45,
  "receipt_date": "2026-05-04",
  "lines": [
    {
      "ingredient_id": 42,
      "quantity_expected": 100,
      "quantity_received": 98,
      "variance_reason": "short_ship",
      "batch_number": "BATCH-2026-001",
      "expiry_date": "2026-08-04",
      "warehouse_location_id": 1
    }
  ]
}

Response: 201
{
  "grn_id": 12,
  "grn_number": "GRN-2026-05-001",
  "status": "draft",
  "variance_detected": {
    "ingredient_id": 42,
    "expected": 100,
    "received": 98,
    "variance": -2
  }
}

// Three-Way Match
POST /api/purchase/match
{
  "purchase_order_id": 45,
  "grn_id": 12,
  "purchase_invoice_id": 8
}

Response: 200
{
  "match_status": "variance",
  "po_total": 2550.50,
  "gr_total": 2499.50,
  "invoice_total": 2560.00,
  "variance_type": "qty_variance",
  "variance_amount": -51.00,
  "action_required": "Resolve quantity mismatch"
}
```

## ⚙️ BUSINESS LOGIC

### Auto-PO from Low Stock
```javascript
// Run daily:
FOR EACH ingredient WHERE current_qty < reorder_level:
  IF not exist(draft_po WITH ingredient):
    GROUP by supplier_id
    CREATE purchase_order with status='draft'
    EMAIL to procurement manager
    AWAIT confirmation before confirming
```

### Three-Way Match Logic
```
PO Amount vs GR Amount vs Invoice Amount

Match Results:
1. Perfect Match (all three equal) → Auto-approve → Move to payment
2. Qty Variance (PO qty ≠ GR qty):
   - If receiver accepted: Update PO & Invoice to match GR
   - If rejected: Create dispute ticket
3. Price Variance (GR total ≠ Invoice):
   - Flag for approval
   - Calculate difference
   - Document reason
4. Dispute → Manager review → Decision (accept/reject/renegotiate)

Auto-approval if variance < 2%
Manual approval if variance >= 2%
```

### Goods Receiving Variance
```javascript
quantity_variance = quantity_received - quantity_expected

IF variance > 0: OVER_SHIP
  - Accept as credit (not deducted from stock)
  - Contact supplier for pickup

IF variance < 0: SHORT_SHIP
  - Document variance_reason
  - Deduct expected from PO receipt
  - Create credit memo request

IF variance > 5% OF QUANTITY:
  - Flag for manager approval
  - Don't auto-add to stock
  - Pending manual review
```

### Return Processing
```javascript
purchase_return.status = 'pending'
→ (IF approved) status = 'approved'
  - Create credit memo
  - Update supplier_ledger balance
  - Deduct stock_transaction (type: return)
  - Reverse COGS entry
→ (IF rejected) status = 'rejected'
  - Notify requestor
  - Close return
```

## 🎨 UI STRUCTURE

**Pages:**
- `/purchase/po-dashboard` — PO status overview, aging analysis
- `/purchase/orders` — PO CRUD, bulk import, auto-create
- `/purchase/receiving` — GRN entry with barcode scanning, variance handling
- `/purchase/matching` — Three-way match status, variance resolution
- `/purchase/returns` — Create/approve returns
- `/purchase/invoices` — Invoice tracking, payment status

**Components:**
- `<POBuilder>` — Item selection with auto-quantity from reorder
- `<QuantityVarianceResolver>` — Handle short/over shipping
- `<InvoiceMatchModal>` — Visual side-by-side comparison

## 📈 REPORTS & KPIs

**Purchase Reports:**
- PO Aging Report (by status, overdue)
- Goods Receiving Performance (variance %, on-time %)
- Three-Way Match Report (perfect match %, disputes)
- Supplier Performance (quality, timeliness, price variance)
- Purchase Return Analysis

**KPIs:**
- Perfect Match Rate
- GRN Variance %
- Days Payable Outstanding (DPO)
- Supplier On-Time Delivery %

## 🔗 INTEGRATION POINTS

### With Inventory
```javascript
// On GRN completion:
- Add received qty to stock_ledger
- Create stock_transaction (type: purchase)
- Match batch_number with expiry_date
- Update ingredient.cost_per_unit
```

### With Accounting
```javascript
// On Invoice receipt:
- Create accounts_payable entry
- Post to supplier_ledger
// On Payment:
- Reverse AP entry
- Create cash disbursement
```

### With Supplier CRM
```javascript
// Track supplier performance:
- On-time delivery %
- Quality issues count
- Price variance %
- Return rate
```

---

# MODULE C: SUPPLIER MANAGEMENT

## 🎯 FEATURES

**Core Capabilities:**
- Supplier master with contact details
- Bank details for payments
- Performance tracking
- Supplier scorecards
- Payment history
- Supplier ledger
- Supplier segmentation (A/B/C)
- Multi-currency support
- Tax ID tracking

## 📊 DATABASE SCHEMA

```sql
-- Suppliers
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  supplier_type VARCHAR(50), -- ingredient, packaging, equipment
  tax_id VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'BDT',
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, blacklisted
  primary_contact_name VARCHAR(100),
  primary_phone VARCHAR(20),
  primary_email VARCHAR(100),
  payment_terms VARCHAR(100), -- Net 30, 2/10 Net 30
  credit_limit DECIMAL(14,2),
  current_credit_used DECIMAL(14,2) DEFAULT 0,
  annual_spend DECIMAL(14,2),
  performance_rating DECIMAL(3,1), -- 1-5 stars
  quality_score DECIMAL(5,2),
  delivery_score DECIMAL(5,2),
  price_competitiveness DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  INDEX idx_supplier_type (supplier_type),
  INDEX idx_status (status)
);

-- Supplier Contacts
CREATE TABLE supplier_contacts (
  id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL,
  contact_name VARCHAR(100) NOT NULL,
  contact_title VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- Supplier Bank Details
CREATE TABLE supplier_bank_details (
  id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL,
  account_holder_name VARCHAR(100),
  account_number VARCHAR(50),
  bank_name VARCHAR(100),
  bank_code VARCHAR(20),
  branch_code VARCHAR(20),
  is_primary BOOLEAN DEFAULT false,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- Supplier Performance (Scorecard)
CREATE TABLE supplier_performance (
  id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL,
  evaluation_period VARCHAR(50), -- monthly, quarterly, annual
  evaluation_date DATE,
  on_time_delivery_rate DECIMAL(5,2),
  quality_compliance_rate DECIMAL(5,2),
  price_variance_pct DECIMAL(5,2),
  return_rate DECIMAL(5,2),
  communication_score DECIMAL(3,1),
  overall_score DECIMAL(5,2),
  notes TEXT,
  evaluated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (evaluated_by) REFERENCES users(id)
);

-- Supplier Ledger (Accounting)
CREATE TABLE supplier_ledger (
  id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL,
  transaction_type VARCHAR(50), -- invoice, payment, return, adjustment
  reference_id INT, -- purchase_invoice_id, payment_id
  amount DECIMAL(14,2),
  balance_due DECIMAL(14,2),
  transaction_date DATE NOT NULL,
  due_date DATE,
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, partial_paid, paid, overdue
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  INDEX idx_supplier_date (supplier_id, transaction_date)
);

-- Supplier Payment History
CREATE TABLE supplier_payments (
  id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(14,2),
  payment_method VARCHAR(50), -- bank_transfer, check, cash
  reference_number VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Supplier Segmentation (ABC Analysis)
CREATE TABLE supplier_segments (
  id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL,
  segment VARCHAR(10), -- A (High Value), B (Medium), C (Low)
  annual_spend DECIMAL(14,2),
  segment_date DATE,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  INDEX idx_segment (segment)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/supplier.js

// ===== SUPPLIER MASTER =====
POST   /api/supplier                          // Create supplier
GET    /api/supplier                          // List suppliers
GET    /api/supplier/:id                      // Get supplier detail
PUT    /api/supplier/:id                      // Update supplier
DELETE /api/supplier/:id                      // Deactivate supplier

// ===== SUPPLIER LEDGER =====
GET    /api/supplier/:id/ledger               // Supplier transactions
GET    /api/supplier/:id/balance              // Outstanding balance

// ===== PAYMENTS =====
POST   /api/supplier/:id/payment              // Record payment
GET    /api/supplier/:id/payments             // Payment history
GET    /api/supplier/report/aging             // Aging report

// ===== PERFORMANCE =====
GET    /api/supplier/:id/performance          // Performance scorecard
POST   /api/supplier/:id/evaluate             // Create evaluation
GET    /api/supplier/ranking                  // Top/bottom suppliers

// ===== SEGMENTATION =====
GET    /api/supplier/segments                 // ABC segments
POST   /api/supplier/segments/calculate       // Recalculate (Admin)
```

### Request/Response Examples

```javascript
// Create Supplier
POST /api/supplier
{
  "supplier_name": "Premium Flour Mills",
  "supplier_type": "ingredient",
  "tax_id": "TAX-2024-001",
  "primary_contact_name": "Ahmed Khan",
  "primary_phone": "+880171234567",
  "primary_email": "contact@flourmills.com",
  "payment_terms": "Net 30",
  "credit_limit": 50000,
  "bank_account_number": "1234567890",
  "bank_name": "Standard Bank"
}

Response: 201
{
  "id": 3,
  "supplier_name": "Premium Flour Mills",
  "status": "active",
  "credit_available": 50000
}

// Record Payment
POST /api/supplier/3/payment
{
  "payment_date": "2026-05-04",
  "amount_paid": 25000,
  "payment_method": "bank_transfer",
  "reference_number": "TXN-2026-001"
}

Response: 201
{
  "payment_id": 5,
  "supplier": "Premium Flour Mills",
  "amount_paid": 25000,
  "new_balance": 15000,
  "previous_balance": 40000
}

// Get Supplier Performance
GET /api/supplier/3/performance

Response: 200
{
  "supplier_id": 3,
  "overall_score": 4.2,
  "on_time_delivery_rate": 95,
  "quality_compliance_rate": 92,
  "price_variance_pct": 2.5,
  "segment": "A",
  "annual_spend": 245000,
  "last_evaluation": "2026-04-01"
}
```

## ⚙️ BUSINESS LOGIC

### ABC Segmentation
```javascript
// Annual spend-based classification:
A = Top 20% of suppliers by spend (High value)
B = Next 30% of suppliers by spend (Medium value)
C = Remaining 50% of suppliers by spend (Low value)

// Run monthly:
SORT suppliers BY annual_spend DESC
ASSIGN segment based on cumulative %
UPDATE supplier_segments
NOTIFY procurement for A-segment strategy
```

### Supplier Scorecard
```javascript
overall_score = (
  on_time_delivery_rate * 0.30 +
  quality_compliance_rate * 0.30 +
  (100 - ABS(price_variance_pct)) * 0.25 +
  (5 - return_rate) * 0.15
) / 100

IF overall_score >= 4.5: "Excellent"
IF overall_score >= 3.5: "Good"
IF overall_score >= 2.5: "Fair"
ELSE: "Poor" → Consider replacement
```

### Payment Tracking
```javascript
payment_status FLOW:
pending → (IF paid_in_full) paid
       → (IF paid_partial) partial_paid
       → (IF past due_date AND unpaid) overdue

DPO = (supplier_ledger.balance_due / COGS_30days) * 30
```

## 🎨 UI STRUCTURE

**Pages:**
- `/supplier/master` — Supplier list, CRUD
- `/supplier/:id/profile` — Detail, contacts, bank details
- `/supplier/:id/ledger` — Payment history, aging
- `/supplier/:id/performance` — Scorecard, trends
- `/supplier/segments` — ABC analysis dashboard

**Components:**
- `<SupplierScorecard>` — Visual 4-metric display
- `<PaymentAging>` — Stacked bar chart (current, 30+, 60+, 90+)

## 📈 REPORTS & KPIs

**Reports:**
- Supplier Master List (with performance)
- Supplier Aging Report
- ABC Segmentation Analysis
- Supplier Performance Trend
- Payment Performance Report

**KPIs:**
- Top 10 suppliers by spend
- Average payment days
- Supplier concentration ratio (top 5 % of spend)

---

# MODULE D: CUSTOMER CRM & LOYALTY

## 🎯 FEATURES

**Core Capabilities:**
- Customer profiles with order history
- Loyalty points system
- Coupon/voucher engine
- Customer segmentation (RFM analysis)
- Feedback and ratings
- Referral program
- Customer analytics
- Lifetime value (CLV)

## 📊 DATABASE SCHEMA

```sql
-- Customers (CRM)
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  gender VARCHAR(10),
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(50),
  postal_code VARCHAR(20),
  loyalty_tier VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum
  total_lifetime_spent DECIMAL(14,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  first_order_date DATE,
  last_order_date DATE,
  average_order_value DECIMAL(12,2) DEFAULT 0,
  preferred_payment_method VARCHAR(50),
  dietary_preferences TEXT, -- vegetarian, vegan, gluten-free
  allergies TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  opted_in_marketing BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  INDEX idx_phone (phone_number),
  INDEX idx_loyalty_tier (loyalty_tier)
);

-- Loyalty Points
CREATE TABLE loyalty_points (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  points_balance DECIMAL(12,2) DEFAULT 0,
  points_earned DECIMAL(12,2) DEFAULT 0,
  points_redeemed DECIMAL(12,2) DEFAULT 0,
  tier_multiplier DECIMAL(3,2) DEFAULT 1.0, -- bronze=1.0, silver=1.5, gold=2.0, platinum=3.0
  last_point_expiry DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  UNIQUE (customer_id)
);

-- Loyalty Point Transactions
CREATE TABLE loyalty_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  transaction_type VARCHAR(50), -- earn, redeem, expire, adjust, promo
  points_amount DECIMAL(12,2),
  reference_type VARCHAR(50), -- order_id, coupon_id
  reference_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_customer_date (customer_id, created_at)
);

-- Loyalty Tiers (Rules)
CREATE TABLE loyalty_tiers (
  id SERIAL PRIMARY KEY,
  tier_name VARCHAR(50) UNIQUE NOT NULL,
  min_lifetime_spend DECIMAL(14,2),
  max_lifetime_spend DECIMAL(14,2),
  points_multiplier DECIMAL(3,2),
  discount_percentage DECIMAL(5,2),
  birthday_bonus_points INT,
  anniversary_bonus_points INT,
  description TEXT
);

-- Coupons/Vouchers
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  coupon_code VARCHAR(50) UNIQUE NOT NULL,
  coupon_type VARCHAR(50), -- percentage, fixed_amount, loyalty_redeem, referral
  description TEXT,
  discount_value DECIMAL(12,2),
  discount_percentage DECIMAL(5,2),
  min_order_amount DECIMAL(12,2),
  max_discount_amount DECIMAL(12,2),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  usage_limit INT,
  usage_count INT DEFAULT 0,
  per_customer_limit INT DEFAULT 1,
  is_stackable BOOLEAN DEFAULT false,
  applicable_categories TEXT, -- JSON: [1, 2, 3]
  applicable_to_delivery_only BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active', -- active, paused, expired, archived
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_code (coupon_code),
  INDEX idx_validity (valid_from, valid_until)
);

-- Coupon Usage
CREATE TABLE coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INT NOT NULL,
  customer_id INT,
  order_id INT NOT NULL,
  discount_amount DECIMAL(12,2),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_coupon_date (coupon_id, used_at)
);

-- Referral Program
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_customer_id INT NOT NULL,
  referred_customer_id INT,
  referral_code VARCHAR(50) UNIQUE,
  referral_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, converted, expired
  referral_bonus_points INT,
  bonus_awarded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_customer_id) REFERENCES customers(id),
  FOREIGN KEY (referred_customer_id) REFERENCES customers(id),
  INDEX idx_referral_code (referral_code)
);

-- Customer Feedback
CREATE TABLE customer_feedback (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  order_id INT,
  rating INT, -- 1-5 stars
  category VARCHAR(50), -- food_quality, service, delivery, value, ambience
  comment TEXT,
  feedback_date DATE,
  response TEXT,
  responded_by INT,
  responded_at TIMESTAMP,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (responded_by) REFERENCES users(id),
  INDEX idx_rating (rating),
  INDEX idx_date (feedback_date)
);

-- RFM Segments (Recency, Frequency, Monetary)
CREATE TABLE customer_segments (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  segment_name VARCHAR(50), -- champions, loyal, at_risk, dormant, new, lost
  recency_score INT, -- 1-5
  frequency_score INT, -- 1-5
  monetary_score INT, -- 1-5
  rfm_score INT, -- 111-555
  segment_date DATE,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  UNIQUE (customer_id, segment_date)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/customer-crm.js

// ===== CUSTOMER MASTER =====
POST   /api/crm/customer                      // Create customer
GET    /api/crm/customer                      // List customers
GET    /api/crm/customer/:id                  // Get customer detail
PUT    /api/crm/customer/:id                  // Update customer

// ===== LOYALTY =====
GET    /api/crm/customer/:id/loyalty          // Get loyalty info
POST   /api/crm/loyalty/points/earn           // Earn points (on order)
POST   /api/crm/loyalty/points/redeem         // Redeem points
GET    /api/crm/loyalty/tiers                 // List loyalty tiers
GET    /api/crm/customer/:id/tier-status      // Check tier upgrade eligibility

// ===== COUPONS =====
POST   /api/crm/coupon                        // Create coupon
GET    /api/crm/coupon                        // List coupons
GET    /api/crm/coupon/validate/:code         // Validate coupon
POST   /api/crm/coupon/:id/apply-order        // Apply to order
GET    /api/crm/coupon/report/usage           // Usage analytics

// ===== REFERRAL =====
GET    /api/crm/customer/:id/referral-code    // Get referral code
POST   /api/crm/referral/convert              // Convert referral to customer
GET    /api/crm/referral/report               // Referral analytics

// ===== FEEDBACK =====
POST   /api/crm/feedback                      // Submit feedback
GET    /api/crm/feedback                      // List feedback
GET    /api/crm/feedback/report/rating        // Rating analytics
POST   /api/crm/feedback/:id/respond          // Admin respond to feedback

// ===== ANALYTICS =====
GET    /api/crm/analytics/rfm                 // RFM analysis
GET    /api/crm/analytics/clv                 // Customer lifetime value
GET    /api/crm/analytics/churn-risk          // At-risk customers
```

### Request/Response Examples

```javascript
// Create Customer
POST /api/crm/customer
{
  "phone_number": "+880171234567",
  "first_name": "Karim",
  "last_name": "Ahmed",
  "email": "karim@example.com",
  "date_of_birth": "1990-05-15",
  "dietary_preferences": "vegetarian",
  "opted_in_marketing": true
}

Response: 201
{
  "id": 101,
  "phone_number": "+880171234567",
  "loyalty_tier": "bronze",
  "loyalty_points_balance": 0
}

// Earn Loyalty Points (After Order Payment)
POST /api/crm/loyalty/points/earn
{
  "customer_id": 101,
  "order_id": 501,
  "order_amount": 500,
  "points_rate": 1 // 1 point per BDT
}

Response: 200
{
  "points_earned": 500,
  "tier_multiplier": 1.0,
  "total_points": 500,
  "next_tier": "silver",
  "points_needed": 1500
}

// Validate Coupon
GET /api/crm/coupon/validate/WELCOME50

Response: 200
{
  "coupon_id": 5,
  "coupon_code": "WELCOME50",
  "coupon_type": "percentage",
  "discount_value": 50,
  "min_order_amount": 200,
  "applicable_categories": [1, 2, 3],
  "valid": true,
  "reason": "Active coupon"
}

// Submit Feedback
POST /api/crm/feedback
{
  "customer_id": 101,
  "order_id": 501,
  "rating": 4,
  "category": "food_quality",
  "comment": "Excellent biryani, but portion could be larger"
}

Response: 201
{
  "feedback_id": 15,
  "rating": 4,
  "status": "published"
}

// Get RFM Analysis
GET /api/crm/analytics/rfm

Response: 200
{
  "total_customers": 250,
  "segments": {
    "champions": {
      "count": 25,
      "avg_clv": 15000,
      "avg_frequency": 8.5
    },
    "loyal": {
      "count": 60,
      "avg_clv": 8000,
      "avg_frequency": 4.2
    },
    "at_risk": {
      "count": 45,
      "avg_clv": 3000,
      "avg_frequency": 1.8
    },
    "dormant": {
      "count": 120,
      "avg_clv": 1000,
      "avg_frequency": 0.5
    }
  }
}
```

## ⚙️ BUSINESS LOGIC

### Loyalty Tier Upgrade
```javascript
// On order payment:
customer.total_lifetime_spent += order_total
IF customer.total_lifetime_spent >= next_tier.min_spend:
  UPGRADE customer.loyalty_tier
  AWARD tier_bonus_points
  NOTIFY customer with new benefits

// Tier Benefits:
Bronze:   0 - 5,000 → 1x points, 0% discount
Silver:   5,000 - 15,000 → 1.5x points, 2% discount
Gold:     15,000 - 50,000 → 2x points, 5% discount
Platinum: 50,000+ → 3x points, 10% discount
```

### Points Calculation
```javascript
points_earned = order_subtotal * points_rate * tier_multiplier
points_earned = Math.floor(points_earned)

// Point expiry:
SET expires_at = created_at + 365 days
// On expiry date:
IF NOT redeemed:
  DEDUCT from points_balance
  CREATE loyalty_transaction (type: expire)
```

### RFM Segmentation
```javascript
// Calculate scores (1-5):
RECENCY = Days since last order
  1: > 180 days
  2: 91-180 days
  3: 31-90 days
  4: 8-30 days
  5: 0-7 days

FREQUENCY = Orders in last 12 months
  1: 0-1 orders
  2: 2-3 orders
  3: 4-6 orders
  4: 7-12 orders
  5: 13+ orders

MONETARY = Total spend in last 12 months
  1: 0-1,000
  2: 1,000-5,000
  3: 5,000-15,000
  4: 15,000-50,000
  5: 50,000+

// Segment assignment:
Champions: R=5, F=5, M=5 (RFM=555)
Loyal: R>=4, F>=4, M>=4 (RFM >= 444)
At Risk: R<=2, F<=2 (Lost interest)
Dormant: R=1, F=1 (Inactive)
New: Last order < 30 days, F < 2
Lost: R=1, M < avg_spend
```

### Coupon Engine
```javascript
VALIDATE coupon:
1. CHECK coupon_code exists
2. CHECK status = active
3. CHECK TODAY between valid_from and valid_until
4. CHECK order_total >= min_order_amount
5. CHECK usage_count < usage_limit
6. CHECK customer hasn't used > per_customer_limit
7. IF applicable_categories: CHECK order has items from applicable categories
8. IF order TYPE = delivery AND applicable_to_delivery_only: VERIFY

CALCULATE discount:
IF coupon_type = percentage:
  discount = order_total * (discount_percentage / 100)
  discount = MIN(discount, max_discount_amount)
ELSE IF coupon_type = fixed_amount:
  discount = discount_value

IF is_stackable = false AND other_coupon applied:
  ERROR: Cannot stack coupons

APPLY discount to order.discount_amount
```

## 🎨 UI STRUCTURE

**Pages:**
- `/crm/customers` — Customer list, search, segments
- `/crm/customer/:id` — Profile, order history, loyalty, feedback
- `/crm/loyalty` — Tier benefits, points, redemption
- `/crm/coupons` — Coupon management, analytics
- `/crm/analytics` — RFM, CLV, churn risk

**Components:**
- `<RFMMatrix>` — 5x5 grid visualization
- `<LoyaltyTierProgress>` — Visual progress to next tier
- `<CouponValidator>` — Real-time validation UI
- `<FeedbackWidget>` — Rating + comment form
- `<CLVCard>` — Customer lifetime value summary

## 📈 REPORTS & KPIs

**Reports:**
- Customer Segmentation (RFM, CLV, Tenure)
- Loyalty Redemption Analysis
- Coupon Performance (Usage, ROI)
- Churn Risk Analysis
- Customer Feedback Summary

**KPIs:**
- Customer Lifetime Value (CLV)
- Customer Acquisition Cost (CAC)
- Churn Rate (Lost customers %)
- Loyalty Program ROI
- Net Promoter Score (NPS) from feedback ratings

## 🔗 INTEGRATION POINTS

### With Orders
```javascript
// On order payment:
- Identify/create customer from phone
- Earn loyalty points
- Apply coupon if used
- Update customer.last_order_date
- Update customer.total_lifetime_spent
- Check tier upgrade eligibility
```

### With Dashboard
```javascript
// Real-time widgets:
- Top customers by spend
- Recent feedback ratings
- Loyalty point redemption trend
- Churn risk alerts
```

---

# MODULE E: EXPENSE MANAGEMENT

## 🎯 FEATURES

**Core Capabilities:**
- Expense categories
- Manual expense entry
- Receipt attachment
- Recurring expenses
- Expense approval workflow
- Department/cost center allocation
- Expense analytics
- Recurring expense automation

## 📊 DATABASE SCHEMA

```sql
-- Expense Categories
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(20),
  description TEXT,
  cost_center VARCHAR(50), -- rent, utilities, salaries, marketing, etc
  is_operational BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (category_code)
);

-- Expenses
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  expense_category_id INT NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BDT',
  supplier_name VARCHAR(100),
  supplier_invoice_number VARCHAR(50),
  cost_center VARCHAR(50),
  payment_method VARCHAR(50), -- cash, bank_transfer, credit_card
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, rejected, paid
  is_recurring BOOLEAN DEFAULT false,
  recurring_expense_id INT,
  attachments TEXT, -- JSON: [url1, url2]
  notes TEXT,
  created_by INT NOT NULL,
  submitted_by INT,
  approved_by INT,
  payment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id),
  INDEX idx_date (expense_date),
  INDEX idx_status (status),
  INDEX idx_category (expense_category_id)
);

-- Recurring Expenses
CREATE TABLE recurring_expenses (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  expense_category_id INT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  frequency VARCHAR(50), -- daily, weekly, monthly, quarterly, annual
  day_of_month INT, -- for monthly frequency
  day_of_week VARCHAR(20), -- for weekly frequency
  start_date DATE NOT NULL,
  end_date DATE,
  next_expense_date DATE,
  auto_approve BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/expense.js

POST   /api/expense                           // Create expense
GET    /api/expense                           // List expenses
GET    /api/expense/:id                       // Get expense
PUT    /api/expense/:id                       // Update (draft only)
POST   /api/expense/:id/submit                // Submit for approval
POST   /api/expense/:id/approve               // Approve (Manager)
POST   /api/expense/:id/reject                // Reject

// Recurring
POST   /api/expense/recurring                 // Create recurring expense
GET    /api/expense/recurring                 // List recurring
PUT    /api/expense/recurring/:id             // Update recurring
POST   /api/expense/recurring/:id/pause       // Pause recurring
POST   /api/expense/recurring/:id/resume      // Resume recurring

// Reports
GET    /api/expense/report/category           // By category
GET    /api/expense/report/monthly            // Monthly breakdown
GET    /api/expense/report/pending-approval   // Approval queue
```

---

# MODULE F: ACCOUNTING MODULE

## 🎯 FEATURES

**Core Capabilities:**
- General Ledger
- Cashbook
- Accounts Payable (AP)
- Accounts Receivable (AR)
- Trial Balance
- Profit & Loss Statement
- Balance Sheet
- VAT Ledger
- Journal entries
- Bank reconciliation

## 📊 DATABASE SCHEMA

```sql
-- Chart of Accounts
CREATE TABLE chart_of_accounts (
  id SERIAL PRIMARY KEY,
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(50), -- asset, liability, equity, revenue, expense, cogs
  parent_account_id INT,
  is_active BOOLEAN DEFAULT true,
  balance_type VARCHAR(10), -- debit, credit
  FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id),
  INDEX idx_code (account_code),
  INDEX idx_type (account_type)
);

-- General Ledger
CREATE TABLE general_ledger (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  account_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50), -- sales, purchase, expense, transfer, adjustment
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  running_balance DECIMAL(14,2),
  reference_type VARCHAR(50), -- order_id, purchase_invoice_id, expense_id
  reference_id INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  INDEX idx_account_date (account_id, transaction_date),
  INDEX idx_transaction_type (transaction_type)
);

-- VAT Ledger
CREATE TABLE vat_ledger (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50), -- input_tax, output_tax, payment
  amount DECIMAL(14,2),
  rate DECIMAL(5,2),
  reference_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  INDEX idx_date (transaction_date)
);

-- Cashbook
CREATE TABLE cashbook (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50), -- receipt, payment, transfer
  amount DECIMAL(14,2),
  payment_method VARCHAR(50), -- cash, bank_transfer, check
  reference_number VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  INDEX idx_date (transaction_date)
);

-- Bank Accounts
CREATE TABLE bank_accounts (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  account_name VARCHAR(100),
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  account_type VARCHAR(50), -- checking, savings
  opening_balance DECIMAL(14,2),
  current_balance DECIMAL(14,2),
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Bank Reconciliation
CREATE TABLE bank_reconciliation (
  id SERIAL PRIMARY KEY,
  bank_account_id INT NOT NULL,
  statement_date DATE NOT NULL,
  statement_balance DECIMAL(14,2),
  book_balance DECIMAL(14,2),
  reconciliation_status VARCHAR(50), -- pending, reconciled, discrepancy
  discrepancy_amount DECIMAL(14,2),
  reconciled_by INT,
  reconciled_at TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (reconciled_by) REFERENCES users(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/accounting.js

// ===== GENERAL LEDGER =====
GET    /api/accounting/ledger                 // Trial balance
GET    /api/accounting/ledger/:account_id     // Account ledger

// ===== REPORTS =====
GET    /api/accounting/report/balance-sheet   // Balance sheet
GET    /api/accounting/report/pl              // P&L statement
GET    /api/accounting/report/cash-flow       // Cash flow
GET    /api/accounting/report/vat-summary     // VAT summary

// ===== BANK RECONCILIATION =====
POST   /api/accounting/bank-reconcile         // Create reconciliation
GET    /api/accounting/bank-reconcile/:id     // Get reconciliation
POST   /api/accounting/bank-reconcile/:id/finalize // Finalize

// ===== ADJUSTMENTS =====
POST   /api/accounting/journal-entry          // Manual journal entry
GET    /api/accounting/journal-entry          // List entries
```

---

# MODULE G: STAFF ATTENDANCE & PAYROLL

## 🎯 FEATURES

**Core Capabilities:**
- Attendance tracking (check-in/out)
- Shift management
- Overtime calculation
- Payroll processing
- Salary components
- Incentive/commission tracking
- Tips distribution
- Salary slips
- Tax deductions

## 📊 DATABASE SCHEMA

```sql
-- Shifts
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  shift_name VARCHAR(50),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INT, -- minutes
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  UNIQUE (branch_id, shift_name)
);

-- Staff Shift Assignment
CREATE TABLE staff_shift_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  shift_id INT NOT NULL,
  assignment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'assigned', -- assigned, worked, absent, leave
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  UNIQUE (user_id, assignment_date)
);

-- Attendance
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  worked_hours DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'present', -- present, absent, leave, late, early_leave
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, attendance_date)
);

-- Payroll
CREATE TABLE payroll (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  user_id INT NOT NULL,
  payroll_period_start DATE NOT NULL,
  payroll_period_end DATE NOT NULL,
  base_salary DECIMAL(14,2),
  worked_days INT,
  worked_hours DECIMAL(8,2),
  overtime_hours DECIMAL(8,2),
  overtime_pay DECIMAL(14,2),
  bonus DECIMAL(14,2),
  commission DECIMAL(14,2),
  tips_earned DECIMAL(14,2),
  gross_pay DECIMAL(14,2),
  tax_deduction DECIMAL(14,2),
  provident_fund DECIMAL(14,2),
  health_insurance DECIMAL(14,2),
  other_deductions DECIMAL(14,2),
  net_pay DECIMAL(14,2),
  status VARCHAR(50) DEFAULT 'draft', -- draft, processed, paid
  payment_date DATE,
  paid_via VARCHAR(50), -- cash, bank_transfer, check
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_period (payroll_period_start, payroll_period_end)
);

-- Tips Distribution
CREATE TABLE tips_pool (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  collection_date DATE,
  total_tips DECIMAL(14,2),
  distribution_method VARCHAR(50), -- equal, based_on_hours, based_on_orders
  status VARCHAR(50) DEFAULT 'pending', -- pending, distributed
  distributed_at TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Tips Distribution Lines
CREATE TABLE tips_distribution_lines (
  id SERIAL PRIMARY KEY,
  tips_pool_id INT NOT NULL,
  user_id INT NOT NULL,
  tips_share DECIMAL(14,2),
  basis_metric INT, -- hours_worked, orders_served
  FOREIGN KEY (tips_pool_id) REFERENCES tips_pool(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/hr.js

// ===== ATTENDANCE =====
POST   /api/hr/attendance/check-in            // Mobile check-in
POST   /api/hr/attendance/check-out           // Mobile check-out
GET    /api/hr/attendance/today               // Today's attendance
GET    /api/hr/attendance/report              // Monthly report

// ===== SHIFTS =====
POST   /api/hr/shift                          // Create shift
PUT    /api/hr/shift/:id                      // Update shift
POST   /api/hr/shift-assignment               // Assign staff to shift

// ===== PAYROLL =====
POST   /api/hr/payroll                        // Create payroll (monthly)
GET    /api/hr/payroll/:id                    // Get payroll details
POST   /api/hr/payroll/:id/process            // Process payroll
POST   /api/hr/payroll/:id/pay                // Mark as paid
GET    /api/hr/payroll/:id/slip               // Generate salary slip

// ===== TIPS =====
POST   /api/hr/tips/create-pool               // Create tips pool
POST   /api/hr/tips/distribute                // Distribute tips
```

---

# MODULE H: QR ORDERING SYSTEM

## 🎯 FEATURES

**Core Capabilities:**
- QR code per table
- Self-ordering interface
- Real-time menu updates
- Table occupancy sync
- Payment via mobile
- Order status tracking
- Customer feedback inline
- Analytics on QR adoption

## 📊 DATABASE SCHEMA

```sql
-- Table QR Codes
CREATE TABLE table_qr_codes (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  table_id INT NOT NULL,
  qr_code_url VARCHAR(500),
  qr_code_string VARCHAR(1000),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (table_id) REFERENCES tables(id),
  UNIQUE (table_id)
);

-- QR Orders (Same as orders table, marked source='qr')
-- Use existing orders table with source_type='qr_table_order'

-- QR Order Sessions (Track customer session)
CREATE TABLE qr_order_sessions (
  id SERIAL PRIMARY KEY,
  table_id INT NOT NULL,
  order_id INT,
  session_token VARCHAR(100) UNIQUE,
  session_start TIMESTAMP,
  session_end TIMESTAMP,
  items_added INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

## 🔌 API ROUTES

```javascript
// Public API (No auth required for QR)
GET    /qr/:table_id/menu                     // Fetch menu for table
POST   /qr/:table_id/order                    // Create QR order
GET    /qr/:session_token/status              // Track order status
POST   /qr/:session_token/add-item            // Add item to order
POST   /qr/:session_token/request-bill        // Request bill
POST   /qr/:session_token/pay                 // Mobile payment
POST   /qr/:session_token/feedback            // Quick feedback
```

---

# MODULE I: DELIVERY FLEET MANAGEMENT

## 🎯 FEATURES

**Core Capabilities:**
- Rider master with documents
- Rider assignment optimization
- Zone mapping
- Real-time GPS tracking
- Commission tracking
- Performance metrics
- Delivery completion reports

## 📊 DATABASE SCHEMA

```sql
-- Riders
CREATE TABLE riders (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  vehicle_type VARCHAR(50), -- bike, scooter, car
  vehicle_registration VARCHAR(50),
  vehicle_insurance_expiry DATE,
  license_number VARCHAR(50),
  license_expiry DATE,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, on_leave
  rating DECIMAL(3,1),
  total_deliveries INT DEFAULT 0,
  average_delivery_time INT, -- minutes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Delivery Zones
CREATE TABLE delivery_zones (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  zone_name VARCHAR(100),
  zone_polygon TEXT, -- GeoJSON
  delivery_fee DECIMAL(10,2),
  estimated_delivery_time INT, -- minutes
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Rider Zone Assignment
CREATE TABLE rider_zone_assignments (
  id SERIAL PRIMARY KEY,
  rider_id INT NOT NULL,
  zone_id INT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  assigned_date DATE,
  FOREIGN KEY (rider_id) REFERENCES riders(id),
  FOREIGN KEY (zone_id) REFERENCES delivery_zones(id)
);

-- Delivery Tracking
CREATE TABLE delivery_tracking (
  id SERIAL PRIMARY KEY,
  delivery_order_id INT NOT NULL,
  rider_id INT,
  assigned_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  delivery_status VARCHAR(50), -- pending, assigned, picked_up, in_transit, delivered
  gps_coordinates TEXT, -- JSON: {lat, lng}
  distance_km DECIMAL(8,2),
  time_taken_minutes INT,
  rating INT, -- 1-5 stars
  feedback TEXT,
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_details(id),
  FOREIGN KEY (rider_id) REFERENCES riders(id)
);

-- Rider Commission
CREATE TABLE rider_commission (
  id SERIAL PRIMARY KEY,
  rider_id INT NOT NULL,
  commission_period_start DATE,
  commission_period_end DATE,
  total_deliveries INT,
  base_commission_rate DECIMAL(5,2), -- % per delivery
  bonus_deliveries INT, -- target met bonus
  bonus_amount DECIMAL(14,2),
  total_commission DECIMAL(14,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid
  FOREIGN KEY (rider_id) REFERENCES riders(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/delivery-fleet.js

// ===== RIDER MANAGEMENT =====
POST   /api/fleet/rider                       // Create rider
GET    /api/fleet/rider                       // List riders
PUT    /api/fleet/rider/:id                   // Update rider
GET    /api/fleet/rider/:id/performance       // Rider stats

// ===== ZONE MANAGEMENT =====
POST   /api/fleet/zone                        // Create zone
GET    /api/fleet/zone                        // List zones

// ===== ASSIGNMENT =====
POST   /api/fleet/assign-rider                // Assign rider to delivery
GET    /api/fleet/delivery/:id/tracking       // Real-time tracking

// ===== COMMISSION =====
GET    /api/fleet/commission/period           // Get commission for period
POST   /api/fleet/commission/calculate        // Calculate monthly commission
```

---

# MODULE J: ADVANCED RESERVATION SYSTEM

## 🎯 FEATURES

**Core Capabilities:**
- Floor map with table occupancy
- Waitlist management
- Deposit/pre-payment
- Auto table allocation
- Reminder notifications
- No-show tracking
- Re-reservation from cancellation

## 📊 DATABASE SCHEMA

```sql
-- Floor Map (Extension to existing)
CREATE TABLE floor_maps (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  floor_name VARCHAR(50),
  floor_number INT,
  floor_layout TEXT, -- SVG/JSON with table positions
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Table Position on Floor (Extend tables table)
-- Add: floor_id, x_position, y_position to tables

-- Waitlist
CREATE TABLE waitlist (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  customer_name VARCHAR(100),
  party_size INT,
  phone VARCHAR(20),
  email VARCHAR(100),
  status VARCHAR(50) DEFAULT 'waiting', -- waiting, called, seated, cancelled, no_show
  add_to_waitlist_time TIMESTAMP,
  seated_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Reservation Deposits
CREATE TABLE reservation_deposits (
  id SERIAL PRIMARY KEY,
  reservation_id INT NOT NULL,
  deposit_amount DECIMAL(14,2),
  payment_date DATE,
  payment_method VARCHAR(50),
  refund_amount DECIMAL(14,2),
  refund_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded, forfeited
  FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

-- Auto Table Allocation Rules
CREATE TABLE table_allocation_rules (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  party_size_min INT,
  party_size_max INT,
  preferred_table_ids TEXT, -- JSON array
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/reservation-advanced.js

GET    /api/reservation/floor-map            // Get floor map with occupancy
POST   /api/reservation/waitlist             // Add to waitlist
GET    /api/reservation/waitlist             // Get waitlist
PATCH  /api/reservation/waitlist/:id/call    // Call customer
PATCH  /api/reservation/waitlist/:id/seated  // Mark seated
POST   /api/reservation/deposit              // Collect deposit
GET    /api/reservation/:id/reminder         // Send reminder
```

---

# MODULE K: MULTI-BRANCH MANAGEMENT

## 🎯 FEATURES

**Core Capabilities:**
- Branch isolation (Data segmentation)
- Centralized dashboard
- Inter-branch transfers (Inventory)
- Branch-specific reports
- Branch performance comparison
- Consolidated financials
- Branch user assignment

## 📊 DATABASE SCHEMA

```sql
-- Branches (Already exists, enhance)
-- Ensure: id, branch_name, address, phone, manager_id, is_active

-- Branch Settings (Override corporate settings)
CREATE TABLE branch_settings (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  setting_key VARCHAR(100),
  setting_value VARCHAR(500),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  UNIQUE (branch_id, setting_key)
);

-- Branch User Assignment
CREATE TABLE branch_user_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  branch_id INT NOT NULL,
  is_primary_branch BOOLEAN DEFAULT false,
  assigned_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  UNIQUE (user_id, branch_id)
);

-- Branch Revenue Summary (Denormalized for speed)
CREATE TABLE branch_daily_summary (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  summary_date DATE,
  orders_count INT,
  total_sales DECIMAL(14,2),
  total_tax DECIMAL(14,2),
  total_discount DECIMAL(14,2),
  customer_count INT,
  avg_order_value DECIMAL(12,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  UNIQUE (branch_id, summary_date)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/branch.js

// ===== BRANCH MANAGEMENT =====
POST   /api/branch                            // Create branch (Super admin)
GET    /api/branch                            // List branches
GET    /api/branch/:id/settings               // Branch settings

// ===== CONSOLIDATED REPORTING =====
GET    /api/branch/consolidated/dashboard    // Multi-branch dashboard
GET    /api/branch/consolidated/comparison   // Compare branches
GET    /api/branch/:id/performance            // Branch KPIs
GET    /api/branch/report/consolidated-pl    // Consolidated P&L

// ===== TRANSFERS =====
POST   /api/branch/transfer                   // Already in inventory module
```

### Multi-Tenant Query Pattern
```javascript
// Every query must include branch_id filter:
const query = `
  SELECT * FROM orders
  WHERE branch_id = $1
  AND order_date BETWEEN $2 AND $3
`;

// Or use middleware to auto-inject:
router.use((req, res, next) => {
  req.branch_id = req.user.primary_branch_id;
  // or for reports, include all branches user has access to
  req.accessible_branches = req.user.branch_ids;
  next();
});
```

---

# MODULE L: BUSINESS INTELLIGENCE

## 🎯 FEATURES

**Core Capabilities:**
- Peak hour analytics
- Menu engineering (PLU Mix Analysis)
- Customer cohort analytics
- Demand forecasting
- Profitability analysis (by menu item, category)
- Staff productivity metrics
- Competitive pricing analysis

## 📊 DATABASE SCHEMA

```sql
-- Hourly Sales Summary
CREATE TABLE hourly_sales_summary (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  summary_date DATE,
  hour INT, -- 0-23
  orders_count INT,
  total_revenue DECIMAL(14,2),
  average_order_value DECIMAL(12,2),
  item_count INT,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  UNIQUE (branch_id, summary_date, hour)
);

-- Menu Item Performance
CREATE TABLE menu_item_performance (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  food_item_id INT NOT NULL,
  period_start DATE,
  period_end DATE,
  units_sold INT,
  revenue DECIMAL(14,2),
  recipe_cost DECIMAL(14,2),
  gross_profit DECIMAL(14,2),
  gross_profit_margin DECIMAL(5,2),
  contribution_margin DECIMAL(5,2),
  plu_mix_percentage DECIMAL(5,2),
  elasticity_score DECIMAL(5,2), -- price sensitivity
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (food_item_id) REFERENCES food_items(id)
);

-- Customer Cohort Analysis
CREATE TABLE customer_cohorts (
  id SERIAL PRIMARY KEY,
  cohort_start_date DATE, -- month of first purchase
  cohort_name VARCHAR(50), -- "May 2026"
  customer_count INT,
  retention_month_0 INT,
  retention_month_1 INT,
  retention_month_2 INT,
  retention_month_3 INT,
  retention_month_6 INT,
  retention_month_12 INT,
  avg_clv DECIMAL(14,2)
);

-- Demand Forecast
CREATE TABLE demand_forecast (
  id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL,
  food_item_id INT NOT NULL,
  forecast_date DATE,
  forecast_quantity INT,
  actual_quantity INT,
  forecast_error DECIMAL(5,2), -- % error
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (food_item_id) REFERENCES food_items(id)
);
```

## 🔌 API ROUTES

```javascript
// Backend: backend/routes/business-intelligence.js

// ===== PEAK HOUR ANALYTICS =====
GET    /api/bi/peak-hours                    // Get peak hours by day
GET    /api/bi/peak-hours/:date               // Specific date analysis

// ===== MENU ENGINEERING =====
GET    /api/bi/menu-engineering              // 4-quadrant PLU mix
GET    /api/bi/menu-engineering/profitability // By contribution margin
GET    /api/bi/menu-engineering/popularity    // By units sold

// ===== COHORT ANALYSIS =====
GET    /api/bi/cohort                        // Cohort retention table
GET    /api/bi/cohort/:cohort_name           // Specific cohort detail

// ===== FORECASTING =====
GET    /api/bi/forecast/:food_item_id        // Demand forecast
POST   /api/bi/forecast/generate             // Run forecast algorithm

// ===== KPI DASHBOARD =====
GET    /api/bi/dashboard                     // Executive dashboard
GET    /api/bi/profitability                 // Profitability by item/category
```

### Request/Response Examples

```javascript
// Get Menu Engineering Matrix
GET /api/bi/menu-engineering?period=7d

Response: 200
{
  "high_profit_high_volume": [
    {
      "food_item_id": 5,
      "name": "Chicken Biryani",
      "units_sold": 450,
      "gross_profit": 4500,
      "margin": 45,
      "status": "star"
    }
  ],
  "high_profit_low_volume": [
    {
      "food_item_id": 12,
      "name": "Special Naan Set",
      "units_sold": 45,
      "gross_profit": 900,
      "margin": 65,
      "status": "premium",
      "recommendation": "Increase price or promote"
    }
  ],
  "low_profit_high_volume": [
    {
      "food_item_id": 8,
      "name": "Samosa",
      "units_sold": 300,
      "gross_profit": 600,
      "margin": 15,
      "status": "ploughorse",
      "recommendation": "Reduce portion or check recipe cost"
    }
  ],
  "low_profit_low_volume": [
    {
      "food_item_id": 20,
      "name": "Exotic Drink",
      "units_sold": 20,
      "gross_profit": 100,
      "margin": 30,
      "status": "dog",
      "recommendation": "Consider discontinuing"
    }
  ]
}

// Get Demand Forecast
GET /api/bi/forecast/5?days_ahead=7

Response: 200
{
  "food_item": "Chicken Biryani",
  "forecast_model": "ARIMA",
  "forecast_accuracy": 92.5,
  "forecast": [
    {
      "date": "2026-05-05",
      "predicted_quantity": 42,
      "confidence_interval": [38, 46]
    },
    {
      "date": "2026-05-06",
      "predicted_quantity": 48,
      "confidence_interval": [43, 53]
    }
  ],
  "recommendation": "Ensure adequate ingredient stock for predicted demand"
}
```

## ⚙️ BUSINESS LOGIC

### Menu Engineering Matrix (PLU Mix Analysis)
```
X-axis: POPULARITY = units_sold / avg_units_sold
Y-axis: PROFITABILITY = gross_profit / avg_gross_profit

QUADRANTS:
1. STARS (High Volume, High Profit)
   - Action: Promote, maintain quality
   
2. PREMIUM/CASH COWS (Low Volume, High Profit)
   - Action: Increase price, increase promotion
   
3. PLOUGHORSE (High Volume, Low Profit)
   - Action: Reduce portion, optimize recipe, increase price
   
4. DOGS (Low Volume, Low Profit)
   - Action: Discontinue or dramatically change
```

### Demand Forecasting
```javascript
// Use ARIMA or exponential smoothing:
1. Collect 90 days historical data
2. Identify seasonality (day of week, holidays)
3. Apply model
4. Generate 7/14/30 day forecast
5. Compare actual vs predicted → measure error
6. Adjust recipe stock based on forecast
```

### Cohort Analysis
```javascript
cohort_retention = (customers_in_month_N / initial_cohort_count) * 100

Example:
May 2026 Cohort: 100 new customers
- Month 0 (May): 100 customers (100%)
- Month 1 (June): 42 customers (42%)
- Month 2 (July): 28 customers (28%)
- Month 3 (Aug): 22 customers (22%)

→ Retention declining, needs customer retention program
```

---

# INTEGRATION ARCHITECTURE

## 🔗 Cross-Module Workflows

### Complete Order-to-Cash Flow
```
1. Customer Ordering
   - CUSTOMER CRM identifies returning customer
   - Auto-apply loyalty points discount
   - Check inventory availability
   
2. Order Creation
   - INVENTORY reserves ingredients
   - KITCHEN receives order via KDS
   - ORDERS route processes payment
   
3. Fulfillment
   - INVENTORY deducts stock on order completion
   - DELIVERY FLEET assigns rider (if delivery)
   - QR ORDERING shows order status in real-time
   
4. Settlement
   - ACCOUNTING posts sales to GL
   - CUSTOMER CRM records transaction for RFM
   - BUSINESS INTELLIGENCE updates hourly summary
   
5. Reporting
   - EXPENSE module tracks COGS
   - SUPPLIER module tracks purchases
   - ACCOUNTING generates P&L with COGS
```

### Purchase-to-Pay Flow
```
1. Low Stock Alert (Inventory Module)
   → Auto-create draft PO
   
2. PO Confirmation (Purchase Module)
   → Create PO
   → Send to supplier
   
3. Goods Receipt (Purchase Module)
   → Create GRN
   → Record variance
   → Accept or flag
   
4. Invoice Matching (Purchase Module)
   → Three-way match: PO-GR-Invoice
   → Resolve variance
   → Approve payment
   
5. Payment (Supplier Module)
   → Record payment
   → Update supplier ledger
   → Update inventory cost_per_unit
   
6. Accounting (Accounting Module)
   → Post AP entry
   → Post payment
   → Update GL
```

### Payroll-to-Cash Flow
```
1. Attendance Tracking (HR Module)
   → Check-in/check-out daily
   
2. Shift Assignment (HR Module)
   → Assign riders delivery commissions
   → Assign staff overtime
   
3. Payroll Calculation (HR Module)
   → Calculate: base + overtime + bonus + commission + tips
   → Deduct: tax + insurance + PF
   
4. Payment Processing (Accounting Module)
   → Post salary expense to GL
   → Record disbursement
   
5. Tips Distribution (HR Module)
   → Collect daily tips
   → Distribute: equal / by hours / by orders
   → Add to payroll
```

---

# SCALABILITY & PERFORMANCE

## Database Optimization Strategy

### Partitioning (100+ Branches)
```sql
-- Partition stock_transactions by date (monthly)
CREATE TABLE stock_transactions_202605 PARTITION OF stock_transactions
FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Partition orders by branch_id + date
CREATE TABLE orders_branch1_202605 PARTITION OF orders
FOR VALUES IN (1) AND ('2026-05-01') TO ('2026-06-01');
```

### Indexing Strategy
```
High-traffic queries:
- stock_ledger: (ingredient_id, warehouse_location_id)
- orders: (branch_id, order_date DESC, status)
- stock_transactions: (ingredient_id, transaction_type, created_at DESC)
- general_ledger: (account_id, transaction_date DESC)
- supplier_ledger: (supplier_id, transaction_date DESC)
```

### Caching Layer (Redis)
```javascript
// Cache patterns:
- Ingredient master: TTL 1 hour
- Menu items: TTL 4 hours
- Recipe costs: TTL 24 hours (recompute daily)
- System settings: TTL 1 hour
- Loyalty tiers: TTL 24 hours
- Exchange rates: TTL 1 hour

// Invalidation:
ON ingredient.update → INVALIDATE ingredient:{id}
ON recipe.update → INVALIDATE recipe_cost:{recipe_id}
ON order_completion → INVALIDATE menu_performance
```

### Async Processing (Background Jobs)
```javascript
// Use Node Queue (Bull/BullMQ):
- Stock transfers (inter-branch)
- Waste approval notifications
- Demand forecasting calculation
- Payroll processing
- Loyalty tier upgrades
- Report generation
- Email notifications

// Example:
const inventoryQueue = new Queue('inventory', redisClient);
inventoryQueue.add('calculate-recipe-cost', {recipe_id: 12}, {delay: 500});
```

### Real-Time Updates (WebSocket)
```javascript
// Socket.IO rooms by entity type:
- stock_updates::{ingredient_id}
- order_updates::{order_id}
- kitchen::{branch_id}
- delivery::{delivery_id}
- payroll_ready::{user_id}
```

---

# PRODUCTION READINESS CHECKLIST

## ✅ Security
- [ ] Role-based access control on all endpoints (Admin, Manager, Staff, Rider)
- [ ] Audit logging on all financial operations (GL, AP, Payroll)
- [ ] Data encryption at rest (PostgreSQL pgcrypto)
- [ ] API rate limiting (Redis-backed)
- [ ] JWT token expiry (15 min access, 7 day refresh)
- [ ] Bank details encryption (pgcrypto)
- [ ] Supplier payment tracking (no unauthorized transfers)

## ✅ Data Integrity
- [ ] Transaction ACID compliance (SERIALIZABLE isolation)
- [ ] Stock ledger consistency checks
- [ ] Three-way match variance limits (alert > 2%)
- [ ] Reconciliation before GL posting
- [ ] Archive old transactions (retention: 7 years per tax rules)

## ✅ Backup & Disaster Recovery
- [ ] Daily full backup
- [ ] Hourly incremental backup
- [ ] Test restore quarterly
- [ ] Backup retention: 90 days local, 1 year archived

## ✅ Monitoring & Alerting
- [ ] Stock below minimum alert
- [ ] Purchase orders overdue alert
- [ ] Supplier payment due alert
- [ ] Reconciliation discrepancy alert
- [ ] System health checks (CPU, RAM, Disk, DB connections)

---

# END-STATE: 12-MODULE ERP SYSTEM

Your FoodPark will transform into a **complete restaurant ERP** with:

- ✅ **Order-to-Cash**: Orders → Billing → Accounting
- ✅ **Purchase-to-Pay**: POs → Receipts → Invoicing → Payments
- ✅ **Inventory**: Stock management, recipes, waste, transfers
- ✅ **Finance**: GL, AP/AR, Cash, VAT, P&L
- ✅ **HR**: Attendance, Shifts, Payroll, Tips
- ✅ **CRM**: Customers, Loyalty, Coupons, Feedback
- ✅ **BI**: Analytics, forecasting, profitability
- ✅ **Multi-branch**: Consolidated reporting, inventory transfers
- ✅ **QR/Delivery**: Self-ordering, fleet management
- ✅ **Compliance**: Audit trails, tax reporting

---

