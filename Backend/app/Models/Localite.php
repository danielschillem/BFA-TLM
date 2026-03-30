<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Localite extends Model
{
    protected $fillable = ['region', 'province', 'commune', 'village', 'pays_id'];

    public function pays()
    {
        return $this->belongsTo(Pays::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function structures()
    {
        return $this->hasMany(Structure::class);
    }
}
