import React, { useEffect, useState, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api';

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  category?: string;
  stock_quantity: number;
  reorder_level: number;
  deficit: number;
  cost_price: number | string;
  selling_price: number | string;
  stock_value: number;
}

interface LowStockReportResponse {
  count: number;
  total_deficit: number;
  total_valuation: number;
  items: LowStockItem[];
}

interface CategorySummary {
  category_name: string;
  product_count: number;
  total_units: number;
  cost_value: number;
  retail_value: number;
}

interface InventorySummaryResponse {
  totals: {
    total_products: number;
    total_units: number;
    total_cost_value: number;
    total_retail_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
  };
  categories: CategorySummary[];
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'low_stock' | 'exports'>('inventory');

  const [inventorySummary, setInventorySummary] = useState<InventorySummaryResponse | null>(null);
  const [lowStockReport, setLowStockReport] = useState<LowStockReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [ordersDateFrom, setOrdersDateFrom] = useState('');
  const [ordersDateTo, setOrdersDateTo] = useState('');
  const [ordersStatus, setOrdersStatus] = useState('');

  const [movementsDateFrom, setMovementsDateFrom] = useState('');
  const [movementsDateTo, setMovementsDateTo] = useState('');
  const [movementsType, setMovementsType] = useState('');

  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchReportsData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, lowRes] = await Promise.all([
        api.get<InventorySummaryResponse>('/reports/inventory-summary'),
        api.get<LowStockReportResponse>('/reports/low-stock'),
      ]);
      setInventorySummary(invRes);
      setLowStockReport(lowRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const handleDownload = async (endpoint: string, filename: string, key: string) => {
    try {
      setDownloading(key);
      await api.download(endpoint, filename);
    } catch (err) {
      console.error(err);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const downloadLowStockCsv = () => {
    handleDownload('/reports/export/low-stock', 'low_stock_report.csv', 'low-stock');
  };

  const downloadOrdersCsv = () => {
    const params = new URLSearchParams();
    if (ordersDateFrom) params.append('date_from', ordersDateFrom);
    if (ordersDateTo) params.append('date_to', ordersDateTo);
    if (ordersStatus) params.append('status', ordersStatus);

    const query = params.toString() ? `?${params.toString()}` : '';
    handleDownload(`/reports/export/orders${query}`, 'orders_export.csv', 'orders');
  };

  const downloadMovementsCsv = () => {
    const params = new URLSearchParams();
    if (movementsDateFrom) params.append('date_from', movementsDateFrom);
    if (movementsDateTo) params.append('date_to', movementsDateTo);
    if (movementsType) params.append('type', movementsType);

    const query = params.toString() ? `?${params.toString()}` : '';
    handleDownload(`/reports/export/stock-movements${query}`, 'stock_movements.csv', 'movements');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const totals = inventorySummary?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reports & CSV Exports</h1>
          <p className="text-sm text-slate-600">
            Analyze stock valuation, monitor deficit inventory, and generate CSV data dumps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadLowStockCsv}
            disabled={downloading === 'low-stock'}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs"
          >
            {downloading === 'low-stock' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-slate-500" />
            )}
            Low Stock CSV
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-4 sm:gap-6 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Valuation & Categories
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('low_stock')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'low_stock'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Low Stock Alert List</span>
          {(lowStockReport?.count ?? 0) > 0 && (
            <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {lowStockReport?.count}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('exports')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'exports'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          CSV Export Center
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Total Units in Stock</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totals?.total_units.toLocaleString() ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Across {totals?.total_products} unique SKUs
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Inventory Cost Basis</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                Rs {totals?.total_cost_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Wholesale capital value</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Projected Retail Value</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                Rs {totals?.total_retail_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Catalog price sum</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Low Stock Products</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {totals?.low_stock_count ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {totals?.out_of_stock_count ?? 0} out of stock
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Category Breakdown</h3>
                <p className="text-xs text-slate-500">
                  Inventory units and monetary valuations aggregated by category.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-center">Products</th>
                    <th className="py-2.5 px-4 text-right">Units</th>
                    <th className="py-2.5 px-4 text-right">Cost Value</th>
                    <th className="py-2.5 px-4 text-right">Retail Value</th>
                    <th className="py-2.5 px-4 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inventorySummary?.categories.map((cat) => {
                    const margin =
                      cat.retail_value > 0
                        ? (((cat.retail_value - cat.cost_value) / cat.retail_value) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <tr key={cat.category_name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {cat.category_name}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600">
                          {cat.product_count}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {Number(cat.total_units || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          Rs {Number(cat.cost_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          Rs {Number(cat.retail_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'low_stock' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Low Stock & Out-of-Stock Items</h3>
                <p className="text-xs text-slate-500">
                  Items currently at or below minimum defined reorder threshold.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadLowStockCsv}
                disabled={downloading === 'low-stock'}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {downloading === 'low-stock' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Export Low Stock List (.CSV)
              </button>
            </div>

            {!lowStockReport?.items || lowStockReport.items.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-medium text-slate-800">Healthy Inventory Levels</h3>
                <p className="text-sm text-slate-500 mt-1">
                  All products currently meet or exceed their reorder threshold quantities.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-medium text-slate-500">
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">In Stock</th>
                      <th className="py-2.5 px-4 text-right">Reorder Level</th>
                      <th className="py-2.5 px-4 text-right">Deficit</th>
                      <th className="py-2.5 px-4 text-right">Est. Restock Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lowStockReport.items.map((item) => {
                      const restockCost = item.deficit * Number(item.cost_price);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.name}</td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-600">{item.sku}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{item.category || 'General'}</td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-bold ${
                                item.stock_quantity <= 0 ? 'text-rose-600' : 'text-amber-600'
                              }`}
                            >
                              {item.stock_quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">{item.reorder_level}</td>
                          <td className="py-3 px-4 text-right font-semibold text-rose-600">
                            +{item.deficit}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900">
                            Rs {restockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'exports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Orders CSV</h3>
                <p className="text-xs text-slate-500">
                  Export customer orders with line totals, items count, and order statuses.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={ordersDateFrom}
                    onChange={(e) => setOrdersDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={ordersDateTo}
                    onChange={(e) => setOrdersDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Filter by Status
                </label>
                <select
                  value={ordersStatus}
                  onChange={(e) => setOrdersStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={downloadOrdersCsv}
                  disabled={downloading === 'orders'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {downloading === 'orders' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export Orders (.CSV)
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Stock Movements CSV</h3>
                <p className="text-xs text-slate-500">
                  Export chronological inventory adjustments, orders, and restocks.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={movementsDateFrom}
                    onChange={(e) => setMovementsDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={movementsDateTo}
                    onChange={(e) => setMovementsDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Movement Type
                </label>
                <select
                  value={movementsType}
                  onChange={(e) => setMovementsType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Movement Types</option>
                  <option value="initial">Initial Stock</option>
                  <option value="manual_adjustment">Manual Adjustment</option>
                  <option value="purchase_received">Purchase Received</option>
                  <option value="order_fulfillment">Order Fulfillment</option>
                  <option value="order_cancellation_restock">Order Restock</option>
                  <option value="return">Return</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={downloadMovementsCsv}
                  disabled={downloading === 'movements'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {downloading === 'movements' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export Stock Movements (.CSV)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
