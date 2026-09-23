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

$resendKey = env_value('RESEND_API_KEY');
$brevoKey = env_value('BREVO_API_KEY');
$from = env_value('MAIL_FROM_EMAIL', env_value('MAIL_FROM'));
$from = trim(preg_replace('/.*<([^>]+)>.*/', '$1', $from));
$fromName = env_value('MAIL_FROM_NAME', 'Sono');
if (($resendKey === '' && $brevoKey === '') || $from === '') {
    error_log('Password reset unavailable: configure BREVO_API_KEY or RESEND_API_KEY plus MAIL_FROM_EMAIL.');
    respond(false, 'Password reset email is not configured. Add a mail provider key and verified sender to Railway.', [], 503);
}

$code = (string)random_int(100000, 999999);
$hash = hash('sha256', $code);
$expires = date('Y-m-d H:i:s', time() + 900);
$pdo->prepare('DELETE FROM password_resets WHERE user_id=? OR expires_at < NOW()')->execute([$user['id']]);
$pdo->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)')->execute([$user['id'], $hash, $expires]);

$subject = 'Your Sono password reset code';
$text = "Hi {$user['full_name']},\n\nYour Sono password reset code is {$code}. It expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.";
$html = '<p>Hi '.htmlspecialchars($user['full_name'], ENT_QUOTES, 'UTF-8').',</p><p>Your Sono password reset code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">'.$code.'</p><p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>';
if ($brevoKey !== '') {
    $payload = json_encode(['sender' => ['name' => $fromName, 'email' => $from], 'to' => [['email' => $email]], 'subject' => $subject, 'textContent' => $text, 'htmlContent' => $html], JSON_UNESCAPED_SLASHES);
    $url = 'https://api.brevo.com/v3/smtp/email';
    $authHeader = "api-key: {$brevoKey}";
} else {
    $payload = json_encode(['from' => $fromName.' <'.$from.'>', 'to' => [$email], 'subject' => $subject, 'text' => $text, 'html' => $html], JSON_UNESCAPED_SLASHES);
    $url = 'https://api.resend.com/emails';
    $authHeader = "Authorization: Bearer {$resendKey}";
}

$context = stream_context_create(['http' => [
    'method' => 'POST',
    'header' => $authHeader."\r\nContent-Type: application/json\r\nContent-Length: " . strlen($payload) . "\r\n",
    'content' => $payload,
    'ignore_errors' => true,
]]);
$response = @file_get_contents($url, false, $context);
$status = $http_response_header[0] ?? '';
preg_match('/\s(\d{3})\s/', $status, $statusMatch);
$statusCode = (int)($statusMatch[1] ?? 0);
if ($response === false || $statusCode < 200 || $statusCode >= 300) {
    $pdo->prepare('DELETE FROM password_resets WHERE user_id=?')->execute([$user['id']]);
    error_log('Password reset email failed provider=' . ($brevoKey !== '' ? 'brevo' : 'resend') . ' status=' . $statusCode . ' response=' . ($response ?: $status));
    if ($statusCode === 401 || $statusCode === 403) {
        respond(false, 'The email provider rejected the API key. Check BREVO_API_KEY in Railway.', [], 502);
    }
    if ($statusCode === 400 || $statusCode === 422) {
        respond(false, 'The email provider rejected the sender. Verify MAIL_FROM_EMAIL in Brevo and use that exact address in Railway.', [], 502);
    }
    respond(false, 'The email provider is temporarily unavailable. Check Railway backend logs.', [], 502);
}

respond(true, $generic);
