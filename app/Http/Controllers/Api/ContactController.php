<?php
// app/Http/Controllers/Api/ContactController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\PlanCheck;
use App\Services\PlanService;
use App\Models\Contact;
use App\Models\ContactList;
use App\Models\MessageLog;
use App\Models\WhatsappInstance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    protected $planService;

    public function __construct(PlanService $planService)
    {
        $this->planService = $planService;
    }

    /**
     * Helper to normalize phone numbers.
     */
    private function normalizePhone($phone): string
    {
        $cleaned = preg_replace('/\D/', '', $phone);
        if (strlen($cleaned) === 10) {
            $cleaned = '91' . $cleaned;
        }
        return $cleaned;
    }

    /**
     * List user's contacts with filters and pagination.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = $user->contacts()->with('contactLists:id,name');

        // Search name or phone
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by contact list
        if ($request->filled('list_id')) {
            $listId = $request->list_id;
            $query->whereHas('contactLists', function ($q) use ($listId) {
                $q->where('contact_list_id', $listId);
            });
        }

        // Filter by tag
        if ($request->filled('tag')) {
            $tag = $request->tag;
            $query->whereJsonContains('tags', $tag);
        }

        // Filter by opt-out status
        if ($request->has('is_opted_out')) {
            $query->where('is_opted_out', filter_var($request->is_opted_out, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by invalid status
        if ($request->has('is_invalid')) {
            $query->where('is_invalid', filter_var($request->is_invalid, FILTER_VALIDATE_BOOLEAN));
        }

        // Fetch counts for metadata
        $totalContacts = $user->contacts()->count();
        $optedOutCount = $user->contacts()->where('is_opted_out', true)->count();
        $invalidCount = $user->contacts()->where('is_invalid', true)->count();

        $contacts = $query->paginate(25);

        return response()->json([
            'success' => true,
            'data' => $contacts->items(),
            'meta' => [
                'current_page' => $contacts->currentPage(),
                'last_page' => $contacts->lastPage(),
                'per_page' => $contacts->perPage(),
                'total' => $contacts->total(),
                'total_contacts' => $totalContacts,
                'opted_out_count' => $optedOutCount,
                'invalid_count' => $invalidCount,
            ]
        ]);
    }

    /**
     * Store a new contact.
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        // Check plan limits
        PlanCheck::or403(
            $this->planService->canAddContacts($user),
            'Contacts'
        );

        $request->validate([
            'name' => 'required|string|max:100',
            'phone' => 'required|string',
            'email' => 'nullable|email|max:100',
            'custom1' => 'nullable|string|max:255',
            'custom2' => 'nullable|string|max:255',
            'custom3' => 'nullable|string|max:255',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'list_ids' => 'nullable|array',
            'list_ids.*' => 'exists:contact_lists,id',
        ]);

        $phone = $this->normalizePhone($request->phone);

        // Check duplicate
        $exists = $user->contacts()->where('phone', $phone)->exists();
        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Contact with this phone number already exists',
            ], 422);
        }

        $contact = $user->contacts()->create([
            'name' => $request->name,
            'phone' => $phone,
            'email' => $request->email,
            'custom1' => $request->custom1,
            'custom2' => $request->custom2,
            'custom3' => $request->custom3,
            'tags' => $request->tags ?? [],
            'is_opted_out' => false,
            'is_invalid' => false,
        ]);

        if ($request->filled('list_ids')) {
            $contact->contactLists()->sync($request->list_ids);
            
            // Recalculate list contact counts
            foreach ($request->list_ids as $listId) {
                $list = ContactList::find($listId);
                if ($list) {
                    $list->update(['contact_count' => $list->contacts()->count()]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $contact->load('contactLists:id,name'),
        ], 201);
    }

    /**
     * Show detailed contact record.
     */
    public function show($id)
    {
        $contact = auth()->user()->contacts()->findOrFail($id);

        $contactLists = $contact->contactLists()->get(['contact_lists.id', 'contact_lists.name']);
        
        $recentMessages = $contact->campaignMessages()
            ->with('campaign:id,name')
            ->latest()
            ->take(5)
            ->get();

        $dripEnrollments = $contact->dripEnrollments()
            ->with('dripSequence:id,name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => array_merge($contact->toArray(), [
                'lists' => $contactLists,
                'recent_messages' => $recentMessages,
                'drip_enrollments' => $dripEnrollments,
            ])
        ]);
    }

    /**
     * Update contact records.
     */
    public function update(Request $request, $id)
    {
        $contact = auth()->user()->contacts()->findOrFail($id);

        $request->validate([
            'name' => 'nullable|string|max:100',
            'phone' => 'nullable|string',
            'email' => 'nullable|email|max:100',
            'custom1' => 'nullable|string|max:255',
            'custom2' => 'nullable|string|max:255',
            'custom3' => 'nullable|string|max:255',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'list_ids' => 'nullable|array',
            'list_ids.*' => 'exists:contact_lists,id',
        ]);

        if ($request->filled('phone')) {
            $phone = $this->normalizePhone($request->phone);

            if ($phone !== $contact->phone) {
                // Cannot change phone number if contact has received messages
                $hasMessages = MessageLog::where('to_phone', $contact->phone)
                    ->where('user_id', auth()->id())
                    ->exists();

                if ($hasMessages) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot change phone of a contact that has received messages',
                    ], 422);
                }

                // Check duplicate for new number
                $exists = auth()->user()->contacts()
                    ->where('phone', $phone)
                    ->where('id', '!=', $id)
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Contact with this phone number already exists',
                    ], 422);
                }

                $contact->phone = $phone;
            }
        }

        if ($request->filled('name')) {
            $contact->name = $request->name;
        }
        if ($request->has('email')) {
            $contact->email = $request->email;
        }
        if ($request->has('custom1')) {
            $contact->custom1 = $request->custom1;
        }
        if ($request->has('custom2')) {
            $contact->custom2 = $request->custom2;
        }
        if ($request->has('custom3')) {
            $contact->custom3 = $request->custom3;
        }
        if ($request->has('tags')) {
            $contact->tags = $request->tags;
        }

        $contact->save();

        if ($request->has('list_ids')) {
            // Keep track of list ids for count updates
            $oldListIds = $contact->contactLists()->pluck('contact_lists.id')->toArray();
            $newListIds = $request->list_ids ?? [];

            $contact->contactLists()->sync($newListIds);

            // Update counts for old and new lists
            $affectedListIds = array_unique(array_merge($oldListIds, $newListIds));
            foreach ($affectedListIds as $listId) {
                $list = ContactList::find($listId);
                if ($list) {
                    $list->update(['contact_count' => $list->contacts()->count()]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $contact->load('contactLists:id,name'),
        ]);
    }

    /**
     * Delete contact record (soft delete).
     */
    public function destroy($id)
    {
        $contact = auth()->user()->contacts()->findOrFail($id);

        $listIds = $contact->contactLists()->pluck('contact_lists.id')->toArray();

        // Detach from all lists
        $contact->contactLists()->detach();

        // Soft delete contact
        $contact->delete();

        // Update counts
        foreach ($listIds as $listId) {
            $list = ContactList::find($listId);
            if ($list) {
                $list->update(['contact_count' => $list->contacts()->count()]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Contact deleted successfully.',
        ]);
    }

    /**
     * Bulk delete contacts.
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:contacts,id',
        ]);

        $user = auth()->user();
        $contacts = $user->contacts()->whereIn('id', $request->ids)->get();

        $listIds = [];
        foreach ($contacts as $contact) {
            $listIds = array_merge($listIds, $contact->contactLists()->pluck('contact_lists.id')->toArray());
            $contact->contactLists()->detach();
            $contact->delete();
        }

        // Update counts for affected lists
        $listIds = array_unique($listIds);
        foreach ($listIds as $listId) {
            $list = ContactList::find($listId);
            if ($list) {
                $list->update(['contact_count' => $list->contacts()->count()]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'deleted' => $contacts->count(),
            ]
        ]);
    }

    /**
     * Toggle Opt Out (DND) status ON.
     */
    public function optOut($id)
    {
        $contact = auth()->user()->contacts()->findOrFail($id);
        $contact->update([
            'is_opted_out' => true,
            'opted_out_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Contact opted out of messaging successfully.',
        ]);
    }

    /**
     * Toggle Opt Out status OFF (Opt In).
     */
    public function optIn($id)
    {
        $contact = auth()->user()->contacts()->findOrFail($id);
        $contact->update([
            'is_opted_out' => false,
            'opted_out_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Contact opted back in to messaging successfully.',
        ]);
    }

    /**
     * Bulk Opt Out contacts.
     */
    public function bulkOptOut(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:contacts,id',
        ]);

        $user = auth()->user();
        $updated = $user->contacts()
            ->whereIn('id', $request->ids)
            ->update([
                'is_opted_out' => true,
                'opted_out_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'updated' => $updated,
            ]
        ]);
    }

    /**
     * Preview CSV contents.
     */
    public function previewCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $path = $request->file('file')->getRealPath();
        $file = fopen($path, 'r');
        
        $previewRows = [];
        $headers = [];
        $rowCount = 0;
        $detectedColumns = 0;

        while (($row = fgetcsv($file)) !== false) {
            if ($rowCount === 0) {
                $headers = $row;
                $detectedColumns = count($row);
            } elseif ($rowCount <= 5) {
                $previewRows[] = $row;
            }
            $rowCount++;
        }
        fclose($file);

        return response()->json([
            'success' => true,
            'data' => [
                'headers' => $headers,
                'preview_rows' => $previewRows,
                'total_rows' => max(0, $rowCount - 1),
                'detected_columns' => $detectedColumns,
            ]
        ]);
    }

    /**
     * Bulk CSV Contacts Importer.
     */
    public function import(Request $request)
    {
        $user = auth()->user();

        // Check plan limits
        PlanCheck::or403(
            $this->planService->canAddContacts($user),
            'Contacts'
        );

        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'list_id' => 'nullable|exists:contact_lists,id',
            'has_header' => 'boolean',
            'column_map' => 'required|array',
        ]);

        $columnMap = $request->column_map;
        $hasHeader = filter_var($request->has_header, FILTER_VALIDATE_BOOLEAN);
        $listId = $request->list_id;

        if ($listId) {
            // Verify ownership
            $user->contactLists()->findOrFail($listId);
        }

        $path = $request->file('file')->getRealPath();
        $file = fopen($path, 'r');

        $imported = 0;
        $skippedDuplicates = 0;
        $skippedInvalid = 0;
        $totalRows = 0;
        $errors = [];
        $rowNumber = 0;

        // Map names to index
        $fieldIndexMap = [];
        foreach ($columnMap as $index => $field) {
            if ($field) {
                $fieldIndexMap[$field] = (int)$index;
            }
        }

        if (!isset($fieldIndexMap['phone'])) {
            return response()->json([
                'success' => false,
                'message' => 'Phone column mapping is required.',
            ], 422);
        }

        // Cache existing phones for duplication check
        $existingPhones = $user->contacts()->pluck('phone')->toArray();
        $existingPhonesMap = array_flip($existingPhones);

        while (($row = fgetcsv($file)) !== false) {
            $rowNumber++;

            if ($rowNumber === 1 && $hasHeader) {
                continue;
            }

            $totalRows++;

            // Extract values based on mapping
            $phoneIdx = $fieldIndexMap['phone'];
            $phoneVal = $row[$phoneIdx] ?? '';
            $phone = preg_replace('/\D/', '', $phoneVal);

            if (strlen($phone) === 10) {
                $phone = '91' . $phone;
            }

            if (empty($phone) || strlen($phone) < 10 || strlen($phone) > 13) {
                $skippedInvalid++;
                if (count($errors) < 10) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'reason' => 'Invalid phone number format: ' . ($phoneVal ?: 'empty'),
                    ];
                }
                continue;
            }

            // Check duplicate
            if (isset($existingPhonesMap[$phone])) {
                $skippedDuplicates++;
                continue;
            }

            // Plan limit incremental check
            if (!$this->planService->canAddContacts($user, $imported + 1)) {
                if (count($errors) < 10) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'reason' => 'Reached limit of contacts allowed on your plan during import.',
                    ];
                }
                break;
            }

            // Extract other variables
            $nameIdx = $fieldIndexMap['name'] ?? null;
            $name = ($nameIdx !== null && isset($row[$nameIdx])) ? trim($row[$nameIdx]) : 'Contact ' . $phone;
            if (empty($name)) {
                $name = 'Contact ' . $phone;
            }

            $emailIdx = $fieldIndexMap['email'] ?? null;
            $email = ($emailIdx !== null && isset($row[$emailIdx])) ? trim($row[$emailIdx]) : null;

            $custom1Idx = $fieldIndexMap['custom1'] ?? null;
            $custom1 = ($custom1Idx !== null && isset($row[$custom1Idx])) ? trim($row[$custom1Idx]) : null;

            $tagsIdx = $fieldIndexMap['tags'] ?? null;
            $tags = [];
            if ($tagsIdx !== null && isset($row[$tagsIdx]) && !empty($row[$tagsIdx])) {
                $tags = array_map('trim', explode(',', $row[$tagsIdx]));
            }

            try {
                DB::beginTransaction();

                $contact = $user->contacts()->create([
                    'name' => $name,
                    'phone' => $phone,
                    'email' => $email,
                    'custom1' => $custom1,
                    'tags' => $tags,
                    'is_opted_out' => false,
                    'is_invalid' => false,
                ]);

                if ($listId) {
                    $contact->contactLists()->attach($listId);
                }

                DB::commit();

                // Cache the newly added phone to prevent duplicates within the same CSV file
                $existingPhonesMap[$phone] = $contact->id;
                $imported++;
            } catch (\Exception $e) {
                DB::rollBack();
                if (count($errors) < 10) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'reason' => 'Database error: ' . $e->getMessage(),
                    ];
                }
            }
        }
        fclose($file);

        // Update list counts
        if ($listId && $imported > 0) {
            $list = ContactList::find($listId);
            if ($list) {
                $list->update(['contact_count' => $list->contacts()->count()]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'imported' => $imported,
                'skipped_duplicates' => $skippedDuplicates,
                'skipped_invalid' => $skippedInvalid,
                'total_rows' => $totalRows,
                'errors' => $errors,
            ]
        ]);
    }

    /**
     * Export contacts as CSV download.
     */
    public function exportCsv(Request $request)
    {
        $user = auth()->user();
        $query = $user->contacts();

        // Apply same filters as index
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        if ($request->filled('list_id')) {
            $listId = $request->list_id;
            $query->whereHas('contactLists', function ($q) use ($listId) {
                $q->where('contact_list_id', $listId);
            });
        }
        if ($request->filled('tag')) {
            $query->whereJsonContains('tags', $request->tag);
        }
        if ($request->has('is_opted_out')) {
            $query->where('is_opted_out', filter_var($request->is_opted_out, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->has('is_invalid')) {
            $query->where('is_invalid', filter_var($request->is_invalid, FILTER_VALIDATE_BOOLEAN));
        }

        $contacts = $query->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=contacts.csv',
        ];

        $callback = function () use ($contacts) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Name', 'Phone', 'Email', 'Custom1', 'Custom2', 'Custom3', 'Tags', 'Opted Out', 'Invalid', 'Created At']);

            foreach ($contacts as $contact) {
                fputcsv($file, [
                    $contact->name,
                    $contact->phone,
                    $contact->email,
                    $contact->custom1,
                    $contact->custom2,
                    $contact->custom3,
                    implode(', ', $contact->tags ?? []),
                    $contact->is_opted_out ? 'Yes' : 'No',
                    $contact->is_invalid ? 'Yes' : 'No',
                    $contact->created_at->toDateTimeString(),
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Batch check numbers on WhatsApp status using Node.js API.
     */
    public function checkNumbers(Request $request)
    {
        $request->validate([
            'instance_id' => 'required|exists:whatsapp_instances,id',
            'contact_ids' => 'required|array',
            'contact_ids.*' => 'exists:contacts,id',
        ]);

        $user = auth()->user();
        $instance = $user->whatsappInstances()->findOrFail($request->instance_id);

        if ($instance->status !== 'connected') {
            return response()->json([
                'success' => false,
                'message' => 'WhatsApp instance must be connected to check numbers.',
            ], 422);
        }

        $contacts = $user->contacts()->whereIn('id', $request->contact_ids)->get();

        $validCount = 0;
        $invalidCount = 0;
        $checkedCount = 0;

        foreach ($contacts as $contact) {
            try {
                // POST to Node.js service
                $nodeUrl = rtrim(config('wasp.node_service_url'), '/') . '/api/contact/check';
                $response = Http::withHeaders([
                    'X-Service-Secret' => config('wasp.node_service_secret'),
                    'Content-Type' => 'application/json',
                ])->post($nodeUrl, [
                    'session_id' => $instance->session_id,
                    'phone' => $contact->phone,
                ]);

                if ($response->successful()) {
                    $resData = $response->json();
                    $exists = $resData['data']['exists'] ?? false;

                    $contact->update([
                        'is_invalid' => !$exists,
                    ]);

                    if ($exists) {
                        $validCount++;
                    } else {
                        $invalidCount++;
                    }
                    $checkedCount++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to check number {$contact->phone}: " . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'valid' => $validCount,
                'invalid' => $invalidCount,
                'checked' => $checkedCount,
            ]
        ]);
    }

    /**
     * Send manual WhatsApp message through Node.js proxy.
     */
    public function quickSend(Request $request)
    {
        $request->validate([
            'instance_id' => 'required|exists:whatsapp_instances,id',
            'phone' => 'required|string',
            'type' => 'required|string|in:text,image,video,document',
            'body' => 'nullable|string',
            'media_url' => 'nullable|url',
            'media_filename' => 'nullable|string',
        ]);

        $user = auth()->user();
        $instance = $user->whatsappInstances()->findOrFail($request->instance_id);

        if ($instance->status !== 'connected') {
            return response()->json([
                'success' => false,
                'message' => 'WhatsApp instance must be connected to send a message.',
            ], 422);
        }

        try {
            $nodeUrl = rtrim(config('wasp.node_service_url'), '/') . '/api/message/send';
            $response = Http::withHeaders([
                'X-Service-Secret' => config('wasp.node_service_secret'),
                'Content-Type' => 'application/json',
            ])->post($nodeUrl, [
                'session_id' => $instance->session_id,
                'phone' => $request->phone,
                'type' => $request->type,
                'body' => $request->body,
                'media_url' => $request->media_url,
                'media_filename' => $request->media_filename,
                'source_type' => 'manual',
            ]);

            if ($response->successful()) {
                return response()->json($response->json());
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to send message: ' . $response->body(),
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to connect to WhatsApp service: ' . $e->getMessage(),
            ], 500);
        }
    }
}
