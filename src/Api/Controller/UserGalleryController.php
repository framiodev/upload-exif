<?php
namespace Framio\UploadExif\Api\Controller;
use Flarum\Http\RequestUtil;
use Framio\UploadExif\Database\FramioImage;
use Laminas\Diactoros\Response\JsonResponse;

class UserGalleryController implements \Psr\Http\Server\RequestHandlerInterface {
    public function handle(\Psr\Http\Message\ServerRequestInterface $request): \Psr\Http\Message\ResponseInterface {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();

        $images = FramioImage::where('user_id', $actor->id)
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get();

        $images->transform(function ($img) {
            $img->mini_url = str_replace('thumb_', 'mini_', $img->thumb_path);
            return $img;
        });

        return new JsonResponse($images);
    }
}