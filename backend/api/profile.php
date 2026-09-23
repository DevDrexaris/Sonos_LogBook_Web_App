<?php
require_once __DIR__ . '/bootstrap.php';
$user = require_auth();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(false, 'Method not allowed.', [], 405);
$fullName = clean($_POST['full_name'] ?? '');
$username = clean($_POST['username'] ?? '');
$email = $user['email'];
if (!$fullName || !preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) respond(false, 'Please provide valid profile details.', [], 422);
$check = $pdo->prepare('SELECT id FROM users WHERE username=? AND id<>?');
$check->execute([$username, $user['id']]);
if ($check->fetch()) respond(false, 'That email or username is already in use.', [], 409);
$defaultImage = 'https://cdn.phototourl.com/free/2026-09-22-5a80ed76-cc8f-4016-abd2-1326314af37b.jpg';
$imagePath = $user['profile_image'] ?: $defaultImage;
if (str_contains($imagePath, 'SonoDefaultbald.jpg')) $imagePath = $defaultImage;
if (!empty($_FILES['profile_image']['tmp_name'])) {
    $file = $_FILES['profile_image'];
    if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > 2 * 1024 * 1024) respond(false, 'Profile images must be smaller than 2 MB.', [], 422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg'=>'jpg', 'image/png'=>'png', 'image/webp'=>'webp'];
    if (!isset($extensions[$mime])) respond(false, 'Use a JPG, PNG, or WebP profile image.', [], 422);
    $directory = __DIR__ . '/../uploads/profiles';
    if (!is_dir($directory)) mkdir($directory, 0755, true);
    $filename = 'user_' . (int)$user['id'] . '_' . bin2hex(random_bytes(6)) . '.' . $extensions[$mime];
    $target = $directory . DIRECTORY_SEPARATOR . $filename;
    $contents = file_get_contents($file['tmp_name']);
    if ($contents === false || file_put_contents($target, $contents, LOCK_EX) === false || !is_file($target)) respond(false, 'Unable to save profile image.', [], 500);
    $imagePath = '/uploads/profiles/' . $filename;
}
$stmt = $pdo->prepare('UPDATE users SET full_name=?, username=?, email=?, profile_image=? WHERE id=?');
$stmt->execute([$fullName, $username, $email, $imagePath, $user['id']]);
$user = array_merge($user, ['full_name'=>$fullName, 'username'=>$username, 'email'=>$email, 'profile_image'=>$imagePath]);
$_SESSION['user'] = $user;
respond(true, 'Profile updated successfully.', ['user'=>$user]);
