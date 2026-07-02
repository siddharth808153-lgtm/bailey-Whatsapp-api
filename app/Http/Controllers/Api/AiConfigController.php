<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class AiConfigController extends Controller
{
    use ApiResponse;

    /**
     * Show current AI configuration (provider + masked key).
     */
    public function show(Request $request)
    {
        $user = $request->user();

        $maskedKey = null;
        if ($user->ai_api_key) {
            try {
                $decrypted = Crypt::decrypt($user->ai_api_key);
                $maskedKey = substr($decrypted, 0, 6) . '••••••••' . substr($decrypted, -4);
            } catch (\Exception $e) {
                $maskedKey = '••••••••';
            }
        }

        return $this->success([
            'provider' => $user->ai_provider,
            'has_key' => !empty($user->ai_api_key),
            'masked_key' => $maskedKey,
        ]);
    }

    /**
     * Update AI provider and API key.
     */
    public function update(Request $request)
    {
        $request->validate([
            'provider' => 'required|in:openai,gemini,anthropic',
            'api_key' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $data = ['ai_provider' => $request->provider];

        if ($request->filled('api_key')) {
            $data['ai_api_key'] = Crypt::encrypt($request->api_key);
        }

        $user->update($data);

        return $this->success(null, 'AI configuration saved successfully.');
    }
}
