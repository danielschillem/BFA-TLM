<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Specialite extends Model
{
    protected $fillable = ['libelle', 'categorie', 'description'];
}
