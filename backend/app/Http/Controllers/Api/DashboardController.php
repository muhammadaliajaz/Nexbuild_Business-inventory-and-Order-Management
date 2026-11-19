<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $totalProducts = Product::count();
        $lowStockCount = Product::lowStock()->count();
        $outOfStockCount = Product::where('stock_quantity', '<=', 0)->count();

        $totalSuppliers = Supplier::where('status', 'active')->count();
        $totalCustomers = Customer::count();

        $totalOrders = Order::count();
        $pendingOrders = Order::whereIn('status', [
            Order::STATUS_CONFIRMED,
            Order::STATUS_PACKED,
            Order::STATUS_DISPATCHED,
        ])->count();

        $totalRevenue = (float) Order::whereIn('status', [
            Order::STATUS_CONFIRMED,
            Order::STATUS_PACKED,
            Order::STATUS_DISPATCHED,
            Order::STATUS_DELIVERED,
        ])->sum('total_amount');

        $inventoryValues = Product::select(
            DB::raw('COALESCE(SUM(stock_quantity * cost_price), 0) as total_cost_value'),
            DB::raw('COALESCE(SUM(stock_quantity * selling_price), 0) as total_retail_value')
        )->first();

        $lowStockItems = Product::with('supplier:id,name')
            ->lowStock()
            ->orderBy('stock_quantity', 'asc')
            ->limit(8)
            ->get();

        $recentOrders = Order::with('customer:id,name')
            ->withCount('items')
            ->latest('id')
            ->limit(8)
            ->get();

        $recentMovements = StockMovement::with(['product:id,name,sku', 'user:id,name'])
            ->latest('id')
            ->limit(8)
            ->get();

        return response()->json([
            'metrics' => [
                'total_products' => $totalProducts,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'total_suppliers' => $totalSuppliers,
                'total_customers' => $totalCustomers,
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'total_revenue' => round($totalRevenue, 2),
                'inventory_cost_value' => round((float) $inventoryValues->total_cost_value, 2),
                'inventory_retail_value' => round((float) $inventoryValues->total_retail_value, 2),
            ],
            'low_stock_items' => $lowStockItems,
            'recent_orders' => $recentOrders,
            'recent_movements' => $recentMovements,
        ]);
    }
}

