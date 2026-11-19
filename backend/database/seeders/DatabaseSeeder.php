<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@nextech.pk'],
            [
                'name' => 'Muhammad Ali',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $staff = User::firstOrCreate(
            ['email' => 'staff@nextech.pk'],
            [
                'name' => 'Hamza Tariq',
                'password' => Hash::make('password123'),
                'role' => 'staff',
                'status' => 'active',
            ]
        );

        $supplierLahore = Supplier::firstOrCreate(
            ['email' => 'sales@paktechdist.pk'],
            [
                'name' => 'PakTech Distribution',
                'contact_name' => 'Usman Tariq',
                'phone' => '+92 300 8472190',
                'address' => 'Hafeez Centre, Main Boulevard, Gulberg III, Lahore',
                'status' => 'active',
            ]
        );

        $supplierKarachi = Supplier::firstOrCreate(
            ['email' => 'orders@siliconimports.pk'],
            [
                'name' => 'Silicon Imports Karachi',
                'contact_name' => 'Bilal Siddiqui',
                'phone' => '+92 321 2345678',
                'address' => 'Techno City Mall, I.I. Chundrigar Road, Karachi',
                'status' => 'active',
            ]
        );

        $customerGaming = Customer::firstOrCreate(
            ['email' => 'hamza@apexgaming.pk'],
            [
                'name' => 'Hamza Farooq',
                'company_name' => 'Apex Gaming Lounge',
                'phone' => '+92 333 4567891',
                'address' => 'Plaza 14, Commercial Area, Phase 4 DHA, Lahore',
            ]
        );

        $customerSolutions = Customer::firstOrCreate(
            ['email' => 'zainab@maliktech.pk'],
            [
                'name' => 'Zainab Malik',
                'company_name' => 'Malik Tech Solutions',
                'phone' => '+92 312 9876543',
                'address' => 'Office 302, Evacuee Trust Complex, Islamabad',
            ]
        );

        $catalog = [
            [
                'supplier_id' => $supplierLahore->id,
                'name' => '65W GaN Fast Charger USB-C',
                'sku' => 'CHG-GAN-65W',
                'category' => 'Chargers & Power',
                'description' => 'Dual-port USB-C and USB-A fast wall charger with PD 3.0 support.',
                'cost_price' => 2800.00,
                'selling_price' => 4500.00,
                'stock_quantity' => 45,
                'reorder_level' => 15,
            ],
            [
                'supplier_id' => $supplierKarachi->id,
                'name' => 'Wireless Noise-Cancelling Earbuds',
                'sku' => 'AUD-TWS-PRO',
                'category' => 'Audio & Sound',
                'description' => 'Bluetooth 5.3 earbuds with active noise cancellation and charging case.',
                'cost_price' => 4200.00,
                'selling_price' => 6900.00,
                'stock_quantity' => 28,
                'reorder_level' => 10,
            ],
            [
                'supplier_id' => $supplierLahore->id,
                'name' => 'Mechanical Wireless Keyboard (RGB)',
                'sku' => 'KBD-MECH-RGB',
                'category' => 'Keyboards & Mice',
                'description' => 'Compact 75% hot-swappable mechanical keyboard with red switches.',
                'cost_price' => 6800.00,
                'selling_price' => 9500.00,
                'stock_quantity' => 18,
                'reorder_level' => 8,
            ],
            [
                'supplier_id' => $supplierLahore->id,
                'name' => 'Ergonomic Wireless Mouse',
                'sku' => 'MOU-ERGO-WL',
                'category' => 'Keyboards & Mice',
                'description' => '2.4GHz rechargeable ergonomic vertical optical mouse.',
                'cost_price' => 1800.00,
                'selling_price' => 2950.00,
                'stock_quantity' => 32,
                'reorder_level' => 10,
            ],
            [
                'supplier_id' => $supplierKarachi->id,
                'name' => 'Braided HDMI 2.1 Cable (2m)',
                'sku' => 'CBL-HDMI-2M',
                'category' => 'Cables & Adapters',
                'description' => 'Ultra high-speed 8K@60Hz 48Gbps braided HDMI cable.',
                'cost_price' => 950.00,
                'selling_price' => 1650.00,
                'stock_quantity' => 60,
                'reorder_level' => 20,
            ],
            [
                'supplier_id' => $supplierKarachi->id,
                'name' => 'Adjustable Aluminum Laptop Stand',
                'sku' => 'STN-ALUM-ADJ',
                'category' => 'Mounts & Stands',
                'description' => 'Foldable heat-dissipation aluminum alloy desk stand.',
                'cost_price' => 2200.00,
                'selling_price' => 3800.00,
                'stock_quantity' => 3,
                'reorder_level' => 8,
            ],
        ];

        $createdProducts = [];
        foreach ($catalog as $item) {
            $stock = $item['stock_quantity'];
            $product = Product::firstOrCreate(['sku' => $item['sku']], $item);
            $createdProducts[$product->sku] = $product;

            StockMovement::firstOrCreate(
                [
                    'product_id' => $product->id,
                    'type' => StockMovement::TYPE_INITIAL,
                ],
                [
                    'user_id' => $admin->id,
                    'quantity' => $stock,
                    'quantity_before' => 0,
                    'quantity_after' => $stock,
                    'reference_type' => Product::class,
                    'reference_id' => $product->id,
                    'reason' => 'Initial stock intake',
                ]
            );
        }

        $order1 = Order::firstOrCreate(
            ['order_number' => 'ORD-20261031-0001'],
            [
                'customer_id' => $customerGaming->id,
                'user_id' => $staff->id,
                'status' => Order::STATUS_CONFIRMED,
                'subtotal' => 24900.00,
                'tax_rate' => 5.00,
                'tax_amount' => 1245.00,
                'discount_amount' => 0.00,
                'total_amount' => 26145.00,
                'stock_reserved' => true,
                'notes' => 'Deliver to DHA Lahore branch.',
                'confirmed_at' => Carbon::now()->subHours(2),
                'created_at' => Carbon::now()->subHours(2),
            ]
        );

        OrderItem::firstOrCreate(
            [
                'order_id' => $order1->id,
                'product_id' => $createdProducts['KBD-MECH-RGB']->id,
            ],
            [
                'product_name' => $createdProducts['KBD-MECH-RGB']->name,
                'product_sku' => $createdProducts['KBD-MECH-RGB']->sku,
                'quantity' => 2,
                'unit_price' => 9500.00,
                'subtotal' => 19000.00,
            ]
        );

        OrderItem::firstOrCreate(
            [
                'order_id' => $order1->id,
                'product_id' => $createdProducts['MOU-ERGO-WL']->id,
            ],
            [
                'product_name' => $createdProducts['MOU-ERGO-WL']->name,
                'product_sku' => $createdProducts['MOU-ERGO-WL']->sku,
                'quantity' => 2,
                'unit_price' => 2950.00,
                'subtotal' => 5900.00,
            ]
        );

        OrderStatusHistory::firstOrCreate(
            [
                'order_id' => $order1->id,
                'to_status' => Order::STATUS_CONFIRMED,
            ],
            [
                'user_id' => $staff->id,
                'from_status' => null,
                'comment' => 'Order created and confirmed.',
            ]
        );

        $order2 = Order::firstOrCreate(
            ['order_number' => 'ORD-20261031-0002'],
            [
                'customer_id' => $customerSolutions->id,
                'user_id' => $admin->id,
                'status' => Order::STATUS_DELIVERED,
                'subtotal' => 18450.00,
                'tax_rate' => 5.00,
                'tax_amount' => 922.50,
                'discount_amount' => 0.00,
                'total_amount' => 19372.50,
                'stock_reserved' => true,
                'notes' => 'Direct dispatch via courier.',
                'confirmed_at' => Carbon::now()->subDays(1),
                'created_at' => Carbon::now()->subDays(1),
            ]
        );

        OrderItem::firstOrCreate(
            [
                'order_id' => $order2->id,
                'product_id' => $createdProducts['CHG-GAN-65W']->id,
            ],
            [
                'product_name' => $createdProducts['CHG-GAN-65W']->name,
                'product_sku' => $createdProducts['CHG-GAN-65W']->sku,
                'quantity' => 3,
                'unit_price' => 4500.00,
                'subtotal' => 13500.00,
            ]
        );

        OrderItem::firstOrCreate(
            [
                'order_id' => $order2->id,
                'product_id' => $createdProducts['CBL-HDMI-2M']->id,
            ],
            [
                'product_name' => $createdProducts['CBL-HDMI-2M']->name,
                'product_sku' => $createdProducts['CBL-HDMI-2M']->sku,
                'quantity' => 3,
                'unit_price' => 1650.00,
                'subtotal' => 4950.00,
            ]
        );

        OrderStatusHistory::firstOrCreate(
            [
                'order_id' => $order2->id,
                'to_status' => Order::STATUS_CONFIRMED,
            ],
            [
                'user_id' => $admin->id,
                'from_status' => null,
                'comment' => 'Order created.',
            ]
        );

        OrderStatusHistory::firstOrCreate(
            [
                'order_id' => $order2->id,
                'to_status' => Order::STATUS_DELIVERED,
            ],
            [
                'user_id' => $staff->id,
                'from_status' => Order::STATUS_CONFIRMED,
                'comment' => 'Order delivered to site.',
            ]
        );
    }
}
