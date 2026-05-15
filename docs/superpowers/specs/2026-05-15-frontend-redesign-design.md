# Frontend Redesign — Design Spec
**Date:** 2026-05-15  
**Status:** Approved  
**Scope:** Full app redesign — desktop-first, cashier-optimized

---

## Context & Goals

The current UI has too many clicks to complete a sale. Primary users are **cashiers on desktop terminals**. The redesign must:

1. Reduce clicks to complete a sale (core cashier workflow)
2. Make navigation fast and unambiguous
3. Modernize the visual language across all modules
4. Keep the existing stack (Next.js 14, Tailwind CSS, shadcn/ui, Radix UI)

---

## Approach: Command Center

Collapsed icon sidebar + split-pane sales view + global ⌘K search. Maximum screen real estate for selling, minimum friction to complete a transaction.

---

## Section 1 — App Shell & Navigation

### Sidebar
- **52px wide**, icon-only by default
- **Expands to 220px on hover** with text labels (CSS transition, no JS needed)
- Active module: blue background (`bg-primary`) on the icon button
- Logo at top: gradient blue-indigo square with "P", 28×28px, rounded-lg
- Nav items (top to bottom): Ventas 🛒, Dashboard 📊, Productos 📦, Inventario 🏷️, Clientes 👥, Usuarios 👤, Reportes 📈, Notificaciones 🔔
- Separator, then: Configuración ⚙️
- Bottom: user avatar (initials, gradient indigo-purple circle) — clicking opens profile/logout dropdown

### Top Bar (52px height)
- Left: breadcrumb — `POS / {Module Name}` in muted + primary text
- Center: **global ⌘K search bar** — `bg-background border border-border`, placeholder "Buscar...", keyboard shortcut badge
- Right: date context chip (dashboard only), notification bell with unread dot, theme toggle (🌙/☀️)

### Color & Theme
- **Dark mode as default** for cashier terminals (configurable via existing `next-themes`)
- Background layers: `#0f172a` (page), `#1e293b` (cards/sidebar), `#162032` (table headers)
- Primary: `#3b82f6` (blue-500)
- Success: `#10b981` (emerald-500)
- Warning: `#f59e0b` (amber-500)
- Destructive: `#ef4444` (red-500)
- Border: `#334155` (slate-700), subtle: `#1a2744`

---

## Section 2 — Sales Module (Split-Pane POS)

The sales page has no secondary navigation — it is a dedicated POS workspace.

### Product Grid (left, flex-1)
- **Category tabs** below the top bar: Todos + one tab per active category. Pill style, active = `bg-primary text-white`
- **Product cards** in a responsive grid (`grid-cols-3` default, `grid-cols-4` on wide screens)
  - Thumbnail (emoji or image), name, price in blue, stock badge
  - Stock badge: green (>5), amber (1–5), red (0 — card is dimmed and non-clickable)
  - Click to add to cart. Blue border ring on cards already in cart
- Keyboard: ⌘K opens global search pre-filtered to products

### Cart Panel (right, fixed 280px)
- Always visible on the sales page — not a drawer
- Header: "Carrito · {n} items"
- **Customer selector** (optional): searchable combobox, "Sin cliente" default
- **Cart items**: product name, `−` qty `+` controls, line total. Click item name to remove
- **Discount input**: dashed border field "🏷️ Aplicar descuento..." — accepts % or fixed amount
- **Totals**: Subtotal, IVA (16%), Total in larger weight
- **Cobrar button**: full-width, gradient blue, `font-bold`, always at the bottom
- **Efectivo shortcut**: secondary green button below Cobrar for cash-only quick flow
- **Limpiar**: tertiary outlined button to clear the cart (with confirmation)

---

## Section 3 — Payment Modal

Triggered by "Cobrar" button. Renders as a full-screen overlay (`fixed inset-0 z-50 bg-background`), not a Dialog component — nothing behind it is interactive.

### Layout
- Back link top-left (← Volver al carrito)
- Sale number top-right (#XXXXX)
- **Total prominently centered** — 40px font, bold
- **Payment method tabs**: Efectivo · Tarjeta · Mixto

### Efectivo tab
- Cash received display field (large, blue border when active)
- **Change calculated live** as user types — shown in green `bg-emerald-950` card
- **Numpad** (3×4 grid): digits 0–9, decimal point, backspace
- **Quick-amount buttons**: $40, $50, $100, Exacto (sets received = total exactly)
- **Confirm button**: full-width green gradient, label "✓ Confirmar pago  Enter ↵"
- Enter key triggers confirm when amount ≥ total

### Tarjeta tab
- Simple confirmation screen (card reader handles the transaction externally)
- "Esperando terminal..." state with spinner
- Manual confirm button for when the reader auto-approves

### Mixto tab
- Two amount fields: Efectivo + Tarjeta, must sum to total
- Same confirm button

### Success screen
- Full-screen green checkmark animation
- Sale number, total, amount received, **change** (large, prominent)
- Secondary actions: 🖨️ Imprimir · 📧 Email (both optional)
- Primary: "+ Nueva venta" button
- Auto-returns to empty sales page after **5 seconds** (countdown shown)

---

## Section 4 — Data Modules (Products, Inventory, Customers, Users)

All four modules share the same layout pattern.

### Toolbar
- Left: inline search input + filter dropdowns (Categoría, Estado, etc. — vary per module)
- Right: primary action button `+ Nuevo {entity}` (gradient blue)

### Table
- Full-width, `bg-card rounded-xl`
- Header row: `bg-slate-900`, uppercase 10px labels, letter-spacing
- Rows: 44px height, compact. Alternating subtle background on hover
- Columns vary per module but always include: checkbox, main identifier, key attributes, status badge, actions
- **Status badges**: green/amber/red pill, `text-xs font-medium`
- **Row actions** (edit ✏️, delete 🗑): small icon buttons, visible on row hover. Edit opens slide-over.
- **Bulk actions bar** appears above table when checkboxes selected

### Slide-over Form Panel
- Opens on the right side of the table (not a modal) — `fixed right-0 top-0 h-full w-72 bg-card border-l`
- Header: "Editar {entity}" or "Nuevo {entity}" + ✕ close
- Form fields: label (10px uppercase), input (bg-background border-border rounded-md)
- Active field: blue border ring
- Footer: Cancel (outlined) + Guardar (gradient blue) — sticky at bottom
- Escape key closes the panel

### Pagination
- Bottom of the table: "Mostrando X–Y de Z {entities}" left, page buttons right
- Current page: `bg-primary text-white`

### Reports Module Exception
- Tab-based layout (Ventas, Productos, Inventario, Clientes)
- Each tab: filter bar (date range, etc.) + chart + export buttons (PDF, Excel)
- No slide-over — reports are read-only

---

## Section 5 — Dashboard

### KPI Cards Row (4 cards)
- Ventas hoy, Transacciones, Ticket promedio, Clientes atendidos
- Each card: `bg-card rounded-xl`, colored left border (3px), metric value (22px bold), delta vs yesterday (↑ green / ↓ red)
- No charts inside cards

### Sales Chart
- 7-day bar chart (Recharts — already in stack or add it)
- Today's bar highlighted blue, others slate
- Toggle: Semana / Mes

### Quick Actions Panel (right, 260px)
- "Nueva venta" — primary gradient blue, full-width
- "Ajustar inventario", "Ver reporte del día", "Agregar producto" — outlined, full-width
- Links directly to the respective module/action

### Recent Sales Table
- Last 10 transactions: #ID, Cliente, Items count, Total, Estado badge
- "Ver todas →" link to Sales module
- Read-only — no actions on rows

---

## Implementation Notes

### What changes
- `components/layout/Sidebar.tsx` — rewrite for collapsed/hover-expand behavior
- `components/layout/Header.tsx` — add ⌘K search bar, restructure right section
- `app/(panel)/sales/page.tsx` — split-pane layout, product grid + cart always visible
- `components/sales/PaymentModal.tsx` — replace current modal with full-screen overlay + numpad
- `app/(panel)/dashboard/page.tsx` — KPI cards, chart, quick actions, recent sales
- All data module pages — adopt toolbar + table + slide-over pattern
- `app/globals.css` — verify dark mode CSS vars match new palette

### What stays the same
- Routing structure (`app/(panel)/...`) — no changes
- API layer (`lib/api/`) — no changes
- State management (Zustand, TanStack Query) — no changes
- Auth flow and middleware — no changes
- i18n structure — all new strings added to `es.json` / `en.json`

### New dependencies
- `recharts` — for the dashboard bar chart (not currently in package.json, needs `npm install recharts`)
- No other new dependencies needed

---

## Success Criteria

1. A cashier can complete a sale (find product → add to cart → pay in cash) in **≤4 clicks**
2. All 9 modules render correctly in dark mode
3. Payment modal is keyboard-navigable end-to-end (no mouse required)
4. Slide-over forms replace all existing modals in data modules
5. Existing tests continue to pass (no backend changes)
