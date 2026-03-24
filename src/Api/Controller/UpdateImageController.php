<?php

namespace Framio\UploadExif\Api\Controller;

use Flarum\Api\Controller\AbstractShowController;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;
use Framio\UploadExif\Database\FramioImage;
use Framio\UploadExif\Api\Serializer\FramioImageSerializer;
use Flarum\User\Exception\PermissionDeniedException;
use Illuminate\Support\Arr;

class UpdateImageController extends AbstractShowController
{
    public $serializer = FramioImageSerializer::class;

    protected function data(ServerRequestInterface $request, Document $document)
    {
        // 1. Kullanıcıyı ve Resim ID'sini al
        $actor = $request->getAttribute('actor');
        $imageId = Arr::get($request->getQueryParams(), 'id');
        
        // 2. Resmi bul
        $image = FramioImage::findOrFail($imageId);

        // 3. Yetki Kontrolü (Sadece sahibi veya admin)
        if ($actor->id !== $image->user_id && !$actor->isAdmin()) {
            throw new PermissionDeniedException;
        }

        // 4. Gelen verileri al
        $data = Arr::get($request->getParsedBody(), 'data.attributes', []);

        // 5. Verileri güncelle
        if (isset($data['title'])) {
            $image->title = $data['title'];
        }
        
        if (isset($data['description'])) {
            $image->description = $data['description'];
        }

        // 6. Kaydet
        $image->save();

        return $image;
    }
}