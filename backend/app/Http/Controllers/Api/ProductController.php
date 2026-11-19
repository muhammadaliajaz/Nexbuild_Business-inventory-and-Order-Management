<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('supplier')
            ->search($request->query('search'))
            ->when($request->query('category'), fn($q, $cat) => $q->where('category', $cat))
            ->when($request->query('supplier_id'), fn($q, $sid) => $q->where('supplier_id', $sid))
            ->when($request->query('status'), function ($q, $status) {
                if ($status !== 'all') {
                    $q->where('status', $status);
                }
            })
            ->when($request->boolean('low_stock'), fn($q) => $q->lowStock())
            ->orderBy('name');

        if ($request->query('all') === 'true' || $request->query('per_page') === 'all') {
            return response()->json(['data' => $query->get()]);
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 15)));
        $products = $query->paginate($perPage);

        return response()->json($products);
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->has('sku')) {
            $request->merge(['sku' => strtoupper(trim((string) $request->sku))]);
        }

        $validated = $request->validate([
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'initial_stock' => ['nullable', 'integer', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $initialStock = (int) ($validated['initial_stock'] ?? 0);

        $product = DB::transaction(function () use ($validated, $initialStock, $request) {
            $product = Product::create([
                'supplier_id' => $validated['supplier_id'] ?? null,
                'name' => $validated['name'],
                'sku' => strtoupper(trim($validated['sku'])),
                'category' => $validated['category'] ?? null,
                'description' => $validated['description'] ?? null,
                'cost_price' => $validated['cost_price'],
                'selling_price' => $validated['selling_price'],
                'stock_quantity' => $initialStock,
                'reorder_level' => $validated['reorder_level'] ?? 10,
                'status' => $validated['status'] ?? 'active',
            ]);

            if ($initialStock > 0) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()?->id,
                    'type' => StockMovement::TYPE_INITIAL,
                    'quantity' => $initialStock,
                    'quantity_before' => 0,
                    'quantity_after' => $initialStock,
                    'reference_type' => Product::class,
                    'reference_id' => $product->id,
                    'reason' => 'Initial stock registered on product creation',
                ]);
            }

            return $product;
        });

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $product->load('supplier'),
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['supplier', 'stockMovements' => function ($q) {
            $q->with('user:id,name')->latest()->limit(10);
        }]);

        return response()->json(['product' => $product]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        if ($request->has('sku')) {
            $request->merge(['sku' => strtoupper(trim((string) $request->sku))]);
        }

        $validated = $request->validate([
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($product->id)],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'cost_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'reorder_level' => ['sometimes', 'required', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);

        if (isset($validated['sku'])) {
            $validated['sku'] = strtoupper(trim($validated['sku']));
        }

        unset($validated['stock_quantity']);

        $product->update($validated);

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $product->load('supplier'),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        if ($product->orderItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete product because it has associated customer orders. You may mark it inactive instead.',
            ], 422);
        }

        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully',
        ]);
    }

    public function lowStock(): JsonResponse
    {
        $products = Product::with('supplier')
            ->lowStock()
            ->orderBy('stock_quantity')
            ->get();

        return response()->json(['data' => $products]);
    }

    public function categories(): JsonResponse
    {
        $categories = Product::whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->pluck('category');

        return response()->json(['categories' => $categories]);
    }
}
