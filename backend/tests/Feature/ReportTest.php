<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_low_stock_report_data(): void
    {
        $user = User::factory()->create();

        Product::create([
            'name' => 'Low Stock Product',
            'sku' => 'LOW-01',
            'cost_price' => 10,
            'selling_price' => 20,
            'stock_quantity' => 2,
            'reorder_level' => 10,
        ]);

        $response = $this->actingAs($user)->getJson('/api/reports/low-stock');

        $response->assertStatus(200)
            ->assertJsonPath('count', 1)
            ->assertJsonPath('total_deficit', 8)
            ->assertJsonPath('items.0.sku', 'LOW-01');
    }

    public function test_csv_export_endpoints_stream_valid_csv(): void
    {
        $user = User::factory()->create();
        $customer = Customer::create(['name' => 'Buyer Corp']);

        $product = Product::create([
            'name' => 'Hammer Pro',
            'sku' => 'HMR-01',
            'cost_price' => 15,
            'selling_price' => 30,
            'stock_quantity' => 1,
            'reorder_level' => 5,
        ]);

        StockMovement::create([
            'product_id' => $product->id,
            'user_id' => $user->id,
            'type' => StockMovement::TYPE_INITIAL,
            'quantity' => 1,
            'quantity_before' => 0,
            'quantity_after' => 1,
            'reason' => 'Initial setup',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-TEST-001',
            'customer_id' => $customer->id,
            'user_id' => $user->id,
            'status' => Order::STATUS_CONFIRMED,
            'subtotal' => 30.00,
            'total_amount' => 30.00,
            'stock_reserved' => true,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku,
            'quantity' => 1,
            'unit_price' => 30.00,
            'subtotal' => 30.00,
        ]);

        $lowStockCsv = $this->actingAs($user)->get('/api/reports/export/low-stock');
        $lowStockCsv->assertStatus(200)
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('HMR-01', $lowStockCsv->streamedContent());

        $ordersCsv = $this->actingAs($user)->get('/api/reports/export/orders');
        $ordersCsv->assertStatus(200)
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('ORD-TEST-001', $ordersCsv->streamedContent());

        $movementsCsv = $this->actingAs($user)->get('/api/reports/export/stock-movements');
        $movementsCsv->assertStatus(200)
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Initial setup', $movementsCsv->streamedContent());
    }
}

