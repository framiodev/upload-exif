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

        $watermarkDir = public_path('assets/watermarks');
        if (!is_dir($watermarkDir)) {
            mkdir($watermarkDir, 0755, true);
        }

        $extension = pathinfo($file->getClientFilename(), PATHINFO_EXTENSION);
        if (strtolower($extension) !== 'png') {
            return new JsonResponse(['error' => 'Sadece PNG dosyaları yüklenebilir.'], 400);
        }

        $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($file->getClientFilename(), PATHINFO_FILENAME));
        $finalFilename = $safeName . '-' . time() . '.png';
        
        $localFullPath = $watermarkDir . '/' . $finalFilename;
        $file->moveTo($localFullPath);

        // Resize if too big (optional, but good for standardization)
        $driver = extension_loaded('imagick') ? 'imagick' : 'gd';
        $manager = new ImageManager(['driver' => $driver]);
        $img = $manager->make($localFullPath);

        if ($img->width() > 1000) {
            $img->resize(1000, null, function ($c) { $c->aspectRatio(); });
            $img->save($localFullPath);
        }
        $img->destroy();

        return new JsonResponse([
            'filename' => $finalFilename,
            'url' => app()->url() . '/assets/watermarks/' . $finalFilename
        ], 200);
    }
}
