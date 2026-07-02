<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaFileController extends Controller
{
    use ApiResponse;

    const STORAGE_LIMIT_BYTES = 31457280; // 30 MB

    public function index()
    {
        $user = auth()->user();
        $files = MediaFile::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $totalUsedBytes = (int) MediaFile::where('user_id', $user->id)->sum('size');

        return $this->success([
            'files' => $files,
            'storage_limit' => self::STORAGE_LIMIT_BYTES,
            'storage_used' => $totalUsedBytes,
            'storage_remaining' => max(0, self::STORAGE_LIMIT_BYTES - $totalUsedBytes),
        ], 'Media files retrieved successfully.');
    }

    public function store(Request $request)
    {
        $user = auth()->user();

        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB individual file upload
        ]);

        $file = $request->file('file');
        $fileSize = $file->getSize();

        // Quota check
        $totalUsedBytes = (int) MediaFile::where('user_id', $user->id)->sum('size');
        if (($totalUsedBytes + $fileSize) > self::STORAGE_LIMIT_BYTES) {
            return $this->error('Storage limit of 30 MB exceeded. Please delete some files first.', 422);
        }

        // Store file on public disk
        $path = $file->store('uploads/media', 'public');
        $url = asset('storage/' . $path);

        $mediaFile = MediaFile::create([
            'user_id' => $user->id,
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'url' => $url,
            'mime_type' => $file->getMimeType(),
            'size' => $fileSize,
        ]);

        return $this->success($mediaFile, 'File uploaded successfully.', 201);
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $mediaFile = MediaFile::where('user_id', $user->id)->findOrFail($id);

        // Delete from public disk
        if (Storage::disk('public')->exists($mediaFile->path)) {
            Storage::disk('public')->delete($mediaFile->path);
        }

        $mediaFile->delete();

        return $this->success(null, 'File deleted successfully.');
    }
}
