<?php

namespace Framio\UploadExif\Api\Controller\Watermark;

use Flarum\Http\RequestUtil;
use Flarum\Foundation\Paths;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class ListWatermarksController implements RequestHandlerInterface
{
    protected $paths;

    public function __construct(Paths $paths)
    {
        $this->paths = $paths;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered(); // Only registered users can fetch watermarks

        $watermarkDir = public_path('assets/watermarks');
        
        if (!is_dir($watermarkDir)) {
            return new JsonResponse(['data' => []], 200);
        }

        $files = array_diff(scandir($watermarkDir), ['.', '..']);
        $watermarks = [];

        foreach ($files as $file) {
            if (pathinfo($file, PATHINFO_EXTENSION) === 'png') {
                // Determine file url
                $watermarks[] = [
                    'filename' => $file,
                    'url' => app()->url() . '/assets/watermarks/' . $file
                ];
            }
        }

        return new JsonResponse(['data' => $watermarks], 200);
    }
}
