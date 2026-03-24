<?php

namespace Framio\UploadExif\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\Api\Controller\AbstractDeleteController;
use Psr\Http\Message\ServerRequestInterface;
use Framio\UploadExif\Database\FramioImage;
use Illuminate\Support\Arr;

class DeleteImageController extends AbstractDeleteController
{
    protected function delete(ServerRequestInterface $request)
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();

        $id = Arr::get($request->getQueryParams(), 'id');
        $image = FramioImage::findOrFail($id);

        // Kural: Kullanıcı sadece kendi resmini silebilir VEYA Admin herkesinkini silebilir.
        if ($image->user_id !== $actor->id && !$actor->isAdmin()) {
            throw new \Flarum\User\Exception\PermissionDeniedException;
        }

        // Dosyaları fiziksel olarak sil
        $basePath = public_path(); 
        // path veritabanında /assets/framio/... şeklinde kayıtlı, başındaki /'ı temizle
        $relativePath = ltrim($image->path, '/');
        $relativeThumb = ltrim($image->thumb_path, '/');

        if (file_exists("$basePath/$relativePath")) @unlink("$basePath/$relativePath");
        if (file_exists("$basePath/$relativeThumb")) @unlink("$basePath/$relativeThumb");

        // Veritabanından sil
        $image->delete();
    }
}