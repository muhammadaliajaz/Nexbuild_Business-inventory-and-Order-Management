# Small Business Inventory and Order Management

<div align="center">
*“We Build What’s Next”*

[![Backend Tests](https://img.shields.io/badge/PHPUnit%20Tests-26%20Passed%20(132%20Assertions)-10b981?style=for-the-badge&logo=php&logoColor=white)](backend)
[![Backend Framework](https://img.shields.io/badge/Backend-Laravel%2012%20%7C%20REST%20API-f43f5e?style=for-the-badge&logo=laravel&logoColor=white)](backend)
[![Frontend Stack](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite-38bdf8?style=for-the-badge&logo=react&logoColor=white)](frontend)
[![Styling](https://img.shields.io/badge/CSS-Tailwind%20CSS%20v4-6366f1?style=for-the-badge&logo=tailwindcss&logoColor=white)](frontend)
[![Database](https://img.shields.io/badge/Database-MySQL%208.0-0ea5e9?style=for-the-badge&logo=mysql&logoColor=white)](backend)

[Business Rules & Logic](docs/BUSINESS_RULES.md) • [Database ERD & API Docs](docs/DATABASE_AND_API.md) • [Quick Setup Guide](#-quick-start--local-setup)

</div>

---

## 📌 Project Overview

This repository contains the complete, production-grade implementation of **Project 02: Small Business Inventory and Order Management**, designed to solve core operational and stock integrity challenges for a small retail/wholesale business.

The system manages the end-to-end lifecycle of:
1. **Product Catalog**: SKU uniqueness, dynamic category autocomplete, supplier assignment, cost and selling prices (PKR), and configurable low-stock thresholds.
2. **Audited Stock Movements**: Manual corrections, inward supplier purchases, and customer returns tracked with actor ID, timestamp, and mandatory reasons.
3. **Sales Order Fulfillment**: 5-stage order state machine (`draft` → `confirmed` → `packed` → `dispatched` → `delivered`, and `cancelled`).
4. **Stock Integrity & Concurrency**: Server-side stock reservation via MySQL pessimistic locking (`lockForUpdate()`), preventing overselling when two orders compete for remaining stock.
5. **Safe Cancellation**: Idempotent cancellation that safely restores stock without duplicate increments, and locks delivered orders from cancellation.
6. **Price Snapshot Freezing**: Order items store frozen unit prices at the time of order creation; future price edits never mutate past orders.
7. **Reports & Exports**: Real-time valuation (cost vs. retail in PKR), low-stock reorder deficit alerts, and UTF-8 BOM streaming CSV exports for authorized staff.

---

## 🎯 Deliverables Summary

| Deliverable | Requirement | Implementation Status | Codebase Location |
|---|---|:---:|---|
| **1. Inventory & Order Portal** | Product catalogue, product editor, stock movement history, searchable order list, and 5-stage workflow (`draft`, `confirmed`, `packed`, `dispatched`, `delivered`, `cancelled`). | ✅ **Complete** | [`frontend/src/pages/`](frontend/src/pages/) |
| **2. Database & API Documentation** | Migrations list, Entity-Relationship Diagram (ERD), and complete JSON endpoint request/response examples. | ✅ **Complete** | [`docs/DATABASE_AND_API.md`](docs/DATABASE_AND_API.md) |
| **3. Release Package** | Professional README, setup instructions, and sample fictional Pakistani business data. | ✅ **Complete** | [`README.md`](README.md) & [`DatabaseSeeder.php`](backend/database/seeders/DatabaseSeeder.php) |
| **4. Stock Integrity Tests** | Automated feature tests for concurrent overselling prevention, cancellation retry idempotency, negative stock prevention, and state transitions. | ✅ **Complete** (26/26 Passing) | [`backend/tests/Feature/`](backend/tests/Feature/) |
| **5. Reporting & CSV Export** | Low-stock deficit ledger, inventory valuation in PKR, and authorized UTF-8 BOM Excel-compatible CSV exports. | ✅ **Complete** | [`ReportsPage.tsx`](frontend/src/pages/ReportsPage.tsx) & [`ReportController.php`](backend/app/Http/Controllers/Api/ReportController.php) |

---

## ⚖️ Evaluation Criteria Alignment

| Evaluation Pillar | Weight | How Our Implementation Satisfies It |
|---|:---:|---|
| **Order and stock correctness** | **30%** | • Server calculates all financial totals and snapshot pricing; client totals are never trusted.<br>• `OrderService` reserves and decrements stock upon `confirmed` status using `lockForUpdate()`.<br>• Cancellation restores reserved inventory with an audited `cancellation_restore` log and is idempotent.<br>• Terminal statuses (`delivered`, `cancelled`) reject further transitions. |
| **Database and backend design** | **25%** | • All 8 recommended tables implemented (`users`, `products`, `suppliers`, `stock_movements`, `customers`, `orders`, `order_items`, `order_status_history`).<br>• Referential integrity guarded: Suppliers with products and products/customers with orders cannot be deleted.<br>• Indexed on unique SKUs, order numbers, foreign keys, and audit timestamps.<br>• Database seeder is 100% idempotent (`firstOrCreate`). |
| **Security and transaction handling** | **20%** | • ACID transactions wrap order creation, cancellation, and stock adjustments.<br>• `/api/login` protected by `throttle:30,1` brute-force rate limiting.<br>• API requests strictly render JSON (`shouldRenderJsonWhen`), preventing production stack trace or database error leaks.<br>• Admin self-preservation: Admins cannot delete, deactivate, or demote themselves. |
| **Frontend usability** | **15%** | • Responsive on all screens: persistent desktop sidebar, mobile sticky topbar, slide-over drawer, and modal scroll-lock.<br>• Mobile-adaptive order line items (switches to vertical card format on phones).<br>• Keyboard accessibility: `Escape` closes modals.<br>• Exact Pakistan Standard Time (`Asia/Karachi`, UTC+05:00) with clean 12-hour AM/PM formatting. |
| **Testing and documentation** | **10%** | • 26 feature tests passing (`php artisan test`, 132 assertions, 1.1s).<br>• Frontend `npm run lint` (0 errors, 0 warnings) and `npm run build` passing in ~360ms.<br>• Comprehensive documentation: [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) and [`docs/DATABASE_AND_API.md`](docs/DATABASE_AND_API.md). |

---

## 🔑 Fictional Business Demo Credentials

The platform comes pre-seeded with realistic Pakistani business entities (Computer & Tech Accessories distribution):

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin@nextech.pk` | `password123` | Full access: Catalog, Stock Adjustments, Order State Machine, Financial Valuation, CSV Exports, Team Members |
| **Staff** | `staff@nextech.pk` | `password123` | Operational access: Products, Stock Movements, Customer Order Processing (Restricted from User Management) |

### Sample Fictional Data (Pakistan Tech Distribution Hubs)
- **Suppliers**:
  - `PakTech Distribution` — Hafeez Centre, Main Boulevard, Gulberg III, Lahore
  - `Silicon Imports Karachi` — Techno City Mall, I.I. Chundrigar Road, Karachi
- **Customers**:
  - `Bilal Computers & Mobile` — Hall Road, Lahore
  - `Vertex Gaming Lounge` — Sector Y, Phase 3, DHA, Lahore
  - `Al-Madina Computer Solutions` — Uni Center, Hasrat Mohani Road, Karachi
- **Sample Catalog**: Logitech Wireless Mice, HP Keyboards, Anker GaN Chargers, Cat6 Cables, Baseus Type-C Hubs, Samsung NVMe SSDs (priced in **PKR / Rs**).

---

## 🔄 Core Order Workflow & Key Implementation Challenges

### 1. Order State Machine
```
   [DRAFT]  ────────►  [CONFIRMED]  ────────►  [PACKED]  ────────►  [DISPATCHED]  ────────►  [DELIVERED] (Terminal)
      │                     │                     │                      │
      ▼                     ▼                     ▼                      ▼
  [CANCELLED]          [CANCELLED]           [CANCELLED]            [CANCELLED] (Terminal)
(No stock change)   (Stock Restored)      (Stock Restored)       (Stock Restored)
```

### 2. Challenge: Concurrent Overselling Prevention
- **Issue**: If product stock is 3 and two customers place simultaneous orders for 2 units each, standard read-then-write code causes inventory to drop to -1.
- **Solution**: In [`OrderService.php`](backend/app/Services/OrderService.php), we acquire MySQL row-level exclusive locks:
  ```php
  $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');
  ```
  If requested quantity exceeds available stock, the transaction throws a 422 `ValidationException` and rolls back atomically.

### 3. Challenge: Cancellation Retry & Safe Restocking
- **Issue**: Retrying a cancellation request could add stock back multiple times.
- **Solution**: In [`OrderService::cancelOrder()`](backend/app/Services/OrderService.php), cancellation is protected by atomic checks:
  ```php
  if ($order->status === Order::STATUS_CANCELLED) {
      return $order; // Idempotent: already cancelled, zero extra stock added
  }
  if ($order->stock_reserved) {
      $product->increment('stock_quantity', $item->quantity);
      // Log stock_movement: cancellation_restore
      $order->update(['stock_reserved' => false, 'status' => 'cancelled']);
  }
  ```

### 4. Challenge: Historical Order Price Freezing
- **Issue**: If an accessory price changes from Rs 1,400 to Rs 1,800 next month, old invoices must not mutate.
- **Solution**: Order items persist immutable price snapshots:
  ```php
  $unitPrice = (float) $product->selling_price;
  OrderItem::create([
      'order_id' => $order->id,
      'product_id' => $product->id,
      'product_name' => $product->name,
      'product_sku' => $product->sku,
      'unit_price' => $unitPrice,
      'quantity' => $quantity,
      'subtotal' => round($unitPrice * $quantity, 2),
  ]);
  ```

---

## 📁 Suggested Database Schema

The database architecture matches all 8 suggested tables:

```text
users                     → id, name, email, password, role (admin/staff), status
suppliers                 → id, name, contact_name, email, phone, address, status
products                  → id, supplier_id, name, sku, category, cost_price, selling_price, stock_quantity, reorder_level
customers                 → id, name, company_name, email, phone, address
orders                    → id, order_number, customer_id, user_id, status, subtotal, tax_amount, total_amount, stock_reserved
order_items               → id, order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal
order_status_history      → id, order_id, user_id, from_status, to_status, comment, created_at
stock_movements           → id, product_id, user_id, type, quantity, quantity_before, quantity_after, reason, created_at
```

*For complete schema migrations, data types, indexes, and Mermaid ERD diagram, see [`docs/DATABASE_AND_API.md`](docs/DATABASE_AND_API.md).*

---

## 🚀 Quick Start & Local Setup

### System Prerequisites
- **PHP 8.2 or higher** with `pdo_mysql`, `mbstring`, `openssl`, `curl` extensions.
- **Composer 2.x**
- **Node.js 18+** & **npm**
- **MySQL 8.0+** (running locally via XAMPP or native service on port `3306`)

---

### Step 1: Backend Setup (Laravel 12 API)

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install PHP dependencies:
   ```bash
   composer install
   ```

3. Configure environment file:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. Verify database and timezone settings in `backend/.env`:
   ```env
   APP_NAME="NexTech Inventory"
   APP_ENV=local
   APP_DEBUG=true
   APP_URL=http://localhost:8000
   APP_TIMEZONE=Asia/Karachi
   DB_TIMEZONE="+05:00"

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=inventory_management
   DB_USERNAME=root
   DB_PASSWORD=
   ```

5. Run database migrations and seed realistic data:
   ```bash
   php artisan migrate --seed
   ```
   *(The seeder is idempotent and safe to run multiple times without creating duplicate records).*

6. Start the API server:
   ```bash
   php artisan serve --port=8000
   # API running at http://127.0.0.1:8000
   ```

---

### Step 2: Frontend Setup (React 19 + TypeScript + Vite)

1. Open a second terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend packages:
   ```bash
   npm install
   ```

3. Start Vite development server:
   ```bash
   npm run dev
   # Client running at http://localhost:5173
   ```

4. Open `http://localhost:5173` in your browser and log in with:
   - **Admin**: `admin@nextech.pk` / `password123`
   - **Staff**: `staff@nextech.pk` / `password123`

---

## 🧪 Automated Stock Integrity Test Suite

The test suite thoroughly evaluates concurrency, overselling prevention, cancellation retries, and data policies.

To run all feature tests:
```bash
cd backend
php artisan test
```

### Test Suite Execution Output (26/26 Passing)

```text
 PASS  Tests\Feature\AuthTest
  ✓ user can login with valid credentials                                  0.33s
  ✓ login fails with invalid credentials                                   0.02s
  ✓ unauthenticated request to protected route is rejected                 0.02s
  ✓ authenticated user can retrieve own profile                            0.02s
  ✓ staff cannot access admin user management                              0.02s
  ✓ admin can access user management                                       0.02s
  ✓ health check endpoint returns success                                  0.02s

 PASS  Tests\Feature\DashboardAndUserTest
  ✓ dashboard stats returns aggregated metrics                             0.03s
  ✓ admin can manage users                                                 0.03s

 PASS  Tests\Feature\OrderManagementTest
  ✓ server calculates totals and snapshots prices                          0.03s
  ✓ cannot order more stock than available (OVERSELL PREVENTION)           0.02s
  ✓ safe cancellation restores stock and is idempotent (CANCELLATION RETRY)0.03s
  ✓ delivered order cannot be cancelled (TERMINAL STATE LOCK)              0.04s
  ✓ order status transitions are strictly validated (STATE MACHINE)        0.03s

 PASS  Tests\Feature\ProductTest
  ✓ can create product with initial stock movement                         0.02s
  ✓ duplicate sku is rejected                                              0.02s
  ✓ updating product preserves controlled stock quantity                   0.02s
  ✓ low stock filter returns only low stock products                       0.02s

 PASS  Tests\Feature\ReportTest
  ✓ low stock report data                                                  0.02s
  ✓ csv export endpoints stream valid csv                                  0.02s

 PASS  Tests\Feature\StockMovementTest
  ✓ manual stock adjustment creates movement with actor and reason         0.02s
  ✓ adjustment cannot reduce stock below zero (NEGATIVE STOCK GUARD)       0.02s
  ✓ stock adjustment requires mandatory reason                             0.02s

 PASS  Tests\Feature\SupplierCustomerTest
  ✓ can create and list suppliers                                          0.02s
  ✓ cannot delete supplier with associated products (REFERENTIAL GUARD)    0.02s
  ✓ can create and search customers                                        0.02s

Tests:    26 passed (132 assertions)
Duration: 1.11s
```

Frontend Verification:
```bash
cd frontend
npm run lint      # 0 errors, 0 warnings
npm run build     # Production bundle compiles in ~350ms
```

---

## 📡 API Endpoints Reference Summary

All endpoints require `Authorization: Bearer <token>` except `/api/login` and `/api/health`.

| Method | Endpoint | Description | Role Scope |
|---|---|---|:---:|
| `GET` | `/api/health` | Health check probe returning operational status | Public |
| `POST` | `/api/login` | User authentication (rate-limited via `throttle:30,1`) | Public |
| `GET` | `/api/me` | Fetch authenticated user profile & role | Authenticated |
| `POST` | `/api/logout` | Revoke current Sanctum token | Authenticated |
| `GET` | `/api/dashboard/stats` | Aggregated revenue, cost value, pending orders count | Authenticated |
| `GET` | `/api/products` | Paginated product catalogue with filters | Authenticated |
| `POST` | `/api/products` | Create product with automatic initial stock movement | Authenticated |
| `GET` | `/api/products/{id}` | Product details with recent stock movements | Authenticated |
| `PUT` | `/api/products/{id}` | Update product metadata (direct stock edits blocked) | Authenticated |
| `DELETE` | `/api/products/{id}` | Delete product (blocked if orders exist) | Authenticated |
| `GET` | `/api/products/low-stock` | Retrieve products at or below reorder threshold | Authenticated |
| `GET` | `/api/products/categories` | Distinct categories list for autocomplete | Authenticated |
| `GET` | `/api/orders` | Paginated orders list with search, status & date filters | Authenticated |
| `POST` | `/api/orders` | Create order with price snapshot & concurrency reservation | Authenticated |
| `GET` | `/api/orders/{id}` | Full order details, line items, and transition timeline | Authenticated |
| `PATCH` | `/api/orders/{id}/status`| Advance order status (`draft` → `confirmed` → `packed`...) | Authenticated |
| `POST` | `/api/orders/{id}/cancel`| Cancel order and restore reserved warehouse stock | Authenticated |
| `GET` | `/api/stock-movements` | Query immutable stock movement ledger | Authenticated |
| `POST` | `/api/stock-movements` | Record stock adjustment (requires mandatory reason) | Authenticated |
| `GET` | `/api/suppliers` | List/search suppliers (blocked from delete if products exist) | Authenticated |
| `GET` | `/api/customers` | List/search customers (blocked from delete if orders exist) | Authenticated |
| `GET` | `/api/reports/low-stock` | Low stock alert deficit report | Authenticated |
| `GET` | `/api/reports/inventory-summary` | Inventory valuation summary (cost basis vs. retail) | Authenticated |
| `GET` | `/api/reports/export/low-stock` | Stream low stock CSV export (Excel compatible) | Authenticated |
| `GET` | `/api/reports/export/orders` | Stream orders CSV export | Authenticated |
| `GET` | `/api/reports/export/stock-movements` | Stream stock movements ledger CSV export | Authenticated |
| `GET` | `/api/users` | List team members | Admin Only |
| `POST` | `/api/users` | Create user account | Admin Only |
| `PUT` | `/api/users/{id}` | Update user account (Admin self-preservation active) | Admin Only |
| `DELETE` | `/api/users/{id}` | Delete user account (Admin cannot delete self) | Admin Only |

*For complete curl commands and request/response payloads, see [`docs/DATABASE_AND_API.md`](docs/DATABASE_AND_API.md).*

---

## 🔒 Security Hardening

- **Brute Force Protection**: `/api/login` endpoint is rate limited via `throttle:30,1`.
- **Zero Information Leaks**: Configured `$exceptions->shouldRenderJsonWhen()` in `backend/bootstrap/app.php` so production instances never expose raw SQL queries or HTML debug stack traces.
- **Admin Self-Preservation**: Built-in authorization checks prevent the active administrator from accidentally deleting, deactivating, or demoting their own account.
- **Safe Production Builds**: Quick-fill demo credentials in the login page are wrapped in `{import.meta.env.DEV && ...}` so they are completely eliminated from production client bundles (`npm run build`).

---

## 📚 Documentation Index
- **[Business Rules & Order Logic](docs/BUSINESS_RULES.md)**: Formal specification of state transitions, stock formulas, discount policies, and snapshot pricing.
- **[Database Schema & API Documentation](docs/DATABASE_AND_API.md)**: Migrations list, Mermaid ERD diagram, and endpoint payload reference.

---

<div align="center">
<strong>Small Business Inventory and Order Management (Project 02)</strong><br>
Prepared for Technical Assessment & Submission to <strong>NexBuild</strong>
</div>
