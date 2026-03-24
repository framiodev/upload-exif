<?php

namespace Framio\UploadExif\Api\Controller;

use Flarum\Http\RequestUtil;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;
use Framio\UploadExif\Database\FramioImage;
use Illuminate\Support\Arr;

class ShowImageController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // URL'den gelen ID'yi al (Örn: /framio-image/15)
        $id = Arr::get($request->getQueryParams(), 'id');
        
        // Veritabanında bu ID'ye sahip resmi bul, yoksa 404 hatası ver
        $image = FramioImage::findOrFail($id);

        // Resmin tüm bilgilerini (EXIF dahil) JSON olarak döndür
        return new JsonResponse($image);
    }
}