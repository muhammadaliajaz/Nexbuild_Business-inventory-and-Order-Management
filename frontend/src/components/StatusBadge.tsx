import React from 'react';
import type { OrderStatus } from '../types';

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const styles: Record<OrderStatus, { text: string; label: string }> = {
    draft: { text: 'text-slate-600 bg-slate-100', label: 'Draft' },
    confirmed: { text: 'text-slate-800 bg-slate-100', label: 'Confirmed' },
    packed: { text: 'text-blue-700 bg-blue-50', label: 'Packed' },
    dispatched: { text: 'text-amber-800 bg-amber-50', label: 'Dispatched' },
    delivered: { text: 'text-emerald-700 bg-emerald-50', label: 'Delivered' },
    cancelled: { text: 'text-rose-700 bg-rose-50', label: 'Cancelled' },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${style.text}`}>
      {style.label}
    </span>
  );
};

export const StockStatusBadge: React.FC<{ quantity: number; reorderLevel: number }> = ({
  quantity,
  reorderLevel,
}) => {
  if (quantity <= 0) {
    return (
      <span className="text-rose-600 font-medium text-sm">
        0 <span className="text-xs text-rose-500 font-normal">(Out of stock)</span>
      </span>
    );
  }

  if (quantity <= reorderLevel) {
    return (
      <span className="text-amber-700 font-medium text-sm">
        {quantity} <span className="text-xs text-amber-600 font-normal">(Low)</span>
      </span>
    );
  }

  return (
    <span className="text-slate-800 text-sm">
      {quantity}
    </span>
  );
};
