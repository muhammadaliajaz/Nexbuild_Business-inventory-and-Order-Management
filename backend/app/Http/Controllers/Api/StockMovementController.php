<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockMovementController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = StockMovement::with(['product:id,name,sku,category,stock_quantity', 'user:id,name,email'])
            ->when($request->query('product_id'), fn($q, $pid) => $q->where('product_id', $pid))
            ->when($request->query('type'), function ($q, $type) {
                if ($type !== 'all') {
                    $q->where('type', $type);
                }
            })
            ->when($request->query('date_from'), fn($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->query('date_to'), fn($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->when($request->query('search'), function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('reason', 'like', "%{$search}%")
                        ->orWhereHas('product', fn($pq) => $pq->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%"));
                });
            })
            ->latest('id');

        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));
        $movements = $query->paginate($perPage);

        return response()->json($movements);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'type' => [
                'required',
                Rule::in([
                    StockMovement::TYPE_MANUAL_ADJUSTMENT,
                    StockMovement::TYPE_PURCHASE_RECEIVED,
                    StockMovement::TYPE_RETURN,
                ]),
            ],
            'quantity' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $movement = $this->inventoryService->adjustStock(
            productId: (int) $validated['product_id'],
            quantityChange: (int) $validated['quantity'],
            type: $validated['type'],
            reason: trim($validated['reason']),
            userId: $request->user()->id
        );

        $movement->load(['product:id,name,sku,stock_quantity', 'user:id,name']);

        return response()->json([
            'message' => 'Stock adjustment recorded successfully',
            'movement' => $movement,
            'new_stock_quantity' => $movement->product->stock_quantity,
        ], 201);
    }
}

