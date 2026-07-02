<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiKnowledgeDoc;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AiKnowledgeController extends Controller
{
    use ApiResponse;

    /**
     * List knowledge docs for an agent.
     */
    public function index(Request $request, $agentId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);

        $docs = AiKnowledgeDoc::where('agent_id', $agent->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'mime_type' => $doc->mime_type,
                    'size' => $doc->size,
                    'content_preview' => mb_substr($doc->content ?? '', 0, 200) . (mb_strlen($doc->content ?? '') > 200 ? '...' : ''),
                    'created_at' => $doc->created_at,
                ];
            });

        return $this->success($docs);
    }

    /**
     * Upload a knowledge document (TXT, PDF, DOCX).
     */
    public function store(Request $request, $agentId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);

        $request->validate([
            'file' => 'required|file|max:5120|mimes:txt,pdf,doc,docx,md,csv',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $size = $file->getSize();

        // Extract text content based on file type
        $content = $this->extractContent($file);

        if (empty($content)) {
            return $this->error('Could not extract text from the uploaded file.', 422);
        }

        // Store the file
        $path = $file->store('knowledge/' . $request->user()->id, 'public');

        $doc = AiKnowledgeDoc::create([
            'user_id' => $request->user()->id,
            'agent_id' => $agent->id,
            'name' => $originalName,
            'file_path' => $path,
            'content' => $content,
            'mime_type' => $mimeType,
            'size' => $size,
        ]);

        return $this->success([
            'id' => $doc->id,
            'name' => $doc->name,
            'mime_type' => $doc->mime_type,
            'size' => $doc->size,
            'content_preview' => mb_substr($content, 0, 200),
            'created_at' => $doc->created_at,
        ], 'Knowledge document uploaded successfully.', 201);
    }

    /**
     * Delete a knowledge document.
     */
    public function destroy(Request $request, $agentId, $docId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);
        $doc = AiKnowledgeDoc::where('agent_id', $agent->id)->findOrFail($docId);

        // Delete physical file
        if ($doc->file_path && Storage::disk('public')->exists($doc->file_path)) {
            Storage::disk('public')->delete($doc->file_path);
        }

        $doc->delete();

        return $this->success(null, 'Knowledge document deleted.');
    }

    /**
     * Extract text content from uploaded file.
     */
    private function extractContent($file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        return match ($extension) {
            'txt', 'md', 'csv' => file_get_contents($file->getRealPath()),
            'pdf' => $this->extractPdf($file),
            'doc', 'docx' => $this->extractDocx($file),
            default => '',
        };
    }

    /**
     * Extract text from PDF using basic PHP parsing.
     */
    private function extractPdf($file): string
    {
        try {
            // Simple PDF text extraction — strip binary, extract text streams
            $content = file_get_contents($file->getRealPath());

            // Try to extract text between BT and ET markers (basic PDF text extraction)
            $text = '';
            preg_match_all('/\((.*?)\)/s', $content, $matches);
            if (!empty($matches[1])) {
                $text = implode(' ', $matches[1]);
                // Clean up non-printable characters
                $text = preg_replace('/[^\x20-\x7E\n\r\t]/', '', $text);
            }

            // If basic extraction failed, try stream-based extraction
            if (empty(trim($text))) {
                preg_match_all('/stream\s*(.*?)\s*endstream/s', $content, $streamMatches);
                foreach ($streamMatches[1] as $stream) {
                    $decoded = @gzuncompress($stream);
                    if ($decoded) {
                        preg_match_all('/\((.*?)\)/s', $decoded, $textMatches);
                        if (!empty($textMatches[1])) {
                            $text .= implode(' ', $textMatches[1]);
                        }
                    }
                }
                $text = preg_replace('/[^\x20-\x7E\n\r\t]/', '', $text);
            }

            return trim($text) ?: 'PDF content could not be fully extracted. Consider using a TXT file for best results.';
        } catch (\Exception $e) {
            return 'PDF extraction failed: ' . $e->getMessage();
        }
    }

    /**
     * Extract text from DOCX.
     */
    private function extractDocx($file): string
    {
        try {
            $zip = new \ZipArchive();
            if ($zip->open($file->getRealPath()) === true) {
                $content = $zip->getFromName('word/document.xml');
                $zip->close();

                if ($content) {
                    // Strip XML tags to get plain text
                    $text = strip_tags($content);
                    $text = preg_replace('/\s+/', ' ', $text);
                    return trim($text);
                }
            }

            return '';
        } catch (\Exception $e) {
            return 'DOCX extraction failed: ' . $e->getMessage();
        }
    }
}
