<?php
require_once __DIR__ . '/../config.php';
date_default_timezone_set('Asia/Manila');
$origin = env_value('APP_ORIGIN', 'http://localhost:5173');
header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Credentials: true'); header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'); header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
session_name(env_value('SESSION_NAME', 'logbook_session'));
session_set_cookie_params([
	'lifetime' => 0,
	'path' => '/',
	'secure' => true,
	'httponly' => true,
	'samesite' => 'None',
]);
session_start();
$database = database_config();
$dbHost = $database['host'];
$dbPort = $database['port'];
$dbName = $database['database'];
$dbUser = $database['username'];
$dbPassword = $database['password'];
if ($dbHost === '') {
    http_response_code(503);
    respond(false, 'Database configuration is missing. Add Railway MySQL variables to this backend service.', [], 503);
}
try {
	$pdo = new PDO('mysql:host='.$dbHost.';port='.$dbPort.';dbname='.$dbName.';charset=utf8mb4', $dbUser, $dbPassword, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
	$pdo->exec("SET time_zone = '+08:00'");
} catch (Throwable $e) {
	error_log('Database connection failed for host='.$dbHost.' port='.$dbPort.' database='.$dbName.' user='.$dbUser.': ' . $e->getMessage());
	http_response_code(503);
	respond(false, 'Database connection is unavailable. Check the Railway backend logs for the PDO error.', [], 503);
}
function body() { return json_decode(file_get_contents('php://input'), true) ?: []; }
function respond($success, $message = '', $data = [], $status = 200) { http_response_code($status); echo json_encode(['success'=>$success, 'message'=>$message] + ($data ? ['data'=>$data] : [])); exit; }
function require_auth($role = null) { if (empty($_SESSION['user'])) respond(false, 'Your session has expired. Please log in again.', [], 401); if ($role && $_SESSION['user']['role'] !== $role) respond(false, 'You do not have permission to access this resource.', [], 403); return $_SESSION['user']; }
function clean($value) { return trim((string)$value); }
function client_ip() { return $_SERVER['REMOTE_ADDR'] ?? 'unknown'; }
function rate_limit($pdo, $key, $limit, $windowSeconds) {
	$windowSeconds = max(1, (int)$windowSeconds);
	$limit = max(1, (int)$limit);
	$pdo->prepare("INSERT INTO api_rate_limits(rate_key, window_started, attempts) VALUES (?, NOW(), 1) ON DUPLICATE KEY UPDATE attempts = IF(window_started < DATE_SUB(NOW(), INTERVAL {$windowSeconds} SECOND), 1, attempts + 1), window_started = IF(window_started < DATE_SUB(NOW(), INTERVAL {$windowSeconds} SECOND), NOW(), window_started)")->execute([$key]);
	$stmt = $pdo->prepare('SELECT attempts FROM api_rate_limits WHERE rate_key=? LIMIT 1');
	$stmt->execute([$key]);
	return (int)$stmt->fetchColumn() <= $limit;
}
function send_brevo_email($to, $subject, $text, $html) {
	$key = env_value('BREVO_API_KEY');
	$from = env_value('MAIL_FROM_EMAIL', env_value('MAIL_FROM'));
	$from = trim(preg_replace('/.*<([^>]+)>.*/', '$1', $from));
	if ($key === '' || $from === '') return ['ok' => false, 'status' => 0];
	$payload = json_encode(['sender' => ['name' => env_value('MAIL_FROM_NAME', 'Sono'), 'email' => $from], 'to' => [['email' => $to]], 'subject' => $subject, 'textContent' => $text, 'htmlContent' => $html], JSON_UNESCAPED_SLASHES);
	$context = stream_context_create(['http' => ['method' => 'POST', 'header' => "api-key: {$key}\r\nContent-Type: application/json\r\nContent-Length: " . strlen($payload) . "\r\n", 'content' => $payload, 'ignore_errors' => true]]);
	$response = @file_get_contents('https://api.brevo.com/v3/smtp/email', false, $context);
	$status = $http_response_header[0] ?? '';
	preg_match('/\s(\d{3})\s/', $status, $statusMatch);
	return ['ok' => $response !== false && (int)($statusMatch[1] ?? 0) >= 200 && (int)($statusMatch[1] ?? 0) < 300, 'status' => (int)($statusMatch[1] ?? 0), 'response' => $response ?: $status];
}
