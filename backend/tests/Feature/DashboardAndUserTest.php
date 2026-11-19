<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAndUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_stats_returns_aggregated_metrics(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $supplier = Supplier::create(['name' => 'Supplier Alpha']);
        $customer = Customer::create(['name' => 'Customer Alpha']);

        $product = Product::create([
            'supplier_id' => $supplier->id,
            'name' => 'Product Alpha',
            'sku' => 'SKU-ALPHA',
            'cost_price' => 10.00,
            'selling_price' => 20.00,
            'stock_quantity' => 2,
            'reorder_level' => 5,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'metrics' => [
                    'total_products',
                    'low_stock_count',
                    'out_of_stock_count',
                    'total_suppliers',
                    'total_customers',
                    'total_orders',
                    'pending_orders',
                    'total_revenue',
                    'inventory_cost_value',
                    'inventory_retail_value',
                ],
                'low_stock_items',
                'recent_orders',
                'recent_movements',
            ])
            ->assertJsonPath('metrics.total_products', 1)
            ->assertJsonPath('metrics.low_stock_count', 1);
    }

    public function test_admin_can_manage_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $createResponse = $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'New Staff',
            'email' => 'newstaff@nexbuild.com',
            'password' => 'secret123',
            'role' => 'staff',
            'status' => 'active',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('user.email', 'newstaff@nexbuild.com');

        $userId = $createResponse->json('user.id');

        $updateResponse = $this->actingAs($admin)->putJson("/api/users/{$userId}", [
            'name' => 'Updated Staff Name',
            'role' => 'staff',
            'status' => 'active',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('user.name', 'Updated Staff Name');

        $deleteSelfResponse = $this->actingAs($admin)->deleteJson("/api/users/{$admin->id}");
        $deleteSelfResponse->assertStatus(422);

        $demoteSelf = $this->actingAs($admin)->putJson("/api/users/{$admin->id}", [
            'name' => $admin->name,
            'role' => 'staff',
        ]);
        $demoteSelf->assertStatus(422);

        $deactivateSelf = $this->actingAs($admin)->putJson("/api/users/{$admin->id}", [
            'name' => $admin->name,
            'status' => 'inactive',
        ]);
        $deactivateSelf->assertStatus(422);

        $deleteOtherResponse = $this->actingAs($admin)->deleteJson("/api/users/{$userId}");
        $deleteOtherResponse->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $userId]);
    }
}

