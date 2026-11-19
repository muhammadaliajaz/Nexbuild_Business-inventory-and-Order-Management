<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    public function lowStock(): JsonResponse
    {
        $products = $this->reportService->getLowStockProducts();

        return response()->json([
            'count' => $products->count(),
            'total_deficit' => $products->sum('deficit'),
            'total_valuation' => round($products->sum('stock_value'), 2),
            'items' => $products,
        ]);
    }

    public function inventorySummary(): JsonResponse
    {
        $categoryBreakdown = Product::select(
            DB::raw("COALESCE(category, 'Uncategorized') as category_name"),
            DB::raw('COUNT(*) as product_count'),
            DB::raw('SUM(stock_quantity) as total_units'),
            DB::raw('ROUND(SUM(stock_quantity * cost_price), 2) as cost_value'),
            DB::raw('ROUND(SUM(stock_quantity * selling_price), 2) as retail_value')
        )
            ->groupBy(DB::raw("COALESCE(category, 'Uncategorized')"))
            ->orderBy('category_name')
            ->get();

        $totals = [
            'total_products' => Product::count(),
            'total_units' => (int) Product::sum('stock_quantity'),
            'total_cost_value' => round((float) Product::sum(DB::raw('stock_quantity * cost_price')), 2),
            'total_retail_value' => round((float) Product::sum(DB::raw('stock_quantity * selling_price')), 2),
            'low_stock_count' => Product::lowStock()->count(),
            'out_of_stock_count' => Product::where('stock_quantity', '<=', 0)->count(),
        ];

        return response()->json([
            'totals' => $totals,
            'categories' => $categoryBreakdown,
        ]);
    }

    public function exportLowStock(): StreamedResponse
    {
        return $this->reportService->exportLowStockCsv();
    }

    public function exportOrders(Request $request): StreamedResponse
    {
        return $this->reportService->exportOrdersCsv(
            from: $request->query('date_from'),
            to: $request->query('date_to'),
            status: $request->query('status')
        );
    }

    public function exportStockMovements(Request $request): StreamedResponse
    {
        return $this->reportService->exportStockMovementsCsv(
            productId: $request->query('product_id') ? (int) $request->query('product_id') : null,
            type: $request->query('type'),
            from: $request->query('date_from'),
            to: $request->query('date_to')
        );
    }
}

