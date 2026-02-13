-- POS Modernization - Initial Seed Data
-- Version: 1.0
-- Description: Sample data for development and testing

-- ============================================
-- INITIAL DATA SETUP
-- ============================================

-- Companies (Multi-tenant setup)
INSERT INTO companies (id, name, registration_number, tax_id, website, phone, email, address, city, state, country, industry) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Acme Retail Corp', 'REG-001', 'TAX-001', 'www.acmeretail.com', '+1-555-0001', 'info@acmeretail.com', '123 Main Street', 'New York', 'NY', 'United States', 'Retail'),
('550e8400-e29b-41d4-a716-446655440002', 'Global Trading Ltd', 'REG-002', 'TAX-002', 'www.globaltrading.com', '+1-555-0002', 'info@globaltrading.com', '456 Commerce Ave', 'Los Angeles', 'CA', 'United States', 'Wholesale'),
('550e8400-e29b-41d4-a716-446655440003', 'Local Shop Inc', 'REG-003', 'TAX-003', 'www.localshop.com', '+1-555-0003', 'contact@localshop.com', '789 Shopping Mall', 'Chicago', 'IL', 'United States', 'Retail');

-- Roles
INSERT INTO roles (id, name, description, is_system_role) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'admin', 'System administrator with full access', TRUE),
('660e8400-e29b-41d4-a716-446655440002', 'manager', 'Store manager with operational access', TRUE),
('660e8400-e29b-41d4-a716-446655440003', 'cashier', 'Point of sale cashier', TRUE),
('660e8400-e29b-41d4-a716-446655440004', 'inventory_manager', 'Inventory management specialist', TRUE),
('660e8400-e29b-41d4-a716-446655440005', 'accountant', 'Financial accounting and reporting', TRUE);

-- Permissions
INSERT INTO permissions (id, name, resource, description) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'read', 'orders', 'View orders'),
('770e8400-e29b-41d4-a716-446655440002', 'create', 'orders', 'Create new orders'),
('770e8400-e29b-41d4-a716-446655440003', 'update', 'orders', 'Update existing orders'),
('770e8400-e29b-41d4-a716-446655440004', 'delete', 'orders', 'Delete orders'),
('770e8400-e29b-41d4-a716-446655440005', 'read', 'products', 'View products'),
('770e8400-e29b-41d4-a716-446655440006', 'create', 'products', 'Create new products'),
('770e8400-e29b-41d4-a716-446655440007', 'update', 'products', 'Update products'),
('770e8400-e29b-41d4-a716-446655440008', 'read', 'reports', 'View reports'),
('770e8400-e29b-41d4-a716-446655440009', 'read', 'customers', 'View customers'),
('770e8400-e29b-41d4-a716-446655440010', 'create', 'customers', 'Create customers'),
('770e8400-e29b-41d4-a716-446655440011', 'manage_users', 'users', 'Manage system users'),
('770e8400-e29b-41d4-a716-446655440012', 'manage_inventory', 'inventory', 'Manage inventory levels');

-- Role-Permission Mappings
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Admin gets all permissions
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440004'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440005'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440006'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440007'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440008'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440009'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440010'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440011'),
('660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440012'),
-- Manager gets most permissions
('660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440005'),
('660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440008'),
('660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440009'),
-- Cashier gets order and product read
('660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440005'),
('660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440009'),
-- Inventory Manager
('660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440005'),
('660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440006'),
('660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440007'),
('660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440012'),
-- Accountant
('660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440008'),
('660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440009');

-- Users
INSERT INTO users (id, email, password_hash, name, first_name, last_name, company_id, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'admin@acmeretail.com', '$2b$10$uHXMzd.c7/BJ4DvTQq8xfO/5L6d5BG6Gx.EF5qZE3nJ5gQXzXO9Ty', 'Admin User', 'Admin', 'User', '550e8400-e29b-41d4-a716-446655440001', TRUE),
('880e8400-e29b-41d4-a716-446655440002', 'manager@acmeretail.com', '$2b$10$uHXMzd.c7/BJ4DvTQq8xfO/5L6d5BG6Gx.EF5qZE3nJ5gQXzXO9Ty', 'Store Manager', 'John', 'Smith', '550e8400-e29b-41d4-a716-446655440001', TRUE),
('880e8400-e29b-41d4-a716-446655440003', 'cashier1@acmeretail.com', '$2b$10$uHXMzd.c7/BJ4DvTQq8xfO/5L6d5BG6Gx.EF5qZE3nJ5gQXzXO9Ty', 'Sarah Johnson', 'Sarah', 'Johnson', '550e8400-e29b-41d4-a716-446655440001', TRUE),
('880e8400-e29b-41d4-a716-446655440004', 'inventory@acmeretail.com', '$2b$10$uHXMzd.c7/BJ4DvTQq8xfO/5L6d5BG6Gx.EF5qZE3nJ5gQXzXO9Ty', 'Mike Davis', 'Mike', 'Davis', '550e8400-e29b-41d4-a716-446655440001', TRUE),
('880e8400-e29b-41d4-a716-446655440005', 'accounting@acmeretail.com', '$2b$10$uHXMzd.c7/BJ4DvTQq8xfO/5L6d5BG6Gx.EF5qZE3nJ5gQXzXO9Ty', 'Lisa Chen', 'Lisa', 'Chen', '550e8400-e29b-41d4-a716-446655440001', TRUE);

-- User-Role Assignments
INSERT INTO user_roles (user_id, role_id) VALUES
('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001'),
('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002'),
('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003'),
('880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004'),
('880e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005');

-- Warehouses
INSERT INTO warehouse (id, company_id, name, location, address, manager_id, capacity) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Main Warehouse', 'New York', '123 Industrial Blvd', '880e8400-e29b-41d4-a716-446655440004', 10000),
('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Distribution Center', 'New Jersey', '456 Logistics Way', NULL, 5000);

-- Categories
INSERT INTO categories (id, company_id, name, slug, description, display_order) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Electronics', 'electronics', 'Electronic devices and accessories', 1),
('aa0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Clothing', 'clothing', 'Apparel and fashion items', 2),
('aa0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Home & Garden', 'home-garden', 'Home and garden supplies', 3),
('aa0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Sports', 'sports', 'Sports equipment and gear', 4),
('aa0e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Books', 'books', 'Books and educational materials', 5);

-- Products (5 products for testing)
INSERT INTO products (id, company_id, category_id, name, description, sku, barcode, unit_type, price, cost, quantity, reorder_level, reorder_quantity, is_taxable, tax_rate) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', 'Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 'ELEC-001', '123456789001', 'unit', 29.99, 12.00, 150, 20, 100, TRUE, 8.00),
('bb0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', 'USB-C Cable', 'Fast charging USB-C cable 6ft', 'ELEC-002', '123456789002', 'unit', 14.99, 4.50, 300, 50, 250, TRUE, 8.00),
('bb0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440002', 'Cotton T-Shirt', 'Premium cotton t-shirt available in multiple sizes', 'CLOTH-001', '123456789003', 'unit', 24.99, 8.00, 200, 30, 150, TRUE, 8.00),
('bb0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440003', 'LED Desk Lamp', 'Modern LED desk lamp with USB charging', 'HOME-001', '123456789004', 'unit', 49.99, 20.00, 75, 15, 50, TRUE, 8.00),
('bb0e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440005', 'Beginner JavaScript Book', 'Complete guide to JavaScript programming', 'BOOK-001', '123456789005', 'unit', 39.99, 15.00, 80, 10, 50, FALSE, 0.00);

-- Inventory
INSERT INTO inventory (id, product_id, warehouse_id, quantity_on_hand, quantity_reserved, reorder_level) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 150, 10, 20),
('cc0e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 300, 50, 50),
('cc0e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', 200, 20, 30),
('cc0e8400-e29b-41d4-a716-446655440004', 'bb0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001', 75, 5, 15),
('cc0e8400-e29b-41d4-a716-446655440005', 'bb0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440001', 80, 0, 10);

-- Customers (3 sample customers)
INSERT INTO customers (id, company_id, name, email, phone, customer_type, tax_id, credit_limit, payment_terms) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'ABC Retail Store', 'contact@abcretail.com', '555-0101', 'business', 'TAX-CUST-001', 5000.00, 'net30'),
('dd0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'John Corporate', 'john.corp@company.com', '555-0102', 'individual', NULL, 1000.00, 'net15'),
('dd0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Wholesale Distributor', 'orders@wholesale.com', '555-0103', 'wholesale', 'TAX-CUST-003', 10000.00, 'net60');

-- Customer Addresses
INSERT INTO customer_addresses (id, customer_id, address_type, street_address, city, state, country, zip_code, is_default) VALUES
('ee0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'billing', '321 Business Blvd', 'Manhattan', 'NY', 'United States', '10001', TRUE),
('ee0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440002', 'billing', '789 Residential Ave', 'Brooklyn', 'NY', 'United States', '11201', TRUE),
('ee0e8400-e29b-41d4-a716-446655440003', 'dd0e8400-e29b-41d4-a716-446655440003', 'billing', '555 Warehouse Lane', 'Long Island', 'NY', 'United States', '11510', TRUE);

-- Orders (2 sample orders)
INSERT INTO orders (id, company_id, customer_id, order_number, order_date, status, subtotal, tax_amount, total_amount, paid_amount, payment_status, created_by) VALUES
('ff0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'ORD-2026-0001', '2026-02-10 10:30:00', 'confirmed', 500.00, 40.00, 540.00, 540.00, 'paid', '880e8400-e29b-41d4-a716-446655440002'),
('ff0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440002', 'ORD-2026-0002', '2026-02-11 14:15:00', 'pending', 200.00, 16.00, 216.00, 100.00, 'partial', '880e8400-e29b-41d4-a716-446655440002');

-- Order Items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, tax_rate, discount_percent) VALUES
('gg0e8400-e29b-41d4-a716-446655440001', 'ff0e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440001', 5, 29.99, 8.00, 0),
('gg0e8400-e29b-41d4-a716-446655440002', 'ff0e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440002', 10, 14.99, 8.00, 0),
('gg0e8400-e29b-41d4-a716-446655440003', 'ff0e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440003', 8, 24.99, 8.00, 5);

-- Payments
INSERT INTO payments (id, order_id, amount, payment_method, payment_date, status, received_by) VALUES
('hh0e8400-e29b-41d4-a716-446655440001', 'ff0e8400-e29b-41d4-a716-446655440001', 540.00, 'bank_transfer', '2026-02-10 16:00:00', 'completed', '880e8400-e29b-41d4-a716-446655440005'),
('hh0e8400-e29b-41d4-a716-446655440002', 'ff0e8400-e29b-41d4-a716-446655440002', 100.00, 'credit_card', '2026-02-11 15:30:00', 'completed', '880e8400-e29b-41d4-a716-446655440003');

-- Invoices
INSERT INTO invoices (id, order_id, invoice_number, invoice_date, due_date, status) VALUES
('ii0e8400-e29b-41d4-a716-446655440001', 'ff0e8400-e29b-41d4-a716-446655440001', 'INV-2026-0001', '2026-02-10', '2026-02-25', 'paid'),
('ii0e8400-e29b-41d4-a716-446655440002', 'ff0e8400-e29b-41d4-a716-446655440002', 'INV-2026-0002', '2026-02-11', '2026-02-26', 'issued');

-- Settings
INSERT INTO settings (id, key, value, type, description, is_system) VALUES
('jj0e8400-e29b-41d4-a716-446655440001', 'default_tax_rate', '8.00', 'number', 'Default tax rate for taxable items', FALSE),
('jj0e8400-e29b-41d4-a716-446655440002', 'currency', 'USD', 'string', 'Default currency', FALSE),
('jj0e8400-e29b-41d4-a716-446655440003', 'invoice_prefix', 'INV', 'string', 'Invoice number prefix', FALSE),
('jj0e8400-e29b-41d4-a716-446655440004', 'order_prefix', 'ORD', 'string', 'Order number prefix', FALSE),
('jj0e8400-e29b-41d4-a716-446655440005', 'default_payment_terms', 'net30', 'string', 'Default payment terms for new customers', FALSE);

-- Stock Movements Log
INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_id, notes, created_by, created_at) VALUES
('kk0e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'out', 5, 'ff0e8400-e29b-41d4-a716-446655440001', 'Sold in order ORD-2026-0001', '880e8400-e29b-41d4-a716-446655440003', '2026-02-10 10:35:00'),
('kk0e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 'out', 10, 'ff0e8400-e29b-41d4-a716-446655440001', 'Sold in order ORD-2026-0001', '880e8400-e29b-41d4-a716-446655440003', '2026-02-10 10:35:00'),
('kk0e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', 'out', 8, 'ff0e8400-e29b-41d4-a716-446655440002', 'Sold in order ORD-2026-0002', '880e8400-e29b-41d4-a716-446655440003', '2026-02-11 14:20:00'),
('kk0e8400-e29b-41d4-a716-446655440004', 'bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'in', 50, NULL, 'Restock order received', '880e8400-e29b-41d4-a716-446655440004', '2026-02-09 09:00:00');

-- ============================================
-- DATA VALIDATION
-- ============================================

-- Verify inserts
SELECT 'Companies' as entity, COUNT(*) as count FROM companies
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Roles', COUNT(*) FROM roles
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Invoices', COUNT(*) FROM invoices;
