<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function createOrder(array $attributes, User $user): Order
    {
        $lineItems = $attributes['items'] ?? [];
        if (empty($lineItems)) {
            throw ValidationException::withMessages([
                'items' => ['An order must contain at least one line item.'],
            ]);
        }

        $status = $attributes['status'] ?? Order::STATUS_CONFIRMED;
        if (!in_array($status, [Order::STATUS_DRAFT, Order::STATUS_CONFIRMED], true)) {
            $status = Order::STATUS_CONFIRMED;
        }

        return DB::transaction(function () use ($attributes, $lineItems, $status, $user) {
            $requestedQuantities = [];
            foreach ($lineItems as $lineItem) {
                $productId = (int) $lineItem['product_id'];
                $quantity = (int) $lineItem['quantity'];
                if ($quantity <= 0) {
                    throw ValidationException::withMessages([
                        'items' => ['Each item quantity must be at least 1.'],
                    ]);
                }
                $requestedQuantities[$productId] = ($requestedQuantities[$productId] ?? 0) + $quantity;
            }

            $productIds = array_keys($requestedQuantities);
            $products = Product::whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($productIds)) {
                throw ValidationException::withMessages([
                    'items' => ['One or more selected products could not be found.'],
                ]);
            }

            $subtotal = 0.00;
            $itemsToCreate = [];

            foreach ($requestedQuantities as $productId => $quantity) {
                $product = $products[$productId];

                if ($product->status !== 'active') {
                    throw ValidationException::withMessages([
                        'items' => ["Product '{$product->name}' is inactive and cannot be ordered."],
                    ]);
                }

                if ($status === Order::STATUS_CONFIRMED && $product->stock_quantity < $quantity) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Insufficient stock for '{$product->name}' (SKU: {$product->sku}). Available: {$product->stock_quantity}, Requested: {$quantity}.",
                        ],
                    ]);
                }

                $unitPrice = (float) $product->selling_price;
                $lineSubtotal = round($unitPrice * $quantity, 2);
                $subtotal += $lineSubtotal;

                $itemsToCreate[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $lineSubtotal,
                ];
            }

            $taxRate = max(0.00, floatval($attributes['tax_rate'] ?? 0));
            $taxAmount = round($subtotal * ($taxRate / 100), 2);
            $discountAmount = min($subtotal, max(0.00, floatval($attributes['discount_amount'] ?? 0)));
            $totalAmount = round($subtotal + $taxAmount - $discountAmount, 2);

            $order = Order::create([
                'order_number' => $this->generateOrderNumber(),
                'customer_id' => $attributes['customer_id'],
                'user_id' => $user->id,
                'status' => $status,
                'subtotal' => $subtotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'stock_reserved' => false,
                'notes' => $attributes['notes'] ?? null,
                'confirmed_at' => $status === Order::STATUS_CONFIRMED ? Carbon::now() : null,
            ]);

            foreach ($itemsToCreate as $item) {
                $product = $item['product'];

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            if ($status === Order::STATUS_CONFIRMED) {
                $this->reserveStockForOrder($order, $user, $products);
            }

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'from_status' => null,
                'to_status' => $status,
                'comment' => "Order created with status {$status}",
            ]);

            return $order->load(['customer', 'items.product', 'user', 'statusHistories']);
        });
    }

    public function updateStatus(Order $order, string $newStatus, ?string $comment, User $user): Order
    {
        if (!in_array($newStatus, Order::STATUSES, true)) {
            throw ValidationException::withMessages([
                'status' => ["Invalid order status: {$newStatus}."],
            ]);
        }

        if ($newStatus === Order::STATUS_CANCELLED) {
            return $this->cancelOrder($order, $comment, $user);
        }

        return DB::transaction(function () use ($order, $newStatus, $comment, $user) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status === Order::STATUS_CANCELLED) {
                throw ValidationException::withMessages([
                    'status' => ['Cannot change the status of a cancelled order.'],
                ]);
            }

            if ($lockedOrder->status === Order::STATUS_DELIVERED) {
                throw ValidationException::withMessages([
                    'status' => ['Cannot change status once an order has been delivered.'],
                ]);
            }

            $fromStatus = $lockedOrder->status;

            if ($newStatus === $fromStatus) {
                return $lockedOrder->load(['customer', 'items.product', 'user', 'statusHistories']);
            }

            $allowed = Order::ALLOWED_TRANSITIONS[$fromStatus] ?? [];
            if (!in_array($newStatus, $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => ["Cannot transition order status from '{$fromStatus}' to '{$newStatus}'."],
                ]);
            }

            if ($fromStatus === Order::STATUS_DRAFT && $newStatus === Order::STATUS_CONFIRMED && !$lockedOrder->stock_reserved) {
                $this->reserveStockForOrder($lockedOrder, $user);
            }

            $lockedOrder->status = $newStatus;
            if ($newStatus === Order::STATUS_CONFIRMED && !$lockedOrder->confirmed_at) {
                $lockedOrder->confirmed_at = Carbon::now();
            }
            $lockedOrder->save();

            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'user_id' => $user->id,
                'from_status' => $fromStatus,
                'to_status' => $newStatus,
                'comment' => $comment ?: "Status changed from {$fromStatus} to {$newStatus}",
            ]);

            return $lockedOrder->load(['customer', 'items.product', 'user', 'statusHistories']);
        });
    }

    public function cancelOrder(Order $order, ?string $reason, User $user): Order
    {
        return DB::transaction(function () use ($order, $reason, $user) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status === Order::STATUS_CANCELLED) {
                return $lockedOrder->load(['customer', 'items.product', 'user', 'statusHistories']);
            }

            if ($lockedOrder->status === Order::STATUS_DELIVERED) {
                throw ValidationException::withMessages([
                    'status' => ['Delivered orders cannot be cancelled.'],
                ]);
            }

            $fromStatus = $lockedOrder->status;

            if ($lockedOrder->stock_reserved) {
                $items = OrderItem::where('order_id', $lockedOrder->id)->get();

                foreach ($items as $item) {
                    $product = Product::where('id', $item->product_id)->lockForUpdate()->first();
                    if ($product) {
                        $stockBefore = $product->stock_quantity;
                        $stockAfter = $stockBefore + $item->quantity;

                        $product->stock_quantity = $stockAfter;
                        $product->save();

                        StockMovement::create([
                            'product_id' => $product->id,
                            'user_id' => $user->id,
                            'type' => StockMovement::TYPE_ORDER_CANCELLATION_RESTOCK,
                            'quantity' => $item->quantity,
                            'quantity_before' => $stockBefore,
                            'quantity_after' => $stockAfter,
                            'reference_type' => Order::class,
                            'reference_id' => $lockedOrder->id,
                            'reason' => "Stock restored upon cancellation of Order #{$lockedOrder->order_number}: " . ($reason ?: 'Order cancelled'),
                        ]);
                    }
                }

                $lockedOrder->stock_reserved = false;
            }

            $lockedOrder->status = Order::STATUS_CANCELLED;
            $lockedOrder->cancelled_at = Carbon::now();
            $lockedOrder->save();

            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'user_id' => $user->id,
                'from_status' => $fromStatus,
                'to_status' => Order::STATUS_CANCELLED,
                'comment' => $reason ?: 'Order was cancelled.',
            ]);

            return $lockedOrder->load(['customer', 'items.product', 'user', 'statusHistories']);
        });
    }

    protected function reserveStockForOrder(Order $order, User $user, $preloadedProducts = null): void
    {
        $items = OrderItem::where('order_id', $order->id)->get();
        $productIds = $items->pluck('product_id')->all();

        $products = $preloadedProducts ?: Product::whereIn('id', $productIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        if (!$preloadedProducts) {
            foreach ($items as $item) {
                $product = $products[$item->product_id] ?? null;
                if (!$product || $product->stock_quantity < $item->quantity) {
                    $available = $product ? $product->stock_quantity : 0;
                    throw ValidationException::withMessages([
                        'items' => [
                            "Insufficient stock for '{$item->product_name}'. Available: {$available}, Required: {$item->quantity}.",
                        ],
                    ]);
                }
            }
        }

        foreach ($items as $item) {
            $product = $products[$item->product_id];
            $stockBefore = $product->stock_quantity;
            $stockAfter = $stockBefore - $item->quantity;

            $product->stock_quantity = $stockAfter;
            $product->save();

            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $user->id,
                'type' => StockMovement::TYPE_ORDER_FULFILLMENT,
                'quantity' => -$item->quantity,
                'quantity_before' => $stockBefore,
                'quantity_after' => $stockAfter,
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'reason' => "Stock allocated for Order #{$order->order_number}",
            ]);
        }

        $order->stock_reserved = true;
        $order->save();
    }

    protected function generateOrderNumber(): string
    {
        $todayPrefix = 'ORD-' . date('Ymd') . '-';
        $sequence = Order::whereDate('created_at', Carbon::today())->count() + 1;

        while (Order::where('order_number', $candidate = $todayPrefix . str_pad((string) $sequence, 4, '0', STR_PAD_LEFT))->exists()) {
            $sequence++;
        }

        return $candidate;
    }
}
