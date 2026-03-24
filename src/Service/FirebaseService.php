<?php

namespace Framio\UploadExif\Service;

use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Foundation\Paths;
use Google\Cloud\Storage\StorageClient;
use Exception;

class FirebaseService
{
    protected $settings;
    protected $paths;

    public function __construct(SettingsRepositoryInterface $settings, Paths $paths)
    {
        $this->settings = $settings;
        $this->paths = $paths;
    }

    public function getBucketName()
    {
        return $this->settings->get('framio-upload-exif.firebase_bucket') ?: 'framio-turkey-storage.firebasestorage.app';
    }

    public function getStorageClient()
    {
        $jsonContent = $this->settings->get('framio-upload-exif.firebase_credentials');
        
        if (empty($jsonContent)) {
            $jsonKeyPath = $this->paths->storage . '/firebase-auth.json';
            if (file_exists($jsonKeyPath)) {
                $jsonContent = file_get_contents($jsonKeyPath);
            } else {
                throw new Exception("Firebase kimlik (JSON) bilgisi ayarlarda veya storage/firebase-auth.json konumunda bulunamadı.");
            }
        }

        $data = json_decode($jsonContent, true);
        if (!isset($data['client_email']) || !isset($data['private_key']) || !isset($data['project_id'])) {
            throw new Exception("Geçersiz Firebase JSON içeriği.");
        }

        $accessToken = $this->getManualAccessToken($data);

        return new StorageClient([
            'accessToken' => $accessToken,
            'projectId' => $data['project_id']
        ]);
    }

    private function getManualAccessToken($data)
    {
        $privateKey = str_replace('\\n', "\n", $data['private_key']);
        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $headerBase64 = $this->base64UrlEncode($header);
        $now = time();
        $iat = $now - 3600;
        $exp = $iat + 3600;
        $payload = json_encode([
            'iss' => $data['client_email'], 
            'scope' => 'https://www.googleapis.com/auth/cloud-platform', 
            'aud' => 'https://oauth2.googleapis.com/token', 
            'exp' => $exp, 
            'iat' => $iat
        ]);
        $payloadBase64 = $this->base64UrlEncode($payload);
        $signature = '';
        openssl_sign($headerBase64 . "." . $payloadBase64, $signature, $privateKey, 'SHA256');
        $signatureBase64 = $this->base64UrlEncode($signature);
        $jwt = $headerBase64 . "." . $payloadBase64 . "." . $signatureBase64;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        
        $responseData = json_decode($response, true);
        if (!isset($responseData['access_token'])) {
            throw new Exception("Google Token Reddedildi.");
        }
        return $responseData['access_token'];
    }

    private function base64UrlEncode($data)
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }
}
