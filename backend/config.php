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

function database_config() {
    $url = env_value_any(['MYSQL_URL', 'DATABASE_URL'], '');
    if ($url !== '') {
        $parts = parse_url($url);
        if (is_array($parts) && !empty($parts['host'])) {
            return [
                'host' => $parts['host'],
                'port' => $parts['port'] ?? 3306,
                'database' => isset($parts['path']) ? ltrim($parts['path'], '/') : 'logbook',
                'username' => isset($parts['user']) ? urldecode($parts['user']) : 'root',
                'password' => isset($parts['pass']) ? urldecode($parts['pass']) : '',
            ];
        }
    }

    return [
        'host' => env_value_any(['MYSQLHOST', 'DB_HOST'], ''),
        'port' => env_value_any(['MYSQLPORT', 'DB_PORT'], '3306'),
        'database' => env_value_any(['MYSQLDATABASE', 'DB_DATABASE'], 'logbook'),
        'username' => env_value_any(['MYSQLUSER', 'DB_USERNAME'], 'root'),
        'password' => env_value_any(['MYSQLPASSWORD', 'DB_PASSWORD'], ''),
    ];
}
