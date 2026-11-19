<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn() => response()->json(['status' => 'healthy', 'timestamp' => now()->toIso8601String()]));
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:30,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    Route::get('/products/low-stock', [ProductController::class, 'lowStock']);
    Route::get('/products/categories', [ProductController::class, 'categories']);
    Route::apiResource('products', ProductController::class);

    Route::apiResource('suppliers', SupplierController::class);
    Route::apiResource('customers', CustomerController::class);

    Route::get('/stock-movements', [StockMovementController::class, 'index']);
    Route::post('/stock-movements', [StockMovementController::class, 'store']);

    Route::apiResource('orders', OrderController::class)->except(['update', 'destroy']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);

    Route::prefix('reports')->group(function () {
        Route::get('/low-stock', [ReportController::class, 'lowStock']);
        Route::get('/inventory-summary', [ReportController::class, 'inventorySummary']);
        Route::get('/export/low-stock', [ReportController::class, 'exportLowStock']);
        Route::get('/export/orders', [ReportController::class, 'exportOrders']);
        Route::get('/export/stock-movements', [ReportController::class, 'exportStockMovements']);
    });

    Route::middleware('admin')->group(function () {
        Route::apiResource('users', UserController::class);
    });
});
