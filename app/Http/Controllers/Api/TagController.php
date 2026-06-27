<?php
// app/Http/Controllers/Api/TagController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TagController extends Controller
{
    /**
     * Retrieve all unique tags used by the user's contacts.
     */
    public function index()
    {
        $contacts = auth()->user()->contacts()->select('tags')->get();

        $tagsCount = [];
        foreach ($contacts as $contact) {
            $tags = $contact->tags ?? [];
            foreach ($tags as $tag) {
                $tag = trim($tag);
                if ($tag !== '') {
                    $tagsCount[$tag] = ($tagsCount[$tag] ?? 0) + 1;
                }
            }
        }

        // Sort by occurrence count descending
        arsort($tagsCount);

        $formatted = [];
        foreach ($tagsCount as $tag => $count) {
            $formatted[] = [
                'tag' => $tag,
                'count' => $count,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Perform bulk tag actions (add, remove, replace) on contacts.
     */
    public function bulkTag(Request $request)
    {
        $request->validate([
            'contact_ids' => 'required|array',
            'contact_ids.*' => 'exists:contacts,id',
            'tags' => 'required|array',
            'tags.*' => 'string|max:50',
            'action' => 'required|string|in:add,remove,replace',
        ]);

        $user = auth()->user();
        $contacts = $user->contacts()->whereIn('id', $request->contact_ids)->get();

        $updatedCount = 0;
        $incomingTags = array_map('trim', $request->tags);

        foreach ($contacts as $contact) {
            $currentTags = $contact->tags ?? [];

            if ($request->action === 'add') {
                $newTags = array_unique(array_merge($currentTags, $incomingTags));
            } elseif ($request->action === 'remove') {
                $newTags = array_values(array_diff($currentTags, $incomingTags));
            } else { // replace
                $newTags = array_unique($incomingTags);
            }

            $contact->update([
                'tags' => $newTags,
            ]);
            $updatedCount++;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'updated' => $updatedCount,
            ]
        ]);
    }
}
