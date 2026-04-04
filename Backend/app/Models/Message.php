<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'contenu',
        'lu',
        'sender_id',
        'recipient_id',
        'attachment_path',
        'attachment_name',
        'attachment_type',
        'attachment_size',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'lu' => 'boolean',
            'read_at' => 'datetime',
            'attachment_size' => 'integer',
        ];
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    /**
     * Vérifie si le message a une pièce jointe.
     */
    public function hasAttachment(): bool
    {
        return !empty($this->attachment_path);
    }

    /**
     * URL de téléchargement de la pièce jointe.
     */
    public function getAttachmentUrlAttribute(): ?string
    {
        if (!$this->attachment_path) {
            return null;
        }
        return route('messages.attachment', $this->id);
    }
}
