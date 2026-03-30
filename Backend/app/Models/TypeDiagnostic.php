<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TypeDiagnostic extends Model
{
    protected $fillable = ['libelle', 'description'];

    public function diagnostics()
    {
        return $this->hasMany(Diagnostic::class);
    }
}
