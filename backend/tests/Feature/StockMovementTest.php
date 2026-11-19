<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockMovementTest extends TestCase
{
    use RefreshDatabase;

    public function test_manual_stock_adjustment_creates_movement_with_actor_and_reason(): void
    {
        $user = User::factory()->create();
        $product = Product::create([
            'name' => 'Drill Bits Set',
            'sku' => 'DRL-BIT-01',
            'cost_price' => 12.00,
            'selling_price' => 22.00,
            'stock_quantity' => 10,
            'reorder_level' => 5,
        ]);

        $response = $this->actingAs($user)->postJson('/api/stock-movements', [
            'product_id' => $product->id,
            'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
            'quantity' => 5,
            'reason' => 'Inventory audit cycle count adjustment',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('new_stock_quantity', 15)
            ->assertJsonPath('movement.quantity_before', 10)
            ->assertJsonPath('movement.quantity_after', 15)
            ->assertJsonPath('movement.reason', 'Inventory audit cycle count adjustment')
            ->assertJsonPath('movement.user.id', $user->id);

        $product->refresh();
        $this->assertEquals(15, $product->stock_quantity);
    }

    public function test_adjustment_cannot_reduce_stock_below_zero(): void
    {
        $user = User::factory()->create();
        $product = Product::create([
            'name' => 'Paint Can',
            'sku' => 'PNT-CAN-01',
            'cost_price' => 10,
            'selling_price' => 18,
            'stock_quantity' => 3,
            'reorder_level' => 2,
        ]);

        $response = $this->actingAs($user)->postJson('/api/stock-movements', [
            'product_id' => $product->id,
            'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
            'quantity' => -5,
            'reason' => 'Damaged in transit',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        $product->refresh();
        $this->assertEquals(3, $product->stock_quantity);
    }

    public function test_stock_adjustment_requires_mandatory_reason(): void
    {
        $user = User::factory()->create();
        $product = Product::create([
            'name' => 'Tape Measure',
            'sku' => 'TAP-MSR-01',
            'cost_price' => 5,
            'selling_price' => 10,
            'stock_quantity' => 10,
            'reorder_level' => 2,
        ]);

        $response = $this->actingAs($user)->postJson('/api/stock-movements', [
            'product_id' => $product->id,
            'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
            'quantity' => 2,
            'reason' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }
}

