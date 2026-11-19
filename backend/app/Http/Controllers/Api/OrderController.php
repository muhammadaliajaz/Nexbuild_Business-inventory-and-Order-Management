<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['customer:id,name,email,company_name', 'user:id,name'])
            ->withCount('items')
            ->search($request->query('search'))
            ->status($request->query('status'))
            ->dateRange($request->query('date_from'), $request->query('date_to'))
            ->when($request->query('customer_id'), fn($q, $cid) => $q->where('customer_id', $cid))
            ->latest('id');

        $perPage = max(1, min(100, (int) $request->query('per_page', 15)));
        $orders = $query->paginate($perPage);

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'status' => ['nullable', Rule::in([Order::STATUS_DRAFT, Order::STATUS_CONFIRMED])],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $order = $this->orderService->createOrder($validated, $request->user());

        return response()->json([
            'message' => 'Order created successfully',
            'order' => $order,
        ], 201);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load([
            'customer',
            'user:id,name,email',
            'items.product:id,name,sku,category,stock_quantity',
            'statusHistories.user:id,name',
        ]);

        return response()->json(['order' => $order]);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Order::STATUSES)],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        $updatedOrder = $this->orderService->updateStatus(
            order: $order,
            newStatus: $validated['status'],
            comment: $validated['comment'] ?? null,
            user: $request->user()
        );

        return response()->json([
            'message' => "Order status updated to {$validated['status']}",
            'order' => $updatedOrder,
        ]);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancelledOrder = $this->orderService->cancelOrder(
            order: $order,
            reason: $validated['reason'] ?? null,
            user: $request->user()
        );

        return response()->json([
            'message' => 'Order cancelled and inventory updated accordingly.',
            'order' => $cancelledOrder,
        ]);
    }
}

