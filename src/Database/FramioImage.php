<?php

namespace Framio\UploadExif\Database;

use Flarum\Database\AbstractModel;
use Flarum\User\User;

class FramioImage extends AbstractModel
{
    protected $table = 'framio_images';

    protected $casts = [
        'created_at' => 'datetime',
        // exif_data JSON ise onu da ekleyebiliriz ama şu an şart değil
    ];

    // Bu ilişkiyi eklemezsek Admin panelinde "Yükleyen: Bilinmiyor" yazar
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}