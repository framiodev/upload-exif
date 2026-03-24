<?php
namespace Framio\UploadExif\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\Api\Controller\AbstractListController;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;

class ListImagesController extends AbstractListController {
    public $serializer = 'Framio\UploadExif\Api\Serializer\FramioImageSerializer';
    public $include = ['user'];

    protected $db;

    public function __construct(ConnectionInterface $db) {
        $this->db = $db;
    }

    protected function data(ServerRequestInterface $request, Document $document) {
        $actor = RequestUtil::getActor($request);
        $filters = $request->getQueryParams()['filter'] ?? [];
        $path = $request->getUri()->getPath(); 
        
        $query = $this->db->table('framio_images')->select('framio_images.*');

        // --- FİLTRELEME (GÜNCELLENDİ: AKILLI ARAMA) ---
        if ($q = Arr::get($filters, 'q')) {
            $query->where(function ($query) use ($q) {
                // 1. Dosya adında ara
                $query->where('filename', 'like', "%{$q}%")
                // 2. VEYA Kullanıcı adında ara (Alt sorgu ile Users tablosuna bak)
                      ->orWhereIn('user_id', function($subQuery) use ($q) {
                          $subQuery->select('id')
                                   ->from('users')
                                   ->where('username', 'like', "%{$q}%");
                      });
            });
        }

        if ($userId = Arr::get($filters, 'user')) {
            $query->where('user_id', $userId);
        }
        
        elseif (strpos($path, '/all') !== false && $actor->isAdmin()) {
            // Admin panelindeyiz, hepsini getir.
        }

        // --- SIRALAMA (Yeniden Eskiye) ---
        $query->orderBy('id', 'desc');

        // --- LİMİT (Sayfa Başına 14 Adet - Admin Paneli İçin) ---
        if (strpos($path, '/all') !== false) {
            $limit = 14; 
        } else {
            $limit = $this->extractLimit($request);
        }

        $offset = $this->extractOffset($request);
        
        $results = $query->limit($limit)->offset($offset)->get();

        $this->loadUsersForResults($results);

        return $results;
    }

    protected function loadUsersForResults($results) {
        $userIds = $results->pluck('user_id')->unique();
        if ($userIds->isEmpty()) return;

        $users = \Flarum\User\User::whereIn('id', $userIds)->get()->keyBy('id');

        foreach ($results as $result) {
            $result->user = $users->get($result->user_id);
        }
    }
}