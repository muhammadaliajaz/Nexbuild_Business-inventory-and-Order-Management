<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasFactory;

    public const TYPE_INITIAL = 'initial';
    public const TYPE_MANUAL_ADJUSTMENT = 'manual_adjustment';
    public const TYPE_PURCHASE_RECEIVED = 'purchase_received';
    public const TYPE_ORDER_FULFILLMENT = 'order_fulfillment';
    public const TYPE_ORDER_CANCELLATION_RESTOCK = 'order_cancellation_restock';
    public const TYPE_RETURN = 'return';

    public const TYPES = [
        self::TYPE_INITIAL,
        self::TYPE_MANUAL_ADJUSTMENT,
        self::TYPE_PURCHASE_RECEIVED,
        self::TYPE_ORDER_FULFILLMENT,
        self::TYPE_ORDER_CANCELLATION_RESTOCK,
        self::TYPE_RETURN,
    ];

    protected $fillable = [
        'product_id',
        'user_id',
        'type',
        'quantity',
        'quantity_before',
        'quantity_after',
        'reference_type',
        'reference_id',
        'reason',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'quantity_before' => 'integer',
        'quantity_after' => 'integer',
        'reference_id' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeProduct(Builder $query, ?int $productId): Builder
    {
        if (!$productId) {
            return $query;
        }

        return $query->where('product_id', $productId);
    }

    public function scopeType(Builder $query, ?string $type): Builder
    {
        if (empty($type) || $type === 'all') {
            return $query;
        }

        return $query->where('type', $type);
    }

    public function scopeDateRange(Builder $query, ?string $from, ?string $to): Builder
    {
        if ($from) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to) {
            $query->whereDate('created_at', '<=', $to);
        }

        return $query;
    }
}

