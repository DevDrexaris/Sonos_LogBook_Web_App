<?php
$env = parse_ini_file(__DIR__ . '/.env');
function env_value($key, $fallback = '') { global $env; return $env[$key] ?? getenv($key) ?: $fallback; }
