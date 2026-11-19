<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 40)->index(); // manual_adjustment, purchase_received, order_fulfillment, order_cancellation_restock, return, initial
            $table->integer('quantity'); // delta: positive or negative
            $table->integer('quantity_before');
            $table->integer('quantity_after');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('reason');
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
