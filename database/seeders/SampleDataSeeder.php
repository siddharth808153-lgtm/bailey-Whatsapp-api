<?php
// database/seeders/SampleDataSeeder.php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\ContactList;
use App\Models\DripSequence;
use App\Models\DripStep;
use App\Models\MessageTemplate;
use App\Models\User;
use App\Models\WhatsappInstance;
use Illuminate\Database\Seeder;

class SampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Find the demo user
        $user = User::where('email', 'user@wasp.com')->first();

        if (!$user) {
            return;
        }

        // 1. WhatsApp Instance
        $instance = WhatsappInstance::create([
            'user_id' => $user->id,
            'name' => 'My Business',
            'phone_number' => null,
            'status' => 'disconnected',
            'session_id' => 'session_demo_user_1',
            'webhook_url' => null,
            'is_warmed' => false,
            'daily_message_limit' => 200,
            'messages_sent_today' => 0,
            'messages_sent_this_month' => 0,
            'is_active' => true,
        ]);

        // 2. 5 Sample Contacts with Indian phone numbers
        $contactsData = [
            ['name' => 'Aarav Sharma', 'phone' => '919876543210', 'email' => 'aarav@example.com'],
            ['name' => 'Vihaan Patel', 'phone' => '919876543211', 'email' => 'vihaan@example.com'],
            ['name' => 'Aditya Verma', 'phone' => '919876543212', 'email' => 'aditya@example.com'],
            ['name' => 'Diya Sen', 'phone' => '919876543213', 'email' => 'diya@example.com'],
            ['name' => 'Ananya Iyer', 'phone' => '919876543214', 'email' => 'ananya@example.com'],
        ];

        $contacts = [];
        foreach ($contactsData as $data) {
            $contacts[] = Contact::create([
                'user_id' => $user->id,
                'name' => $data['name'],
                'phone' => $data['phone'],
                'email' => $data['email'],
                'custom1' => 'VIP Customer',
                'is_opted_out' => false,
                'is_invalid' => false,
                'tags' => ['customer', 'retail'],
            ]);
        }

        // 3. Contact List with those 5 contacts
        $contactList = ContactList::create([
            'user_id' => $user->id,
            'name' => 'My Customers',
            'description' => 'A list of my primary customer contacts.',
            'contact_count' => count($contacts),
        ]);

        // Attach contacts to the list
        $contactList->contacts()->sync(array_column($contacts, 'id'));

        // 4. Message Template
        MessageTemplate::create([
            'user_id' => $user->id,
            'name' => 'Welcome Message',
            'category' => 'greeting',
            'message_type' => 'text',
            'body' => "Hi {{name}}! Welcome to our service. Feel free to reach out anytime. 😊",
            'has_buttons' => false,
            'buttons' => null,
        ]);

        // 5. Drip Sequence
        $drip = DripSequence::create([
            'user_id' => $user->id,
            'instance_id' => $instance->id,
            'name' => 'Welcome Sequence',
            'status' => 'active',
            'description' => 'Sequence sent to new customers onboarding on our platform.',
        ]);

        // Steps for Drip Sequence
        DripStep::create([
            'sequence_id' => $drip->id,
            'step_number' => 1,
            'name' => 'Day 0 Greeting',
            'message_type' => 'text',
            'message_body' => "Hi {{name}}, thanks for joining!",
            'wait_days' => 0,
            'wait_hours' => 0,
            'send_time' => '10:00:00',
        ]);

        DripStep::create([
            'sequence_id' => $drip->id,
            'step_number' => 2,
            'name' => 'Day 1 Value Pitch',
            'message_type' => 'text',
            'message_body' => "{{name}}, here's how we can help you...",
            'wait_days' => 1,
            'wait_hours' => 0,
            'send_time' => '10:00:00',
        ]);

        DripStep::create([
            'sequence_id' => $drip->id,
            'step_number' => 3,
            'name' => 'Day 3 Checkup',
            'message_type' => 'text',
            'message_body' => "{{name}}, any questions? Reply anytime!",
            'wait_days' => 3,
            'wait_hours' => 0,
            'send_time' => '10:00:00',
        ]);
    }
}
