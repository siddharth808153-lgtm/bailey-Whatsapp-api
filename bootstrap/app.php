<?php

use App\Http\Middleware\CheckPlanFeature;
use App\Http\Middleware\HasActivePlan;
use App\Http\Middleware\IsReseller;
use App\Http\Middleware\IsResellerOrSuperAdmin;
use App\Http\Middleware\IsSuperAdmin;
use App\Http\Middleware\TrackLastLogin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'super_admin' => IsSuperAdmin::class,
            'reseller' => IsReseller::class,
            'reseller_or_super' => IsResellerOrSuperAdmin::class,
            'active_plan' => HasActivePlan::class,
            'plan.feature' => CheckPlanFeature::class,
            'track.login' => TrackLastLogin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
