<?php

namespace Framio\UploadExif\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\Post\Post;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Foundation\Paths;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Framio\UploadExif\Database\FramioImage;
use Framio\UploadExif\Service\FirebaseService;

class EditImageController implements RequestHandlerInterface
{
    protected $settings;
    protected $paths;
    protected $firebaseService;

    public function __construct(SettingsRepositoryInterface $settings, Paths $paths, FirebaseService $firebaseService)
    {
        $this->settings = $settings;
        $this->paths = $paths;
        $this->firebaseService = $firebaseService;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $id = \Illuminate\Support\Arr::get($request->getQueryParams(), 'id');
        $data = $request->getParsedBody();
        $newNameRaw = $data['name'] ?? null;

        if (!$id || !$newNameRaw) {
            return new JsonResponse(['error' => 'Eksik parametre.'], 400);
        }

        $image = FramioImage::find($id);
        if (!$image) {
            return new JsonResponse(['error' => 'Görsel bulunamadı.'], 404);
        }

        $info = pathinfo($image->filename);
        $ext = $info['extension'] ?? 'jpg';

        $safeName = preg_replace('/[^a-zA-Z0-9\s\-_]/u', '', $newNameRaw);
        $safeName = trim($safeName);

        if (empty($safeName)) {
            $safeName = time();
        }

        $newFilename = $safeName . '.' . $ext;

        $urlSafeName = str_replace([' ', '_'], '-', $safeName);

        $newSafeName = time() . '_' . $urlSafeName . '.' . $ext;
        $newOriginalSafeName = time() . '_' . $urlSafeName . '_orijinal.' . $ext;

        $bucketName = $this->firebaseService->getBucketName();
        $bucketPrefix = $bucketName . '/';
        $relativeOldPath = str_replace('https://storage.googleapis.com/' . $bucketPrefix, '', $image->path);
        $folderPath = dirname($relativeOldPath);

        $oldName = basename($image->path);
        $oldThumbName = basename($image->thumb_path);
        $oldMiniName = 'mini_' . str_replace('thumb_', '', $oldThumbName);
        $oldOriginalName = $image->original_path ? basename($image->original_path) : null;

        try {
            $storage = $this->firebaseService->getStorageClient();
            $bucketName = $this->firebaseService->getBucketName();
            $bucket = $storage->bucket($bucketName);

            $this->renameOnCloud($bucket, $folderPath . '/' . $oldName, $folderPath . '/' . $newSafeName);

            $newThumbName = 'thumb_' . $newSafeName;
            $this->renameOnCloud($bucket, $folderPath . '/' . $oldThumbName, $folderPath . '/' . $newThumbName);

            $newMiniName = 'mini_' . $newSafeName;
            $this->renameOnCloud($bucket, $folderPath . '/' . $oldMiniName, $folderPath . '/' . $newMiniName);

            $newOriginalUrl = null;
            if ($oldOriginalName) {
                $this->renameOnCloud($bucket, $folderPath . '/' . $oldOriginalName, $folderPath . '/' . $newOriginalSafeName);
                $newOriginalUrl = 'https://storage.googleapis.com/' . $bucketName . '/' . $folderPath . '/' . $newOriginalSafeName;
            }

            $baseUrl = 'https://storage.googleapis.com/' . $bucketName . '/' . $folderPath . '/';
            $newPath = $baseUrl . $newSafeName;
            $newThumbPath = $baseUrl . $newThumbName;

            $oldThumbUrl = $image->thumb_path;
            $oldMainUrl = $image->path;

            $posts = Post::where('content', 'like', '%' . $image->id . '%')
                ->where(function ($q) use ($oldThumbUrl, $oldMainUrl, $image) {
                    $q->where('content', 'like', '%[framio-image id=' . $image->id . '%')
                      ->orWhere('content', 'like', '%' . basename($oldThumbUrl) . '%')
                      ->orWhere('content', 'like', '%' . basename($oldMainUrl) . '%');
                })
                ->get();

            foreach ($posts as $post) {
                $newContent = $post->content;

                $pattern = '/\[framio-image id=' . $image->id . ' url="([^"]+)" alt="([^"]+)"\]/';
                $replacement = '[framio-image id=' . $image->id . ' url="' . $newThumbPath . '" alt="' . $safeName . '"]';
                $newContent = preg_replace($pattern, $replacement, $newContent);

                $patternNoQuote = '/\[framio-image id=' . $image->id . ' url=([^\s\]]+) alt=([^\]]+)\]/';
                $replacementNoQuote = '[framio-image id=' . $image->id . ' url=' . $newThumbPath . ' alt=' . $safeName . ']';
                $newContent = preg_replace($patternNoQuote, $replacementNoQuote, $newContent);

                if ($oldThumbUrl) {
                    $newContent = str_replace(basename($oldThumbUrl), $newThumbName, $newContent);
                }
                if ($oldMainUrl && $oldMainUrl !== $oldThumbUrl) {
                    $newContent = str_replace(basename($oldMainUrl), $newSafeName, $newContent);
                }

                if ($newContent !== $post->content) {
                    $post->content = $newContent;
                    $post->save();
                }
            }

            $image->filename = $newFilename;
            $image->path = $newPath;
            $image->thumb_path = $newThumbPath;
            if ($newOriginalUrl) {
                $image->original_path = $newOriginalUrl;
            }
            $image->save();

            return new JsonResponse([
                'success' => true,
                'filename' => $newFilename,
                'url' => $newPath,
                'thumb_path' => $newThumbPath
            ]);

        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'İsim değiştirme hatası: ' . $e->getMessage()], 500);
        }
    }

    private function renameOnCloud($bucket, $oldPath, $newPath)
    {
        $object = $bucket->object($oldPath);
        if ($object->exists()) {
            $object->copy($bucket, [
                'name' => $newPath,
                'predefinedAcl' => 'publicRead'
            ]);
            $object->delete();
        }
    }
}