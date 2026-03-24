<?php

use Flarum\Extend;
use s9e\TextFormatter\Configurator;
use Framio\UploadExif\Api\Controller\UploadImageController;
use Framio\UploadExif\Api\Controller\ShowImageController;
use Framio\UploadExif\Api\Controller\ListImagesController;
use Framio\UploadExif\Api\Controller\UserGalleryController;
use Framio\UploadExif\Api\Controller\DeleteImageController;
use Framio\UploadExif\Api\Controller\EditImageController;
use Framio\UploadExif\Api\Controller\UpdateRetroactiveAltTagsController;
use Framio\UploadExif\Listener\SaveAltTagFromContent;
use Flarum\Post\Event\Saving;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less')
        ->css(__DIR__.'/resources/less/framio-user-gallery.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    (new Extend\Routes('api'))
        ->post('/framio-upload', 'framio.upload', UploadImageController::class)
        ->get('/framio-image/{id}', 'framio.show', ShowImageController::class)
        ->get('/framio-images', 'framio.images.list', ListImagesController::class)
        ->get('/framio-images/all', 'framio.admin.list', ListImagesController::class)
        ->get('/framio-images/user', 'framio.user.gallery', UserGalleryController::class)
        ->patch('/framio-image/{id}', 'framio.update', EditImageController::class)
        ->delete('/framio-image/{id}', 'framio.delete', DeleteImageController::class)
        ->post('/framio-update-alt-tags', 'framio.update-alt-tags', UpdateRetroactiveAltTagsController::class),

    (new Extend\Formatter)
        ->configure(function (Configurator $config) {
            $config->BBCodes->addCustom(
                '[framio-image id={NUMBER} url={URL} alt={TEXT}]',
                '<div class="framio-image-container" data-id="{NUMBER}">
                    <div class="FramioCard-image-wrapper">
                        <img src="{URL}" alt="{TEXT}" class="framio-lazy" loading="lazy" />
                    </div>
                    <div class="framio-exif-placeholder"></div>
                 </div>'
            );
            $config->BBCodes->addCustom(
                '[upl-image-preview uuid={TEXT1} url={URL} alt={TEXT2?}]',
                '<div class="fof-legacy-image"><img src="{URL}" alt="{TEXT2}" loading="lazy" style="max-width:100%;height:auto;" /></div>'
            );
        }),

    (new Extend\Event())
        ->listen(Saving::class, SaveAltTagFromContent::class),

    (new Extend\Settings())
        ->serializeToForum('framioBrandModels', 'framio-upload-exif.brand_models'),
];