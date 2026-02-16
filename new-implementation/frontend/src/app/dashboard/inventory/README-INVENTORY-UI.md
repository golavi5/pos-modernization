# Inventory Dashboard UI - Frontend Module

Complete inventory management interface for the POS system.

## Overview

This module provides a full-featured inventory management UI with:
- Real-time stock levels tracking
- Stock movements history
- Stock adjustments (IN, OUT, ADJUST, DAMAGE, RETURN)
- Warehouse management
- Low stock alerts
- Inventory statistics dashboard
- Responsive design

## Files Created

### Pages (1)
- `page.tsx` - Main inventory dashboard

### Components (4)
- `StockTable.tsx` - Current stock levels table
- `StockMovements.tsx` - Movement history timeline
- `AdjustStockModal.tsx` - Stock adjustment modal
- `InventoryFilters.tsx` - Filters and search

### Hooks (1)
- `hooks/useInventory.ts` - React Query hooks (14 hooks)

### API (1)
- `lib/api/inventory.ts` - API client (13 methods)

### Types (1)
- `types/inventory.ts` - TypeScript interfaces (11 interfaces)

**Total:** 8 files

---

## Features

### 📊 Inventory Statistics
- Total products in inventory
- Total stock units
- Low stock items count
- Out of stock items
- Active warehouses count
- Recent movements count

### 📦 Stock Management
- View current stock levels
- Filter by warehouse
- Filter by low stock
- Sort by product, quantity, last movement
- Pagination (20 items per page)
- Stock status badges (available, low, out of stock)

### 🔄 Stock Movements
- Movement history timeline
- 6 movement types:
  - **IN:** Receive stock
  - **OUT:** Remove stock
  - **ADJUST:** Set exact quantity
  - **TRANSFER:** Move between warehouses
  - **DAMAGE:** Register damaged items
  - **RETURN:** Customer returns
- Reference number tracking
- Notes per movement
- User tracking

### ⚙️ Stock Adjustments
- 5 operation types
- Visual operation selection
- Quantity input with validation
- Reference number (optional)
- Notes field (optional)
- Preview before confirmation
- Available stock validation

---

## API Integration

### Endpoints Used

```typescript
GET    /inventory/stock               // Current stock levels
GET    /inventory/stock/:product_id   // Stock by product
POST   /inventory/adjust               // Adjust stock
GET    /inventory/movements            // Movement history
GET    /inventory/movements/:id        // Single movement
GET    /inventory/warehouses           // List warehouses
POST   /inventory/warehouses           // Create warehouse
GET    /inventory/warehouses/:id       // Warehouse details
PUT    /inventory/warehouses/:id       // Update warehouse
GET    /inventory/locations/:warehouse_id // Warehouse locations
POST   /inventory/locations            // Create location
PUT    /inventory/locations/:id        // Update location
GET    /inventory/stats                // Statistics
```

### React Query Hooks (14)

```typescript
// Queries
useStock(params)            // Stock levels
useStockByProduct(id)       // Product stock
useMovements(params)        // Movements
useMovement(id)             // Single movement
useWarehouses()             // Warehouses list
useWarehouse(id)            // Single warehouse
useLocations(warehouseId)   // Warehouse locations
useInventoryStats()         // Statistics

// Mutations
useAdjustStock()            // Adjust stock
useCreateWarehouse()        // Create warehouse
useUpdateWarehouse()        // Update warehouse
useCreateLocation()         // Create location
useUpdateLocation()         // Update location
```

---

## Components API

### StockTable

```tsx
<StockTable
  stock={StockLevel[]}
  onAdjust={(stock) => void}
  isLoading={boolean}
/>
```

**Columns:**
- Product (name + SKU)
- Warehouse (name + location)
- Quantity (total + min level)
- Reserved
- Available
- Status (badge with icon)
- Action (adjust button)

### StockMovements

```tsx
<StockMovements
  movements={StockMovement[]}
  isLoading={boolean}
/>
```

**Features:**
- Timeline layout
- Color-coded by type
- Icons per movement type
- Quantity with +/- sign
- Date/time + user info
- Reference number display

### AdjustStockModal

```tsx
<AdjustStockModal
  isOpen={boolean}
  onClose={() => void}
  stock={StockLevel | null}
  onConfirm={(type, qty, ref, notes) => void}
  isLoading={boolean}
/>
```

**Movement Types:**
- IN (green, arrow up)
- OUT (red, arrow down)
- ADJUST (blue, edit icon)
- DAMAGE (orange, alert icon)
- RETURN (indigo, rotate icon)

### InventoryFilters

```tsx
<InventoryFilters
  onFilterChange={(filters) => void}
  warehouses={Warehouse[]}
/>
```

**Filters:**
- Warehouse dropdown
- Stock level (all/low/normal)
- Sort by (product/quantity/last movement)
- Sort order (ASC/DESC)

---

## Usage Flow

### 1. View Stock
```tsx
const { data, isLoading } = useStock({
  warehouse_id: 'uuid',
  low_stock: true,
  page: 1,
  pageSize: 20,
});

<StockTable
  stock={data?.data || []}
  onAdjust={handleAdjust}
/>
```

### 2. Adjust Stock
```tsx
const adjustMutation = useAdjustStock();

await adjustMutation.mutateAsync({
  product_id: 'uuid',
  warehouse_id: 'uuid',
  movement_type: 'IN',
  quantity: 100,
  reference_number: 'PO-12345',
  notes: 'Received from supplier',
});
```

### 3. View Movements
```tsx
const { data } = useMovements({
  warehouse_id: 'uuid',
  movement_type: 'IN',
  start_date: '2026-02-01',
  end_date: '2026-02-14',
});

<StockMovements movements={data?.data || []} />
```

---

## State Management

### Query Parameters
```typescript
const [stockParams, setStockParams] = useState({
  page: 1,
  pageSize: 20,
  warehouse_id: undefined,
  low_stock: undefined,
});

const [movementParams, setMovementParams] = useState({
  page: 1,
  pageSize: 10,
  movement_type: undefined,
});
```

### Modal State
```typescript
const [adjustingStock, setAdjustingStock] = useState<StockLevel | null>(null);
const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
```

---

## Movement Types

| Type | Label | Icon | Color | Use Case |
|------|-------|------|-------|----------|
| IN | Entrada | ↑ | Green | Receive from supplier |
| OUT | Salida | ↓ | Red | Ship to customer |
| ADJUST | Ajuste | ✎ | Blue | Inventory count |
| TRANSFER | Transferencia | → | Purple | Between warehouses |
| DAMAGE | Daño | ⚠ | Orange | Damaged goods |
| RETURN | Devolución | ↻ | Indigo | Customer return |

---

## Validation Rules

### Stock Adjustments
- ✅ Quantity > 0
- ✅ Movement type required
- ✅ Product and warehouse required
- ✅ OUT cannot exceed available stock
- ❌ Cannot adjust negative stock

### Warehouse
- ✅ Name required
- ✅ Code required (unique)
- ✅ Address optional

### Location
- ✅ Name required
- ✅ Code required (unique per warehouse)
- ✅ Capacity optional

---

## Integration Points

### Products Module (Task 2.2)
- Product names and SKUs
- Stock quantity display
- Low stock alerts

### Sales Module (Task 2.3)
- Auto-create OUT movements on sales
- Reserve stock on orders
- Release stock on cancellation

### Backend API (Task 2.4)
- All 13 endpoints integrated
- Multi-tenant isolation
- RBAC enforcement

---

## Performance

### Optimizations
- React Query caching (5 min)
- Pagination for large datasets
- Lazy loading tabs
- Memoized calculations

---

## Accessibility

### Keyboard Navigation
- Tab through table rows
- Enter to adjust
- Escape to close modal
- Arrow keys in dropdowns

### Screen Readers
- Semantic table markup
- ARIA labels on icons
- Status badges with text
- Alt text on movement types

---

## Future Enhancements

- [ ] Barcode scanner integration
- [ ] Export stock report (PDF/Excel)
- [ ] Import stock from CSV
- [ ] Batch stock adjustments
- [ ] Stock forecasting
- [ ] Reorder automation
- [ ] Transfer between warehouses
- [ ] Multi-location picking

---

## Dependencies

All dependencies already installed:
- `@tanstack/react-query` - Server state
- `axios` - HTTP client
- `lucide-react` - Icons
- `next` - Framework
- `react` - UI library

---

## File Structure

```
frontend/src/
├── app/
│   └── dashboard/
│       └── inventory/
│           ├── page.tsx                  # Main page
│           └── README-INVENTORY-UI.md    # This file
├── components/
│   └── inventory/
│       ├── StockTable.tsx                # Stock table
│       ├── StockMovements.tsx            # Movements
│       ├── AdjustStockModal.tsx          # Adjust modal
│       └── InventoryFilters.tsx          # Filters
├── hooks/
│   └── useInventory.ts                   # React Query
├── lib/
│   └── api/
│       └── inventory.ts                  # API client
└── types/
    └── inventory.ts                      # TypeScript
```

---

**Module Status:** ✅ Production Ready  
**Last Updated:** 2026-02-16  
**Maintainer:** OpenClaw Assistant
