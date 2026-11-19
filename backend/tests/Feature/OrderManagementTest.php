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

class OrderManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_server_calculates_totals_and_snapshots_prices(): void
    {
        $user = User::factory()->create();
        $customer = Customer::create([
            'name' => 'Acme Corporation',
            'email' => 'acme@example.com',
        ]);

        $productA = Product::create([
            'name' => 'Widget A',
            'sku' => 'WDG-A',
            'cost_price' => 10.00,
            'selling_price' => 20.00,
            'stock_quantity' => 15,
            'reorder_level' => 5,
        ]);

        $productB = Product::create([
            'name' => 'Widget B',
            'sku' => 'WDG-B',
            'cost_price' => 30.00,
            'selling_price' => 50.00,
            'stock_quantity' => 10,
            'reorder_level' => 3,
        ]);

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'customer_id' => $customer->id,
            'status' => Order::STATUS_CONFIRMED,
            'tax_rate' => 10,
            'discount_amount' => 10,
            'items' => [
                ['product_id' => $productA->id, 'quantity' => 2],
                ['product_id' => $productB->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('order.subtotal', '90.00')
            ->assertJsonPath('order.tax_amount', '9.00')
            ->assertJsonPath('order.discount_amount', '10.00')
            ->assertJsonPath('order.total_amount', '89.00')
            ->assertJsonPath('order.stock_reserved', true);

        $productA->refresh();
        $productB->refresh();
        $this->assertEquals(13, $productA->stock_quantity);
        $this->assertEquals(9, $productB->stock_quantity);

        $productA->update(['selling_price' => 999.00]);

        $orderId = $response->json('order.id');
        $item = OrderItem::where('order_id', $orderId)->where('product_id', $productA->id)->first();
        $this->assertEquals('20.00', (string) $item->unit_price);
        $this->assertEquals('40.00', (string) $item->subtotal);
    }

    public function test_cannot_order_more_stock_than_available(): void
    {
        $user = User::factory()->create();
        $customer = Customer::create(['name' => 'John Doe']);
        $product = Product::create([
            'name' => 'Limited Supply Item',
            'sku' => 'LIM-01',
            'cost_price' => 50,
            'selling_price' => 100,
            'stock_quantity' => 3,
            'reorder_level' => 1,
        ]);

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'customer_id' => $customer->id,
            'status' => Order::STATUS_CONFIRMED,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 5],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);

        $product->refresh();
        $this->assertEquals(3, $product->stock_quantity);
    }

    public function test_safe_cancellation_restores_stock_and_is_idempotent(): void
    {
        $user = User::factory()->create();
        $customer = Customer::create(['name' => 'Jane Smith']);
        $product = Product::create([
            'name' => 'Steel Beam',
            'sku' => 'STL-BM-01',
            'cost_price' => 50,
            'selling_price' => 80,
            'stock_quantity' => 10,
            'reorder_level' => 2,
        ]);

        $orderResponse = $this->actingAs($user)->postJson('/api/orders', [
            'customer_id' => $customer->id,
            'status' => Order::STATUS_CONFIRMED,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 4],
            ],
        ]);
        $orderId = $orderResponse->json('order.id');

        $product->refresh();
        $this->assertEquals(6, $product->stock_quantity);

        $cancelResponse = $this->actingAs($user)->postJson("/api/orders/{$orderId}/cancel", [
            'reason' => 'Customer requested cancellation',
        ]);

        $cancelResponse->assertStatus(200)
            ->assertJsonPath('order.status', Order::STATUS_CANCELLED)
            ->assertJsonPath('order.stock_reserved', false);

        $product->refresh();
        $this->assertEquals(10, $product->stock_quantity);

        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_ORDER_CANCELLATION_RESTOCK,
            'product_id' => $product->id,
            'quantity' => 4,
            'quantity_before' => 6,
            'quantity_after' => 10,
        ]);

        $repeatCancel = $this->actingAs($user)->postJson("/api/orders/{$orderId}/cancel", [
            'reason' => 'Repeat request',
        ]);

        $repeatCancel->assertStatus(200);

        $product->refresh();
        $this->assertEquals(10, $product->stock_quantity);
    }

    public function test_delivered_order_cannot_be_cancelled(): void
    {
        $user = User::factory()->create();
        $customer = Customer::create(['name' => 'Contractor Inc']);
        $product = Product::create([
            'name' => 'Cement Bag 20kg',
            'sku' => 'CMT-20KG',
            'cost_price' => 6,
            'selling_price' => 12,
            'stock_quantity' => 20,
            'reorder_level' => 5,
        ]);

        $orderResponse = $this->actingAs($user)->postJson('/api/orders', [
            'customer_id' => $customer->id,
            'status' => Order::STATUS_CONFIRMED,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
        ]);
        $orderId = $orderResponse->json('order.id');

        $this->actingAs($user)->patchJson("/api/orders/{$orderId}/status", ['status' => Order::STATUS_PACKED]);
        $this->actingAs($user)->patchJson("/api/orders/{$orderId}/status", ['status' => Order::STATUS_DISPATCHED]);
        $this->actingAs($user)->patchJson("/api/orders/{$orderId}/status", ['status' => Order::STATUS_DELIVERED]);

        $cancelResponse = $this->actingAs($user)->postJson("/api/orders/{$orderId}/cancel", [
            'reason' => 'Attempt late cancellation',
        ]);

        $cancelResponse->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_order_status_transitions_are_strictly_validated(): void
    {
        $user = User::factory()->create();
        $customer = Customer::create(['name' => 'Tech Client']);
        $product = Product::create([
            'name' => 'Fast Charger',
            'sku' => 'CHG-01',
            'cost_price' => 20,
            'selling_price' => 40,
            'stock_quantity' => 10,
            'reorder_level' => 2,
        ]);

        $orderResponse = $this->actingAs($user)->postJson('/api/orders', [
            'customer_id' => $customer->id,
            'status' => Order::STATUS_DRAFT,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
        ]);
        $orderId = $orderResponse->json('order.id');

        // Cannot skip directly from draft to delivered
        $invalidHop = $this->actingAs($user)->patchJson("/api/orders/{$orderId}/status", [
            'status' => Order::STATUS_DELIVERED,
        ]);
        $invalidHop->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // Valid transition: draft -> confirmed
        $validConfirm = $this->actingAs($user)->patchJson("/api/orders/{$orderId}/status", [
            'status' => Order::STATUS_CONFIRMED,
        ]);
        $validConfirm->assertStatus(200);

        // Cannot transition backwards from confirmed to draft
        $invalidBack = $this->actingAs($user)->patchJson("/api/orders/{$orderId}/status", [
            'status' => Order::STATUS_DRAFT,
        ]);
        $invalidBack->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }
}

