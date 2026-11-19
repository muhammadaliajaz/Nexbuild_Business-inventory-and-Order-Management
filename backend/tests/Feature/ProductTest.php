<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_product_with_initial_stock_movement(): void
    {
        $user = User::factory()->create(['role' => 'staff']);
        $supplier = Supplier::create([
            'name' => 'Supplier One',
            'email' => 'sup1@example.com',
        ]);

        $payload = [
            'supplier_id' => $supplier->id,
            'name' => 'Oak Timber Board',
            'sku' => 'OAK-TBR-01',
            'category' => 'Timber',
            'cost_price' => 15.00,
            'selling_price' => 25.00,
            'initial_stock' => 50,
            'reorder_level' => 10,
        ];

        $response = $this->actingAs($user)->postJson('/api/products', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('product.sku', 'OAK-TBR-01')
            ->assertJsonPath('product.stock_quantity', 50);

        $this->assertDatabaseHas('products', [
            'sku' => 'OAK-TBR-01',
            'stock_quantity' => 50,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_INITIAL,
            'quantity' => 50,
            'quantity_before' => 0,
            'quantity_after' => 50,
        ]);
    }

    public function test_duplicate_sku_is_rejected(): void
    {
        $user = User::factory()->create();
        Product::create([
            'name' => 'First Product',
            'sku' => 'DUP-SKU-1',
            'cost_price' => 10,
            'selling_price' => 20,
            'stock_quantity' => 5,
            'reorder_level' => 2,
        ]);

        $response = $this->actingAs($user)->postJson('/api/products', [
            'name' => 'Second Product',
            'sku' => 'dup-sku-1',
            'cost_price' => 12,
            'selling_price' => 22,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }

    public function test_updating_product_preserves_controlled_stock_quantity(): void
    {
        $user = User::factory()->create();
        $product = Product::create([
            'name' => 'Original Name',
            'sku' => 'ORIG-01',
            'cost_price' => 10,
            'selling_price' => 20,
            'stock_quantity' => 25,
            'reorder_level' => 5,
        ]);

        $response = $this->actingAs($user)->putJson("/api/products/{$product->id}", [
            'name' => 'Updated Name',
            'stock_quantity' => 999,
            'cost_price' => 12,
            'selling_price' => 24,
            'reorder_level' => 8,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('product.name', 'Updated Name')
            ->assertJsonPath('product.stock_quantity', 25);

        $product->refresh();
        $this->assertEquals(25, $product->stock_quantity);
    }

    public function test_low_stock_filter_returns_only_low_stock_products(): void
    {
        $user = User::factory()->create();

        Product::create([
            'name' => 'Low Stock Product',
            'sku' => 'LOW-01',
            'cost_price' => 10,
            'selling_price' => 15,
            'stock_quantity' => 3,
            'reorder_level' => 10,
        ]);

        Product::create([
            'name' => 'Adequate Stock Product',
            'sku' => 'ADEQ-01',
            'cost_price' => 10,
            'selling_price' => 15,
            'stock_quantity' => 30,
            'reorder_level' => 10,
        ]);

        $response = $this->actingAs($user)->getJson('/api/products/low-stock');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sku', 'LOW-01');
    }
}

