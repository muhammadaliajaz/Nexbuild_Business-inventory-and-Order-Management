export type UserRole = 'admin' | 'staff';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
}

export interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  products_count?: number;
  created_at?: string;
}

export interface Customer {
  id: number;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  orders_count?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  supplier_id?: number | null;
  supplier?: Supplier;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  cost_price: number | string;
  selling_price: number | string;
  stock_quantity: number;
  reorder_level: number;
  status: 'active' | 'inactive';
  is_low_stock?: boolean;
}

export type OrderStatus = 'draft' | 'confirmed' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  product?: Product;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  user_id?: number;
  from_status?: string | null;
  to_status: string;
  comment?: string | null;
  created_at: string;
  user?: { id: number; name: string };
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer?: Customer;
  user_id?: number;
  user?: { id: number; name: string };
  status: OrderStatus;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  stock_reserved: boolean;
  notes?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  items?: OrderItem[];
  items_count?: number;
  status_histories?: OrderStatusHistory[];
}

export interface StockMovement {
  id: number;
  product_id: number;
  product?: Product;
  user_id?: number;
  user?: { id: number; name: string };
  type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  created_at: string;
}

export interface DashboardMetrics {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_suppliers: number;
  total_customers: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  inventory_cost_value: number;
  inventory_retail_value: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  low_stock_items: Product[];
  recent_orders: Order[];
  recent_movements: StockMovement[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

