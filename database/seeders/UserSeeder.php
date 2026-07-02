<?php
// database/seeders/UserSeeder.php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\User;
use App\Models\ResellerSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $proPlan = Plan::where('slug', 'pro')->first();
        $starterPlan = Plan::where('slug', 'starter')->first();

        // 1. Super Admin
        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@wasp.com',
            'password' => Hash::make('secret123'),
            'role' => 'super_admin',
            'reseller_id' => null,
            'plan_id' => null,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // 2. Reseller
        $reseller = User::create([
            'name' => 'Demo Reseller',
            'email' => 'reseller@wasp.com',
            'password' => Hash::make('secret123'),
            'role' => 'reseller',
            'reseller_id' => null,
            'plan_id' => $proPlan ? $proPlan->id : null,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // Create reseller settings for the reseller
        ResellerSetting::create([
            'user_id' => $reseller->id,
            'business_name' => 'Demo Reseller',
            'primary_color' => '#2563EB',
            'markup_percentage' => 0.00,
            'credit_balance' => 0.00,
        ]);

        // 3. User (assigned to Reseller, with Starter plan)
        $user = User::create([
            'name' => 'Demo User',
            'email' => 'user@wasp.com',
            'password' => Hash::make('secret123'),
            'role' => 'user',
            'reseller_id' => $reseller->id,
            'plan_id' => $starterPlan ? $starterPlan->id : null,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        if ($starterPlan) {
            \App\Models\Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $starterPlan->id,
                'status' => 'active',
                'billing_cycle' => 'monthly',
                'amount_paid' => 19,
                'starts_at' => now(),
                'ends_at' => now()->addYears(5),
                'payment_method' => 'stripe',
            ]);
        }
    }
}
