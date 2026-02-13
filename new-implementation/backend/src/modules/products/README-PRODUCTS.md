# Product Catalog API Module

This module provides comprehensive product catalog functionality for the POS system, including full CRUD operations, category management, and inventory tracking.

## Endpoints

### Product Operations

#### GET /products
List products with pagination and filtering options.

**Parameters:**
- `offset`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 10, max: 100)
- `search`: Search by product name, SKU, or barcode
- `category_id`: Filter by category ID
- `sort`: Sort field (default: created_at)
- `order`: Sort order (ASC or DESC, default: DESC)
- `is_active`: Filter by active status (default: true)

**Example:**
```bash
curl -X GET \
  "http://localhost:3000/products?offset=0&limit=10&search=laptop&is_active=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "company_id": "uuid-string",
      "name": "Product Name",
      "description": "Product Description",
      "sku": "ABC123",
      "barcode": "1234567890123",
      "category_id": "uuid-string",
      "price": 99.99,
      "cost": 79.99,
      "stock_quantity": 50,
      "reorder_level": 5,
      "tax_rate": 19.00,
      "is_active": true,
      "image_url": "https://example.com/image.jpg",
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-01-01T00:00:00.000Z",
      "deleted_at": null
    }
  ],
  "meta": {
    "total": 1,
    "offset": 0,
    "limit": 10,
    "hasMore": false
  }
}
```

#### GET /products/:id
Get a single product by ID.

**Example:**
```bash
curl -X GET \
  "http://localhost:3000/products/product-uuid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### POST /products
Create a new product. Requires 'manager' or 'inventory_manager' role.

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "sku": "ABC123",
  "barcode": "1234567890123",
  "category_id": "category-uuid",
  "price": 99.99,
  "cost": 79.99,
  "stock_quantity": 50,
  "reorder_level": 5,
  "tax_rate": 19.00,
  "is_active": true,
  "image_url": "https://example.com/image.jpg"
}
```

**Example:**
```bash
curl -X POST \
  "http://localhost:3000/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "New Product",
    "sku": "ABC123",
    "price": 99.99,
    "stock_quantity": 50,
    "reorder_level": 5,
    "tax_rate": 19.00,
    "company_id": "company-uuid",
    "created_by": "user-uuid"
  }'
```

#### PUT /products/:id
Update an existing product. Requires 'manager' or 'inventory_manager' role.

**Example:**
```bash
curl -X PUT \
  "http://localhost:3000/products/product-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Product Name",
    "price": 89.99
  }'
```

#### DELETE /products/:id
Soft delete a product. Requires 'manager' role.

**Example:**
```bash
curl -X DELETE \
  "http://localhost:3000/products/product-uuid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Category Operations

#### GET /products/categories
List all categories for the user's company.

**Example:**
```bash
curl -X GET \
  "http://localhost:3000/products/categories" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
[
  {
    "id": "uuid-string",
    "company_id": "uuid-string",
    "name": "Electronics",
    "description": "Electronic devices",
    "parent_id": null,
    "is_active": true,
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z",
    "deleted_at": null
  }
]
```

#### POST /products/categories
Create a new category. Requires 'manager' role.

**Request Body:**
```json
{
  "name": "New Category",
  "description": "Category description",
  "parent_id": "parent-category-uuid"
}
```

**Example:**
```bash
curl -X POST \
  "http://localhost:3000/products/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices",
    "company_id": "company-uuid"
  }'
```

#### PUT /products/categories/:id
Update an existing category. Requires 'manager' role.

**Example:**
```bash
curl -X PUT \
  "http://localhost:3000/products/categories/category-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Category Name",
    "description": "Updated description"
  }'
```

## Security

- All endpoints require JWT authentication
- Write operations require appropriate roles:
  - `manager` or `inventory_manager` for product creation/update
  - `manager` for product deletion and category management
- Multi-tenant data isolation ensures users only access their company's data
- SKU and barcode uniqueness is enforced per company

## Validation

- SKU format: Only uppercase letters and numbers
- Price and cost must be non-negative
- Stock quantity must be non-negative
- Tax rate must be between 0 and 100
- Image URL must be valid if provided

## Features

- Multi-tenant isolation
- SKU and barcode uniqueness validation
- Stock quantity tracking
- Reorder level alerts
- Price and cost management
- Tax rate support
- Product images
- Soft delete support
- Comprehensive search and filtering
- Pagination support