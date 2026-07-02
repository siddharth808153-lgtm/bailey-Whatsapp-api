<?php
// app/Jobs/ProcessCampaignJob.php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\Contact;
use App\Models\CampaignMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $campaign;
    public $timeout = 7200; // 2 hours
    public $tries = 1;

    /**
     * Create a new job instance.
     */
    public function __construct(Campaign $campaign)
    {
        $this->campaign = $campaign;
        $this->onQueue('campaigns');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $campaign = $this->campaign->fresh();

        // Guard: only process if running or scheduled
        if (!$campaign || !in_array($campaign->status, ['running', 'scheduled', 'draft'])) {
            return;
        }

        // Update to running + record start time
        $campaign->update([
            'status' => 'running',
            'started_at' => now(),
        ]);

        // Get instance
        $instance = $campaign->instance;
        if (!$instance || $instance->status !== 'connected') {
            $campaign->update(['status' => 'failed']);
            return;
        }

        // Build contact list
        $contacts = $this->buildContactList($campaign);

        if ($contacts->isEmpty()) {
            $campaign->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
            return;
        }

        // Create campaign_messages for all contacts
        $this->createCampaignMessages($campaign, $contacts);

        // Fetch contacts with the created message IDs to compile payloads
        $payloadContacts = $campaign->campaignMessages()
            ->with('contact')
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->contact_id,
                    'name' => $msg->contact->name,
                    'phone' => $msg->phone,
                    'custom1' => $msg->contact->custom1,
                    'custom2' => $msg->contact->custom2,
                    'campaign_message_id' => $msg->id,
                ];
            });

        // Build payload for Node service
        $messages = $this->buildMessagePayload($campaign, collect($payloadContacts));

        // Send to Node service in batches of 500
        $chunks = array_chunk($messages, 500);

        foreach ($chunks as $chunk) {
            // Check if campaign was paused/cancelled
            $campaign->refresh();
            if ($campaign->status !== 'running') {
                return;
            }

            try {
                $nodeUrl = rtrim(config('wasp.node_service_url'), '/') . '/api/message/send-campaign-bulk';
                Http::withHeaders([
                    'X-Service-Secret' => config('wasp.node_service_secret'),
                    'Content-Type' => 'application/json',
                ])->timeout(30)->post($nodeUrl, [
                    'session_id' => $instance->session_id,
                    'campaign_id' => $campaign->id,
                    'messages' => $chunk,
                    'min_delay' => $campaign->min_delay_seconds * 1000,
                    'max_delay' => $campaign->max_delay_seconds * 1000,
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to send chunk to Node service for campaign {$campaign->id}: " . $e->getMessage());
                $campaign->update(['status' => 'failed']);
                return;
            }
        }
    }

    /**
     * Build target contact details.
     */
    private function buildContactList(Campaign $campaign): Collection
    {
        $contacts = collect();

        if ($campaign->contact_list_id) {
            // Sourced from List Group
            $listContacts = Contact::whereHas('contactLists', function ($q) use ($campaign) {
                $q->where('contact_list_id', $campaign->contact_list_id);
            })
            ->where('is_opted_out', false)
            ->where('is_invalid', false)
            ->where('user_id', $campaign->user_id)
            ->get(['id', 'name', 'phone', 'custom1', 'custom2']);

            foreach ($listContacts as $c) {
                $contacts->push([
                    'id' => $c->id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'custom1' => $c->custom1,
                    'custom2' => $c->custom2,
                ]);
            }
        } elseif ($campaign->custom_contacts) {
            // Sourced from raw numbers array
            $customArr = is_string($campaign->custom_contacts) 
                ? json_decode($campaign->custom_contacts, true) 
                : $campaign->custom_contacts;

            if (is_array($customArr)) {
                foreach ($customArr as $item) {
                    $phoneVal = $item['phone'] ?? '';
                    $phone = preg_replace('/\D/', '', $phoneVal);
                    if (strlen($phone) === 10) {
                        $phone = '91' . $phone;
                    }

                    if (empty($phone) || strlen($phone) < 10) {
                        continue;
                    }

                    // Check if opted out or invalid in contacts DB
                    $dbContact = Contact::where('user_id', $campaign->user_id)
                        ->where('phone', $phone)
                        ->first();

                    if ($dbContact && ($dbContact->is_opted_out || $dbContact->is_invalid)) {
                        continue;
                    }

                    if (!$dbContact) {
                        // Create contact record so we have a valid contact_id
                        $dbContact = Contact::create([
                            'user_id' => $campaign->user_id,
                            'name' => $item['name'] ?? 'Contact ' . $phone,
                            'phone' => $phone,
                            'is_opted_out' => false,
                            'is_invalid' => false,
                        ]);
                    }

                    $contacts->push([
                        'id' => $dbContact->id,
                        'name' => $dbContact->name,
                        'phone' => $dbContact->phone,
                        'custom1' => $dbContact->custom1,
                        'custom2' => $dbContact->custom2,
                    ]);
                }
            }
        }

        // Return unique phones
        return $contacts->unique('phone');
    }

    /**
     * Batch insert campaign_messages.
     */
    private function createCampaignMessages(Campaign $campaign, Collection $contacts): void
    {
        $rows = [];
        $now = now();

        foreach ($contacts as $contact) {
            $rows[] = [
                'campaign_id' => $campaign->id,
                'contact_id' => $contact['id'],
                'instance_id' => $campaign->instance_id,
                'phone' => $contact['phone'],
                'status' => 'pending',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $chunks = array_chunk($rows, 500);
        foreach ($chunks as $chunk) {
            DB::table('campaign_messages')->insertOrIgnore($chunk);
        }
    }

    /**
     * Build message payloads with custom variable text substitutions.
     */
    private function buildMessagePayload(Campaign $campaign, Collection $contacts): array
    {
        $payloads = [];

        foreach ($contacts as $contact) {
            // Apply personalization variable replacements to body
            $body = $campaign->message_body;
            $body = str_replace('{{name}}', $contact['name'], $body);
            $body = str_replace('{{phone}}', $contact['phone'], $body);
            $body = str_replace('{{custom1}}', $contact['custom1'] ?? '', $body);

            $payloads[] = [
                'phone' => $contact['phone'],
                'type' => $campaign->message_type,
                'body' => $body,
                'media_url' => $campaign->media_url,
                'media_filename' => $campaign->media_filename,
                'footer' => $campaign->footer,
                'buttons' => $campaign->buttons,
                'variables' => [
                    'name' => $contact['name'],
                    'phone' => $contact['phone'],
                    'custom1' => $contact['custom1'] ?? '',
                ],
                'campaign_message_id' => $contact['campaign_message_id'],
                'campaign_id' => $campaign->id,
                'source_type' => 'campaign',
                'source_id' => $campaign->id,
            ];
        }

        return $payloads;
    }
}
