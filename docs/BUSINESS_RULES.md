# Business Rules & System Specifications

## 1. System Overview & Core Scope
- **Application**: NexBuild Inventory & Order Management System.
- **Business Domain**: Tech & Computer Accessories distribution and retail (chargers, audio, peripherals, cables, stands).
- **Primary Operating Currency**: Pakistani Rupee (PKR, formatted as `Rs`).
- **Precision**: Monetary figures maintain two decimal places (`decimal(12, 2)` or `decimal(10, 2)`). Stock counts are strictly non-negative integers (`INTEGER`).

---

## 2. Authentication & Access Control

### 2.1 User Roles
- **Administrator (`admin`)**:
  - Full system access.
  - Can create, view, update, and delete staff and administrator user accounts.
  - Can configure system settings, view all financial valuation reports, and execute CSV exports.
- **Staff (`staff`)**:
  - Operational access: products, suppliers, customers, inventory stock movements, and customer orders.
  - **Restricted**: Cannot access User Management (`/api/users` routes return `403 Forbidden`).

### 2.2 Account Self-Preservation Rules
- An authenticated administrator **cannot delete their own user account**.
- An authenticated administrator **cannot demote their own role** from `admin` to `staff`.
- An authenticated administrator **cannot deactivate their own account** (`status: inactive`).

### 2.3 Production Security
- Demo login buttons and pre-filled credentials must be restricted strictly to local development (`import.meta.env.DEV`). Production builds must never expose pre-filled administrative credentials.

---

## 3. Product & Catalog Management

### 3.1 Product Identity
- Each product must possess a globally unique Stock Keeping Unit (`sku`), formatted in uppercase alphanumeric characters (e.g., `CHG-GAN-65W`).
- A product requires a `name`, `cost_price` ($\ge 0$), and `selling_price` ($\ge 0$).
- Optionally associated with an active `supplier_id` and `category`.

### 3.2 Controlled Stock Invariant
- **Direct Stock Mutation Prohibited**: The product update endpoint (`PUT /api/products/{id}`) strictly forbids updating `stock_quantity`.
- Stock levels may **only** change via:
  1. Initial stock registration at product creation (`StockMovement::TYPE_INITIAL`).
  2. Manual inventory adjustments with an audited reason (`StockMovementController::store`).
  3. Order confirmation allocation (`OrderService::reserveStockForOrder`).
  4. Order cancellation restocking (`OrderService::cancelOrder`).

---

## 4. Inventory Adjustments & Audit Trail

### 4.1 Stock Movement Integrity
- Every stock change creates an immutable `stock_movements` record capturing:
  - `product_id`, `user_id` (actor), `type`, `quantity` ($\pm$), `quantity_before`, `quantity_after`, `reference_type`, `reference_id`, and `reason`.
- **Non-Negative Stock Floor**: An adjustment that would reduce `stock_quantity` below `0` is strictly rejected with HTTP `422 Unprocessable Entity`.
- **Zero Change Prohibited**: An adjustment with `quantity = 0` is rejected with HTTP `422`.
- **Mandatory Reason**: Every manual adjustment requires a descriptive `reason` (minimum 3 characters, non-whitespace).

### 4.2 Movement Types
- `initial`: Registered during initial product intake.
- `manual_adjustment`: Cycle count discrepancies, physical audit corrections.
- `purchase_received`: Inbound shipments received from suppliers.
- `order_fulfillment`: Stock reserved/deducted upon customer sales order confirmation.
- `order_cancellation_restock`: Stock restored upon order cancellation.
- `return`: Damaged goods return or customer return.

---

## 5. Sales Orders & Order Lifecycle

### 5.1 Order Lifecycle State Machine
Orders transition strictly through the following directed acyclic flow:

```
[Draft] ----------> [Confirmed] ----------> [Packed] ----------> [Dispatched] ----------> [Delivered]
   |                    |                      |                      |                      |
   v                    v                      v                      v                      v
[Cancelled]         [Cancelled]            [Cancelled]            [Cancelled]           (Terminal)
 (No Restock)        (Restocked)            (Restocked)            (Restocked)         (Cannot Cancel)
```

#### Allowed State Transitions:
- `draft` $\rightarrow$ `confirmed` | `cancelled`
- `confirmed` $\rightarrow$ `packed` | `cancelled`
- `packed` $\rightarrow$ `dispatched` | `cancelled`
- `dispatched` $\rightarrow$ `delivered` | `cancelled`
- `delivered` $\rightarrow$ None (Terminal; cannot be modified or cancelled).
- `cancelled` $\rightarrow$ None (Terminal; cannot be re-opened).

Any transition outside this table is rejected with HTTP `422 Unprocessable Entity`.

### 5.2 Stock Reservation & Restocking Invariant
- **Draft Orders**: Do not allocate or decrement inventory (`stock_reserved = false`). Stock remains freely available for other orders.
- **Order Confirmation**:
  - Occurs on order creation (if status is `confirmed`) or when advancing from `draft` $\rightarrow$ `confirmed`.
  - Atomically locks product rows (`lockForUpdate`).
  - Verifies `product.stock_quantity >= item.quantity` for each item. If any item is insufficient, the transaction rolls back with HTTP `422`.
  - Atomically deducts quantity from `products.stock_quantity`.
  - Creates a `StockMovement` of type `order_fulfillment` with negative quantity.
  - Sets `order.stock_reserved = true` and timestamps `confirmed_at`.
- **Order Cancellation**:
  - Can be initiated while status is `draft`, `confirmed`, `packed`, or `dispatched`.
  - **Delivered orders cannot be cancelled** (rejected with HTTP `422`).
  - If `stock_reserved == true`:
    - Atomically increments `products.stock_quantity` by `item.quantity` for all order items.
    - Creates a `StockMovement` of type `order_cancellation_restock` with positive quantity.
    - Sets `order.stock_reserved = false`.
  - Sets `order.status = 'cancelled'` and timestamps `cancelled_at`.
  - **Idempotency**: Repeated cancellation requests on an already-cancelled order succeed safely with HTTP `200` without double-restocking.

### 5.3 Pricing & Financial Freezing
- **Historical Snapshot**: At the moment an order is created, the unit price for each item is copied from `product.selling_price`. Future price edits to the product catalog do **not** affect historical order item line subtotals.
- **Financial Calculations**:
  - $\text{Line Subtotal} = \text{unit\_price} \times \text{quantity}$
  - $\text{Order Subtotal} = \sum \text{Line Subtotals}$
  - $\text{Tax Amount} = \text{round}\left(\text{Subtotal} \times \frac{\text{tax\_rate}}{100}, 2\right)$
  - $\text{Discount Amount} = \min(\text{Subtotal}, \max(0, \text{discount\_amount}))$ (discount cannot exceed subtotal).
  - $\text{Total Amount} = \text{round}(\text{Subtotal} + \text{Tax Amount} - \text{Discount Amount}, 2)$

---

## 6. Reports & Valuation Formulas

### 6.1 Low Stock Detection
- A product is classified as Low Stock if:
  $$\text{stock\_quantity} \le \text{reorder\_level}$$
- **Deficit**:
  $$\text{deficit} = \max(0, \text{reorder\_level} - \text{stock\_quantity})$$
- **Estimated Restock Cost**:
  $$\text{restock\_cost} = \text{deficit} \times \text{cost\_price}$$

### 6.2 Inventory Valuation
- **Total Units**: $\sum \text{stock\_quantity}$
- **Cost Basis (Wholesale Capital Value)**: $\sum (\text{cost\_price} \times \text{stock\_quantity})$
- **Projected Retail Value**: $\sum (\text{selling\_price} \times \text{stock\_quantity})$
- **Category Gross Margin %**:
  $$\text{Margin \%} = \frac{\text{Retail Value} - \text{Cost Value}}{\text{Retail Value}} \times 100$$

### 6.3 CSV Data Streaming
- Export streams use UTF-8 with Byte Order Mark (`\xEF\xBB\xBF`) for compatibility with Microsoft Excel across all operating systems.
- Database results are chunked (200 records per chunk) to eliminate memory exhaustion.

---

## 7. Database Seeding & Idempotency
- Seeders must be **100% idempotent**:
  - Users, suppliers, customers, and products use `updateOrCreate` or `firstOrCreate` keyed on unique identifiers (`email`, `sku`, `order_number`).
  - Stock movements and order items verify existence before insertion.
  - Running `php artisan db:seed` multiple times consecutively must execute cleanly without SQL duplicate key violations or duplicate records.

