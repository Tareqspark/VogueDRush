-- Vogue Cafe D Rush - Restaurant Management System Database Schema
-- MySQL Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS vogue_cafe_drush CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vogue_cafe_drush;

-- Users table for authentication and user management
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'waiter') NOT NULL DEFAULT 'waiter',
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
    FOREIGN KEY (food_item_id) REFERENCES food_items(id),
    INDEX idx_order_id (order_id),
    INDEX idx_food_item_id (food_item_id),
    INDEX idx_status (status)
);

-- Payment records for orders
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method ENUM('cash', 'bkash', 'card') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_status (status)
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
    INDEX idx_delivery_status (delivery_status)
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
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_reservation_date (reservation_date),
    INDEX idx_status (status),
    INDEX idx_customer_phone (customer_phone)
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
    INDEX idx_created_at (created_at)
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
    FOREIGN KEY (modified_by) REFERENCES users(id),
    INDEX idx_order_id (order_id),
    INDEX idx_modified_by (modified_by),
    INDEX idx_created_at (created_at)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, data_type) VALUES
('vat_percentage', '15.00', 'VAT percentage for orders', 'number'),
('service_charge_percentage', '10.00', 'Service charge percentage for dine-in orders', 'number'),
('restaurant_name', 'Vogue Cafe D Rush', 'Restaurant name for receipts and displays', 'string'),
('restaurant_address', '123 Fashion Street, Dhaka', 'Restaurant address', 'string'),
('restaurant_phone', '+8801234567890', 'Restaurant contact phone', 'string'),
('currency_symbol', '৳', 'Currency symbol for display', 'string'),
('enable_delivery', 'true', 'Enable delivery orders', 'boolean'),
('delivery_fee', '50.00', 'Standard delivery fee', 'number'),
('advance_payment_required', 'false', 'Require advance payment for delivery', 'boolean'),
('min_advance_percentage', '30.00', 'Minimum advance payment percentage for delivery', 'number');

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@voguecafe.com', '$2b$10$rQZ8kHWKtGY5uKx4vJ2x/.vQZ8kHWKtGY5uKx4vJ2x/.vQZ8kHWKtGY', 'System Administrator', 'admin');

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
