CREATE TABLE IF NOT EXISTS signup_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_signup_email (email),
    INDEX idx_signup_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
    rate_key VARCHAR(191) PRIMARY KEY,
    window_started DATETIME NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    INDEX idx_rate_window (window_started)
);