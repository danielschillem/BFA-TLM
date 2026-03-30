<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Icd11Chapter extends Model
{
    protected $fillable = [
        'code',
        'code_range',
        'title',
        'definition',
        'uri',
        'class_kind',
        'browser_url',
        'parent_id',
        'depth',
        'sort_order',
        'is_leaf',
        'is_residual',
    ];

    protected function casts(): array
    {
        return [
            'depth' => 'integer',
            'sort_order' => 'integer',
            'is_leaf' => 'boolean',
            'is_residual' => 'boolean',
        ];
    }

    // ── Relations ──

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    // ── Scopes ──

    public function scopeChapters($query)
    {
        return $query->where('depth', 0)->orderBy('sort_order');
    }

    public function scopeByDepth($query, int $depth)
    {
        return $query->where('depth', $depth)->orderBy('sort_order');
    }

    public function scopeLeaves($query)
    {
        return $query->where('is_leaf', true);
    }
}
