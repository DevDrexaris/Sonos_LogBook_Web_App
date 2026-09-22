<?php
$env = [];
if (file_exists(__DIR__ . '/.env')) {
    $env = parse_ini_file(__DIR__ . '/.env') ?: [];
}

function env_value($key, $fallback = '') {
    global $env;
    $value = getenv($key);
    if ($value === false || $value === null || $value === '') {
        $value = $env[$key] ?? null;
    }
    return ($value !== false && $value !== null && $value !== '') ? $value : $fallback;
}
