<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function adjustStock(
        int $productId,
        int $quantityChange,
        string $type,
        string $reason,
        ?int $userId = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): StockMovement {
        if ($quantityChange === 0) {
            throw ValidationException::withMessages([
                'quantity' => ['Quantity change must not be zero.'],
            ]);
        }

        if (trim($reason) === '') {
            throw ValidationException::withMessages([
                'reason' => ['A valid reason is required for every stock adjustment.'],
            ]);
        }

        return DB::transaction(function () use (
            $productId,
            $quantityChange,
            $type,
            $reason,
            $userId,
            $referenceType,
            $referenceId
        ) {
            $product = Product::where('id', $productId)->lockForUpdate()->firstOrFail();

            $before = $product->stock_quantity;
            $after = $before + $quantityChange;

            if ($after < 0) {
                throw ValidationException::withMessages([
                    'quantity' => [
                        "Insufficient stock for {$product->name} (SKU: {$product->sku}). Current stock: {$before}, requested deduction: " . abs($quantityChange),
                    ],
                ]);
            }

            $product->stock_quantity = $after;
            $product->save();

            return StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $userId,
                'type' => $type,
                'quantity' => $quantityChange,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reason' => $reason,
            ]);
        });
    }
}

