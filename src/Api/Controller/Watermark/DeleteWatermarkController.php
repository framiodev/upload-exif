<?php

namespace Framio\UploadExif\Api\Controller\Watermark;

use Flarum\Http\RequestUtil;
use Flarum\Foundation\Paths;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Laminas\Diactoros\Response\EmptyResponse;

class DeleteWatermarkController implements RequestHandlerInterface
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

        $filename = \Illuminate\Support\Arr::get($request->getQueryParams(), 'filename');

        if (!$filename || preg_match('/\.\./', $filename)) {
             return new JsonResponse(['error' => 'Gecersiz dosya adi.'], 400);
        }

        $watermarkDir = $this->paths->public . '/assets/watermarks';
        $fullPath = $watermarkDir . '/' . basename($filename);

        if (file_exists($fullPath)) {
            @unlink($fullPath);
            return new EmptyResponse(204);
        }

        return new JsonResponse(['error' => 'Dosya bulunamadi.'], 404);
    }
}
