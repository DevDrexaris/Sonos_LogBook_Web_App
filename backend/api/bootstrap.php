<?php
require_once __DIR__ . '/../config.php';
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
} catch (Throwable $e) {
	error_log('Database connection failed for host='.$dbHost.' port='.$dbPort.' database='.$dbName.' user='.$dbUser.': ' . $e->getMessage());
	http_response_code(503);
	respond(false, 'Database connection is unavailable. Check the Railway backend logs for the PDO error.', [], 503);
}
function body() { return json_decode(file_get_contents('php://input'), true) ?: []; }
function respond($success, $message = '', $data = [], $status = 200) { http_response_code($status); echo json_encode(['success'=>$success, 'message'=>$message] + ($data ? ['data'=>$data] : [])); exit; }
function require_auth($role = null) { if (empty($_SESSION['user'])) respond(false, 'Your session has expired. Please log in again.', [], 401); if ($role && $_SESSION['user']['role'] !== $role) respond(false, 'You do not have permission to access this resource.', [], 403); return $_SESSION['user']; }
function clean($value) { return trim((string)$value); }
