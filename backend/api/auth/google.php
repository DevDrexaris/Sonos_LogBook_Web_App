<?php
require_once __DIR__ . '/../bootstrap.php';

$redirectUri = env_value(
    'GOOGLE_REDIRECT_URI',
    'https://sonoslogbookwebapp-production.up.railway.app/api/auth/google.php'
);
$clientId = env_value('GOOGLE_CLIENT_ID');

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
    'client_secret' => env_value('GOOGLE_CLIENT_SECRET'),
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

if (empty($user['email'])) {
    respond(false, 'Google login failed: no email returned.', [], 400);
}

$email = strtolower(trim($user['email']));
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
    $insert->execute([$fullName, $username, $email, $passwordHash, '/api/uploads/profiles/SonoDefaultbald.jpg', 'user']);
    $id = $pdo->lastInsertId();

    $fetch = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fetch->execute([$id]);
    $existing = $fetch->fetch();
}

unset($existing['password']);
$_SESSION['user'] = $existing;

respond(true, 'Google login successful.', ['user' => $existing]);
