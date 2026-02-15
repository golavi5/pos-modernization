# Customer Management API

Complete customer relationship management (CRM) module for the POS system.

## Features

- ✅ Full CRUD operations for customers
- ✅ Multi-tenant isolation (company_id)
- ✅ Role-based access control (RBAC)
- ✅ Loyalty points management
- ✅ Customer purchase tracking
- ✅ Advanced search and filtering
- ✅ Customer statistics and analytics
- ✅ Top customers ranking
- ✅ Soft delete (deactivation)
- ✅ Purchase history integration (placeholder for sales module)
- ✅ Email/phone uniqueness validation
- ✅ >85% test coverage

## API Endpoints

### Authentication Required
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

### 1. Create Customer
**POST** `/customers`

**Roles:** `admin`, `manager`, `cashier`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City, State 12345"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "company_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City, State 12345",
  "loyalty_points": 0,
  "total_purchases": 0,
  "last_purchase_date": null,
  "is_active": true,
  "created_at": "2026-02-14T20:00:00.000Z",
  "updated_at": "2026-02-14T20:00:00.000Z"
}
```

**Validation:**
- `name` (required, 1-200 chars)
- `email` (optional, valid email format, unique per company)
- `phone` (optional, 7-20 chars, unique per company)
- `address` (optional, max 500 chars)

**Errors:**
- `400 Bad Request` - Duplicate email or phone
- `401 Unauthorized` - Invalid/missing token
- `403 Forbidden` - Insufficient permissions

---

### 2. Get All Customers (Paginated)
**GET** `/customers?page=1&pageSize=20&search=john&isActive=true&minLoyaltyPoints=100&sortBy=name&sortOrder=ASC`

**Roles:** `admin`, `manager`, `cashier`, `viewer`

**Query Parameters:**
- `page` (number, default: 1)
- `pageSize` (number, default: 20, max: 100)
- `search` (string, searches name/email/phone)
- `isActive` (boolean, filter by active status)
- `minLoyaltyPoints` (number, minimum loyalty points)
- `sortBy` (string: `name` | `total_purchases` | `loyalty_points` | `created_at`)
- `sortOrder` (`ASC` | `DESC`, default: DESC)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "loyalty_points": 150,
      "total_purchases": 1250.50,
      "last_purchase_date": "2026-02-10T15:30:00.000Z",
      "is_active": true,
      "created_at": "2026-01-01T10:00:00.000Z",
      "updated_at": "2026-02-10T15:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### 3. Get Customer by ID
**GET** `/customers/:id`

**Roles:** `admin`, `manager`, `cashier`, `viewer`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "company_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "loyalty_points": 150,
  "total_purchases": 1250.50,
  "last_purchase_date": "2026-02-10T15:30:00.000Z",
  "is_active": true,
  "created_at": "2026-01-01T10:00:00.000Z",
  "updated_at": "2026-02-10T15:30:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Customer does not exist or belongs to different company

---

### 4. Update Customer
**PATCH** `/customers/:id`

**Roles:** `admin`, `manager`

**Request Body:** (all fields optional)
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567899",
  "address": "456 Oak Ave",
  "is_active": true
}
```

**Response:** `200 OK` (updated customer object)

**Validation:**
- Email/phone uniqueness checked if changed
- Cannot update `company_id`, `loyalty_points`, `total_purchases` directly

**Errors:**
- `400 Bad Request` - Duplicate email/phone
- `404 Not Found` - Customer not found

---

### 5. Delete Customer (Soft Delete)
**DELETE** `/customers/:id`

**Roles:** `admin`

**Response:** `204 No Content`

**Note:** Sets `is_active = false` instead of hard delete. Customer data is preserved for historical records.

---

### 6. Get Customer Purchase History
**GET** `/customers/:id/purchase-history?limit=10`

**Roles:** `admin`, `manager`, `cashier`

**Query Parameters:**
- `limit` (number, default: 10, max: 100)

**Response:** `200 OK`
```json
[
  {
    "id": "order-uuid",
    "order_number": "ORD-2026-001",
    "total": 125.50,
    "status": "completed",
    "created_at": "2026-02-10T15:30:00.000Z"
  }
]
```

**Note:** Currently returns empty array. Will be populated when sales module integration is complete.

---

### 7. Update Loyalty Points
**PATCH** `/customers/:id/loyalty`

**Roles:** `admin`, `manager`

**Request Body:**
```json
{
  "points": 50,
  "operation": "add"
}
```

**Operations:**
- `add` - Add points to current balance
- `subtract` - Subtract points (requires sufficient balance)
- `set` - Set points to exact value

**Response:** `200 OK` (updated customer object)

**Errors:**
- `400 Bad Request` - Insufficient points for subtraction

---

### 8. Get Top Customers
**GET** `/customers/top?limit=10`

**Roles:** `admin`, `manager`

**Query Parameters:**
- `limit` (number, default: 10, max: 100)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Top Customer",
    "email": "top@example.com",
    "total_purchases": 5000.00,
    "loyalty_points": 500,
    "is_active": true
  }
]
```

**Note:** Sorted by `total_purchases` DESC. Only includes active customers.

---

### 9. Get Customer Statistics
**GET** `/customers/stats`

**Roles:** `admin`, `manager`

**Response:** `200 OK`
```json
{
  "totalCustomers": 150,
  "activeCustomers": 135,
  "inactiveCustomers": 15,
  "totalLoyaltyPoints": 12500,
  "avgPurchaseValue": 250.75,
  "recentCustomers": 42
}
```

**Metrics:**
- `totalCustomers` - All customers (active + inactive)
- `activeCustomers` - `is_active = true`
- `inactiveCustomers` - `is_active = false`
- `totalLoyaltyPoints` - Sum of all loyalty points
- `avgPurchaseValue` - Average total_purchases per active customer
- `recentCustomers` - Customers with purchases in last 30 days

---

### 10. Advanced Search
**GET** `/customers/search?search=john&isActive=true&minLoyaltyPoints=100&sortBy=total_purchases&sortOrder=DESC`

**Roles:** `admin`, `manager`, `cashier`

**Query Parameters:** (same as GET /customers)
- `search`, `isActive`, `minLoyaltyPoints`, `sortBy`, `sortOrder`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "total_purchases": 1500.00,
    "loyalty_points": 150,
    "is_active": true
  }
]
```

**Note:** Returns up to 100 results without pagination. Use GET /customers for paginated results.

---

## Database Schema

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_purchases DECIMAL(10,2) DEFAULT 0.00,
  last_purchase_date TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, email),
  UNIQUE(company_id, phone)
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_loyalty ON customers(loyalty_points);
CREATE INDEX idx_customers_active ON customers(is_active);
```

---

## DTOs

### CreateCustomerDto
```typescript
{
  name: string;          // required, 1-200 chars
  email?: string;        // optional, valid email
  phone?: string;        // optional, 7-20 chars
  address?: string;      // optional, max 500 chars
}
```

### UpdateCustomerDto
All fields optional (partial update).

### CustomerQueryDto
```typescript
{
  page?: number;              // default: 1
  pageSize?: number;          // default: 20
  search?: string;            // searches name/email/phone
  isActive?: boolean;         // filter by active status
  minLoyaltyPoints?: number;  // minimum loyalty points
  sortBy?: string;            // name | total_purchases | loyalty_points | created_at
  sortOrder?: 'ASC' | 'DESC'; // default: DESC
}
```

### UpdateLoyaltyPointsDto
```typescript
{
  points: number;                    // required, positive integer
  operation: 'add' | 'subtract' | 'set'; // required
}
```

---

## Integration Points

### With Sales Module
When a sale is completed:
```typescript
await customersService.updatePurchaseStats(
  customerId,
  companyId,
  saleTotal
);
```

This automatically:
- Increments `total_purchases` by sale amount
- Updates `last_purchase_date` to current timestamp

### With Loyalty System
Points can be awarded based on business rules:
```typescript
const pointsEarned = Math.floor(saleTotal / 10); // 1 point per $10
await customersService.updateLoyaltyPoints(
  customerId,
  { points: pointsEarned, operation: 'add' },
  companyId
);
```

---

## Testing

### Run Tests
```bash
# Unit tests
npm run test customers.service.spec
npm run test customers.controller.spec

# Coverage
npm run test:cov
```

### Test Coverage
- **Service:** 85%+ coverage
- **Controller:** 85%+ coverage
- **Integration:** Ready for E2E tests

### Key Test Scenarios
- ✅ Create customer with valid data
- ✅ Duplicate email/phone validation
- ✅ Pagination and filtering
- ✅ Loyalty points operations (add/subtract/set)
- ✅ Soft delete behavior
- ✅ Top customers ranking
- ✅ Statistics calculation
- ✅ Multi-tenant isolation
- ✅ RBAC enforcement

---

## Security

### Multi-Tenant Isolation
All queries automatically filter by `company_id` from JWT token. Users cannot access customers from other companies.

### Role-Based Access Control

| Endpoint | Admin | Manager | Cashier | Viewer |
|----------|-------|---------|---------|--------|
| Create | ✅ | ✅ | ✅ | ❌ |
| Read | ✅ | ✅ | ✅ | ✅ |
| Update | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| Loyalty | ✅ | ✅ | ❌ | ❌ |
| Stats | ✅ | ✅ | ❌ | ❌ |

### Input Validation
- All DTOs use `class-validator` decorators
- Email/phone format validation
- Length constraints on all string fields
- Sanitization of search queries (ILIKE with parameterization)

---

## Performance Considerations

### Database Indexes
- `company_id` (multi-tenant queries)
- `email` (uniqueness checks)
- `phone` (uniqueness checks)
- `loyalty_points` (top customers, filtering)
- `is_active` (active/inactive filtering)

### Query Optimization
- Pagination prevents large result sets
- Query builder for complex filters
- Indexed columns in WHERE and ORDER BY clauses
- Limit advanced search to 100 results

---

## Future Enhancements

### Planned Features
- [ ] Customer segmentation (VIP, regular, at-risk)
- [ ] Email/SMS marketing integration
- [ ] Birthday tracking and automated campaigns
- [ ] Customer notes and tags
- [ ] Purchase predictions and recommendations
- [ ] Referral tracking
- [ ] Customer lifetime value (CLV) calculation
- [ ] Integration with external CRM systems

### Sales Integration (Next Sprint)
- Link to `orders` table via `customer_id`
- Populate purchase history endpoint
- Automatic loyalty points on purchase
- Customer purchase analytics

---

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Customer with this email already exists",
  "error": "Bad Request"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Customer with ID abc-123 not found",
  "error": "Not Found"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Usage Examples

### Create a New Customer
```bash
curl -X POST http://localhost:3000/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "address": "123 Main St"
  }'
```

### Search Active Customers with High Loyalty
```bash
curl -X GET "http://localhost:3000/customers?isActive=true&minLoyaltyPoints=100&sortBy=loyalty_points&sortOrder=DESC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Add Loyalty Points
```bash
curl -X PATCH http://localhost:3000/customers/CUSTOMER_ID/loyalty \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 50,
    "operation": "add"
  }'
```

### Get Top 5 Customers
```bash
curl -X GET "http://localhost:3000/customers/top?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Changelog

### v1.0.0 (2026-02-14)
- Initial release
- Complete CRUD operations
- Loyalty points management
- Purchase tracking
- Advanced search and filtering
- Customer statistics
- >85% test coverage
- Production-ready

---

## Support

For issues or questions:
1. Check database schema: `/database/schema.sql`
2. Review test files for usage examples
3. Consult main project documentation

---

**Module Status:** ✅ Production Ready  
**Test Coverage:** 85%+  
**Last Updated:** 2026-02-14
