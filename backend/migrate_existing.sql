-- Additive migration for the existing GovBridge MySQL database.
-- This preserves all current records and password values.
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

ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER password,
  ADD COLUMN organization_name VARCHAR(200) NULL AFTER role,
  ADD COLUMN dpiit_recognition_number VARCHAR(100) NULL AFTER organization_name;

ALTER TABLE users
  MODIFY COLUMN password VARCHAR(255) NULL;

ALTER TABLE challenges
  ADD COLUMN baseline TEXT NULL,
  ADD COLUMN target TEXT NULL,
  ADD COLUMN kpis JSON NULL,
  ADD COLUMN capability_criteria JSON NULL,
  ADD COLUMN evidence_requirements JSON NULL;

ALTER TABLE proposals
  ADD COLUMN problem TEXT NULL,
  ADD COLUMN usp TEXT NULL,
  ADD COLUMN tech_stack VARCHAR(255) NULL,
  ADD COLUMN estimated_cost DECIMAL(12,2) NULL,
  ADD COLUMN implementation_plan TEXT NULL,
  ADD COLUMN expected_impact TEXT NULL,
  ADD COLUMN timeline VARCHAR(100) NULL,
  ADD COLUMN previous_projects TEXT NULL,
  ADD COLUMN team_details TEXT NULL,
  ADD COLUMN approach TEXT NULL,
  ADD COLUMN prototype_status TEXT NULL,
  ADD COLUMN testing_evidence TEXT NULL,
  ADD COLUMN security_compliance TEXT NULL,
  ADD COLUMN pilot_plan TEXT NULL,
  ADD COLUMN evidence JSON NULL;
