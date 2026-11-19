<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierCustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_and_list_suppliers(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/suppliers', [
            'name' => 'Metro Tools Ltd',
            'contact_name' => 'John Boss',
            'email' => 'sales@metrotools.com',
            'phone' => '123456789',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('supplier.name', 'Metro Tools Ltd');

        $listResponse = $this->actingAs($user)->getJson('/api/suppliers');
        $listResponse->assertStatus(200)
            ->assertJsonFragment(['name' => 'Metro Tools Ltd']);
    }

    public function test_cannot_delete_supplier_with_associated_products(): void
    {
        $user = User::factory()->create();
        $supplier = Supplier::create(['name' => 'Timber Supply Co']);
        Product::create([
            'supplier_id' => $supplier->id,
            'name' => 'Pine Wood',
            'sku' => 'PINE-001',
            'cost_price' => 10,
            'selling_price' => 15,
            'stock_quantity' => 10,
            'reorder_level' => 5,
        ]);

        $response = $this->actingAs($user)->deleteJson("/api/suppliers/{$supplier->id}");
        $response->assertStatus(422);

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id]);
    }

    public function test_can_create_and_search_customers(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/customers', [
            'name' => 'Alice Wonder',
            'company_name' => 'Wonder Designs',
            'email' => 'alice@wonder.com',
            'phone' => '987654321',
        ])->assertStatus(201);

        $searchResponse = $this->actingAs($user)->getJson('/api/customers?search=Wonder');
        $searchResponse->assertStatus(200)
            ->assertJsonFragment(['name' => 'Alice Wonder']);
    }
}

