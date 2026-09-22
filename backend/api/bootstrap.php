<?php
require_once __DIR__ . '/../config.php';
$origin = env_value('APP_ORIGIN', 'http://localhost:5173');
header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Credentials: true'); header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'); header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
session_name(env_value('SESSION_NAME', 'logbook_session')); session_start();
$dbHost = env_value_any(['MYSQLHOST', 'DB_HOST'], '127.0.0.1');
$dbPort = env_value_any(['MYSQLPORT', 'DB_PORT'], '3306');
$dbName = env_value_any(['MYSQLDATABASE', 'DB_DATABASE'], 'logbook');
$dbUser = env_value_any(['MYSQLUSER', 'DB_USERNAME'], 'root');
$dbPassword = env_value_any(['MYSQLPASSWORD', 'DB_PASSWORD'], '');
try {
	$pdo = new PDO('mysql:host='.$dbHost.';port='.$dbPort.';dbname='.$dbName.';charset=utf8mb4', $dbUser, $dbPassword, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
} catch (Throwable $e) {
	error_log('Database connection failed: ' . $e->getMessage());
	http_response_code(503);
	respond(false, 'Database connection is unavailable.');
}
function body() { return json_decode(file_get_contents('php://input'), true) ?: []; }
function respond($success, $message = '', $data = [], $status = 200) { http_response_code($status); echo json_encode(['success'=>$success, 'message'=>$message] + ($data ? ['data'=>$data] : [])); exit; }
function require_auth($role = null) { if (empty($_SESSION['user'])) respond(false, 'Your session has expired. Please log in again.', [], 401); if ($role && $_SESSION['user']['role'] !== $role) respond(false, 'You do not have permission to access this resource.', [], 403); return $_SESSION['user']; }
function clean($value) { return trim((string)$value); }
