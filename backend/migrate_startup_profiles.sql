-- Add startup matching-profile storage to an existing GovBridge database.
-- Safe to run repeatedly; it does not modify existing profile or account data.
USE govbridge;

CREATE TABLE IF NOT EXISTS startup_profiles (
  startup_id INT NOT NULL PRIMARY KEY,
  industry VARCHAR(255) NULL,
  technology TEXT NULL,
  capabilities TEXT NULL,
  evidence TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_startup_profiles_user FOREIGN KEY (startup_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
