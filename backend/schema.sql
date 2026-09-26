-- Fresh-install schema for GovBridge. Existing databases should use
-- migrate_existing.sql instead; never drop or recreate an existing database.
CREATE DATABASE IF NOT EXISTS govbridge
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE govbridge;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NULL, -- legacy field; new accounts leave this NULL
  password_hash VARCHAR(255) NULL,
  role VARCHAR(50) NOT NULL,
  organization_name VARCHAR(200) NULL,
  dpiit_recognition_number VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challenges (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  department VARCHAR(255) NULL,
  category VARCHAR(100) NULL,
  location VARCHAR(255) NULL,
  budget_min DECIMAL(12,2) NULL,
  budget_max DECIMAL(12,2) NULL,
  description TEXT NULL,
  current_situation TEXT NULL,
  expected_solution TEXT NULL,
  beneficiaries TEXT NULL,
  timeline VARCHAR(100) NULL,
  tech_preference VARCHAR(255) NULL,
  eligibility TEXT NULL,
  deadline DATE NULL,
  status VARCHAR(50) DEFAULT 'Open',
  baseline TEXT NULL,
  target TEXT NULL,
  kpis JSON NULL,
  capability_criteria JSON NULL,
  evidence_requirements JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY ix_challenges_created_by (created_by),
  CONSTRAINT fk_challenges_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS startup_profiles (
  startup_id INT NOT NULL PRIMARY KEY,
  industry VARCHAR(255) NULL,
  technology TEXT NULL,
  capabilities TEXT NULL,
  evidence TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_startup_profiles_user FOREIGN KEY (startup_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proposals (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  challenge_id INT NOT NULL,
  startup_id INT NOT NULL,
  solution_title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  problem TEXT NULL,
  usp TEXT NULL,
  tech_stack VARCHAR(255) NULL,
  estimated_cost DECIMAL(12,2) NULL,
  implementation_plan TEXT NULL,
  expected_impact TEXT NULL,
  timeline VARCHAR(100) NULL,
  previous_projects TEXT NULL,
  team_details TEXT NULL,
  approach TEXT NULL,
  prototype_status TEXT NULL,
  testing_evidence TEXT NULL,
  security_compliance TEXT NULL,
  pilot_plan TEXT NULL,
  evidence JSON NULL,
  status VARCHAR(50) DEFAULT 'Submitted',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY ix_proposals_challenge (challenge_id),
  KEY ix_proposals_startup (startup_id),
  CONSTRAINT fk_proposals_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  CONSTRAINT fk_proposals_startup FOREIGN KEY (startup_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  expert_id INT NOT NULL,
  score DECIMAL(5,2) NULL,
  comments TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY ix_evaluations_proposal (proposal_id),
  KEY ix_evaluations_expert (expert_id),
  CONSTRAINT fk_evaluations_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id),
  CONSTRAINT fk_evaluations_expert FOREIGN KEY (expert_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pilots (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status VARCHAR(50) DEFAULT 'Planned',
  kpi TEXT NULL,
  result TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pilots_proposal (proposal_id),
  CONSTRAINT fk_pilots_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS milestones (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pilot_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  due_date DATE NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  payment_amount DECIMAL(12,2) NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY ix_milestones_pilot (pilot_id),
  CONSTRAINT fk_milestones_pilot FOREIGN KEY (pilot_id) REFERENCES pilots(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
