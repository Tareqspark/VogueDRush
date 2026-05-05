-- ============================================================
-- FoodPark ERP Extension — Phase 2 Schema (20 New Modules)
-- Run after schema.sql (depends on users, food_items tables)
-- ============================================================
USE foodpark;

-- ─────────────────────────────────────────
-- MODULE 1: PRODUCTION PLANNING
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_date DATE NOT NULL,
    branch_id INT DEFAULT 1,
    status ENUM('draft','approved','in_progress','completed','cancelled') DEFAULT 'draft',
    created_by INT NOT NULL,
    approved_by INT DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_plan_date (plan_date),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS production_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    food_item_id INT DEFAULT NULL,
    batch_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    target_date DATE NOT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    status ENUM('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
    batch_cost DECIMAL(10,2) DEFAULT 0.00,
    yield_percentage DECIMAL(5,2) DEFAULT 100.00,
    assigned_to INT DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_plan_id (plan_id),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS semi_finished_goods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    unit VARCHAR(20) NOT NULL,
    stock_qty DECIMAL(10,3) DEFAULT 0.000,
    reorder_point DECIMAL(10,3) DEFAULT 0.000,
    cost_per_unit DECIMAL(10,4) DEFAULT 0.0000,
    storage_location VARCHAR(100),
    expiry_hours INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sku (sku)
);

CREATE TABLE IF NOT EXISTS yield_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    ingredient_name VARCHAR(100) NOT NULL,
    input_qty DECIMAL(10,3) NOT NULL,
    output_qty DECIMAL(10,3) NOT NULL,
    yield_pct DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((output_qty/input_qty)*100, 2)) STORED,
    logged_by INT NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_id (batch_id)
);

CREATE TABLE IF NOT EXISTS wastage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT DEFAULT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    cost_value DECIMAL(10,2) DEFAULT 0.00,
    reason ENUM('overproduction','spoilage','dropped','expired','other') NOT NULL,
    stage ENUM('prep','cooking','plating','storage') DEFAULT 'prep',
    logged_by INT NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    INDEX idx_logged_at (logged_at)
);

CREATE TABLE IF NOT EXISTS branch_dispatches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    from_branch INT DEFAULT 1,
    to_branch INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    qty DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    dispatch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_time TIMESTAMP NULL,
    status ENUM('pending','in_transit','received','rejected') DEFAULT 'pending',
    driver_name VARCHAR(100),
    notes TEXT,
    INDEX idx_status (status)
);

-- ─────────────────────────────────────────
-- MODULE 2: FOOD COSTING ENGINE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_cost_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_item_id INT NOT NULL,
    snapshot_date DATE NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    food_cost DECIMAL(10,4) NOT NULL,
    food_cost_pct DECIMAL(5,2) NOT NULL,
    gross_margin DECIMAL(10,4) NOT NULL,
    gross_margin_pct DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_item_date (food_item_id, snapshot_date),
    INDEX idx_snapshot_date (snapshot_date)
);

CREATE TABLE IF NOT EXISTS portion_costs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_item_id INT NOT NULL,
    ingredient_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_cost DECIMAL(10,4) NOT NULL,
    line_cost DECIMAL(10,4) GENERATED ALWAYS AS (ROUND(quantity * unit_cost, 4)) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_food_item_id (food_item_id)
);

CREATE TABLE IF NOT EXISTS margin_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL,
    food_item_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    qty_sold INT DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0.00,
    total_food_cost DECIMAL(12,2) DEFAULT 0.00,
    gross_profit DECIMAL(12,2) DEFAULT 0.00,
    margin_pct DECIMAL(5,2) DEFAULT 0.00,
    alert_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_date (report_date)
);

-- ─────────────────────────────────────────
-- MODULE 3: PROCUREMENT INTELLIGENCE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    ingredient_name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quoted_price DECIMAL(10,4) NOT NULL,
    moq DECIMAL(10,3) DEFAULT 1.000,
    lead_days INT DEFAULT 1,
    valid_until DATE,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ingredient (ingredient_name)
);

CREATE TABLE IF NOT EXISTS purchase_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    ingredient_name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    recorded_date DATE NOT NULL,
    po_reference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ingredient_date (ingredient_name, recorded_date)
);

CREATE TABLE IF NOT EXISTS procurement_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL,
    reorder_point DECIMAL(10,3) NOT NULL,
    reorder_qty DECIMAL(10,3) NOT NULL,
    preferred_supplier VARCHAR(100),
    auto_po BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ingredient (ingredient_name)
);

-- ─────────────────────────────────────────
-- MODULE 4: ASSET MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category ENUM('kitchen_equipment','refrigeration','hvac','furniture','vehicle','it','other') NOT NULL,
    location VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_cost DECIMAL(12,2) DEFAULT 0.00,
    current_value DECIMAL(12,2) DEFAULT 0.00,
    depreciation_method ENUM('straight_line','declining_balance','none') DEFAULT 'straight_line',
    useful_life_years INT DEFAULT 5,
    salvage_value DECIMAL(12,2) DEFAULT 0.00,
    warranty_expiry DATE,
    status ENUM('active','maintenance','retired','disposed') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS asset_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    maintenance_type ENUM('preventive','corrective','inspection') NOT NULL,
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    status ENUM('scheduled','completed','overdue','cancelled') DEFAULT 'scheduled',
    technician_name VARCHAR(100),
    cost DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_asset_id (asset_id),
    INDEX idx_scheduled_date (scheduled_date)
);

CREATE TABLE IF NOT EXISTS asset_service_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    service_date DATE NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    technician VARCHAR(100),
    vendor VARCHAR(100),
    cost DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    next_service_date DATE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_asset_id (asset_id)
);

-- ─────────────────────────────────────────
-- MODULE 5: MAINTENANCE MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    asset_id INT DEFAULT NULL,
    issue_title VARCHAR(200) NOT NULL,
    description TEXT,
    priority ENUM('low','medium','high','critical') DEFAULT 'medium',
    status ENUM('open','assigned','in_progress','resolved','closed') DEFAULT 'open',
    reported_by INT NOT NULL,
    assigned_to_name VARCHAR(100),
    sla_hours INT DEFAULT 24,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    resolution_notes TEXT,
    INDEX idx_status (status),
    INDEX idx_priority (priority)
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(100),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent_minutes INT DEFAULT 0,
    parts_used TEXT,
    cost DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    INDEX idx_ticket_id (ticket_id)
);

-- ─────────────────────────────────────────
-- MODULE 6: CATERING MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catering_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(200) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    event_date DATE NOT NULL,
    event_time TIME,
    venue VARCHAR(200),
    guest_count INT NOT NULL,
    package_id INT DEFAULT NULL,
    status ENUM('inquiry','confirmed','in_progress','completed','cancelled') DEFAULT 'inquiry',
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    advance_paid DECIMAL(12,2) DEFAULT 0.00,
    balance_due DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - advance_paid) STORED,
    special_requirements TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_date (event_date),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS catering_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_per_head DECIMAL(10,2) NOT NULL,
    min_guests INT DEFAULT 10,
    max_guests INT DEFAULT 500,
    includes_setup BOOLEAN DEFAULT FALSE,
    includes_service BOOLEAN DEFAULT FALSE,
    items_json TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catering_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('cash','card','bank_transfer','cheque') NOT NULL,
    reference VARCHAR(100),
    payment_type ENUM('advance','balance','refund') DEFAULT 'advance',
    received_by INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id)
);

-- ─────────────────────────────────────────
-- MODULE 7: BANQUET MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banquet_halls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    floor VARCHAR(50),
    area_sqft INT,
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    daily_rate DECIMAL(10,2) DEFAULT 0.00,
    amenities TEXT,
    status ENUM('available','booked','maintenance') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banquet_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_ref VARCHAR(20) UNIQUE NOT NULL,
    hall_id INT NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    event_type VARCHAR(100),
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    guest_count INT NOT NULL,
    status ENUM('tentative','confirmed','completed','cancelled') DEFAULT 'tentative',
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    advance_paid DECIMAL(12,2) DEFAULT 0.00,
    special_requests TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_date (event_date),
    INDEX idx_hall_id (hall_id)
);

CREATE TABLE IF NOT EXISTS banquet_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_booking_id (booking_id)
);

-- ─────────────────────────────────────────
-- MODULE 8: MARKETING AUTOMATION
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    campaign_type ENUM('sms','whatsapp','email','push') NOT NULL,
    trigger_type ENUM('manual','birthday','winback','anniversary','scheduled') DEFAULT 'manual',
    segment_id INT DEFAULT NULL,
    subject VARCHAR(200),
    message_body TEXT NOT NULL,
    status ENUM('draft','scheduled','running','completed','cancelled') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_trigger (trigger_type)
);

CREATE TABLE IF NOT EXISTS campaign_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    customer_id INT DEFAULT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(100),
    status ENUM('queued','sent','delivered','failed','opened','clicked') DEFAULT 'queued',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS customer_segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    criteria_json TEXT NOT NULL,
    customer_count INT DEFAULT 0,
    last_refreshed TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- MODULE 9: REVIEW MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('google','facebook','tripadvisor','zomato','yelp','internal') NOT NULL,
    api_connected BOOLEAN DEFAULT FALSE,
    last_sync TIMESTAMP NULL,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_platform (platform)
);

CREATE TABLE IF NOT EXISTS customer_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT NOT NULL,
    external_id VARCHAR(200),
    reviewer_name VARCHAR(100),
    rating DECIMAL(3,2) NOT NULL,
    review_text TEXT,
    sentiment ENUM('positive','neutral','negative') DEFAULT 'neutral',
    sentiment_score DECIMAL(4,3) DEFAULT 0.000,
    review_date DATE NOT NULL,
    is_responded BOOLEAN DEFAULT FALSE,
    response_text TEXT,
    responded_at TIMESTAMP NULL,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_source_id (source_id),
    INDEX idx_rating (rating),
    INDEX idx_sentiment (sentiment)
);

CREATE TABLE IF NOT EXISTS review_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    alert_type ENUM('low_rating','negative_sentiment','no_response_48h') NOT NULL,
    assigned_to INT DEFAULT NULL,
    status ENUM('open','acknowledged','resolved') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    INDEX idx_status (status)
);

-- ─────────────────────────────────────────
-- MODULE 10: ONLINE ORDER AGGREGATOR
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aggregator_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('foodpanda','ubereats','doordash','talabat','careem') NOT NULL,
    platform_order_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    items_json TEXT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2) NOT NULL,
    status ENUM('received','accepted','preparing','picked_up','delivered','cancelled') DEFAULT 'received',
    order_time TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    delivery_address TEXT,
    internal_order_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_platform_order (platform, platform_order_id),
    INDEX idx_platform (platform),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS aggregator_settlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('foodpanda','ubereats','doordash','talabat','careem') NOT NULL,
    settlement_ref VARCHAR(100),
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    gross_revenue DECIMAL(12,2) NOT NULL,
    commission_pct DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    net_payout DECIMAL(12,2) NOT NULL,
    order_count INT DEFAULT 0,
    status ENUM('pending','received','reconciled') DEFAULT 'pending',
    settlement_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_platform (platform)
);

-- ─────────────────────────────────────────
-- MODULE 11: TAX & COMPLIANCE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type ENUM('vat_invoice','credit_note','tax_receipt','vat_return') NOT NULL,
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    related_order_id INT DEFAULT NULL,
    customer_name VARCHAR(100),
    customer_trn VARCHAR(50),
    issue_date DATE NOT NULL,
    tax_period VARCHAR(20),
    taxable_amount DECIMAL(12,2) NOT NULL,
    vat_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status ENUM('draft','issued','cancelled') DEFAULT 'draft',
    pdf_path VARCHAR(255),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_document_type (document_type),
    INDEX idx_issue_date (issue_date)
);

CREATE TABLE IF NOT EXISTS tax_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_type ENUM('vat_return','annual_summary','monthly_summary') NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    output_vat DECIMAL(12,2) DEFAULT 0.00,
    input_vat DECIMAL(12,2) DEFAULT 0.00,
    net_vat_payable DECIMAL(12,2) DEFAULT 0.00,
    total_sales DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('draft','filed','accepted') DEFAULT 'draft',
    filed_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_type (report_type)
);

-- ─────────────────────────────────────────
-- MODULE 12: DOCUMENT MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    document_type ENUM('contract','license','certificate','lease','policy','other') NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size_kb INT,
    version INT DEFAULT 1,
    related_to ENUM('supplier','employee','general','branch') DEFAULT 'general',
    related_entity_name VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    status ENUM('active','expired','archived') DEFAULT 'active',
    reminder_days_before INT DEFAULT 30,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_id (category_id),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_status (status)
);

-- ─────────────────────────────────────────
-- MODULE 13: AI & FORECASTING
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_type ENUM('demand','inventory','churn','staffing','menu') NOT NULL,
    algorithm VARCHAR(50) DEFAULT 'moving_average',
    parameters_json TEXT,
    last_trained TIMESTAMP NULL,
    accuracy_score DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forecast_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    forecast_date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    predicted_value DECIMAL(14,4) NOT NULL,
    actual_value DECIMAL(14,4) DEFAULT NULL,
    confidence_low DECIMAL(14,4),
    confidence_high DECIMAL(14,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_model_id (model_id),
    INDEX idx_forecast_date (forecast_date)
);

-- ─────────────────────────────────────────
-- MODULE 14: CALL CENTER
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    total_orders INT DEFAULT 0,
    last_order_date DATE,
    last_order_items TEXT,
    vip_flag BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone)
);

CREATE TABLE IF NOT EXISTS call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT DEFAULT NULL,
    caller_phone VARCHAR(20) NOT NULL,
    caller_name VARCHAR(100),
    agent_id INT NOT NULL,
    call_type ENUM('inbound','outbound') DEFAULT 'inbound',
    call_purpose ENUM('order','inquiry','complaint','other') DEFAULT 'order',
    duration_seconds INT DEFAULT 0,
    order_id INT DEFAULT NULL,
    outcome ENUM('order_placed','callback_scheduled','resolved','abandoned') NOT NULL,
    notes TEXT,
    call_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    call_end TIMESTAMP NULL,
    INDEX idx_agent_id (agent_id),
    INDEX idx_caller_phone (caller_phone)
);

-- ─────────────────────────────────────────
-- MODULE 15: QUEUE MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_number INT NOT NULL,
    token_display VARCHAR(10) NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    party_size INT DEFAULT 1,
    status ENUM('waiting','called','serving','completed','no_show','cancelled') DEFAULT 'waiting',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    served_at TIMESTAMP NULL,
    wait_minutes INT DEFAULT NULL,
    notes TEXT,
    INDEX idx_status (status),
    INDEX idx_issued_at (issued_at)
);

CREATE TABLE IF NOT EXISTS queue_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NOT NULL,
    event_type ENUM('issued','called','serving','completed','cancelled','sms_sent') NOT NULL,
    performed_by INT DEFAULT NULL,
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    INDEX idx_token_id (token_id)
);

-- ─────────────────────────────────────────
-- MODULE 16: GIFT CARD SYSTEM
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_code VARCHAR(20) UNIQUE NOT NULL,
    initial_balance DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    issued_to_name VARCHAR(100),
    issued_to_phone VARCHAR(20),
    issued_by INT NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    status ENUM('active','exhausted','expired','cancelled') DEFAULT 'active',
    purchase_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_card_code (card_code),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    transaction_type ENUM('issue','redeem','topup','refund','expire') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    order_id INT DEFAULT NULL,
    processed_by INT NOT NULL,
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    INDEX idx_card_id (card_id)
);

-- ─────────────────────────────────────────
-- MODULE 17: MEMBERSHIP ENGINE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_months INT NOT NULL,
    discount_pct DECIMAL(5,2) DEFAULT 0.00,
    free_deliveries INT DEFAULT 0,
    priority_booking BOOLEAN DEFAULT FALSE,
    benefits_json TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membership_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    membership_id INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active','expired','cancelled','suspended') DEFAULT 'active',
    payment_method ENUM('cash','card','bank_transfer') NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    auto_renew BOOLEAN DEFAULT FALSE,
    subscribed_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_end_date (end_date)
);

-- ─────────────────────────────────────────
-- MODULE 18: COMPLAINT MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_ref VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(100),
    order_id INT DEFAULT NULL,
    category ENUM('food_quality','service','delivery','billing','hygiene','staff','other') NOT NULL,
    priority ENUM('low','medium','high','critical') DEFAULT 'medium',
    description TEXT NOT NULL,
    status ENUM('open','investigating','resolved','closed') DEFAULT 'open',
    assigned_to INT DEFAULT NULL,
    compensation_offered TEXT,
    root_cause TEXT,
    resolution_notes TEXT,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS complaint_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    action_type ENUM('note','status_change','compensation','escalation','resolution') NOT NULL,
    description TEXT NOT NULL,
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_complaint_id (complaint_id)
);

-- ─────────────────────────────────────────
-- MODULE 19: INTERNAL MESSAGING
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    thread_type ENUM('direct','group','announcement') DEFAULT 'direct',
    created_by INT NOT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_by (created_by)
);

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text','announcement','file') DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    read_by_json TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    INDEX idx_thread_id (thread_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_sent_at (sent_at)
);

-- ─────────────────────────────────────────
-- MODULE 20: PUBLIC API ECOSYSTEM
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    api_secret_hash VARCHAR(255),
    owner_name VARCHAR(100) NOT NULL,
    owner_email VARCHAR(100),
    permissions_json TEXT,
    rate_limit_per_hour INT DEFAULT 1000,
    status ENUM('active','suspended','revoked') DEFAULT 'active',
    last_used_at TIMESTAMP NULL,
    expires_at DATE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_key (api_key),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS webhooks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events_json TEXT NOT NULL,
    secret_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP NULL,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT DEFAULT NULL,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_ms INT DEFAULT 0,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_size_bytes INT DEFAULT 0,
    response_size_bytes INT DEFAULT 0,
    error_message TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_key_id (api_key_id),
    INDEX idx_logged_at (logged_at),
    INDEX idx_endpoint (endpoint(100))
);
