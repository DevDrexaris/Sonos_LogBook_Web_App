<?php
require_once __DIR__ . '/../bootstrap.php';

$redirectUri = env_value(
    'GOOGLE_REDIRECT_URI',
    'https://sonoslogbookwebapp-production.up.railway.app/api/auth/google.php'
);
$clientId = env_value('GOOGLE_CLIENT_ID', '938960396366-8r9boja8p8pitc355qo2ejbe5koe8e25.apps.googleusercontent.com');
$clientSecret = env_value('GOOGLE_CLIENT_SECRET');
$frontendOrigin = rtrim(env_value('APP_ORIGIN', 'https://sono-logbook.vercel.app'), '/');

if ($clientSecret === '') {
    respond(false, 'Google login is not configured on the backend.', [], 503);
}

$code = $_GET['code'] ?? null;

if (!$code) {
    $params = http_build_query([
        'client_id' => $clientId,
        'redirect_uri' => $redirectUri,
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'access_type' => 'online',
    ]);

    header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
    exit;
}

$tokenPayload = [
    'code' => $code,
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'redirect_uri' => $redirectUri,
    'grant_type' => 'authorization_code',
];

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query($tokenPayload),
    ]
]);

$tokenJson = @file_get_contents('https://oauth2.googleapis.com/token', false, $context);
$tokenData = json_decode($tokenJson, true);

if (empty($tokenData['access_token'])) {
    respond(false, 'Google token exchange failed.', [], 400);
}

$userJson = @file_get_contents('https://openidconnect.googleapis.com/v1/userinfo?access_token=' . urlencode($tokenData['access_token']));
$user = json_decode($userJson, true);

if (empty($user['email']) || ($user['email_verified'] ?? false) !== true) {
    respond(false, 'Google login failed: no email returned.', [], 400);
}

$email = strtolower(trim($user['email']));
if (!str_ends_with($email, '@gmail.com')) {
    session_destroy();
    header('Location: ' . $frontendOrigin . '/login?google=error&message=' . rawurlencode('Only Gmail accounts can register or sign in.'));
    exit;
}
$fullName = trim($user['name'] ?? $user['given_name'] ?? 'Google User');
$username = preg_replace('/[^a-zA-Z0-9_]/', '', strtolower(str_replace(' ', '_', $fullName))) ?: 'googleuser';

$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$existing = $stmt->fetch();

if (!$existing) {
    $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $base = $username;
    $suffix = 1;

    while (true) {
        $check = $pdo->prepare('SELECT id FROM users WHERE username = ?');
        $check->execute([$username]);
        if (!$check->fetch()) {
            break;
        }
        $username = $base . $suffix;
        $suffix++;
    }

    $insert = $pdo->prepare('INSERT INTO users (full_name, username, email, password, profile_image, role) VALUES (?, ?, ?, ?, ?, ?)');
    $insert->execute([$fullName, $username, $email, $passwordHash, 'https://cdn.phototourl.com/free/2026-09-22-5a80ed76-cc8f-4016-abd2-1326314af37b.jpg', 'user']);
    $id = $pdo->lastInsertId();

    $fetch = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fetch->execute([$id]);
    $existing = $fetch->fetch();
}

unset($existing['password']);
$_SESSION['user'] = $existing;

header('Location: ' . $frontendOrigin . '/login?google=success');
exit;
