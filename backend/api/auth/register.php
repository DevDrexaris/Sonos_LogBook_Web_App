<?php
require_once __DIR__ . '/../bootstrap.php';

$input = body();
$name = clean($input['full_name'] ?? '');
$username = clean($input['username'] ?? '');
$email = strtolower(trim((string)($input['email'] ?? '')));
$password = (string)($input['password'] ?? '');
$code = trim((string)($input['verification_code'] ?? ''));
$generic = 'If the details are eligible, a verification code has been sent to that Gmail address.';
ensure_signup_security_tables($pdo);

if (!$name || strlen($name) > 120 || !preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username) || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[^@\s]+@gmail\.com$/i', $email) || strlen($password) < 8 || $password !== ($input['confirm_password'] ?? '')) {
	respond(false, 'Use a valid Gmail address and complete all required fields.', [], 422);
}

$ip = client_ip();
if ($code !== '') {
	if (!preg_match('/^\d{6}$/', $code) || !rate_limit($pdo, 'signup_verify_ip:' . hash('sha256', $ip), 10, 3600)) {
		respond(false, 'Too many verification attempts. Request a new code later.', [], 429);
	}
	$stmt = $pdo->prepare('SELECT * FROM signup_verifications WHERE email=? AND expires_at > NOW() LIMIT 1');
	$stmt->execute([$email]);
	$pending = $stmt->fetch();
	if (!$pending || (int)$pending['attempts'] >= 5) respond(false, 'That verification code is invalid or expired. Request a new one.', [], 422);
	$pdo->prepare('UPDATE signup_verifications SET attempts=attempts+1 WHERE id=?')->execute([$pending['id']]);
	if (!hash_equals($pending['code_hash'], hash('sha256', $code))) respond(false, 'That verification code is invalid or expired. Request a new one.', [], 422);

	$check = $pdo->prepare('SELECT id FROM users WHERE email=? OR username=? LIMIT 1');
	$check->execute([$email, $username]);
	if ($check->fetch()) {
		$pdo->prepare('DELETE FROM signup_verifications WHERE id=?')->execute([$pending['id']]);
		respond(false, 'That email or username is already in use.', [], 409);
	}
	$defaultImage = 'https://cdn.phototourl.com/free/2026-09-22-5a80ed76-cc8f-4016-abd2-1326314af37b.jpg';
	$stmt = $pdo->prepare('INSERT INTO users(full_name,username,email,password,profile_image) VALUES(?,?,?,?,?)');
	$stmt->execute([$pending['full_name'], $pending['username'], $pending['email'], $pending['password_hash'], $defaultImage]);
	$id = $pdo->lastInsertId();
	$pdo->prepare('DELETE FROM signup_verifications WHERE id=?')->execute([$pending['id']]);
	$_SESSION['user'] = ['id' => $id, 'full_name' => $pending['full_name'], 'username' => $pending['username'], 'email' => $pending['email'], 'profile_image' => $defaultImage, 'role' => 'user'];
	respond(true, 'Account created successfully.', ['user' => $_SESSION['user']]);
}

if (!rate_limit($pdo, 'signup_ip:' . hash('sha256', $ip), 5, 3600) || !rate_limit($pdo, 'signup_email:' . hash('sha256', $email), 3, 900)) {
	respond(false, 'Too many signup attempts. Please try again later.', [], 429);
}
$check = $pdo->prepare('SELECT id FROM users WHERE email=? OR username=? LIMIT 1');
$check->execute([$email, $username]);
if ($check->fetch()) respond(true, $generic, ['verification_required' => true]);

$code = (string)random_int(100000, 999999);
$hash = hash('sha256', $code);
$expires = date('Y-m-d H:i:s', time() + 900);
$pdo->prepare('DELETE FROM signup_verifications WHERE email=? OR expires_at < NOW()')->execute([$email]);
$pdo->prepare('INSERT INTO signup_verifications(full_name, username, email, password_hash, code_hash, expires_at, attempts, ip_address) VALUES(?,?,?,?,?,?,0,?)')->execute([$name, $username, $email, password_hash($password, PASSWORD_DEFAULT), $hash, $expires, $ip]);
$html = '<p>Welcome to Sono.</p><p>Your verification code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">' . $code . '</p><p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>';
$brevo = send_brevo_email($email, 'Verify your Sono account', "Your Sono verification code is {$code}. It expires in 15 minutes.", $html);
if (!$brevo['ok']) {
	$pdo->prepare('DELETE FROM signup_verifications WHERE email=?')->execute([$email]);
	error_log('Signup verification email failed status=' . $brevo['status'] . ' response=' . ($brevo['response'] ?? ''));
	respond(false, 'Verification email is temporarily unavailable. Please try again later.', [], 503);
}
respond(true, $generic, ['verification_required' => true]);
