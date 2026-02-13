-- POS Modernization - MySQL Schema
-- Version: 1.0
-- Created: 2026-02-13
-- Description: Complete database schema for POS system with user management, sales, inventory, and reporting

SET FOREIGN_KEY_CHECKS=0;

-- ============================================
-- USER MANAGEMENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email address',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
  `name` VARCHAR(255) NOT NULL COMMENT 'Full name',
  `first_name` VARCHAR(128) COMMENT 'First name',
  `last_name` VARCHAR(128) COMMENT 'Last name',
  `phone` VARCHAR(20) COMMENT 'Phone number',
  `company_id` CHAR(36) COMMENT 'Associated company',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT 'User active status',
  `last_login` DATETIME COMMENT 'Last login timestamp',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
  `deleted_at` DATETIME COMMENT 'Soft delete timestamp for audit compliance',
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System users';

CREATE TABLE IF NOT EXISTS `roles` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `name` VARCHAR(128) NOT NULL UNIQUE COMMENT 'Role name (admin, manager, cashier, etc)',
  `description` TEXT COMMENT 'Role description',
  `company_id` CHAR(36) COMMENT 'Company-specific role or NULL for system-wide',
  `is_system_role` BOOLEAN DEFAULT FALSE COMMENT 'System-wide role flag',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User roles';

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `name` VARCHAR(128) NOT NULL UNIQUE COMMENT 'Permission name (read, write, delete)',
  `resource` VARCHAR(128) NOT NULL COMMENT 'Resource type (users, products, orders)',
  `description` TEXT COMMENT 'Permission description',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_resource` (`resource`),
  UNIQUE KEY `uk_name_resource` (`name`, `resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System permissions';

CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` CHAR(36) NOT NULL,
  `role_id` CHAR(36) NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` CHAR(36) COMMENT 'User who made the assignment',
  PRIMARY KEY (`user_id`, `role_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_assigned_by` (`assigned_by`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User-role assignments';

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` CHAR(36) NOT NULL,
  `permission_id` CHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `idx_permission_id` (`permission_id`),
  CONSTRAINT `fk_role_perms_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_perms_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Role-permission assignments';

-- ============================================
-- COMPANY & CUSTOMER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS `companies` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `name` VARCHAR(255) NOT NULL COMMENT 'Company name',
  `registration_number` VARCHAR(50) COMMENT 'Business registration number',
  `tax_id` VARCHAR(50) UNIQUE COMMENT 'Tax identification number',
  `website` VARCHAR(255) COMMENT 'Company website URL',
  `phone` VARCHAR(20) COMMENT 'Main phone number',
  `email` VARCHAR(255) COMMENT 'Main email address',
  `address` TEXT COMMENT 'Physical address',
  `city` VARCHAR(128),
  `state` VARCHAR(128),
  `country` VARCHAR(128),
  `zip_code` VARCHAR(20),
  `industry` VARCHAR(128) COMMENT 'Industry type',
  `employee_count` INT COMMENT 'Number of employees',
  `annual_revenue` DECIMAL(15, 2) COMMENT 'Annual revenue',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_tax_id` (`tax_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Business entities';

CREATE TABLE IF NOT EXISTS `customers` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `company_id` CHAR(36) NOT NULL COMMENT 'Company associated with customer',
  `name` VARCHAR(255) NOT NULL COMMENT 'Customer name',
  `email` VARCHAR(255) COMMENT 'Customer email',
  `phone` VARCHAR(20) COMMENT 'Customer phone',
  `customer_type` ENUM('individual', 'business', 'wholesale') DEFAULT 'individual' COMMENT 'Customer classification',
  `tax_id` VARCHAR(50) COMMENT 'Tax identification for business customers',
  `credit_limit` DECIMAL(12, 2) DEFAULT 0 COMMENT 'Credit limit for account',
  `current_balance` DECIMAL(12, 2) DEFAULT 0 COMMENT 'Current account balance',
  `payment_terms` VARCHAR(50) COMMENT 'Payment terms (net30, net60, etc)',
  `notes` TEXT COMMENT 'Internal notes about customer',
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_purchase_date` DATE COMMENT 'Last purchase date for analytics',
  `total_purchases` DECIMAL(15, 2) DEFAULT 0 COMMENT 'Lifetime purchases total',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_customers_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer information';

CREATE TABLE IF NOT EXISTS `customer_addresses` (
  `id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `address_type` ENUM('billing', 'shipping', 'other') DEFAULT 'billing' COMMENT 'Address purpose',
  `street_address` VARCHAR(255) NOT NULL,
  `apartment_number` VARCHAR(50),
  `city` VARCHAR(128) NOT NULL,
  `state` VARCHAR(128),
  `country` VARCHAR(128) NOT NULL,
  `zip_code` VARCHAR(20),
  `is_default` BOOLEAN DEFAULT FALSE COMMENT 'Default address for type',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_address_type` (`address_type`),
  CONSTRAINT `fk_cust_addr_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer addresses';

CREATE TABLE IF NOT EXISTS `customer_contacts` (
  `id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `contact_name` VARCHAR(255) NOT NULL,
  `title` VARCHAR(128) COMMENT 'Job title',
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `is_primary` BOOLEAN DEFAULT FALSE COMMENT 'Primary contact person',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  CONSTRAINT `fk_cust_contact_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer contact persons';

-- ============================================
-- INVENTORY & PRODUCTS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS `categories` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE COMMENT 'URL-friendly name',
  `description` TEXT,
  `parent_category_id` CHAR(36) COMMENT 'Parent category for hierarchy',
  `display_order` INT DEFAULT 0 COMMENT 'Sort order',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_parent_category_id` (`parent_category_id`),
  KEY `idx_slug` (`slug`),
  CONSTRAINT `fk_categories_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product categories';

CREATE TABLE IF NOT EXISTS `products` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `category_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `sku` VARCHAR(128) NOT NULL COMMENT 'Stock Keeping Unit',
  `barcode` VARCHAR(128) COMMENT 'Product barcode',
  `unit_type` VARCHAR(50) DEFAULT 'unit' COMMENT 'unit, liter, kg, etc',
  `price` DECIMAL(12, 2) NOT NULL COMMENT 'Selling price',
  `cost` DECIMAL(12, 2) COMMENT 'Product cost',
  `margin_percent` DECIMAL(5, 2) GENERATED ALWAYS AS (((price - cost) / NULLIF(price, 0)) * 100) STORED COMMENT 'Profit margin %',
  `quantity` INT DEFAULT 0 COMMENT 'Current stock quantity',
  `reorder_level` INT DEFAULT 10 COMMENT 'Minimum stock threshold',
  `reorder_quantity` INT DEFAULT 50 COMMENT 'Reorder amount',
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_taxable` BOOLEAN DEFAULT TRUE,
  `tax_rate` DECIMAL(5, 2) COMMENT 'Tax percentage',
  `supplier_id` VARCHAR(255) COMMENT 'Supplier reference',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_company_sku` (`company_id`, `sku`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_barcode` (`barcode`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_quantity` (`quantity`),
  CONSTRAINT `fk_products_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product catalog';

CREATE TABLE IF NOT EXISTS `warehouse` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255),
  `address` TEXT,
  `manager_id` CHAR(36) COMMENT 'Warehouse manager user',
  `capacity` INT COMMENT 'Storage capacity',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_manager_id` (`manager_id`),
  CONSTRAINT `fk_warehouse_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_warehouse_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Warehouse locations';

CREATE TABLE IF NOT EXISTS `inventory` (
  `id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `warehouse_id` CHAR(36) NOT NULL,
  `quantity_on_hand` INT DEFAULT 0 COMMENT 'Current stock',
  `quantity_reserved` INT DEFAULT 0 COMMENT 'Reserved for orders',
  `quantity_available` INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED COMMENT 'Available stock',
  `reorder_level` INT,
  `last_counted_at` DATETIME COMMENT 'Last physical count date',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_warehouse` (`product_id`, `warehouse_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_quantity_available` (`quantity_available`),
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inventory levels by warehouse';

-- ============================================
-- SALES & ORDERS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS `orders` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `company_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `order_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Human-readable order number',
  `order_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When order was placed',
  `delivery_date` DATE COMMENT 'Expected delivery date',
  `completed_date` DATETIME COMMENT 'When order was completed',
  `status` ENUM('draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') DEFAULT 'pending' COMMENT 'Order status',
  `order_type` ENUM('sale', 'return', 'exchange') DEFAULT 'sale',
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0 COMMENT 'Before tax and shipping',
  `tax_amount` DECIMAL(12, 2) DEFAULT 0 COMMENT 'Total tax',
  `shipping_cost` DECIMAL(12, 2) DEFAULT 0 COMMENT 'Shipping fee',
  `discount_amount` DECIMAL(12, 2) DEFAULT 0 COMMENT 'Discount applied',
  `total_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0 COMMENT 'Final order total',
  `paid_amount` DECIMAL(14, 2) DEFAULT 0 COMMENT 'Amount paid so far',
  `remaining_balance` DECIMAL(14, 2) GENERATED ALWAYS AS (total_amount - COALESCE(paid_amount, 0)) STORED,
  `payment_status` ENUM('unpaid', 'partial', 'paid', 'overpaid', 'refunded') DEFAULT 'unpaid',
  `created_by` CHAR(36) NOT NULL COMMENT 'User who created order',
  `notes` TEXT COMMENT 'Order notes',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_number` (`order_number`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_orders_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sales orders';

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12, 2) NOT NULL COMMENT 'Price at time of order',
  `tax_rate` DECIMAL(5, 2) DEFAULT 0,
  `tax_amount` DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price * (tax_rate / 100)) STORED,
  `discount_percent` DECIMAL(5, 2) DEFAULT 0,
  `discount_amount` DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price * (discount_percent / 100)) STORED,
  `subtotal` DECIMAL(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED COMMENT 'Before discount/tax',
  `line_total` DECIMAL(14, 2) GENERATED ALWAYS AS ((quantity * unit_price) - (quantity * unit_price * (discount_percent / 100)) + (quantity * unit_price * (tax_rate / 100))) STORED,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Individual line items in orders';

CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_method` ENUM('cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'other') DEFAULT 'cash',
  `reference_number` VARCHAR(128) COMMENT 'Check/transaction reference',
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
  `received_by` CHAR(36) COMMENT 'User who recorded payment',
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_status` (`status`),
  KEY `idx_received_by` (`received_by`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment records';

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `order_id` CHAR(36) COMMENT 'Associated order, nullable for non-order transactions',
  `company_id` CHAR(36) NOT NULL,
  `transaction_type` ENUM('sale', 'refund', 'adjustment', 'return', 'exchange', 'discount') DEFAULT 'sale',
  `amount` DECIMAL(14, 2) NOT NULL,
  `description` VARCHAR(255),
  `reference_id` VARCHAR(128) COMMENT 'Invoice/receipt number',
  `created_by` CHAR(36),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_transactions_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Financial transactions and ledger';

-- ============================================
-- AUDIT & REPORTING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) COMMENT 'User who performed action',
  `action` VARCHAR(128) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, etc',
  `entity_type` VARCHAR(128) NOT NULL COMMENT 'users, products, orders, etc',
  `entity_id` CHAR(36) NOT NULL COMMENT 'ID of affected entity',
  `old_values` JSON COMMENT 'Previous values before change',
  `new_values` JSON COMMENT 'New values after change',
  `ip_address` VARCHAR(45) COMMENT 'IPv4 or IPv6 address',
  `user_agent` TEXT COMMENT 'Browser user agent',
  `status` VARCHAR(50) DEFAULT 'success' COMMENT 'success or error',
  `error_message` TEXT COMMENT 'Error details if failed',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_entity_type_id` (`entity_type`, `entity_id`),
  KEY `idx_action` (`action`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `fk_audit_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System audit log';

CREATE TABLE IF NOT EXISTS `settings` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) COMMENT 'NULL for system-wide settings',
  `key` VARCHAR(255) NOT NULL,
  `value` LONGTEXT,
  `type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  `description` TEXT,
  `is_system` BOOLEAN DEFAULT FALSE COMMENT 'System-wide setting',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key_company` (`key`, `company_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_settings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System and company settings';

CREATE TABLE IF NOT EXISTS `reports` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `report_type` VARCHAR(128) NOT NULL COMMENT 'sales, inventory, customer, financial',
  `query` LONGTEXT COMMENT 'Saved query or report configuration',
  `created_by` CHAR(36) NOT NULL,
  `is_public` BOOLEAN DEFAULT FALSE COMMENT 'Accessible to all users',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_report_type` (`report_type`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_reports_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Saved reports';

-- ============================================
-- ADDITIONAL SUPPORTING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL UNIQUE,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE COMMENT 'Payment due date',
  `status` ENUM('draft', 'issued', 'paid', 'overdue', 'cancelled') DEFAULT 'issued',
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_invoice_number` (`invoice_number`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_invoices_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Invoice records';

CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `warehouse_id` CHAR(36) NOT NULL,
  `movement_type` ENUM('in', 'out', 'adjustment', 'return', 'damage') DEFAULT 'out',
  `quantity` INT NOT NULL,
  `reference_id` CHAR(36) COMMENT 'Order, return, or adjustment ID',
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_movement_type` (`movement_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_stock_mov_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_mov_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_mov_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track inventory movements';

SET FOREIGN_KEY_CHECKS=1;
