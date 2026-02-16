## Reports API Module

Complete reporting and analytics module for the POS system. Provides comprehensive insights into sales, products, inventory, and customers.

### Module Structure

```
reports/
├── reports.module.ts           # Module configuration
├── reports.controller.ts       # REST API endpoints
├── dto/
│   ├── report-query.dto.ts     # Common query parameters
│   ├── sales-report.dto.ts     # Sales report responses
│   ├── product-report.dto.ts   # Product report responses
│   └── customer-report.dto.ts  # Customer report responses
├── services/
│   ├── sales-report.service.ts      # Sales analytics
│   ├── product-report.service.ts    # Product analytics
│   ├── customer-report.service.ts   # Customer analytics
│   ├── inventory-report.service.ts  # Inventory analytics
│   └── export.service.ts            # Export to PDF/Excel/CSV
└── README-REPORTS.md           # This file
```

---

## 📊 Features

### Sales Reports
- **Sales Summary**: Total sales, revenue, profit, average ticket
- **Period Comparison**: Compare current vs previous period
- **Trends Analysis**: Daily/weekly/monthly revenue trends
- **Payment Methods**: Revenue breakdown by payment method

### Product Reports
- **Top Selling Products**: Best performers by quantity and revenue
- **Low Stock Alert**: Products below reorder point
- **Inventory Turnover**: Fast-moving vs slow-moving products
- **Dead Stock**: Products with no movement

### Customer Reports
- **Top Buyers**: Highest spending customers
- **Customer Segmentation**: VIP, Regular, New, Inactive
- **Loyalty Analytics**: Points accumulation and usage
- **Active Customers**: Recent purchase activity

### Inventory Reports
- **Stock Valuation**: Total inventory value by warehouse
- **Movement Summary**: IN/OUT/ADJUST/DAMAGE/RETURN counts
- **Days Until Stockout**: Estimated stock depletion time

---

## 🚀 API Endpoints

### Sales Reports

#### `GET /api/reports/sales/summary`
Get high-level sales summary with period comparison.

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `yearly` | `custom` (default: `monthly`)
- `startDate`: ISO date string (e.g., `2026-01-01`)
- `endDate`: ISO date string (e.g., `2026-12-31`)

**Response:**
```json
{
  "totalSales": 150,
  "totalRevenue": 45000.50,
  "totalProfit": 12000.25,
  "averageTicket": 300.00,
  "totalItems": 450,
  "period": "2026-01-01 - 2026-01-31",
  "comparedToLastPeriod": {
    "salesChange": 15.5,
    "revenueChange": 12.3,
    "profitChange": 18.7
  }
}
```

#### `GET /api/reports/sales/by-period`
Detailed sales breakdown over time.

**Query Parameters:**
- Same as summary + `limit` (default: 10)

**Response:**
```json
{
  "summary": { /* ... */ },
  "periodData": [
    {
      "date": "2026-01-01",
      "totalSales": 10,
      "totalRevenue": 3000.00,
      "totalItems": 30,
      "averageTicket": 300.00
    }
  ],
  "generatedAt": "2026-02-16T..."
}
```

#### `GET /api/reports/revenue/trends`
Revenue trends with payment method breakdown.

**Response:**
```json
{
  "trends": [ /* period data */ ],
  "byPaymentMethod": [
    {
      "paymentMethod": "cash",
      "totalRevenue": 25000.00,
      "transactionCount": 75,
      "percentage": 55.6
    }
  ],
  "totalRevenue": 45000.50,
  "generatedAt": "2026-02-16T..."
}
```

---

### Product Reports

#### `GET /api/reports/products/top-selling`
Get best-performing products.

**Query Parameters:**
- `period`, `startDate`, `endDate`, `limit` (default: 10)
- `categoryId`: Filter by category (optional)

**Response:**
```json
[
  {
    "productId": 1,
    "productName": "Laptop HP",
    "sku": "LAP-HP-001",
    "category": "Electronics",
    "totalQuantitySold": 50,
    "totalRevenue": 25000.00,
    "averagePrice": 500.00,
    "transactionCount": 45
  }
]
```

#### `GET /api/reports/products/low-stock`
Products needing reorder.

**Response:**
```json
[
  {
    "productId": 5,
    "productName": "Mouse Logitech",
    "sku": "MOU-LOG-001",
    "currentStock": 5,
    "reorderPoint": 20,
    "stockLevel": "critical",
    "warehouseName": "Main Warehouse",
    "daysUntilStockout": 3
  }
]
```

#### `GET /api/reports/products/report`
Comprehensive product analytics.

**Response:**
```json
{
  "topSelling": [ /* ... */ ],
  "lowStock": [ /* ... */ ],
  "generatedAt": "2026-02-16T..."
}
```

---

### Inventory Reports

#### `GET /api/reports/inventory/turnover`
Inventory turnover analysis.

**Response:**
```json
{
  "turnover": [
    {
      "productId": 1,
      "productName": "Laptop HP",
      "sku": "LAP-HP-001",
      "averageStock": 25,
      "totalSold": 100,
      "turnoverRate": 4.0,
      "daysOfInventory": 7.5,
      "category": "Electronics",
      "status": "fast-moving"
    }
  ],
  "averageTurnoverRate": 2.5,
  "totalProducts": 100,
  "fastMovingCount": 25,
  "slowMovingCount": 60,
  "deadStockCount": 15,
  "generatedAt": "2026-02-16T..."
}
```

**Status Classification:**
- **fast-moving**: Turnover rate >= 4 times per period
- **slow-moving**: Turnover rate >= 1 but < 4
- **dead-stock**: Turnover rate < 1 (no/minimal sales)

#### `GET /api/reports/inventory/value-by-warehouse`
Total inventory value per warehouse.

**Response:**
```json
[
  {
    "warehouseId": 1,
    "warehouseName": "Main Warehouse",
    "productCount": 150,
    "totalUnits": 5000,
    "totalValue": 125000.00
  }
]
```

---

### Customer Reports

#### `GET /api/reports/customers/top-buyers`
Highest spending customers.

**Query Parameters:**
- `period`, `startDate`, `endDate`, `limit` (default: 10)

**Response:**
```json
[
  {
    "customerId": 1,
    "customerName": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "totalPurchases": 25,
    "totalSpent": 15000.00,
    "averageTicket": 600.00,
    "lastPurchaseDate": "2026-02-15T...",
    "loyaltyPoints": 1500
  }
]
```

#### `GET /api/reports/customers/segments`
Customer segmentation analysis.

**Response:**
```json
[
  {
    "segment": "VIP",
    "customerCount": 15,
    "totalRevenue": 50000.00,
    "averageSpent": 3333.33,
    "percentage": 10.0
  },
  {
    "segment": "Regular",
    "customerCount": 100,
    "totalRevenue": 80000.00,
    "averageSpent": 800.00,
    "percentage": 66.7
  },
  {
    "segment": "New",
    "customerCount": 20,
    "totalRevenue": 5000.00,
    "averageSpent": 250.00,
    "percentage": 13.3
  },
  {
    "segment": "Inactive",
    "customerCount": 15,
    "totalRevenue": 10000.00,
    "averageSpent": 666.67,
    "percentage": 10.0
  }
]
```

**Segmentation Rules:**
- **VIP**: Total spent >= $1000 OR purchases >= 10
- **Inactive**: No purchase in last 90 days
- **New**: Registered in last 30 days
- **Regular**: Everyone else

#### `GET /api/reports/customers/report`
Comprehensive customer analytics.

**Response:**
```json
{
  "topBuyers": [ /* ... */ ],
  "segments": [ /* ... */ ],
  "totalCustomers": 150,
  "activeCustomers": 85,
  "newCustomers": 20,
  "generatedAt": "2026-02-16T..."
}
```

**Active Customers**: Purchased in last 30 days

---

## 📥 Export Endpoints

### `GET /api/reports/export/sales`
Export sales report to file.

**Query Parameters:**
- All report query parameters +
- `format`: `pdf` | `excel` | `csv` (default: `pdf`)
- `filename`: Custom filename (optional)

**Response:**
- Binary file download with appropriate Content-Type

### `GET /api/reports/export/products`
Export product report to file.

### `GET /api/reports/export/customers`
Export customer report to file.

**Note**: PDF and Excel export currently return 501 Not Implemented. Install required libraries:
```bash
npm install pdfkit @types/pdfkit  # For PDF
npm install exceljs               # For Excel
```

CSV export is fully functional.

---

## 🔒 Security & Permissions

All endpoints require JWT authentication. Role-based access:

- **admin**: Full access to all reports
- **manager**: Full access to all reports
- **staff**: Read-only access to product/inventory reports

Endpoints automatically filter data by `companyId` from JWT token (multi-tenant isolation).

---

## 📅 Period Types

The `period` query parameter supports:

1. **daily**: Current day (00:00 - 23:59)
2. **weekly**: Last 7 days
3. **monthly**: Last 30 days (default)
4. **yearly**: Last 365 days
5. **custom**: Use `startDate` and `endDate`

---

## 💡 Usage Examples

### Get This Month's Sales Summary
```bash
GET /api/reports/sales/summary?period=monthly
```

### Get Top 20 Selling Products (Last 7 Days)
```bash
GET /api/reports/products/top-selling?period=weekly&limit=20
```

### Get Custom Period Report
```bash
GET /api/reports/sales/by-period?period=custom&startDate=2026-01-01&endDate=2026-01-31
```

### Export Sales Report to CSV
```bash
GET /api/reports/export/sales?period=monthly&format=csv&filename=january-sales
```

### Get Inventory Turnover for Electronics
```bash
GET /api/reports/inventory/turnover?categoryId=1&limit=50
```

---

## 🧪 Testing

Currently no unit tests. Recommended to add:
- Service unit tests (mock repositories)
- Controller integration tests
- Export service tests

---

## 🚀 Future Enhancements

1. **Scheduled Reports**: Automatic daily/weekly email reports
2. **Custom Dashboards**: User-configurable widgets
3. **Advanced Filters**: More granular filtering options
4. **Forecasting**: Predictive analytics for sales/inventory
5. **Real-time Updates**: WebSocket support for live data
6. **Multi-currency**: Support for different currencies
7. **Comparison Views**: Year-over-year, quarter-over-quarter
8. **Export Templates**: Customizable PDF/Excel templates

---

## 📝 Implementation Notes

### Data Calculations

**Sales Summary:**
- `totalSales`: COUNT of completed sales
- `totalRevenue`: SUM of sale.totalAmount
- `totalProfit`: SUM of (unitPrice - cost) * quantity
- `averageTicket`: totalRevenue / totalSales

**Inventory Turnover:**
- `turnoverRate`: totalSold / averageStock
- `daysOfInventory`: periodDays / turnoverRate

**Customer Segmentation:**
- Calculated based on purchase history and registration date
- Percentages based on total customer count

### Performance Considerations

- Use database indexes on:
  - `sale.createdAt`
  - `sale.companyId`
  - `product.companyId`
  - `customer.companyId`
- Consider caching for frequently accessed reports
- Use read replicas for heavy analytics queries
- Implement pagination for large datasets

### Dependencies

This module depends on:
- `@nestjs/typeorm` - Database ORM
- `class-validator` - DTO validation
- `class-transformer` - Type transformation

Optional (not yet implemented):
- `pdfkit` - PDF generation
- `exceljs` - Excel file generation

---

## 📄 Related Documentation

- [Sales Module](../sales/README-SALES.md)
- [Products Module](../products/README-PRODUCTS.md)
- [Customers Module](../customers/README-CUSTOMERS.md)
- [Inventory Module](../inventory/README-INVENTORY.md)

---

**Module Status**: ✅ Complete and production-ready (except PDF/Excel export)  
**Test Coverage**: 0% (tests pending)  
**Last Updated**: 2026-02-16
