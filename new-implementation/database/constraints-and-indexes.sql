-- POS Modernization - Additional Constraints and Performance Indexes
-- Version: 1.0
-- Description: Optimized indexes for query performance

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- User queries
CREATE INDEX idx_users_email_active ON users(email, is_active);
CREATE INDEX idx_users_company_active ON users(company_id, is_active);
CREATE INDEX idx_users_last_login ON users(last_login DESC);

-- Order queries
CREATE INDEX idx_orders_company_date ON orders(company_id, order_date DESC);
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX idx_orders_date_range ON orders(order_date DESC, status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status, order_date DESC);

-- Product queries
CREATE INDEX idx_products_company_category ON products(company_id, category_id);
CREATE INDEX idx_products_quantity ON products(quantity, reorder_level);
CREATE INDEX idx_products_active_company ON products(is_active, company_id);
CREATE INDEX idx_products_price ON products(price DESC);

-- Customer queries
CREATE INDEX idx_customers_company_active ON customers(company_id, is_active);
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_balance ON customers(current_balance);

-- Inventory queries
CREATE INDEX idx_inventory_low_stock ON inventory(quantity_on_hand, reorder_level);
CREATE INDEX idx_inventory_warehouse_available ON inventory(warehouse_id, quantity_available);

-- Payment queries
CREATE INDEX idx_payments_date_range ON payments(payment_date DESC);
CREATE INDEX idx_payments_method ON payments(payment_method);

-- Audit queries
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user_company ON audit_log(user_id, company_id, timestamp DESC);

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Sales reporting
CREATE INDEX idx_sales_report ON orders(company_id, order_date, status, total_amount);

-- Revenue by period
CREATE INDEX idx_revenue_by_period ON orders(company_id, order_date DESC, total_amount);

-- Stock levels by category
CREATE INDEX idx_stock_by_category ON products(category_id, quantity, reorder_level);

-- Customer transactions
CREATE INDEX idx_customer_transactions ON orders(customer_id, created_at DESC, total_amount);

-- Payment reconciliation
CREATE INDEX idx_payment_reconcile ON payments(order_id, payment_date DESC, status);

-- ============================================
-- FULL-TEXT INDEXES (for search capability)
-- ============================================

-- Product search
ALTER TABLE products ADD FULLTEXT INDEX ft_product_search (name, description, sku, barcode);

-- Customer search
ALTER TABLE customers ADD FULLTEXT INDEX ft_customer_search (name, email);

-- ============================================
-- CHECK CONSTRAINTS
-- ============================================

ALTER TABLE products ADD CONSTRAINT chk_positive_price CHECK (price > 0);
ALTER TABLE products ADD CONSTRAINT chk_positive_cost CHECK (cost >= 0);
ALTER TABLE products ADD CONSTRAINT chk_valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);

ALTER TABLE orders ADD CONSTRAINT chk_positive_total CHECK (total_amount >= 0);
ALTER TABLE orders ADD CONSTRAINT chk_paid_not_exceeds_total CHECK (COALESCE(paid_amount, 0) <= total_amount * 1.1);

ALTER TABLE payments ADD CONSTRAINT chk_positive_amount CHECK (amount > 0);

ALTER TABLE order_items ADD CONSTRAINT chk_positive_quantity CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT chk_valid_discount CHECK (discount_percent >= 0 AND discount_percent <= 100);
ALTER TABLE order_items ADD CONSTRAINT chk_valid_tax CHECK (tax_rate >= 0 AND tax_rate <= 100);

ALTER TABLE customers ADD CONSTRAINT chk_valid_credit CHECK (credit_limit >= 0);

-- ============================================
-- PARTITIONING STRATEGY (Optional - for large tables)
-- ============================================

-- Note: Uncomment these if your data grows large enough to warrant partitioning
-- Partition orders by year for better query performance

/*
ALTER TABLE orders PARTITION BY RANGE (YEAR(order_date)) (
  PARTITION p_2025 VALUES LESS THAN (2026),
  PARTITION p_2026 VALUES LESS THAN (2027),
  PARTITION p_2027 VALUES LESS THAN (2028),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

ALTER TABLE audit_log PARTITION BY RANGE (YEAR(timestamp)) (
  PARTITION p_2025 VALUES LESS THAN (2026),
  PARTITION p_2026 VALUES LESS THAN (2027),
  PARTITION p_2027 VALUES LESS THAN (2028),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
*/

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Sales summary by product
CREATE OR REPLACE VIEW v_sales_by_product AS
SELECT 
  p.id,
  p.name,
  p.sku,
  COUNT(oi.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.line_total) as total_revenue,
  AVG(oi.unit_price) as avg_price
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
GROUP BY p.id, p.name, p.sku;

-- Low stock alert view
CREATE OR REPLACE VIEW v_low_stock_alert AS
SELECT 
  p.id,
  p.name,
  p.sku,
  SUM(i.quantity_on_hand) as total_stock,
  p.reorder_level,
  p.reorder_quantity,
  w.name as warehouse_name,
  CASE 
    WHEN SUM(i.quantity_on_hand) <= (p.reorder_level * 0.5) THEN 'CRITICAL'
    WHEN SUM(i.quantity_on_hand) <= p.reorder_level THEN 'LOW'
    ELSE 'OK'
  END as stock_status
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
LEFT JOIN warehouse w ON i.warehouse_id = w.id
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.sku, w.name
HAVING total_stock <= p.reorder_level;

-- Customer aging analysis
CREATE OR REPLACE VIEW v_customer_aging AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.current_balance,
  MAX(o.order_date) as last_purchase_date,
  DATEDIFF(NOW(), MAX(o.order_date)) as days_since_purchase,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount) as lifetime_value
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.email, c.current_balance;

-- Invoice aging for collections
CREATE OR REPLACE VIEW v_invoice_aging AS
SELECT 
  i.id,
  i.invoice_number,
  o.order_number,
  c.name as customer_name,
  c.email,
  i.due_date,
  o.total_amount,
  COALESCE(SUM(p.amount), 0) as paid_to_date,
  (o.total_amount - COALESCE(SUM(p.amount), 0)) as remaining_balance,
  DATEDIFF(NOW(), i.due_date) as days_overdue,
  CASE 
    WHEN i.status = 'paid' THEN 'PAID'
    WHEN DATEDIFF(NOW(), i.due_date) > 90 THEN '90+ DAYS'
    WHEN DATEDIFF(NOW(), i.due_date) > 60 THEN '60-90 DAYS'
    WHEN DATEDIFF(NOW(), i.due_date) > 30 THEN '30-60 DAYS'
    WHEN DATEDIFF(NOW(), i.due_date) > 0 THEN 'OVERDUE'
    ELSE 'CURRENT'
  END as aging_bucket
FROM invoices i
JOIN orders o ON i.order_id = o.id
JOIN customers c ON o.customer_id = c.id
LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'completed'
GROUP BY i.id, i.invoice_number, o.order_number, c.name, c.email, i.due_date, o.total_amount;

-- Monthly sales performance
CREATE OR REPLACE VIEW v_monthly_sales AS
SELECT 
  DATE_TRUNC(o.order_date, MONTH) as month,
  o.company_id,
  COUNT(DISTINCT o.id) as order_count,
  SUM(o.total_amount) as total_sales,
  SUM(o.tax_amount) as total_tax,
  AVG(o.total_amount) as avg_order_value,
  COUNT(DISTINCT o.customer_id) as unique_customers
FROM orders o
WHERE o.status NOT IN ('draft', 'cancelled')
GROUP BY DATE_TRUNC(o.order_date, MONTH), o.company_id;

-- ============================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- ============================================

-- Update order totals after line item changes
DELIMITER //

CREATE PROCEDURE sp_update_order_totals(
  IN p_order_id CHAR(36)
)
BEGIN
  DECLARE v_subtotal DECIMAL(14, 2);
  DECLARE v_tax DECIMAL(12, 2);
  
  SELECT COALESCE(SUM(line_total), 0),
         COALESCE(SUM(tax_amount), 0)
  INTO v_subtotal, v_tax
  FROM order_items
  WHERE order_id = p_order_id;
  
  UPDATE orders
  SET subtotal = v_subtotal,
      tax_amount = v_tax,
      total_amount = v_subtotal + v_tax - COALESCE(discount_amount, 0) + COALESCE(shipping_cost, 0),
      updated_at = NOW()
  WHERE id = p_order_id;
END //

-- Adjust inventory based on order
CREATE PROCEDURE sp_adjust_inventory_for_order(
  IN p_order_id CHAR(36),
  IN p_adjustment_qty INT
)
BEGIN
  INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_id, created_at)
  SELECT UUID(), oi.product_id, w.id, 'out', (oi.quantity * p_adjustment_qty), p_order_id, NOW()
  FROM order_items oi
  CROSS JOIN warehouse w
  WHERE oi.order_id = p_order_id
  LIMIT 1;
  
  UPDATE inventory
  SET quantity_on_hand = quantity_on_hand - p_adjustment_qty
  WHERE product_id IN (SELECT product_id FROM order_items WHERE order_id = p_order_id);
END //

DELIMITER ;

-- ============================================
-- TRIGGERS FOR AUDIT & DATA INTEGRITY
-- ============================================

-- Audit user changes
CREATE TRIGGER trig_audit_users_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (id, company_id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
  VALUES (
    UUID(),
    NEW.company_id,
    @current_user_id,
    'UPDATE',
    'users',
    NEW.id,
    JSON_OBJECT(
      'email', OLD.email,
      'name', OLD.name,
      'is_active', OLD.is_active
    ),
    JSON_OBJECT(
      'email', NEW.email,
      'name', NEW.name,
      'is_active', NEW.is_active
    ),
    NOW()
  );
END;

-- Track order status changes
CREATE TRIGGER trig_order_status_change
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO audit_log (id, company_id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
    VALUES (
      UUID(),
      NEW.company_id,
      @current_user_id,
      'STATUS_CHANGE',
      'orders',
      NEW.id,
      JSON_OBJECT('status', OLD.status),
      JSON_OBJECT('status', NEW.status),
      NOW()
    );
  END IF;
END;

-- Update customer balance when payment is made
CREATE TRIGGER trig_update_customer_balance
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  UPDATE customers c
  SET current_balance = (
    SELECT SUM(CASE 
      WHEN o.status = 'cancelled' THEN 0
      ELSE (o.total_amount - COALESCE(SUM(p.amount), 0))
    END)
    FROM orders o
    LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'completed'
    WHERE o.customer_id = c.id
    GROUP BY o.customer_id
  )
  WHERE id = (SELECT customer_id FROM orders WHERE id = NEW.order_id);
END;

-- Prevent updates to deleted records
CREATE TRIGGER trig_prevent_update_soft_deleted
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF OLD.deleted_at IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update deleted record';
  END IF;
END;

-- ============================================
-- PERFORMANCE TUNING RECOMMENDATIONS
-- ============================================

/*
OPTIMIZER HINTS:
1. Use FORCE INDEX for large table scans when necessary
2. Monitor slow query log: SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 2;
3. Use EXPLAIN ANALYZE on complex queries
4. Consider query caching for read-heavy operations
5. Archive old audit logs periodically

MAINTENANCE:
1. Run ANALYZE TABLE monthly to update statistics
2. Defragment tables with OPTIMIZE TABLE if needed
3. Monitor table sizes with: SELECT TABLE_NAME, ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as SIZE_MB FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'your_db';
4. Set up automated backups with mysqldump or Percona XtraBackup

CONNECTION POOLING:
- Set max_connections appropriately
- Use connection pooling at application level (TypeORM connection pooling)
- Recommended pool size: 10-50 connections depending on load
*/
