<?php
require_once __DIR__ . '/../bootstrap.php';

$input = body();
$email = strtolower(trim((string)($input['email'] ?? '')));
$generic = 'If that Gmail account exists, a verification code has been sent.';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '@gmail.com')) {
    respond(true, $generic);
}

$stmt = $pdo->prepare('SELECT id, full_name FROM users WHERE email=? AND status=? LIMIT 1');
$stmt->execute([$email, 'active']);
$user = $stmt->fetch();
if (!$user) respond(true, $generic);

$apiKey = env_value('RESEND_API_KEY');
$from = env_value('MAIL_FROM', 'Sono <onboarding@resend.dev>');
if ($apiKey === '') {
    error_log('Password reset unavailable: RESEND_API_KEY is not configured.');
    respond(false, 'Password reset email is not configured yet.', [], 503);
}

$code = (string)random_int(100000, 999999);
$hash = hash('sha256', $code);
$expires = date('Y-m-d H:i:s', time() + 900);
$pdo->prepare('DELETE FROM password_resets WHERE user_id=? OR expires_at < NOW()')->execute([$user['id']]);
$pdo->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)')->execute([$user['id'], $hash, $expires]);

$payload = json_encode([
    'from' => $from,
    'to' => [$email],
    'subject' => 'Your Sono password reset code',
    'text' => "Hi {$user['full_name']},\n\nYour Sono password reset code is {$code}. It expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.",
    'html' => '<p>Hi '.htmlspecialchars($user['full_name'], ENT_QUOTES, 'UTF-8').',</p><p>Your Sono password reset code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">'.$code.'</p><p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>',
], JSON_UNESCAPED_SLASHES);

$context = stream_context_create(['http' => [
    'method' => 'POST',
    'header' => "Authorization: Bearer {$apiKey}\r\nContent-Type: application/json\r\nContent-Length: " . strlen($payload) . "\r\n",
    'content' => $payload,
    'ignore_errors' => true,
]]);
$response = @file_get_contents('https://api.resend.com/emails', false, $context);
$status = $http_response_header[0] ?? '';
if ($response === false || !str_contains($status, ' 2')) {
    $pdo->prepare('DELETE FROM password_resets WHERE user_id=?')->execute([$user['id']]);
    error_log('Password reset email failed: ' . ($response ?: $status));
    respond(false, 'Unable to send the verification email. Please try again later.', [], 502);
}

respond(true, $generic);
