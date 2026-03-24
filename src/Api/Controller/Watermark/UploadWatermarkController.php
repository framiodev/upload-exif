<?php

namespace Framio\UploadExif\Api\Controller\Watermark;

use Flarum\Http\RequestUtil;
use Flarum\Foundation\Paths;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Intervention\Image\ImageManager;

class UploadWatermarkController implements RequestHandlerInterface
{
    protected $paths;

    public function __construct(Paths $paths)
    {
        $this->paths = $paths;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $files = $request->getUploadedFiles();
        $file = $files['watermark'] ?? null;

        if (!$file || $file->getError() !== UPLOAD_ERR_OK) {
             return new JsonResponse(['error' => 'Dosya yüklenemedi.'], 400);
        }

        $watermarkDir = $this->paths->public . '/assets/watermarks';
        if (!is_dir($watermarkDir)) {
            mkdir($watermarkDir, 0755, true);
        }

        $extension = pathinfo($file->getClientFilename(), PATHINFO_EXTENSION);
        if (strtolower($extension) !== 'png') {
            return new JsonResponse(['error' => 'Sadece PNG dosyalari yuklenebilir.'], 400);
        }

        $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($file->getClientFilename(), PATHINFO_FILENAME));
        $finalFilename = $safeName . '-' . time() . '.png';
        
        $localFullPath = $watermarkDir . '/' . $finalFilename;
        $file->moveTo($localFullPath);

        $driver = extension_loaded('imagick') ? 'imagick' : 'gd';
        $manager = new ImageManager(['driver' => $driver]);
        $img = $manager->make($localFullPath);

        if ($img->width() > 1000) {
            $img->resize(1000, null, function ($c) { $c->aspectRatio(); });
            $img->save($localFullPath);
        }
        $img->destroy();

        $baseUrl = resolve(\Flarum\Http\UrlGenerator::class)->to('forum')->base();

        return new JsonResponse([
            'filename' => $finalFilename,
            'url' => $baseUrl . '/assets/watermarks/' . $finalFilename
        ], 200);
    }
}
