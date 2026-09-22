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

function env_value_any($keys, $fallback = '') {
    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value !== false && $value !== null && $value !== '') {
            return $value;
        }
    }

    global $env;
    foreach ($keys as $key) {
        if (isset($env[$key]) && $env[$key] !== '') {
            return $env[$key];
        }
    }

    return $fallback;
}
