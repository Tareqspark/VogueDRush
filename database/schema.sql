-- FoodPark - Restaurant Management System Database Schema
-- MySQL Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS foodpark CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE foodpark;

-- Users table for authentication and user management
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'waiter', 'kitchen') NOT NULL DEFAULT 'waiter',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Tables management for dine-in orders
CREATE TABLE tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_number VARCHAR(10) UNIQUE NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status ENUM('available', 'occupied', 'reserved') DEFAULT 'available',
    location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_table_number (table_number),
    INDEX idx_status (status)
);

-- Food categories for menu organization
CREATE TABLE food_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_display_order (display_order)
);

-- Food items menu
CREATE TABLE food_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    promotional_price DECIMAL(10,2) DEFAULT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0.00,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    preparation_time INT DEFAULT 15, -- in minutes
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE CASCADE,
    INDEX idx_category_id (category_id),
    INDEX idx_name (name),
    INDEX idx_availability (is_available),
    INDEX idx_display_order (display_order)
);

-- Orders main table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    order_type ENUM('dine_in', 'delivery', 'direct') NOT NULL,
    table_id INT NULL,
    waiter_id INT NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    status ENUM('pending', 'preparing', 'ready', 'done', 'cancelled') DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    bill_printed BOOLEAN DEFAULT FALSE,
    bill_printed_at TIMESTAMP NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (waiter_id) REFERENCES users(id),
    INDEX idx_order_number (order_number),
    INDEX idx_order_type (order_type),
    INDEX idx_status (status),
    INDEX idx_waiter_id (waiter_id),
    INDEX idx_created_at (created_at)
);

-- Order items (individual food items in an order)
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    food_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    status ENUM('pending', 'preparing', 'ready', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_food_item_id (food_item_id),
    INDEX idx_status (status),
    INDEX idx_order_status (order_id, status),
    CONSTRAINT chk_quantity CHECK (quantity > 0),
    CONSTRAINT chk_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_total_price CHECK (total_price >= 0)
);

-- Payment records for orders
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method ENUM('cash', 'bkash', 'nagad', 'card') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_status (status),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_order_payment (order_id, status),
    CONSTRAINT chk_amount CHECK (amount >= 0)
);

-- Delivery details for delivery orders
CREATE TABLE delivery_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_phone VARCHAR(20),
    advance_payment DECIMAL(10,2) DEFAULT 0.00,
    due_amount DECIMAL(10,2) DEFAULT 0.00,
    delivery_status ENUM('pending', 'assigned', 'picked_up', 'delivered', 'cancelled') DEFAULT 'pending',
    delivery_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_delivery_status (delivery_status),
    INDEX idx_order_delivery (order_id, delivery_status),
    CONSTRAINT chk_advance_payment CHECK (advance_payment >= 0),
    CONSTRAINT chk_due_amount CHECK (due_amount >= 0)
);

-- Reservations and bookings
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100),
    party_size INT NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    table_id INT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    special_requests TEXT,
    pre_order_id INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (pre_order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_reservation_date (reservation_date),
    INDEX idx_status (status),
    INDEX idx_customer_phone (customer_phone),
    INDEX idx_table_id (table_id),
    INDEX idx_date_time (reservation_date, reservation_time),
    INDEX idx_table_date (table_id, reservation_date),
    CONSTRAINT chk_party_size CHECK (party_size > 0 AND party_size <= 20),
    CONSTRAINT chk_reservation_time CHECK (reservation_time >= '10:00:00' AND reservation_time <= '23:00:00')
);

-- Kitchen queue for order preparation tracking
CREATE TABLE kitchen_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    order_item_id INT NOT NULL,
    priority INT DEFAULT 0, -- 0=normal, 1=high, 2=urgent
    estimated_prep_time INT DEFAULT 15, -- in minutes
    actual_prep_time INT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    status ENUM('queued', 'preparing', 'ready', 'cancelled') DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_order_priority (order_id, priority),
    INDEX idx_status_priority (status, priority),
    CONSTRAINT chk_priority CHECK (priority >= 0 AND priority <= 2),
    CONSTRAINT chk_estimated_prep_time CHECK (estimated_prep_time > 0 AND estimated_prep_time <= 240),
    CONSTRAINT chk_actual_prep_time CHECK (actual_prep_time IS NULL OR actual_prep_time > 0)
);

-- System settings for configuration
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
);

-- Audit log for tracking changes
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_table_name (table_name),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Order modifications tracking (for advanced order modification feature)
CREATE TABLE order_modifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    modified_by INT NOT NULL,
    modification_type ENUM('add_item', 'remove_item', 'update_quantity', 'cancel_item', 'update_special_instructions') NOT NULL,
    description TEXT NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    price_change DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_modified_by (modified_by),
    INDEX idx_created_at (created_at),
    INDEX idx_order_date (order_id, created_at),
    INDEX idx_modification_type (modification_type)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, data_type) VALUES
('vat_percentage', '15.00', 'VAT percentage for orders', 'number'),
('service_charge_percentage', '10.00', 'Service charge percentage for dine-in orders', 'number'),
('restaurant_name', 'FoodPark', 'Restaurant name for receipts and displays', 'string'),
('restaurant_address', '123 Fashion Street, Dhaka', 'Restaurant address', 'string'),
('restaurant_phone', '+8801234567890', 'Restaurant contact phone', 'string'),
('currency_symbol', '৳', 'Currency symbol for display', 'string'),
('enable_delivery', 'true', 'Enable delivery orders', 'boolean'),
('delivery_fee', '50.00', 'Standard delivery fee', 'number'),
('advance_payment_required', 'false', 'Require advance payment for delivery', 'boolean'),
('min_advance_percentage', '30.00', 'Minimum advance payment percentage for delivery', 'number');

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
-- Default password is: Admin@1234  (hash generated with bcrypt cost 10)
('admin', 'admin@foodpark.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu', 'System Administrator', 'admin');

-- Insert default food categories
INSERT INTO food_categories (name, description, icon, display_order) VALUES
('Appetizers', 'Starters and small bites', '🥗', 1),
('Main Course', 'Main dishes and entrees', '🍽️', 2),
('Beverages', 'Drinks and refreshments', '🥤', 3),
('Desserts', 'Sweet treats and desserts', '🍰', 4),
('Soups', 'Hot and cold soups', '🍲', 5),
('Salads', 'Fresh and healthy salads', '🥗', 6);

-- Insert sample tables
INSERT INTO tables (table_number, capacity, location) VALUES
('T1', 4, 'Ground Floor'),
('T2', 4, 'Ground Floor'),
('T3', 2, 'Ground Floor'),
('T4', 6, 'First Floor'),
('T5', 4, 'First Floor'),
('T6', 8, 'First Floor'),
('T7', 2, 'Outdoor'),
('T8', 4, 'Outdoor');

-- Token blacklist for logout functionality
CREATE TABLE token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL, -- JWT ID
    token_type ENUM('access', 'refresh') NOT NULL,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token_jti (token_jti),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- User sessions for concurrent session management
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_jti VARCHAR(255) UNIQUE NOT NULL,
    device_info JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_refresh_token_jti (refresh_token_jti),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_activity (last_activity)
);

-- Inventory management for food items
CREATE TABLE food_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_item_id INT NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    min_stock_threshold INT NOT NULL DEFAULT 10,
    unit VARCHAR(20) DEFAULT 'pieces',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
    INDEX idx_food_item_id (food_item_id),
    INDEX idx_low_stock (current_stock, min_stock_threshold)
);

-- Delivery tracking
CREATE TABLE delivery_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_detail_id INT NOT NULL,
    driver_id INT NULL,
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    current_status ENUM('assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') DEFAULT 'assigned',
    current_location JSON,
    estimated_delivery_time TIMESTAMP NULL,
    actual_delivery_time TIMESTAMP NULL,
    tracking_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_detail_id) REFERENCES delivery_details(id) ON DELETE CASCADE,
    INDEX idx_delivery_detail_id (delivery_detail_id),
    INDEX idx_driver_id (driver_id),
    INDEX idx_current_status (current_status),
    INDEX idx_estimated_delivery (estimated_delivery_time)
);
