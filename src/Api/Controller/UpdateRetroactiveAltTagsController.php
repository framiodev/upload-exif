<?php

namespace Framio\UploadExif\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\Post\Post;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Framio\UploadExif\Database\FramioImage;

class UpdateRetroactiveAltTagsController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $updatedCount = 0;
        $baseUrl = "https://storage.googleapis.com/framio-turkey-storage.firebasestorage.app/assets/framio/";

        Post::where('type', 'comment')
            ->where('content', 'like', '%[framio-image%')
            ->chunkById(50, function ($posts) use (&$updatedCount, $baseUrl) {
                foreach ($posts as $post) {
                    $content = $post->content;
                    
                    $newContent = preg_replace_callback('/\[framio-image\s+([^\]]+)\]/is', function($matches) use ($post, $baseUrl) {
                        $tagBody = $matches[1];
                        preg_match('/id=["\']?(\d+)["\']?/i', $tagBody, $idMatch);
                        $id = $idMatch[1] ?? null;

                        if (!$id) return $matches[0];

                        $image = FramioImage::find($id);
                        if (!$image) return $matches[0];

                        preg_match('/url=["\']?([^"\'\s\]]+)["\']?/i', $tagBody, $urlMatch);
                        $currentUrl = $urlMatch[1] ?? '';

                        if (strpos($currentUrl, 'thumb_') !== false) {
                            $rawPath = !empty($image->thumb_path) ? $image->thumb_path : $image->path;
                        } else {
                            $rawPath = !empty($image->path) ? $image->path : $image->thumb_path;
                        }

                        $cleanPath = str_replace($baseUrl, '', $rawPath);
                        $finalUrl = $baseUrl . ltrim($cleanPath, '/');
                        $finalUrl = str_replace(['%20', '"', "'"], [' ', '', ''], $finalUrl);

                        preg_match_all('/^\s*[-*]\s*(?:\*\*)?(.+?)(?:\*\*)?\s*$/m', $post->content, $attrMatches);
                        $cleanAlt = !empty($attrMatches[1]) ? implode(' - ', array_map('trim', $attrMatches[1])) : $image->filename;
                        $cleanAlt = str_replace(['"', '[', ']'], '', $cleanAlt);

                        return '[framio-image id="' . $id . '" url="' . $finalUrl . '" alt="' . $cleanAlt . '"]';
                    }, $content);

                    if ($newContent !== $post->content) {
                        $post->content = $newContent;
                        $post->save();
                        $updatedCount++;
                    }
                }
            });

        return new JsonResponse(['success' => true, 'updated_count' => $updatedCount]);
    }
}