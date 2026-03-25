<?php

namespace Framio\UploadExif\Api\Controller;

use Flarum\User\User;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Foundation\Paths;
use Intervention\Image\ImageManager;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Framio\UploadExif\Database\FramioImage;
use Framio\UploadExif\Service\FirebaseService;

class UploadImageController implements RequestHandlerInterface
{
    protected $uploadPath;
    protected $urlPath;
    protected $settings;
    protected $paths;
    protected $firebaseService; 

    public function __construct(SettingsRepositoryInterface $settings, Paths $paths, FirebaseService $firebaseService)
    {
        $this->settings = $settings;
        $this->paths = $paths;
        $this->firebaseService = $firebaseService;
        $this->uploadPath = public_path('assets/temp_processing');
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // 1. AYARLAR
        $maxWidth   = (int) ($this->settings->get('framio-upload-exif.resize_width') ?: 3840);
        $quality    = (int) ($this->settings->get('framio-upload-exif.compression_quality') ?: 90);
        $thumbWidth = (int) ($this->settings->get('framio-upload-exif.thumb_width') ?: 1024);
        $miniWidth  = (int) ($this->settings->get('framio-upload-exif.mini_width') ?: 250);

        // Orijinal (Yedek) Ayarları
        $origResize = $this->settings->get('framio-upload-exif.original_resize_width');
        $origQuality = $this->settings->get('framio-upload-exif.original_compression_quality'); 

        @ini_set('memory_limit', '1024M');
        @ini_set('max_execution_time', 300);

        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();

        $files = $request->getUploadedFiles();
        $file = $files['framio_image'] ?? null;
        $body = $request->getParsedBody();
        $watermarkId = $body['watermark_type'] ?? 'none';
        
        // Admin Parametreleri
        $targetUsername = $body['target_username'] ?? null;
        // Framio'de özel imza olmadığı için targetWatermarkType'a gerek yok,
        // ama parametre olarak gelirse de kod kırılmasın diye bırakıyoruz.

        if (!$file || $file->getError() !== UPLOAD_ERR_OK) {
             return new JsonResponse(['error' => 'Dosya yüklenemedi.'], 400);
        }

        // 2. DOSYA İŞLEMLERİ
        if (!is_dir($this->uploadPath)) mkdir($this->uploadPath, 0755, true);

        $originalName = $file->getClientFilename();
        $safeName = time() . '_' . $originalName; 
        $localFullPath = "$this->uploadPath/$safeName";
        
        $file->moveTo($localFullPath);

        // EXIF
        $exifRaw = @exif_read_data($localFullPath);
        $cleanExif = $this->parseExif($exifRaw);

        // --- ORİJİNAL YEDEK OLUŞTURMA ---
        $pathInfo = pathinfo($safeName);
        $ext = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
        $originalSafeName = $pathInfo['filename'] . '_orijinal' . $ext;
        $tempBackupPath = "$this->uploadPath/$originalSafeName";
        
        copy($localFullPath, $tempBackupPath); // Ham kopyayı al

        $driver = extension_loaded('imagick') ? 'imagick' : 'gd';
        $manager = new ImageManager(['driver' => $driver]);

        // --- ORİJİNAL DOSYAYI İŞLE (YEDEK) ---
        // Ayar varsa işle, yoksa ham kalsın.
        if (($origResize && (int)$origResize > 0) || ($origQuality && (int)$origQuality < 100)) {
            $imgOrigBackup = $manager->make($tempBackupPath);
            if ($origResize) {
                $imgOrigBackup->resize($origResize, null, function ($c) { $c->aspectRatio(); $c->upsize(); });
            }
            $q = $origQuality ? (int)$origQuality : 100;
            $imgOrigBackup->save($tempBackupPath, $q);
            $imgOrigBackup->destroy();
        }

        // --- ANA VİTRİN DOSYASINI İŞLE ---
        $imgOriginal = $manager->make($localFullPath);

        if ($imgOriginal->width() > $maxWidth) {
            $imgOriginal->resize($maxWidth, null, function ($c) { $c->aspectRatio(); });
        }

        // Watermark (Framio Standart 9 İmza)
        if ($watermarkId !== 'none') {
            $wmPath = $this->paths->public . '/assets/watermarks/' . $watermarkId;
            if (file_exists($wmPath)) {
                $wm = $manager->make($wmPath);
                $targetWidth = $imgOriginal->width();
                $targetHeight = $imgOriginal->height();
                $wmWidth = $wm->width();
                $wmHeight = $wm->height();
                $targetRatio = $targetWidth / $targetHeight;
                $wmRatio = $wmWidth / $wmHeight;

                if ($targetRatio > $wmRatio) {
                    $wm->resize($targetWidth, null, function ($c) { $c->aspectRatio(); });
                } else {
                    $wm->resize(null, $targetHeight, function ($c) { $c->aspectRatio(); });
                }

                $cropX = intval(($wm->width() - $targetWidth) / 2);
                $cropY = intval($wm->height() - $targetHeight);
                $wm->crop($targetWidth, $targetHeight, $cropX, $cropY);
                $imgOriginal->insert($wm, 'center');
            }
        }

        $imgOriginal->save($localFullPath, $quality); 
        $this->transferExifData($tempBackupPath, $localFullPath); // EXIF'i orijinalden aktar

        // Thumbnails
        $imgThumb = clone $imgOriginal; 
        if ($imgThumb->width() > $thumbWidth) {
            $imgThumb->resize($thumbWidth, null, function ($c) { $c->aspectRatio(); });
        }
        $thumbName = 'thumb_' . $safeName;
        $localThumbPath = "$this->uploadPath/$thumbName";
        $imgThumb->save($localThumbPath, 80);

        $imgMini = clone $imgOriginal;
        if ($imgMini->width() > $miniWidth) {
            $imgMini->resize($miniWidth, null, function ($c) { $c->aspectRatio(); });
        }
        $miniName = 'mini_' . $safeName;
        $localMiniPath = "$this->uploadPath/$miniName";
        $imgMini->save($localMiniPath, 70);

        // --- FIREBASE UPLOAD ---
        try {
            $storage = $this->firebaseService->getStorageClient();
            $bucketName = $this->firebaseService->getBucketName();
            $bucket = $storage->bucket($bucketName);

            $subDir = date('Y/m');
            $cloudFolder = 'assets/framio/' . $subDir . '/';

            // Upload - Ana, Thumb, Mini
            $bucket->upload(fopen($localFullPath, 'r'), ['name' => $cloudFolder . $safeName, 'predefinedAcl' => 'publicRead']);
            $bucket->upload(fopen($localThumbPath, 'r'), ['name' => $cloudFolder . $thumbName, 'predefinedAcl' => 'publicRead']);
            $bucket->upload(fopen($localMiniPath, 'r'), ['name' => $cloudFolder . $miniName, 'predefinedAcl' => 'publicRead']);

            // Upload - Orijinal (Yedek)
            $bucket->upload(fopen($tempBackupPath, 'r'), ['name' => $cloudFolder . $originalSafeName, 'predefinedAcl' => 'publicRead']);

            $firebaseBaseUrl = 'https://storage.googleapis.com/' . $bucketName;
            $finalMainUrl = $firebaseBaseUrl . '/' . $cloudFolder . $safeName;
            $finalThumbUrl = $firebaseBaseUrl . '/' . $cloudFolder . $thumbName;
            $finalOriginalUrl = $firebaseBaseUrl . '/' . $cloudFolder . $originalSafeName;

        } catch (\Exception $e) {
            @unlink($localFullPath); @unlink($localThumbPath); @unlink($localMiniPath); @unlink($tempBackupPath);
            return new JsonResponse(['error' => 'Upload Hatası: ' . $e->getMessage()], 500);
        }

        // Temizlik ve Kayıt
        @unlink($localFullPath); @unlink($localThumbPath); @unlink($localMiniPath); @unlink($tempBackupPath);

        // SAHİPLİK AYARI (Admin Override)
        $ownerId = $actor->id;
        if ($actor->isAdmin() && !empty($targetUsername)) {
            $targetUserObj = User::where('username', trim($targetUsername))->first();
            if ($targetUserObj) {
                $ownerId = $targetUserObj->id;
            }
        }

        $imageModel = new FramioImage();
        $imageModel->user_id = $ownerId;
        $imageModel->filename = $originalName;
        $imageModel->path = $finalMainUrl;
        $imageModel->thumb_path = $finalThumbUrl;
        $imageModel->original_path = $finalOriginalUrl; // YENİ: Orijinal yol kaydedildi
        $imageModel->exif_data = json_encode($cleanExif);
        $imageModel->save();

        $pathInfo = pathinfo($originalName);
        $altText = str_replace(['-', '_'], ' ', $pathInfo['filename']);
        $bbcode = "[framio-image id={$imageModel->id} url={$imageModel->thumb_path} alt={$altText}]";

        return new JsonResponse([
            'id' => $imageModel->id,
            'url' => $imageModel->path,
            'original_url' => $imageModel->original_path,
            'bbcode' => $bbcode
        ]);
    }

    // --- YARDIMCI METODLAR ---
    private function parseExif($exif) { if (!$exif || !is_array($exif)) return null; $make = isset($exif['Make']) ? trim($exif['Make']) : 'Bilinmiyor'; $model = isset($exif['Model']) ? trim($exif['Model']) : 'Bilinmiyor'; if ($make !== 'Bilinmiyor' && stripos($model, $make) === 0) { $model = trim(substr($model, strlen($make))); } $focal = isset($exif['FocalLength']) ? $this->evalFraction($exif['FocalLength']) . ' mm' : null; $aperture = $exif['COMPUTED']['ApertureFNumber'] ?? $exif['FNumber'] ?? null; $exposure = $exif['ExposureTime'] ?? null; $iso = $exif['ISOSpeedRatings'] ?? $exif['ISOSpeed'] ?? null; if (is_array($iso)) $iso = $iso[0]; $lens = $exif['LensModel'] ?? $exif['LensInfo'] ?? $exif['UndefinedTag:0xA434'] ?? null; $lat = $this->getGps($exif['GPSLatitude'] ?? null, $exif['GPSLatitudeRef'] ?? null); $lon = $this->getGps($exif['GPSLongitude'] ?? null, $exif['GPSLongitudeRef'] ?? null); return [ 'make' => $make, 'model' => $model, 'lens' => $lens, 'aperture' => $aperture, 'exposure' => $exposure, 'iso' => $iso, 'focal' => $focal, 'date' => $exif['DateTimeOriginal'] ?? null, 'lat' => $lat, 'lon' => $lon ]; }
    private function getGps($exifCoord, $hemi) { if (!isset($exifCoord) || !isset($hemi)) return null; $degrees = count($exifCoord) > 0 ? $this->evalFraction($exifCoord[0]) : 0; $minutes = count($exifCoord) > 1 ? $this->evalFraction($exifCoord[1]) : 0; $seconds = count($exifCoord) > 2 ? $this->evalFraction($exifCoord[2]) : 0; $flip = ($hemi == 'W' || $hemi == 'S') ? -1 : 1; return $flip * ($degrees + ($minutes / 60) + ($seconds / 3600)); }
    private function evalFraction($fraction) { $parts = explode('/', $fraction); if (count($parts) == 2 && $parts[1] != 0) { return $parts[0] / $parts[1]; } return (float)$fraction; }
    private function transferExifData($s, $d) { try { $srcContent = file_get_contents($s); $destContent = file_get_contents($d); if (substr($srcContent, 0, 2) !== "\xFF\xD8" || substr($destContent, 0, 2) !== "\xFF\xD8") return; $exifData = null; $len = strlen($srcContent); $pos = 2; while ($pos < $len) { $marker = substr($srcContent, $pos, 2); $size = unpack('n', substr($srcContent, $pos + 2, 2))[1]; if ($marker === "\xFF\xE1") { $exifData = substr($srcContent, $pos, $size + 2); break; } $pos += 2 + $size; } if ($exifData) { $newDestContent = substr($destContent, 0, 2) . $exifData . substr($destContent, 2); file_put_contents($d, $newDestContent); } } catch (\Exception $e) { } }
}