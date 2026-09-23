<?php
require_once __DIR__ . '/../bootstrap.php';

$input = body();
$email = strtolower(trim((string)($input['email'] ?? '')));
$code = trim((string)($input['code'] ?? ''));
$password = (string)($input['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '@gmail.com') || !preg_match('/^\d{6}$/', $code) || strlen($password) < 8) {
    respond(false, 'Enter a valid Gmail, six-digit code, and password of at least 8 characters.', [], 422);
}

$stmt = $pdo->prepare('SELECT pr.id, pr.user_id FROM password_resets pr JOIN users u ON u.id=pr.user_id WHERE u.email=? AND u.status=? AND pr.token_hash=? AND pr.expires_at > NOW() LIMIT 1');
$stmt->execute([$email, 'active', hash('sha256', $code)]);
$reset = $stmt->fetch();
if (!$reset) respond(false, 'That code is invalid or expired. Request a new one.', [], 422);

$pdo->beginTransaction();
try {
    $pdo->prepare('UPDATE users SET password=? WHERE id=?')->execute([password_hash($password, PASSWORD_DEFAULT), $reset['user_id']]);
    $pdo->prepare('DELETE FROM password_resets WHERE id=?')->execute([$reset['id']]);
    $pdo->commit();
} catch (Throwable $error) {
    $pdo->rollBack();
    respond(false, 'Unable to reset the password. Please try again.', [], 500);
}

respond(true, 'Password reset successfully. You can sign in now.');
