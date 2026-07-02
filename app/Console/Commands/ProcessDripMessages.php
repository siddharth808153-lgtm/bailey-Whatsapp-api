<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DripEnrollment;
use App\Jobs\ProcessDripMessageJob;
use Carbon\Carbon;

class ProcessDripMessages extends Command
{
    protected $signature = 'drip:process';
    protected $description = 'Send due drip messages';

    public function handle(): void
    {
        $dueEnrollments = DripEnrollment::with([
            'dripSequence.whatsappInstance',
            'contact',
            'dripSequence.dripSteps'
        ])
        ->where('status', 'active')
        ->where('next_message_at', '<=', Carbon::now())
        ->get();

        $this->info("Processing {$dueEnrollments->count()} drip messages");

        foreach ($dueEnrollments as $enrollment) {
            ProcessDripMessageJob::dispatch($enrollment);
        }
    }
}
