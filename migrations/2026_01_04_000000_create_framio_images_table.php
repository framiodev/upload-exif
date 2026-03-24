<?php
use Illuminate\Database\Schema\Blueprint;
use Flarum\Database\Migration;

return Migration::createTable('framio_images', function (Blueprint $table) {
    $table->increments('id');
    $table->integer('user_id')->unsigned();
    $table->string('filename');
    $table->string('path');
    $table->string('thumb_path');
    $table->string('original_path')->nullable();
    $table->text('exif_data')->nullable();
    $table->timestamps();
    $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
});