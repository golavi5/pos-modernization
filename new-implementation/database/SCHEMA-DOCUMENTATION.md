# POS Modernization - Database Schema Documentation

**Version:** 1.0  
**Created:** 2026-02-13  
**Database System:** MySQL 8.0+  
**ORM:** TypeORM

---

## Table of Contents

1. [Overview](#overview)
2. [Core Design Principles](#core-design-principles)
3. [Table Reference](#table-reference)
4. [Relationships](#relationships)
5. [Performance Considerations](#performance-considerations)
6. [Security & Audit](#security--audit)
7. [Implementation Notes](#implementation-notes)

---

## Overview

This schema supports a multi-tenant, role-based POS (Point of Sale) system with comprehensive order management, inventory tracking, customer relationships, and detailed audit logging.

### Key Statistics
- **Total Tables:** 20
- **Total Columns:** 200+
- **Primary Relationships:** 30+
- **Indexes:** 50+ (including full-text indexes)
- **Views:** 6 for reporting
- **Stored Procedures:** 2
- **Triggers:** 4

---

## Core Design Principles

### 1. Multi-Tenancy
- All transactional tables have `company_id` for complete data isolation
- Queries automatically filter by company context
- Supports multiple independent organizations in single instance

### 2. Audit Trail
- All major tables include `created_at`, `updated_at`, `deleted_at`
- Soft deletes via `deleted_at` column for data retention compliance
- Dedicated `audit_log` table tracks all changes with JSON diff support

### 3. UUID Primary Keys
- All primary keys use UUID (CHAR(36)) for:
  - Distributed system compatibility
  - Preventing ID enumeration attacks
  - Future horizontal scaling

### 4. Role-Based Access Control (RBAC)
- Users → Roles → Permissions hierarchy
- Flexible assignment via junction tables
- Supports both system-wide and company-specific roles

### 5. Financial Precision
- All monetary values use DECIMAL(12, 2) or DECIMAL(14, 2)
- Never use FLOAT/DOUBLE for financial data
- Calculated fields use GENERATED columns (immutable)

### 6. Temporal Data
- All timestamps use DATETIME (CURRENT_TIMESTAMP)
- Timezone handling at application layer
- Support for time-range queries via indexes

---

## Table Reference

### USER MANAGEMENT TABLES

#### **users**
Stores system user accounts with authentication and profile data.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| email | VARCHAR(255) | UNIQUE | Unique across system |
| password_hash | VARCHAR(255) | - | Bcrypt hash only |
| name | VARCHAR(255) | - | Display name |
| first_name | VARCHAR(128) | - | Optional parsing |
| last_name | VARCHAR(128) | - | Optional parsing |
| phone | VARCHAR(20) | - | User phone |
| company_id | CHAR(36) | FK | Multi-tenant isolation |
| is_active | BOOLEAN | INDEX | Active/inactive flag |
| last_login | DATETIME | INDEX | For analytics |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

**Usage:** Authenticate users, track logins, manage account status.

**Constraints:**
- Email must be unique
- Password must be hashed (never stored plain)
- Only active users can log in

---

#### **roles**
Defines user roles with descriptions and permissions.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| name | VARCHAR(128) | UNIQUE | e.g., 'admin', 'cashier' |
| description | TEXT | - | Role purpose |
| company_id | CHAR(36) | FK | NULL for system roles |
| is_system_role | BOOLEAN | - | Global vs. company-specific |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

**System Roles:**
- `admin` - Full system access
- `manager` - Store management
- `cashier` - POS operations
- `inventory_manager` - Stock management
- `accountant` - Financial reporting

---

#### **permissions**
Granular access control permissions.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| name | VARCHAR(128) | UNIQUE | Action: read, write, delete |
| resource | VARCHAR(128) | INDEX | Target: orders, products, users |
| description | TEXT | - | Permission details |
| created_at | DATETIME | - | Auto-set |
| deleted_at | DATETIME | - | Soft delete |

**Pattern:** `{action}:{resource}` (e.g., `read:orders`, `delete:products`)

---

#### **user_roles** (Junction)
Many-to-many relationship between users and roles.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| user_id | CHAR(36) | PK+FK | User UUID |
| role_id | CHAR(36) | PK+FK | Role UUID |
| assigned_at | DATETIME | - | When role was assigned |
| assigned_by | CHAR(36) | FK | Admin who made assignment |

---

#### **role_permissions** (Junction)
Many-to-many relationship between roles and permissions.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| role_id | CHAR(36) | PK+FK | Role UUID |
| permission_id | CHAR(36) | PK+FK | Permission UUID |
| created_at | DATETIME | - | When granted |

---

### COMPANY & CUSTOMER TABLES

#### **companies**
Multi-tenant business entities.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| name | VARCHAR(255) | - | Company legal name |
| registration_number | VARCHAR(50) | - | Business registration |
| tax_id | VARCHAR(50) | UNIQUE | Tax identification |
| website | VARCHAR(255) | - | Company website |
| phone | VARCHAR(20) | - | Main phone |
| email | VARCHAR(255) | - | Main email |
| address | TEXT | - | Headquarters address |
| city, state, country | VARCHAR(128) | - | Location details |
| industry | VARCHAR(128) | - | Industry classification |
| employee_count | INT | - | Employee count |
| annual_revenue | DECIMAL(15,2) | - | Revenue for analytics |
| is_active | BOOLEAN | INDEX | Active company flag |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

**Usage:** Isolate data for each tenant, store business information.

---

#### **customers**
Customer accounts and relationship information.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | Parent company |
| name | VARCHAR(255) | - | Customer name |
| email | VARCHAR(255) | INDEX | Email address |
| phone | VARCHAR(20) | - | Phone number |
| customer_type | ENUM | - | individual / business / wholesale |
| tax_id | VARCHAR(50) | - | Tax ID for business |
| credit_limit | DECIMAL(12,2) | - | Maximum credit allowed |
| current_balance | DECIMAL(12,2) | - | Updated by trigger |
| payment_terms | VARCHAR(50) | - | net30, net60, etc |
| notes | TEXT | - | Internal notes |
| is_active | BOOLEAN | INDEX | Active customer |
| last_purchase_date | DATE | - | For RFM analysis |
| total_purchases | DECIMAL(15,2) | - | Lifetime value |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

**Usage:** Track customer relationships, credit history, preferences.

---

#### **customer_addresses**
Multiple addresses per customer (billing, shipping, etc).

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| customer_id | CHAR(36) | FK | Parent customer |
| address_type | ENUM | - | billing / shipping / other |
| street_address | VARCHAR(255) | - | Full street address |
| city, state, country | VARCHAR(128) | - | Location |
| zip_code | VARCHAR(20) | - | Postal code |
| is_default | BOOLEAN | - | Use by default? |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |

---

#### **customer_contacts**
Named contacts within customer accounts.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| customer_id | CHAR(36) | FK | Parent customer |
| contact_name | VARCHAR(255) | - | Person's name |
| title | VARCHAR(128) | - | Job title |
| email | VARCHAR(255) | - | Direct email |
| phone | VARCHAR(20) | - | Direct phone |
| is_primary | BOOLEAN | - | Primary contact? |
| created_at | DATETIME | - | Auto-set |

---

### INVENTORY & PRODUCTS TABLES

#### **categories**
Product classification hierarchy.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | Multi-tenant |
| name | VARCHAR(255) | - | Category name |
| slug | VARCHAR(255) | UNIQUE | URL-friendly name |
| description | TEXT | - | Category details |
| parent_category_id | CHAR(36) | FK | For hierarchies |
| display_order | INT | - | Sort order |
| is_active | BOOLEAN | - | Active flag |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

**Usage:** Organize products, enable category-based searches.

---

#### **products**
Product catalog with pricing and inventory info.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | Multi-tenant |
| category_id | CHAR(36) | FK | Product classification |
| name | VARCHAR(255) | - | Product name |
| description | TEXT | - | Detailed description |
| sku | VARCHAR(128) | UNIQUE | Stock keeping unit |
| barcode | VARCHAR(128) | INDEX | For scanning |
| unit_type | VARCHAR(50) | - | unit / liter / kg |
| price | DECIMAL(12,2) | - | Selling price |
| cost | DECIMAL(12,2) | - | Cost basis |
| margin_percent | DECIMAL(5,2) | GEN | Calculated: (price-cost)/price*100 |
| quantity | INT | INDEX | Current stock (summed from inventory) |
| reorder_level | INT | - | Minimum threshold |
| reorder_quantity | INT | - | Order quantity when below level |
| is_active | BOOLEAN | INDEX | Active product |
| is_taxable | BOOLEAN | - | Tax applies? |
| tax_rate | DECIMAL(5,2) | - | Tax percentage |
| supplier_id | VARCHAR(255) | - | Supplier reference |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

**Notes:**
- `margin_percent` is calculated and immutable
- SKU must be unique per company
- Quantity is aggregated from inventory table

---

#### **warehouse**
Physical storage locations.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | Parent company |
| name | VARCHAR(255) | - | Warehouse name |
| location | VARCHAR(255) | - | Location description |
| address | TEXT | - | Full address |
| manager_id | CHAR(36) | FK | User managing warehouse |
| capacity | INT | - | Storage capacity |
| is_active | BOOLEAN | - | Active warehouse |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |

---

#### **inventory**
Stock levels by product and warehouse (denormalized for performance).

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| product_id | CHAR(36) | FK | Product UUID |
| warehouse_id | CHAR(36) | FK | Warehouse UUID |
| quantity_on_hand | INT | - | Physical stock |
| quantity_reserved | INT | - | Reserved for orders |
| quantity_available | INT | GEN | on_hand - reserved |
| reorder_level | INT | - | Min threshold |
| last_counted_at | DATETIME | - | Last physical count |
| updated_at | DATETIME | - | Auto-update |

**Note:** One row per product-warehouse combination. `quantity_available` is calculated.

---

### SALES & ORDERS TABLES

#### **orders**
Master order records with financial summary.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | Multi-tenant |
| customer_id | CHAR(36) | FK | Customer |
| order_number | VARCHAR(50) | UNIQUE | ORD-2026-0001 format |
| order_date | DATETIME | INDEX | When placed |
| delivery_date | DATE | - | Expected delivery |
| completed_date | DATETIME | - | When fulfilled |
| status | ENUM | INDEX | draft / pending / confirmed / processing / shipped / delivered / cancelled / returned |
| order_type | ENUM | - | sale / return / exchange |
| subtotal | DECIMAL(14,2) | - | Before tax/shipping |
| tax_amount | DECIMAL(12,2) | - | Total tax |
| shipping_cost | DECIMAL(12,2) | - | Shipping fee |
| discount_amount | DECIMAL(12,2) | - | Total discount |
| total_amount | DECIMAL(14,2) | - | Final total |
| paid_amount | DECIMAL(14,2) | - | Amount received |
| remaining_balance | DECIMAL(14,2) | GEN | total - paid |
| payment_status | ENUM | INDEX | unpaid / partial / paid / overpaid / refunded |
| created_by | CHAR(36) | FK | User who created |
| notes | TEXT | - | Order notes |
| created_at | DATETIME | INDEX | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

**Status Flow:** draft → pending → confirmed → processing → shipped → delivered

**Payment Status Logic:**
- `unpaid`: paid_amount = 0
- `partial`: 0 < paid_amount < total_amount
- `paid`: paid_amount = total_amount
- `overpaid`: paid_amount > total_amount
- `refunded`: paid_amount = 0 but refund issued

---

#### **order_items**
Line items within orders.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| order_id | CHAR(36) | FK | Parent order |
| product_id | CHAR(36) | FK | Product purchased |
| quantity | INT | - | Units ordered |
| unit_price | DECIMAL(12,2) | - | Price at order time |
| tax_rate | DECIMAL(5,2) | - | Tax % for item |
| tax_amount | DECIMAL(12,2) | GEN | qty * unit_price * (tax_rate/100) |
| discount_percent | DECIMAL(5,2) | - | Line discount % |
| discount_amount | DECIMAL(12,2) | GEN | qty * unit_price * (discount/100) |
| subtotal | DECIMAL(14,2) | GEN | qty * unit_price |
| line_total | DECIMAL(14,2) | GEN | subtotal - discount + tax |
| notes | TEXT | - | Item-specific notes |
| created_at | DATETIME | - | Auto-set |

**Calculated Fields:** All amounts are immutable GENERATED columns.

---

#### **payments**
Payment transaction records.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| order_id | CHAR(36) | FK | Associated order |
| amount | DECIMAL(12,2) | - | Payment amount |
| payment_method | ENUM | INDEX | cash / credit_card / debit_card / check / bank_transfer / other |
| reference_number | VARCHAR(128) | - | Check# or transaction ID |
| payment_date | DATETIME | INDEX | When received |
| status | ENUM | - | pending / completed / failed / refunded |
| received_by | CHAR(36) | FK | User who recorded |
| notes | TEXT | - | Additional info |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |

**Note:** Trigger updates customer.current_balance when payment completes.

---

#### **transactions**
General ledger transaction log.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| order_id | CHAR(36) | FK | Associated order (optional) |
| company_id | CHAR(36) | FK | Multi-tenant |
| transaction_type | ENUM | - | sale / refund / adjustment / return / exchange / discount |
| amount | DECIMAL(14,2) | - | Transaction amount |
| description | VARCHAR(255) | - | Transaction details |
| reference_id | VARCHAR(128) | - | Invoice or receipt # |
| created_by | CHAR(36) | FK | User who created |
| created_at | DATETIME | INDEX | Auto-set |

**Usage:** Audit trail for financial reconciliation.

---

### AUDIT & REPORTING TABLES

#### **audit_log**
Complete system audit trail.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | Multi-tenant context |
| user_id | CHAR(36) | FK | Who made change |
| action | VARCHAR(128) | INDEX | CREATE / UPDATE / DELETE / LOGIN |
| entity_type | VARCHAR(128) | INDEX | users / orders / products |
| entity_id | CHAR(36) | INDEX | ID of affected record |
| old_values | JSON | - | Before values |
| new_values | JSON | - | After values |
| ip_address | VARCHAR(45) | - | IPv4 or IPv6 |
| user_agent | TEXT | - | Browser info |
| status | VARCHAR(50) | - | success / error |
| error_message | TEXT | - | Error details |
| timestamp | DATETIME | INDEX | When it occurred |

**Usage:** Compliance, debugging, security investigation.

**Example Query:** Find who deleted customer:
```sql
SELECT * FROM audit_log 
WHERE entity_type = 'customers' 
AND action = 'DELETE' 
ORDER BY timestamp DESC;
```

---

#### **settings**
System and company-specific configuration.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | NULL = system-wide |
| key | VARCHAR(255) | - | Setting key (e.g., 'tax_rate') |
| value | LONGTEXT | - | Setting value |
| type | ENUM | - | string / number / boolean / json |
| description | TEXT | - | Human-readable description |
| is_system | BOOLEAN | - | System-wide setting flag |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |

**Example Settings:**
- `default_tax_rate` = "8.00"
- `invoice_prefix` = "INV"
- `currency` = "USD"

---

#### **reports**
Saved report queries and configurations.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| company_id | CHAR(36) | FK | Multi-tenant |
| name | VARCHAR(255) | - | Report name |
| description | TEXT | - | Report details |
| report_type | VARCHAR(128) | INDEX | sales / inventory / customer / financial |
| query | LONGTEXT | - | Saved SQL or config |
| created_by | CHAR(36) | FK | User who created |
| is_public | BOOLEAN | - | Public to all users? |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |
| deleted_at | DATETIME | - | Soft delete |

---

### SUPPORTING TABLES

#### **invoices**
Invoice records (one per order).

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| order_id | CHAR(36) | FK | Parent order (UNIQUE) |
| invoice_number | VARCHAR(50) | UNIQUE | INV-2026-0001 format |
| invoice_date | DATE | - | Invoice date |
| due_date | DATE | - | Payment due date |
| status | ENUM | - | draft / issued / paid / overdue / cancelled |
| notes | TEXT | - | Invoice notes |
| created_at | DATETIME | - | Auto-set |
| updated_at | DATETIME | - | Auto-update |

**Usage:** Generate and track invoices for accounting.

---

#### **stock_movements**
Detailed inventory movement log.

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | CHAR(36) | PK | UUID |
| product_id | CHAR(36) | FK | Product moved |
| warehouse_id | CHAR(36) | FK | Warehouse location |
| movement_type | ENUM | - | in / out / adjustment / return / damage |
| quantity | INT | - | Units moved |
| reference_id | CHAR(36) | - | Order / return ID |
| notes | TEXT | - | Movement notes |
| created_by | CHAR(36) | FK | User who created |
| created_at | DATETIME | INDEX | Auto-set |

**Usage:** Track all inventory changes for reconciliation and analytics.

---

## Relationships

### Key Foreign Key Relationships

```
users ──FK──> companies
users ──FK──> user_roles ──FK──> roles
roles ──FK──> role_permissions ──FK──> permissions

customers ──FK──> companies
customer_addresses ──FK──> customers
customer_contacts ──FK──> customers

products ──FK──> companies
products ──FK──> categories
categories ──FK──> categories (parent_category_id)
categories ──FK──> companies

inventory ──FK──> products
inventory ──FK──> warehouse
warehouse ──FK──> companies

orders ──FK──> companies
orders ──FK──> customers
order_items ──FK──> orders
order_items ──FK──> products
payments ──FK──> orders

invoices ──FK──> orders
transactions ──FK──> orders
stock_movements ──FK──> products
stock_movements ──FK──> warehouse

audit_log ──FK──> companies
```

### Cascade Delete Rules

- **CASCADE:** company → users, customers, orders, products, etc.
- **RESTRICT:** product → order_items (prevent deleting products with history)
- **SET NULL:** user → orders (allow user deletion, orphan orders)

---

## Performance Considerations

### Indexing Strategy

**Query Performance Bottlenecks Addressed:**
1. **Order lookup by date range** → `orders(company_id, order_date DESC, status)`
2. **Customer search** → Full-text index on `customers(name, email)`
3. **Low stock alerts** → `inventory(quantity_on_hand, reorder_level)`
4. **Payment reconciliation** → `payments(order_id, payment_date DESC, status)`
5. **User authentication** → `users(email, is_active)`

### Statistics & Maintenance

```sql
-- Monthly maintenance tasks
ANALYZE TABLE users, orders, products, payments;
OPTIMIZE TABLE audit_log; -- Compact fragmented tables
CHECK TABLE users, orders; -- Verify table integrity
```

### Connection Pooling

Recommended settings for TypeORM:
```typescript
{
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'pos_user',
  password: '***',
  database: 'pos_modernization',
  entities: ['src/**/*.entity.ts'],
  synchronize: false, // Use migrations instead
  logging: ['query', 'error'],
  extra: {
    connectionLimit: 50,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0
  }
}
```

### Query Optimization Tips

1. **Always filter by company_id** in WHERE clause
2. **Use EXPLAIN ANALYZE** for complex queries
3. **Avoid SELECT *** — specify needed columns
4. **Use LIMIT when pagination needed**
5. **Index foreign keys used in JOINs**
6. **Archive old audit_log records** (2+ years)

---

## Security & Audit

### User Data Protection

- Passwords stored as bcrypt hashes only (minimum 10 rounds)
- Email addresses are indexed for fast lookup
- Soft deletes preserve historical data for audit

### Financial Data Integrity

- All monetary values use DECIMAL (never FLOAT)
- Generated columns for calculated amounts (immutable)
- CHECK constraints prevent invalid prices/quantities

### Audit Compliance

- `audit_log` captures all create/update/delete operations
- JSON storage of old/new values enables diff tracking
- Soft deletes (`deleted_at`) keep deleted records for compliance
- IP address and user agent logged for security analysis

### Row-Level Security

Implement at application layer:
```sql
-- Filter orders by customer and company
SELECT * FROM orders 
WHERE company_id = @current_company_id 
AND customer_id = @customer_id;
```

---

## Implementation Notes

### TypeORM Integration

Entity column mapping example:
```typescript
@Entity('orders')
export class Order {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column('char', { length: 36 })
  company_id: string;

  @Column('decimal', { precision: 14, scale: 2 })
  total_amount: number;

  @Column('datetime', { default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}
```

### Initial Data

The `seed-data.sql` file includes:
- 3 test companies
- 5 test users with different roles
- 5 sample products across categories
- 2 sample orders with payments
- Complete audit trail for testing

### Deployment Checklist

- [ ] Create database with UTF8MB4 charset
- [ ] Run `schema.sql` to create tables
- [ ] Run `constraints-and-indexes.sql` for optimization
- [ ] Run `seed-data.sql` for test data
- [ ] Verify all foreign keys resolve
- [ ] Test audit triggers
- [ ] Configure database backups
- [ ] Set up monitoring for slow queries
- [ ] Document company creation procedure

### Future Enhancements

- Partition large tables by year (orders, audit_log)
- Add read replicas for reporting queries
- Implement materialized views for dashboards
- Add elasticsearch for full-text search at scale
- Consider document storage for large JSON fields

---

**Document Owner:** Database Team  
**Last Updated:** 2026-02-13  
**Next Review:** 2026-03-13
