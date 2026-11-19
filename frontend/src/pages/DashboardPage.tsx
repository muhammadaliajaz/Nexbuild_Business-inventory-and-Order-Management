import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api';
import { OrderStatusBadge, StockStatusBadge } from '../components/StatusBadge';
import { formatRelativeTime } from '../utils/date';
import type { DashboardData } from '../types';
import type { NavTab } from '../components/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<DashboardData>('/dashboard/stats');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-lg border border-slate-200">
        Could not load dashboard data.
        <button
          type="button"
          onClick={() => fetchDashboard()}
          className="ml-2 text-slate-900 hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  const { metrics, low_stock_items, recent_orders } = data;
  const costVal = Number(metrics.inventory_cost_value || 0);
  const revenueVal = Number(metrics.total_revenue || 0);

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overview of inventory status and customer orders.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* 4 Clean Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Total Revenue</div>
          <div className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1 font-mono truncate">
            Rs {revenueVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Inventory Cost Value</div>
          <div className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1 font-mono truncate">
            Rs {costVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Pending Orders</div>
          <div className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
            {metrics.pending_orders}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Low Stock Items</div>
          <div className={`text-xl sm:text-2xl font-semibold mt-1 ${metrics.low_stock_count > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {metrics.low_stock_count}
          </div>
        </div>
      </div>

      {/* 2 Clean Side-by-side Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">Recent Orders</h2>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              View all orders →
            </button>
          </div>

          {recent_orders.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No orders placed yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent_orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  onClick={() => onNavigate('orders')}
                  className="p-3 px-4 flex items-center justify-between text-sm hover:bg-slate-50/60 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold font-mono text-slate-900">{order.order_number}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{order.customer?.name}</span>
                      <span>•</span>
                      <span className="text-slate-400 font-mono text-[11px]">{formatRelativeTime(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right font-medium text-slate-900 font-mono text-sm">
                    Rs {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">Low Stock Items</h2>
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              View catalog →
            </button>
          </div>

          {low_stock_items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No products currently low on stock.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {low_stock_items.slice(0, 5).map((item) => (
                <div key={item.id} className="p-3 px-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      {item.sku} • Reorder level: {item.reorder_level}
                    </div>
                  </div>
                  <div>
                    <StockStatusBadge
                      quantity={item.stock_quantity}
                      reorderLevel={item.reorder_level}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
