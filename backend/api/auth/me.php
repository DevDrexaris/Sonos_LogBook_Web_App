<?php require_once __DIR__ . '/../bootstrap.php'; $user=require_auth(); respond(true,'',['user'=>$user]);
