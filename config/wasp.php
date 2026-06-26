<?php
// config/wasp.php

return [
    'node_service_url' => env('NODE_SERVICE_URL', 'http://localhost:3001'),
    'node_service_secret' => env('NODE_SERVICE_SECRET', 'wasp_secret'),
    'max_bulk_contacts' => env('MAX_BULK_CONTACTS', 10000),
    'warmup_days' => env('WARMUP_DAYS', 7),
    'warmup_daily_targets' => [
        1 => 20,
        2 => 35,
        3 => 55,
        4 => 80,
        5 => 110,
        6 => 150,
        7 => 200,
    ],
    'message_delay_min' => env('MSG_DELAY_MIN', 3),
    'message_delay_max' => env('MSG_DELAY_MAX', 15),
    'trial_days' => env('TRIAL_DAYS', 7),
    'app_name' => env('WASP_APP_NAME', 'WASp'),
    'app_url' => env('APP_URL', 'http://localhost:8000'),
];
