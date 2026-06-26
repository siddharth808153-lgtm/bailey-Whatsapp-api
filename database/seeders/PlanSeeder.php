<?php
// database/seeders/PlanSeeder.php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price_monthly' => 0.00,
                'price_yearly' => null,
                'max_instances' => 1,
                'max_messages_per_month' => 500,
                'max_contacts' => 200,
                'max_drip_sequences' => 0,
                'max_chatbot_flows' => 1,
                'can_use_ai_chatbot' => false,
                'can_use_groups' => false,
                'can_use_warmer' => false,
                'can_use_api' => false,
                'can_white_label' => false,
                'is_active' => true,
                'is_public' => true,
            ],
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'price_monthly' => 499.00,
                'price_yearly' => null,
                'max_instances' => 1,
                'max_messages_per_month' => 5000,
                'max_contacts' => 2000,
                'max_drip_sequences' => 3,
                'max_chatbot_flows' => 3,
                'can_use_ai_chatbot' => false,
                'can_use_groups' => false,
                'can_use_warmer' => true,
                'can_use_api' => false,
                'can_white_label' => false,
                'is_active' => true,
                'is_public' => true,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price_monthly' => 999.00,
                'price_yearly' => null,
                'max_instances' => 3,
                'max_messages_per_month' => 25000,
                'max_contacts' => 10000,
                'max_drip_sequences' => -1,
                'max_chatbot_flows' => -1,
                'can_use_ai_chatbot' => true,
                'can_use_groups' => true,
                'can_use_warmer' => true,
                'can_use_api' => false,
                'can_white_label' => false,
                'is_active' => true,
                'is_public' => true,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'price_monthly' => 2499.00,
                'price_yearly' => null,
                'max_instances' => 10,
                'max_messages_per_month' => -1,
                'max_contacts' => -1,
                'max_drip_sequences' => -1,
                'max_chatbot_flows' => -1,
                'can_use_ai_chatbot' => true,
                'can_use_groups' => true,
                'can_use_warmer' => true,
                'can_use_api' => true,
                'can_white_label' => true,
                'is_active' => true,
                'is_public' => true,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::create($plan);
        }
    }
}
