import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Trash,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  XCircle,
  Check,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { OrderStatusBadge } from '../components/StatusBadge';
import { formatDate, formatTime, formatDateTime } from '../utils/date';
import type {
  Order,
  Customer,
  Product,
  PaginatedResponse,
  OrderStatus,
} from '../types';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderStatus, setOrderStatus] = useState<'draft' | 'confirmed'>('confirmed');
  const [taxRate, setTaxRate] = useState('10');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [orderLines, setOrderLines] = useState<Array<{ product_id: string; quantity: number }>>([
    { product_id: '', quantity: 1 },
  ]);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
      });

      const res = await api.get<PaginatedResponse<Order>>(`/orders?${params.toString()}`);
      setOrders(res.data);
      setTotalPages(res.last_page);
      setTotalCount(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  const fetchMetadata = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get<{ data: Customer[] }>('/customers?all=true'),
        api.get<{ data: Product[] }>('/products?all=true'),
      ]);
      setCustomers(custRes.data);
      setProducts(prodRes.data.filter((p) => p.status === 'active'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenCreate = () => {
    setSelectedCustomerId(customers[0]?.id.toString() || '');
    setOrderStatus('confirmed');
    setTaxRate('10');
    setDiscountAmount('0');
    setNotes('');
    setOrderLines([{ product_id: products[0]?.id.toString() || '', quantity: 1 }]);
    setErrorMessage(null);
    setIsCreateOpen(true);
  };

  const addLineItem = () => {
    setOrderLines([...orderLines, { product_id: products[0]?.id.toString() || '', quantity: 1 }]);
  };

  const removeLineItem = (index: number) => {
    if (orderLines.length === 1) return;
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: 'product_id' | 'quantity', value: string | number) => {
    const updated = [...orderLines];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, Number(value));
    } else {
      updated[index].product_id = value.toString();
    }
    setOrderLines(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCreateLoading(true);

    const payload = {
      customer_id: Number(selectedCustomerId),
      status: orderStatus,
      tax_rate: Number(taxRate),
      discount_amount: Number(discountAmount),
      notes: notes || null,
      items: orderLines.map((line) => ({
        product_id: Number(line.product_id),
        quantity: line.quantity,
      })),
    };

    try {
      await api.post('/orders', payload);
      setIsCreateOpen(false);
      setSuccessMessage('Order created successfully');
      fetchOrders();
      fetchMetadata();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to create order');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const viewOrderDetails = async (orderId: number) => {
    setDetailsLoading(true);
    try {
      const res = await api.get<{ order: Order }>(`/orders/${orderId}`);
      setSelectedOrder(res.order);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;

    try {
      const res = await api.patch<{ order: Order }>(`/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        comment: `Order marked as ${newStatus}`,
      });
      setSelectedOrder(res.order);
      setSuccessMessage(`Order status updated to ${newStatus}`);
      fetchOrders();
      fetchMetadata();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Failed to update status');
      }
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setCancelLoading(true);

    try {
      const res = await api.post<{ order: Order }>(`/orders/${selectedOrder.id}/cancel`, {
        reason: cancelReason || 'Order cancelled by staff',
      });
      setSelectedOrder(res.order);
      setCancelModalOpen(false);
      setCancelReason('');
      setSuccessMessage('Order cancelled and inventory safely restocked.');
      fetchOrders();
      fetchMetadata();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Failed to cancel order');
      }
    } finally {
      setCancelLoading(false);
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

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders</h2>
          <p className="text-xs text-slate-500 mt-0.5">Customer sales orders, fulfillment workflow, and line totals</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors self-start sm:self-auto cursor-pointer"
        >
          Create Order
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order # or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
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
                <th className="py-2.5 px-4">Order #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Items</th>
                <th className="py-2.5 px-4 text-right">Total</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400 mb-1.5" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{order.customer?.name}</div>
                      {order.customer?.company_name && (
                        <div className="text-xs text-slate-400">{order.customer.company_name}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-slate-800">{formatDate(order.created_at)}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{formatTime(order.created_at)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {order.items_count ?? order.items?.length ?? 0} item(s)
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      Rs {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => viewOrderDetails(order.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
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
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Customer Order"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Customer *
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Initial Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as 'draft' | 'confirmed')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="confirmed">Confirmed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Order Line Items *
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {orderLines.map((line, idx) => {
                const selectedProd = products.find((p) => p.id.toString() === line.product_id);
                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <select
                        required
                        value={line.product_id}
                        onChange={(e) => updateLineItem(idx, 'product_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-sm"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Rs {Number(p.selling_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} [Avail: {p.stock_quantity}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 sm:hidden">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          className="w-20 sm:w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-center"
                          title="Quantity"
                        />
                      </div>

                      <div className="w-28 text-right font-mono font-medium text-xs sm:text-sm text-slate-800">
                        Rs {((selectedProd ? Number(selectedProd.selling_price) : 0) * line.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        disabled={orderLines.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Discount Amount (PKR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Order Notes / Delivery Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery instructions, customer purchase order number..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Order
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order Details: ${selectedOrder.order_number}` : ''}
        maxWidth="max-w-3xl"
      >
        {detailsLoading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            Loading details...
          </div>
        ) : selectedOrder && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-medium">Customer</p>
                <p className="text-base font-semibold text-slate-900 mt-0.5">{selectedOrder.customer?.name}</p>
                <p className="text-xs text-slate-600">{selectedOrder.customer?.company_name} • {selectedOrder.customer?.phone}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium">Status</p>
                <div className="mt-1">
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium">Date placed</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {formatDateTime(selectedOrder.created_at)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">
                Order Items
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">{item.product_name}</td>
                        <td className="py-2 px-3 font-mono text-xs text-slate-500">{item.product_sku}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">Rs {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-900">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">Rs {Number(item.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">Rs {Number(selectedOrder.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({Number(selectedOrder.tax_rate)}%):</span>
                  <span className="font-mono font-medium">Rs {Number(selectedOrder.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-mono font-medium">-Rs {Number(selectedOrder.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span className="font-mono">Rs {Number(selectedOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-medium text-slate-700">Notes: </span>
                {selectedOrder.notes}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {selectedOrder.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('confirmed')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirm Order
                  </button>
                )}

                {selectedOrder.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('packed')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <PackageCheck className="w-3.5 h-3.5" /> Mark Packed
                  </button>
                )}

                {selectedOrder.status === 'packed' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('dispatched')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" /> Mark Dispatched
                  </button>
                )}

                {selectedOrder.status === 'dispatched' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('delivered')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                  </button>
                )}

                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel Order
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>

            {selectedOrder.status_histories && selectedOrder.status_histories.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-slate-500 mb-2">Status history</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedOrder.status_histories.map((h) => (
                    <div key={h.id} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="text-slate-400 font-mono">
                        {formatTime(h.created_at)}:
                      </span>
                      <span className="font-medium text-slate-800 capitalize">{h.to_status}</span>
                      <span>— {h.comment || 'Status updated'}</span>
                      <span className="text-slate-400">({h.user?.name || 'Staff'})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Order"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Cancelling this order will return the reserved quantities back to stock.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer cancelled due to project delay..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={cancelLoading}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {cancelLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
