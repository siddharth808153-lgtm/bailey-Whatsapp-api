<?php
// app/Http/Controllers/Api/MessageTemplateController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MessageTemplate;
use Illuminate\Http\Request;

class MessageTemplateController extends Controller
{
    /**
     * List user templates with category / message type filters.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = $user->messageTemplates()->latest();

        // Filters
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('message_type')) {
            $query->where('message_type', $request->message_type);
        }
        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $templates = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $templates->items(),
            'meta' => [
                'current_page' => $templates->currentPage(),
                'last_page' => $templates->lastPage(),
                'per_page' => $templates->perPage(),
                'total' => $templates->total(),
            ]
        ]);
    }

    /**
     * Store new template.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'category' => 'required|string|in:promotional,transactional,greeting,follow_up,other',
            'message_type' => 'required|string|in:text,image,video,document,audio',
            'body' => 'required|string|max:4096',
            'media_url' => 'nullable|url',
            'media_filename' => 'nullable|string|max:255',
            'footer' => 'nullable|string|max:60',
            'buttons' => 'nullable|array|max:3',
            'buttons.*.text' => 'required_with:buttons|string|max:20',
        ]);

        $template = auth()->user()->messageTemplates()->create([
            'name' => $request->name,
            'category' => $request->category,
            'message_type' => $request->message_type,
            'body' => $request->body,
            'media_url' => $request->media_url,
            'media_filename' => $request->media_filename,
            'footer' => $request->footer,
            'buttons' => $request->buttons,
        ]);

        return response()->json([
            'success' => true,
            'data' => $template,
        ], 201);
    }

    /**
     * Get single template.
     */
    public function show($id)
    {
        $template = auth()->user()->messageTemplates()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $template,
        ]);
    }

    /**
     * Update template details.
     */
    public function update(Request $request, $id)
    {
        $template = auth()->user()->messageTemplates()->findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:100',
            'category' => 'required|string|in:promotional,transactional,greeting,follow_up,other',
            'message_type' => 'required|string|in:text,image,video,document,audio',
            'body' => 'required|string|max:4096',
            'media_url' => 'nullable|url',
            'media_filename' => 'nullable|string|max:255',
            'footer' => 'nullable|string|max:60',
            'buttons' => 'nullable|array|max:3',
            'buttons.*.text' => 'required_with:buttons|string|max:20',
        ]);

        $template->update([
            'name' => $request->name,
            'category' => $request->category,
            'message_type' => $request->message_type,
            'body' => $request->body,
            'media_url' => $request->media_url,
            'media_filename' => $request->media_filename,
            'footer' => $request->footer,
            'buttons' => $request->buttons,
        ]);

        return response()->json([
            'success' => true,
            'data' => $template,
        ]);
    }

    /**
     * Delete template.
     */
    public function destroy($id)
    {
        $template = auth()->user()->messageTemplates()->findOrFail($id);
        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Template deleted successfully.',
        ]);
    }

    /**
     * Format template data for pre-filling a new Campaign setup form.
     */
    public function useInCampaign($id)
    {
        $template = auth()->user()->messageTemplates()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'message_type' => $template->message_type,
                'message_body' => $template->body,
                'media_url' => $template->media_url,
                'media_filename' => $template->media_filename,
                'footer' => $template->footer,
                'buttons' => $template->buttons,
            ]
        ]);
    }
}
