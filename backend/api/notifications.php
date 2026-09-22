<?php
require_once __DIR__ . '/bootstrap.php';
$user = require_auth();
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT n.id, n.title, n.message, n.created_at, nr.read_at FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.user_id=? ORDER BY n.created_at DESC LIMIT 30');
    $stmt->execute([$user['id']]);
    respond(true, '', ['notifications'=>$stmt->fetchAll()]);
}
if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = body();
    $id = (int)($input['id'] ?? 0);
    $stmt = $pdo->prepare('UPDATE notification_recipients SET read_at=NOW() WHERE notification_id=? AND user_id=?');
    $stmt->execute([$id, $user['id']]);
    respond(true, 'Notification marked as read.');
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || $user['role'] !== 'admin') respond(false, 'Only administrators can send notifications.', [], 403);
$input = body();
$title = clean($input['title'] ?? '');
$message = clean($input['message'] ?? '');
$notifyAll = !empty($input['notify_all']);
$recipientIds = array_values(array_unique(array_map('intval', $input['user_ids'] ?? [])));
if (!$title || !$message || (!$notifyAll && !$recipientIds)) respond(false, 'Add a title, message, and at least one recipient.', [], 422);
$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('INSERT INTO notifications(sender_id,title,message) VALUES(?,?,?)');
    $stmt->execute([$user['id'], $title, $message]);
    $notificationId = $pdo->lastInsertId();
    if ($notifyAll) {
        $pdo->prepare('INSERT INTO notification_recipients(notification_id,user_id) SELECT ?,id FROM users WHERE status="active"')->execute([$notificationId]);
    } else {
        $placeholders = implode(',', array_fill(0, count($recipientIds), '?'));
        $stmt = $pdo->prepare("INSERT INTO notification_recipients(notification_id,user_id) SELECT ?,id FROM users WHERE status='active' AND id IN ($placeholders)");
        $stmt->execute(array_merge([$notificationId], $recipientIds));
    }
    $pdo->commit();
    respond(true, 'Notification sent successfully.', ['id'=>$notificationId], 201);
} catch (Throwable $e) { $pdo->rollBack(); respond(false, 'Unable to send notification.', [], 500); }
