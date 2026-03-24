<?php

namespace Framio\UploadExif\Listener;

use Flarum\Post\Event\Saving;
use Framio\UploadExif\Database\FramioImage;

class SaveAltTagFromContent
{
    public function handle(Saving $event)
    {
        $post = $event->post;
        $content = $post->content;

        if (empty($content) || strpos($content, '[framio-image') === false) {
            return;
        }

        $baseUrl = "https://storage.googleapis.com/framio-turkey-storage.firebasestorage.app/assets/framio/";

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
            $finalUrl = str_replace(['"', "'"], ['', ''], $finalUrl);

            preg_match_all('/^\s*[-*]\s*(?:\*\*)?(.+?)(?:\*\*)?\s*$/m', $post->content, $attrMatches);
            
            if (!empty($attrMatches[1])) {
                $first2 = array_slice(array_map('trim', $attrMatches[1]), 0, 2);
                $cleanAlt = implode(' - ', $first2);
            } else {
                $cleanAlt = $image->filename;
            }
            
            $cleanAlt = str_replace(['"', '[', ']'], '', $cleanAlt);

            return '[framio-image id="' . $id . '" url="' . $finalUrl . '" alt="' . $cleanAlt . '"]';
        }, $content);

        if ($newContent !== $post->content) {
            $post->content = $newContent;
        }
    }
}