<?php
// app/Console/Commands/ProcessScheduledCampaigns.php

namespace App\Console\Commands;

use App\Models\Campaign;
use App\Jobs\ProcessCampaignJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessScheduledCampaigns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'campaigns:process-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Trigger scheduled campaigns that have reached their target time.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $campaigns = Campaign::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        $count = $campaigns->count();

        if ($count > 0) {
            foreach ($campaigns as $campaign) {
                // Update status immediately to prevent duplicate runs
                $campaign->update([
                    'status' => 'running',
                ]);

                // Dispatch bulk processor job
                ProcessCampaignJob::dispatch($campaign);

                Log::info("Dispatched scheduled campaign ID {$campaign->id} ({$campaign->name})");
            }
            $this->info("Successfully triggered {$count} scheduled campaigns.");
        } else {
            $this->info("No scheduled campaigns to trigger.");
        }
    }
}
