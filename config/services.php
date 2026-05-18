<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ml' => [
        'python_bin' => env('ML_PYTHON_BIN', 'python'),
        'model_dir' => env('ML_MODEL_DIR', '../ml'),
        'enable_batch_predictions' => env('ML_ENABLE_BATCH_PREDICTIONS', false),
    ],

    'idfm_navitia' => [
        'enabled' => env('IDFM_NAVITIA_ENABLED', false),
        'api_key' => env('IDFM_NAVITIA_API_KEY'),
        'base_url' => env('IDFM_NAVITIA_BASE_URL', 'https://prim.iledefrance-mobilites.fr/marketplace/v2'),
        'timeout' => env('IDFM_NAVITIA_TIMEOUT', 8),
        'calm_candidate_limit' => env('IDFM_NAVITIA_CALM_CANDIDATE_LIMIT', 8),
    ],

];
