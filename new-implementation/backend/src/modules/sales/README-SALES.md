# Sales/Order Management API Module

Complete API documentation for the POS Modernization Sales Module.

## Overview

The Sales/Order Management API provides comprehensive order creation, payment processing, and sales reporting capabilities. It integrates with the Authentication and Product modules to manage the complete sales lifecycle.

## Table of Contents

1. [Features](#features)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Authentication & Authorization](#authentication--authorization)
5. [Request/Response Examples](#requestresponse-examples)
6. [Error Handling](#error-handling)
7. [Business Rules](#business-rules)
8. [Integration Examples](#integration-examples)
9. [Testing](#testing)

---

## Features

### Core Functionality

✅ **Order Management**
- Create, read, update, and cancel orders
- Order status workflow (draft → pending → confirmed → completed → cancelled/voided)
- Multi-tenant order isolation
- Sequential order number generation per company

✅ **Order Items**
- Add multiple items to orders
- Automatic quantity and pricing validation
- Stock availability checking
- Tax calculations per item

✅ **Payment Processing**
- Record payments against orders
- Multiple payment methods (cash, card, transfer, other)
- Payment status tracking (unpaid → partially_paid → paid → refunded)
- Prevent overpayment (total payment ≤ order total)

✅ **Calculations**
- Automatic subtotal calculation
- Tax amount computation per item and order
- Discount application (fixed amount)
- Final total (subtotal + tax - discount)

✅ **Authorization**
- Role-based access control (cashier, manager, admin)
- Order status transitions require appropriate roles
- Users can only access their company's orders

✅ **Reporting**
- Daily sales summary
- Sales summary by date range
- Requires manager or admin role

---

## API Endpoints

### Order Management Endpoints

#### 1. List Orders
```
GET /sales/orders
```

**Required Role:** cashier, manager, admin  
**Authentication:** JWT token required

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| page | number | Page number (1-indexed) | 1 |
| limit | number | Items per page | 10 |
| status | string | Filter by status | PENDING |
| customer_id | string | Filter by customer | uuid |
| startDate | ISO8601 | From date | 2026-02-13T00:00:00Z |
| endDate | ISO8601 | To date | 2026-02-14T23:59:59Z |

**Response (200 OK):**
```json
{
  "orders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "company_id": "550e8400-e29b-41d4-a716-446655440001",
      "order_number": "ORD20260213001",
      "order_date": "2026-02-13T14:30:00Z",
      "status": "PENDING",
      "payment_status": "UNPAID",
      "subtotal": 250.00,
      "tax_amount": 25.00,
      "discount_amount": 10.00,
      "total_amount": 265.00,
      "created_by": "550e8400-e29b-41d4-a716-446655440002",
      "created_at": "2026-02-13T14:30:00Z",
      "updated_at": "2026-02-13T14:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```

**cURL Example:**
```bash
curl -X GET 'http://localhost:3000/sales/orders?page=1&limit=10&status=PENDING' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### 2. Get Order Details
```
GET /sales/orders/:id
```

**Required Role:** cashier, manager, admin  
**Authentication:** JWT token required

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | UUID | Yes | Order UUID |

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "550e8400-e29b-41d4-a716-446655440001",
  "order_number": "ORD20260213001",
  "customer_id": "550e8400-e29b-41d4-a716-446655440003",
  "order_date": "2026-02-13T14:30:00Z",
  "status": "PENDING",
  "payment_status": "UNPAID",
  "subtotal": 250.00,
  "tax_amount": 25.00,
  "discount_amount": 10.00,
  "total_amount": 265.00,
  "notes": "Deliver to front desk",
  "order_items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "product_id": "550e8400-e29b-41d4-a716-446655440005",
      "product_name": "Laptop",
      "quantity": 1,
      "unit_price": 200.00,
      "tax_amount": 20.00,
      "total": 220.00
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "product_id": "550e8400-e29b-41d4-a716-446655440007",
      "product_name": "Mouse",
      "quantity": 2,
      "unit_price": 25.00,
      "tax_amount": 5.00,
      "total": 55.00
    }
  ],
  "payments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "payment_method": "CASH",
      "amount": 130.00,
      "payment_date": "2026-02-13T14:35:00Z",
      "transaction_id": "TXN123456",
      "status": "COMPLETED"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET 'http://localhost:3000/sales/orders/550e8400-e29b-41d4-a716-446655440000' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Error Responses:**
- `404 Not Found` - Order doesn't exist or belongs to different company

---

#### 3. Create Order
```
POST /sales/orders
```

**Required Role:** cashier, manager  
**Authentication:** JWT token required

**Request Body:**
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440003",
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440005",
      "quantity": 1,
      "unit_price": 200.00
    },
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440007",
      "quantity": 2,
      "unit_price": 25.00
    }
  ],
  "discount_amount": 10.00,
  "notes": "Rush order"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "550e8400-e29b-41d4-a716-446655440001",
  "order_number": "ORD20260213001",
  "status": "DRAFT",
  "payment_status": "UNPAID",
  "subtotal": 250.00,
  "tax_amount": 25.00,
  "discount_amount": 10.00,
  "total_amount": 265.00,
  "created_at": "2026-02-13T14:30:00Z"
}
```

**Validation Rules:**
- ✅ At least 1 item required
- ✅ Quantity must be > 0
- ✅ Unit price must be ≥ 0
- ✅ Stock must be available for all items
- ✅ Discount cannot exceed subtotal

**Error Responses:**
- `400 Bad Request` - Validation error or insufficient stock
- `404 Not Found` - Product doesn't exist
- `403 Forbidden` - Insufficient permissions

**cURL Example:**
```bash
curl -X POST 'http://localhost:3000/sales/orders' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440005",
        "quantity": 1,
        "unit_price": 200.00
      }
    ],
    "discount_amount": 0
  }'
```

---

#### 4. Update Order
```
PUT /sales/orders/:id
```

**Required Role:** manager  
**Authentication:** JWT token required  
**Condition:** Can only update DRAFT orders

**Request Body:**
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440003",
  "discount_amount": 15.00,
  "notes": "Updated notes"
}
```

**Response (200 OK):**
Same as Create Order response

**Error Responses:**
- `400 Bad Request` - Cannot modify non-DRAFT orders
- `404 Not Found` - Order not found

---

#### 5. Update Order Status
```
PATCH /sales/orders/:id/status
```

**Required Role:** cashier, manager  
**Authentication:** JWT token required

**Request Body:**
```json
{
  "status": "PENDING"
}
```

**Valid Status Transitions:**
```
DRAFT → [PENDING, CANCELLED]
PENDING → [CONFIRMED, CANCELLED]
CONFIRMED → [COMPLETED, CANCELLED]
COMPLETED → [VOIDED] (cancel old order)
CANCELLED → (no transitions)
VOIDED → (no transitions)
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "message": "Order status updated"
}
```

**Business Rules:**
- ✅ DRAFT → PENDING: Order becomes pending
- ✅ PENDING → CONFIRMED: Stock is deducted from inventory
- ✅ CONFIRMED → COMPLETED: Order marked as complete
- ✅ Any → CANCELLED: Order cancelled, stock restored (if was confirmed)

**Error Responses:**
- `400 Bad Request` - Invalid status transition
- `404 Not Found` - Order not found

**cURL Example:**
```bash
curl -X PATCH 'http://localhost:3000/sales/orders/550e8400-e29b-41d4-a716-446655440000/status' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "PENDING"}'
```

---

#### 6. Delete Order (Cancel/Void)
```
DELETE /sales/orders/:id
```

**Required Role:** manager  
**Authentication:** JWT token required  
**Condition:** Can only delete DRAFT orders

**Response (200 OK):**
```json
{
  "message": "Order ORD20260213001 deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Cannot delete non-DRAFT orders
- `404 Not Found` - Order not found

**cURL Example:**
```bash
curl -X DELETE 'http://localhost:3000/sales/orders/550e8400-e29b-41d4-a716-446655440000' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Payment Endpoints

#### 7. Record Payment
```
POST /sales/orders/:id/payments
```

**Required Role:** cashier, manager  
**Authentication:** JWT token required

**Request Body:**
```json
{
  "payment_method": "CASH",
  "amount": 130.00,
  "transaction_id": "TXN123456"
}
```

**Payment Methods:**
- CASH
- CARD
- TRANSFER
- OTHER

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "payment_method": "CASH",
  "amount": 130.00,
  "payment_date": "2026-02-13T14:35:00Z",
  "transaction_id": "TXN123456",
  "status": "COMPLETED",
  "order_payment_status": "PARTIALLY_PAID"
}
```

**Validation:**
- ✅ Amount must be > 0
- ✅ Total payment cannot exceed order total
- ✅ Payment method is required

**Error Responses:**
- `400 Bad Request` - Validation error or overpayment attempt
- `404 Not Found` - Order not found

**cURL Example:**
```bash
curl -X POST 'http://localhost:3000/sales/orders/550e8400-e29b-41d4-a716-446655440000/payments' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "CASH",
    "amount": 130.00,
    "transaction_id": "TXN123456"
  }'
```

---

#### 8. List Order Payments
```
GET /sales/orders/:id/payments
```

**Required Role:** cashier, manager, admin  
**Authentication:** JWT token required

**Response (200 OK):**
```json
{
  "payments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "payment_method": "CASH",
      "amount": 130.00,
      "payment_date": "2026-02-13T14:35:00Z",
      "transaction_id": "TXN123456",
      "status": "COMPLETED"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440009",
      "payment_method": "CARD",
      "amount": 135.00,
      "payment_date": "2026-02-13T14:40:00Z",
      "transaction_id": "TXN123457",
      "status": "COMPLETED"
    }
  ],
  "total_paid": 265.00,
  "order_total": 265.00,
  "remaining": 0.00
}
```

**cURL Example:**
```bash
curl -X GET 'http://localhost:3000/sales/orders/550e8400-e29b-41d4-a716-446655440000/payments' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Reporting Endpoints

#### 9. Daily Sales Summary
```
GET /sales/reports/daily
```

**Required Role:** manager, admin  
**Authentication:** JWT token required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| date | ISO8601 | Specific date (default: today) |

**Response (200 OK):**
```json
{
  "date": "2026-02-13",
  "total_sales": 2650.00,
  "total_orders": 10,
  "total_items": 23,
  "payment_breakdown": {
    "CASH": 1200.00,
    "CARD": 1000.00,
    "TRANSFER": 450.00
  },
  "status_breakdown": {
    "DRAFT": 1,
    "PENDING": 2,
    "CONFIRMED": 3,
    "COMPLETED": 4
  }
}
```

**cURL Example:**
```bash
curl -X GET 'http://localhost:3000/sales/reports/daily?date=2026-02-13' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### 10. Sales Summary by Date Range
```
GET /sales/reports/summary
```

**Required Role:** manager, admin  
**Authentication:** JWT token required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO8601 | Yes | From date |
| endDate | ISO8601 | Yes | To date |

**Response (200 OK):**
```json
{
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-14"
  },
  "total_sales": 52800.00,
  "total_orders": 150,
  "average_order_value": 352.00,
  "daily_breakdown": [
    {
      "date": "2026-02-13",
      "total_sales": 2650.00,
      "orders": 10
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET 'http://localhost:3000/sales/reports/summary?startDate=2026-02-01&endDate=2026-02-14' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Data Models

### Order Entity
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| company_id | UUID | No | Company isolation |
| customer_id | UUID | Yes | Associated customer |
| order_number | String | No | Sequential per company |
| order_date | DateTime | No | When order was created |
| status | Enum | No | Draft/Pending/Confirmed/etc |
| payment_status | Enum | No | Unpaid/Partially Paid/Paid/Refunded |
| subtotal | Decimal | No | Sum of items before tax |
| tax_amount | Decimal | No | Total tax |
| discount_amount | Decimal | No | Total discount |
| total_amount | Decimal | No | Final total |
| notes | String | Yes | Order notes |
| created_by | UUID | No | User who created |
| created_at | DateTime | No | Created timestamp |
| updated_at | DateTime | No | Last update |
| deleted_at | DateTime | Yes | Soft delete |

### OrderItem Entity
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| order_id | UUID | No | Foreign key to Order |
| product_id | UUID | No | Foreign key to Product |
| quantity | Integer | No | Item quantity |
| unit_price | Decimal | No | Price per unit |
| tax_amount | Decimal | No | Item tax |
| total | Decimal | No | quantity × unit_price + tax |

### Payment Entity
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| order_id | UUID | No | Foreign key to Order |
| payment_method | Enum | No | Cash/Card/Transfer/Other |
| amount | Decimal | No | Payment amount |
| transaction_id | String | Yes | External transaction ID |
| payment_date | DateTime | No | When payment was made |
| status | Enum | No | Completed/Refunded/Pending |

---

## Authentication & Authorization

### Required Headers
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json (for POST/PUT/PATCH)
```

### Role Requirements
| Endpoint | Role | Description |
|----------|------|-------------|
| List Orders | cashier, manager, admin | View orders |
| Get Order | cashier, manager, admin | View single order |
| Create Order | cashier, manager | Create new order |
| Update Order | manager | Modify draft order |
| Update Status | cashier, manager | Change order status |
| Delete Order | manager | Cancel draft order |
| Record Payment | cashier, manager | Add payment |
| List Payments | cashier, manager, admin | View payments |
| Daily Report | manager, admin | Sales summary |
| Summary Report | manager, admin | Period summary |

### Multi-Tenant Isolation
- All endpoints automatically filter by user's company_id
- Users cannot access orders from other companies
- API validates company_id on every operation

---

## Error Handling

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "BadRequest"
}
```

### Common Status Codes
| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Invalid operation |

---

## Business Rules

### Order Lifecycle
1. **DRAFT**: Initial state, can be modified or cancelled
2. **PENDING**: Awaiting confirmation or processing
3. **CONFIRMED**: Order confirmed, stock deducted
4. **COMPLETED**: Order finished
5. **CANCELLED**: Order cancelled, stock restored (if confirmed)
6. **VOIDED**: Order voided by manager

### Stock Management
- Stock checked when creating order (prevents overselling)
- Stock deducted when order moves to CONFIRMED
- Stock restored if CONFIRMED order is cancelled
- Cannot create orders with insufficient stock

### Payment Rules
- Order can have multiple payments
- Total payment cannot exceed order total
- Payment status auto-updated based on total paid:
  - Unpaid: $0 paid
  - Partially Paid: $0 < paid < total
  - Paid: paid = total
  - Refunded: partial refunds handled

### Calculation Rules
- Order Total = Subtotal + Tax Amount - Discount Amount
- Item Total = (Quantity × Unit Price) + Item Tax
- Tax Calculation: Item Tax = (Item Subtotal × Tax Rate / 100)
- Discount: Fixed amount, applied to entire order

---

## Integration Examples

### Creating an Order with Products
```typescript
// 1. Get auth token
const authResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'cashier@example.com', password: 'SecurePass123!' })
});
const { access_token } = await authResponse.json();

// 2. Create order
const orderResponse = await fetch('http://localhost:3000/sales/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    items: [
      { product_id: 'prod-123', quantity: 2, unit_price: 99.99 }
    ],
    discount_amount: 5.00
  })
});
const newOrder = await orderResponse.json();

// 3. Record payment
const paymentResponse = await fetch(
  `http://localhost:3000/sales/orders/${newOrder.id}/payments`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({
      payment_method: 'CASH',
      amount: newOrder.total_amount,
      transaction_id: 'TXN001'
    })
  }
);

// 4. Update status to completed
const statusResponse = await fetch(
  `http://localhost:3000/sales/orders/${newOrder.id}/status`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({ status: 'CONFIRMED' })
  }
);
```

---

## Testing

### Running Tests
```bash
npm test -- sales.service.spec.ts
```

### Test Coverage
- ✅ Order CRUD operations
- ✅ Order status transitions
- ✅ Payment processing
- ✅ Stock validation
- ✅ Multi-tenant isolation
- ✅ Role-based authorization
- ✅ Error scenarios
- ✅ Calculation accuracy

### Mock Data for Testing
```javascript
const mockOrder = {
  order_number: 'ORD20260213001',
  items: [
    { product_id: '123', quantity: 2, unit_price: 100 }
  ],
  discount_amount: 10
};
```

---

## Support & Troubleshooting

### Common Issues

**"Insufficient stock" error**
- Check product stock quantity before creating order
- Use Products API to verify availability

**"Unauthorized" error**
- Verify JWT token is valid and not expired
- Token expires in 1 hour, use refresh endpoint
- Check Authorization header format: `Bearer <token>`

**"Insufficient permissions" error**
- Verify user has required role
- Check role in user profile (/auth/me)
- Only managers can update/delete orders

**"Order not found" error**
- Verify order exists in your company
- Check order UUID is correct
- Users can only access their company's orders

---

## Future Enhancements

- Order return/refund management
- Partial refunds
- Order tracking with notifications
- Inventory synchronization
- Advanced reporting (by category, product, etc.)
- Order scheduling/recurring orders
- Customer order history
- Integration with payment gateways

---

**Module:** Sales/Order Management (Task 2.3)  
**Status:** Production Ready  
**Last Updated:** 2026-02-13  
**Version:** 1.0.0
