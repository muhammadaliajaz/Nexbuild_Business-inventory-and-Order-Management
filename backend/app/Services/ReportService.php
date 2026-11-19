<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportService
{
    public function getLowStockProducts(): Collection
    {
        return Product::with('supplier')
            ->lowStock()
            ->orderBy('stock_quantity', 'asc')
            ->get()
            ->map(fn(Product $p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'category' => $p->category,
                'supplier' => $p->supplier?->name ?? 'N/A',
                'stock_quantity' => $p->stock_quantity,
                'reorder_level' => $p->reorder_level,
                'deficit' => max(0, $p->reorder_level - $p->stock_quantity),
                'cost_price' => (float) $p->cost_price,
                'selling_price' => (float) $p->selling_price,
                'stock_value' => round($p->stock_quantity * (float) $p->cost_price, 2),
            ]);
    }

    public function exportLowStockCsv(): StreamedResponse
    {
        $products = $this->getLowStockProducts();
        $headers = ['SKU', 'Product Name', 'Category', 'Supplier', 'Current Stock', 'Reorder Level', 'Deficit', 'Cost Price', 'Selling Price', 'Inventory Valuation'];

        return $this->streamCsv('low_stock_report_' . date('Y-m-d') . '.csv', $headers, function ($handle) use ($products) {
            foreach ($products as $row) {
                fputcsv($handle, [
                    $row['sku'],
                    $row['name'],
                    $row['category'],
                    $row['supplier'],
                    $row['stock_quantity'],
                    $row['reorder_level'],
                    $row['deficit'],
                    number_format($row['cost_price'], 2, '.', ''),
                    number_format($row['selling_price'], 2, '.', ''),
                    number_format($row['stock_value'], 2, '.', ''),
                ]);
            }
        });
    }

    public function exportOrdersCsv(?string $from = null, ?string $to = null, ?string $status = null): StreamedResponse
    {
        $query = Order::with(['customer', 'items'])
            ->dateRange($from, $to)
            ->status($status)
            ->latest('id');

        $headers = ['Order #', 'Date', 'Customer', 'Customer Email', 'Status', 'Items Count', 'Subtotal', 'Tax', 'Discount', 'Total Amount', 'Notes'];

        return $this->streamCsv('orders_report_' . date('Y-m-d') . '.csv', $headers, function ($handle) use ($query) {
            $query->chunk(200, function ($orders) use ($handle) {
                foreach ($orders as $order) {
                    fputcsv($handle, [
                        $order->order_number,
                        $order->created_at?->format('Y-m-d H:i') ?? '',
                        $order->customer?->name ?? 'N/A',
                        $order->customer?->email ?? '',
                        ucfirst($order->status),
                        $order->items->sum('quantity'),
                        number_format((float) $order->subtotal, 2, '.', ''),
                        number_format((float) $order->tax_amount, 2, '.', ''),
                        number_format((float) $order->discount_amount, 2, '.', ''),
                        number_format((float) $order->total_amount, 2, '.', ''),
                        $order->notes ?? '',
                    ]);
                }
            });
        });
    }

    public function exportStockMovementsCsv(?int $productId = null, ?string $type = null, ?string $from = null, ?string $to = null): StreamedResponse
    {
        $query = StockMovement::with(['product', 'user'])
            ->product($productId)
            ->type($type)
            ->dateRange($from, $to)
            ->latest('id');

        $headers = ['Timestamp', 'Product SKU', 'Product Name', 'Movement Type', 'Change', 'Before', 'After', 'Responsible User', 'Reason'];

        return $this->streamCsv('stock_movements_' . date('Y-m-d') . '.csv', $headers, function ($handle) use ($query) {
            $query->chunk(200, function ($movements) use ($handle) {
                foreach ($movements as $m) {
                    fputcsv($handle, [
                        $m->created_at?->format('Y-m-d H:i:s') ?? '',
                        $m->product?->sku ?? 'N/A',
                        $m->product?->name ?? 'N/A',
                        $m->type,
                        $m->quantity > 0 ? "+{$m->quantity}" : $m->quantity,
                        $m->quantity_before,
                        $m->quantity_after,
                        $m->user?->name ?? 'System',
                        $m->reason,
                    ]);
                }
            });
        });
    }

    protected function streamCsv(string $filename, array $headers, \Closure $callback): StreamedResponse
    {
        return response()->stream(function () use ($headers, $callback) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, $headers);
            $callback($handle);
            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
