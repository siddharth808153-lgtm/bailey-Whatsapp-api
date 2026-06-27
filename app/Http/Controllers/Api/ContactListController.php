<?php
// app/Http/Controllers/Api/ContactListController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactList;
use App\Models\Campaign;
use Illuminate\Http\Request;

class ContactListController extends Controller
{
    /**
     * List all contact lists for authenticated user.
     */
    public function index()
    {
        $lists = auth()->user()->contactLists()
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'contact_count', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => $lists,
        ]);
    }

    /**
     * Store a new contact list.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        $list = auth()->user()->contactLists()->create([
            'name' => $request->name,
            'description' => $request->description,
            'contact_count' => 0,
        ]);

        return response()->json([
            'success' => true,
            'data' => $list,
        ], 201);
    }

    /**
     * Show a contact list with paginated contacts.
     */
    public function show($id)
    {
        $list = auth()->user()->contactLists()->findOrFail($id);
        $contacts = $list->contacts()->paginate(20);

        return response()->json([
            'success' => true,
            'data' => array_merge($list->toArray(), [
                'contacts' => $contacts->items(),
                'meta' => [
                    'current_page' => $contacts->currentPage(),
                    'last_page' => $contacts->lastPage(),
                    'per_page' => $contacts->perPage(),
                    'total' => $contacts->total(),
                ]
            ])
        ]);
    }

    /**
     * Update a contact list details.
     */
    public function update(Request $request, $id)
    {
        $list = auth()->user()->contactLists()->findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        $list->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'success' => true,
            'data' => $list,
        ]);
    }

    /**
     * Delete contact list.
     */
    public function destroy($id)
    {
        $list = auth()->user()->contactLists()->findOrFail($id);

        // Check if list is used in active/scheduled campaigns
        $hasActiveCampaigns = Campaign::where('contact_list_id', $id)
            ->whereIn('status', ['running', 'scheduled', 'paused'])
            ->exists();

        if ($hasActiveCampaigns) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete list used in active campaigns',
            ], 422);
        }

        // Detach all contacts in the pivot table
        $list->contacts()->detach();

        // Delete list
        $list->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contact list deleted successfully.',
        ]);
    }

    /**
     * Bulk add contacts to this list.
     */
    public function addContacts(Request $request, $id)
    {
        $list = auth()->user()->contactLists()->findOrFail($id);

        $request->validate([
            'contact_ids' => 'required|array|max:1000',
            'contact_ids.*' => 'exists:contacts,id',
        ]);

        $user = auth()->user();
        
        // Ensure all contacts belong to auth user
        $validContactIds = $user->contacts()
            ->whereIn('id', $request->contact_ids)
            ->pluck('id')
            ->toArray();

        $existing = $list->contacts()->pluck('contacts.id')->toArray();
        $new = array_diff($validContactIds, $existing);

        if (count($new) > 0) {
            $list->contacts()->attach($new);
            $list->update(['contact_count' => $list->contacts()->count()]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'added' => count($new),
                'already_in_list' => count($validContactIds) - count($new),
            ]
        ]);
    }

    /**
     * Remove contacts from this list.
     */
    public function removeContacts(Request $request, $id)
    {
        $list = auth()->user()->contactLists()->findOrFail($id);

        $request->validate([
            'contact_ids' => 'required|array',
            'contact_ids.*' => 'exists:contacts,id',
        ]);

        $list->contacts()->detach($request->contact_ids);
        $list->update(['contact_count' => $list->contacts()->count()]);

        return response()->json([
            'success' => true,
            'data' => [
                'removed' => count($request->contact_ids),
            ]
        ]);
    }

    /**
     * Import directly into this list using ContactController import.
     */
    public function importToList(Request $request, $id)
    {
        // Enforce list ID constraint in request
        $request->merge(['list_id' => $id]);
        return app(ContactController::class)->import($request);
    }
}
