import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { formatDate, formatTime } from '../utils/date';
import type { StockMovement, Product, PaginatedResponse } from '../types';

export const InventoryPage: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formProductId, setFormProductId] = useState('');
  const [formType, setFormType] = useState('manual_adjustment');
  const [formQuantity, setFormQuantity] = useState('');
  const [formReason, setFormReason] = useState('');

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        product_id: selectedProduct,
        type: selectedType,
        date_from: dateFrom,
        date_to: dateTo,
      });

      const res = await api.get<PaginatedResponse<StockMovement>>(`/stock-movements?${params.toString()}`);
      setMovements(res.data);
      setTotalPages(res.last_page);
      setTotalCount(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedProduct, selectedType, dateFrom, dateTo]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get<{ data: Product[] }>('/products?all=true');
      setProducts(res.data);
      setFormProductId((prev) => prev || (res.data[0] ? res.data[0].id.toString() : ''));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleOpenModal = () => {
    setFormQuantity('');
    setFormReason('');
    setFormType('manual_adjustment');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      await api.post('/stock-movements', {
        product_id: Number(formProductId),
        type: formType,
        quantity: Number(formQuantity),
        reason: formReason.trim(),
      });

      setSuccessMessage('Stock adjustment recorded successfully');
      setIsModalOpen(false);
      fetchMovements();
      fetchProducts();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to record adjustment');
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Stock Movements</h2>
          <p className="text-xs text-slate-500 mt-0.5">Chronological inventory audit log, adjustments, and order fulfillments</p>
        </div>
        <button
          type="button"
          onClick={handleOpenModal}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors self-start sm:self-auto cursor-pointer"
        >
          Record Adjustment
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search product or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <select
          value={selectedProduct}
          onChange={(e) => {
            setSelectedProduct(e.target.value);
            setPage(1);
          }}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-700"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setPage(1);
          }}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-700"
        >
          <option value="">All Movement Types</option>
          <option value="initial">Initial Stock</option>
          <option value="manual_adjustment">Manual Adjustment</option>
          <option value="purchase_received">Purchase Received</option>
          <option value="order_fulfillment">Order Fulfillment</option>
          <option value="order_cancellation_restock">Order Restock</option>
          <option value="return">Return</option>
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="py-1 px-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="py-1 px-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 text-xs font-medium text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-center">Change</th>
                <th className="py-2.5 px-4 text-center">Before</th>
                <th className="py-2.5 px-4 text-center">After</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading movements...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No stock movements found matching filter criteria.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-slate-800">{formatDate(m.created_at)}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{formatTime(m.created_at)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{m.product?.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{m.product?.sku}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                          m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantity > 0 ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5" /> +{m.quantity}
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3.5 h-3.5" /> {m.quantity}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      {m.quantity_before}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                      {m.quantity_after}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                      {m.user?.name ?? 'System'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-sm truncate" title={m.reason}>
                      {m.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          lastPage={totalPages}
          total={totalCount}
          onPageChange={setPage}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Adjustment"
      >
        {formError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Product *
            </label>
            <select
              required
              value={formProductId}
              onChange={(e) => setFormProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Current Stock: {p.stock_quantity}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Adjustment Type *
              </label>
              <select
                required
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual_adjustment">Manual Adjustment</option>
                <option value="purchase_received">Purchase Received</option>
                <option value="return">Customer Return</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity Change (+ or -) *
              </label>
              <input
                type="number"
                required
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder="e.g. +10 or -3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Positive number to add stock, negative to deduct.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason *
            </label>
            <textarea
              required
              rows={3}
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="e.g. Physical inventory count discrepancy, damaged item..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Stock Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

