<?php

namespace Framio\UploadExif\Api\Serializer;

use Flarum\Api\Serializer\AbstractSerializer;
use Flarum\Api\Serializer\UserSerializer;

class FramioImageSerializer extends AbstractSerializer
{
    protected $type = 'framio-images';

    protected function getDefaultAttributes($model)
    {
        // 1. Veriyi Al
        $raw = $model->exif_data;
        
        // JSON String ise diziye çevir
        if (is_string($raw)) {
            $raw = json_decode($raw, true);
        }
        if (!is_array($raw)) {
            $raw = [];
        }

        // --- VERİ HAZIRLAMA ---
        
        // 1. KAMERA
        $make = $raw['make'] ?? $raw['Make'] ?? '';
        $modelName = $raw['model'] ?? $raw['Model'] ?? '';
        
        if (stripos($modelName, $make) !== false) {
            $fullCameraName = $modelName;
        } else {
            $fullCameraName = trim($make . ' ' . $modelName);
        }
        if (empty($fullCameraName)) {
            $fullCameraName = null;
        }

        // 2. LENS
        $lensVal = $raw['lens'] ?? $raw['Lens'] ?? $raw['LensModel'] ?? null;

        // 3. DİYAFRAM
        $apertureVal = $raw['aperture'] ?? $raw['ApertureValue'] ?? $raw['FNumber'] ?? null;
        if ($apertureVal && is_numeric($apertureVal)) {
            $apertureVal = 'f/' . $apertureVal;
        }

        // 4. ISO
        $isoVal = $raw['iso'] ?? $raw['ISO'] ?? $raw['ISOSpeedRatings'] ?? null;
        if (is_array($isoVal)) {
            $isoVal = $isoVal[0] ?? null;
        }

        // 5. ENSTANTANE
        $expVal = $raw['exposure'] ?? $raw['ExposureTime'] ?? null;

        // 6. ODAK UZAKLIĞI
        $focalVal = $raw['focal'] ?? $raw['FocalLength'] ?? null;
        if ($focalVal && is_numeric($focalVal)) {
            $focalVal .= ' mm';
        }

        // 7. TARİH
        // Veritabanında 'date' olarak veya 'DateTimeOriginal' olarak gelebilir
        $dateVal = $raw['date'] ?? $raw['DateTimeOriginal'] ?? null;

        // 8. GPS
        $latVal = $raw['lat'] ?? $raw['GPSLatitude'] ?? null;
        $lonVal = $raw['lon'] ?? $raw['GPSLongitude'] ?? null;

        // --- PAKETLEME ---
        $finalExif = [
            'Model'           => $fullCameraName,
            'Make'            => $make,
            'LensModel'       => $lensVal,
            'Lens'            => $lensVal,
            'FNumber'         => $apertureVal,
            'ISOSpeedRatings' => $isoVal,
            'ISO'             => $isoVal,
            'ExposureTime'    => $expVal,
            'FocalLength'     => $focalVal,
            'DateTimeOriginal'=> $dateVal,
            'GPSLatitude'     => $latVal,
            'GPSLongitude'    => $lonVal,
            
            // Kolay Erişim Anahtarları (Frontend bunları kullanıyor)
            'camera'          => $fullCameraName,
            'lens'            => $lensVal,
            'aperture'        => $apertureVal,
            'iso'             => $isoVal,
            'exposure'        => $expVal,
            'focal'           => $focalVal,
            'date'            => $dateVal,
            'lat'             => $latVal,
            'lon'             => $lonVal
        ];

        return [
            'id'           => $model->id,
            'filename'     => $model->filename,
            'url'          => $model->thumb_path ?: $model->path,       
            'original_url' => $model->path,
            'exif'         => $finalExif, 
            'thumb_path'   => $model->thumb_path,
            'createdAt'    => $this->formatDate($model->created_at),
            'title'        => $model->title,
            'description'  => $model->description,
        ];
    }

    public function user($model)
    {
        return $this->hasOne($model, UserSerializer::class);
    }
}