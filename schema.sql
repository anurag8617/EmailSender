-- MailSender — MySQL Schema
-- MySQL 5.7+ / MariaDB 10.4+
-- Charset: utf8mb4

CREATE DATABASE IF NOT EXISTS email_tool
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE email_tool;

-- users
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- email_accounts
CREATE TABLE IF NOT EXISTS email_accounts (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id               INT UNSIGNED NOT NULL,
  email                 VARCHAR(255) NOT NULL,
  provider              VARCHAR(100) NOT NULL DEFAULT 'smtp',
  auth_type             VARCHAR(50)  NOT NULL DEFAULT 'password',
  credentials_reference VARCHAR(1000) NOT NULL,
  daily_limit           INT UNSIGNED NOT NULL DEFAULT 50,
  hourly_limit          INT UNSIGNED NOT NULL DEFAULT 10,
  sent_today            INT UNSIGNED NOT NULL DEFAULT 0,
  last_sent_at          TIMESTAMP NULL DEFAULT NULL,
  status                VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE KEY uq_email_accounts (user_id, email)
) ENGINE=InnoDB;

-- leads
CREATE TABLE IF NOT EXISTS leads (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(255) DEFAULT NULL,
  last_name   VARCHAR(255) DEFAULT NULL,
  company     VARCHAR(255) DEFAULT NULL,
  email       VARCHAR(255) NOT NULL,
  website     VARCHAR(255) DEFAULT NULL,
  phone       VARCHAR(100) DEFAULT NULL,
  subject     VARCHAR(255) DEFAULT NULL,
  message     TEXT DEFAULT NULL,
  custom_data JSON DEFAULT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'new',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_leads_email (email)
) ENGINE=InnoDB;

-- lead_lists
CREATE TABLE IF NOT EXISTS lead_lists (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_lists_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- lead_list_members
CREATE TABLE IF NOT EXISTS lead_list_members (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_list_id INT UNSIGNED NOT NULL,
  lead_id     INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_llm_list FOREIGN KEY (lead_list_id) REFERENCES lead_lists (id) ON DELETE CASCADE,
  CONSTRAINT fk_llm_lead  FOREIGN KEY (lead_id)     REFERENCES leads (id)     ON DELETE CASCADE,
  UNIQUE KEY uq_llm (lead_list_id, lead_id)
) ENGINE=InnoDB;

-- campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  start_at    TIMESTAMP NULL DEFAULT NULL,
  end_at      TIMESTAMP NULL DEFAULT NULL,
  daily_limit INT UNSIGNED NOT NULL DEFAULT 50,
  hourly_limit INT UNSIGNED NOT NULL DEFAULT 10,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaigns_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- campaign_leads
CREATE TABLE IF NOT EXISTS campaign_leads (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT UNSIGNED NOT NULL,
  lead_id     INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cl_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE,
  CONSTRAINT fk_cl_lead     FOREIGN KEY (lead_id)     REFERENCES leads (id)     ON DELETE CASCADE,
  UNIQUE KEY uq_cl (campaign_id, lead_id)
) ENGINE=InnoDB;

-- email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- campaign_steps
CREATE TABLE IF NOT EXISTS campaign_steps (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT UNSIGNED NOT NULL,
  template_id INT UNSIGNED NOT NULL,
  step_order  INT UNSIGNED NOT NULL DEFAULT 1,
  delay_days  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cs_campaign  FOREIGN KEY (campaign_id)  REFERENCES campaigns (id)       ON DELETE CASCADE,
  CONSTRAINT fk_cs_template  FOREIGN KEY (template_id)  REFERENCES email_templates (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- campaign_email_accounts
CREATE TABLE IF NOT EXISTS campaign_email_accounts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id      INT UNSIGNED NOT NULL,
  email_account_id INT UNSIGNED NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cea_campaign FOREIGN KEY (campaign_id)      REFERENCES campaigns (id)      ON DELETE CASCADE,
  CONSTRAINT fk_cea_account  FOREIGN KEY (email_account_id) REFERENCES email_accounts (id) ON DELETE CASCADE,
  UNIQUE KEY uq_cea (campaign_id, email_account_id)
) ENGINE=InnoDB;

-- email_jobs
CREATE TABLE IF NOT EXISTS email_jobs (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id          INT UNSIGNED NOT NULL,
  lead_id              INT UNSIGNED NOT NULL,
  email_account_id     INT UNSIGNED NULL,
  template_id          INT UNSIGNED NULL,
  scheduled_at         TIMESTAMP NULL DEFAULT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attempts             INT UNSIGNED NOT NULL DEFAULT 0,
  provider_message_id  VARCHAR(255) DEFAULT NULL,
  error_message        TEXT DEFAULT NULL,
  sent_at              TIMESTAMP NULL DEFAULT NULL,
  failed_at            TIMESTAMP NULL DEFAULT NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ej_campaign FOREIGN KEY (campaign_id)      REFERENCES campaigns (id)      ON DELETE CASCADE,
  CONSTRAINT fk_ej_lead     FOREIGN KEY (lead_id)          REFERENCES leads (id)          ON DELETE CASCADE,
  CONSTRAINT fk_ej_account  FOREIGN KEY (email_account_id) REFERENCES email_accounts (id) ON DELETE SET NULL,
  CONSTRAINT fk_ej_template FOREIGN KEY (template_id)      REFERENCES email_templates (id) ON DELETE SET NULL,
  KEY idx_ej_status_scheduled (status, scheduled_at)
) ENGINE=InnoDB;

-- email_events
CREATE TABLE IF NOT EXISTS email_events (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email_job_id      INT UNSIGNED NOT NULL,
  lead_id           INT UNSIGNED NULL,
  event_type        VARCHAR(50) NOT NULL,
  provider_event_id VARCHAR(255) DEFAULT NULL,
  event_data        JSON DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ee_job FOREIGN KEY (email_job_id) REFERENCES email_jobs (id) ON DELETE CASCADE,
  CONSTRAINT fk_ee_lead FOREIGN KEY (lead_id)     REFERENCES leads (id)     ON DELETE SET NULL,
  KEY idx_ee_type (event_type)
) ENGINE=InnoDB;

-- suppressions
CREATE TABLE IF NOT EXISTS suppressions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  reason     VARCHAR(50) NOT NULL,
  source     VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_suppressions_email (email)
) ENGINE=InnoDB;

-- sending_limits
CREATE TABLE IF NOT EXISTS sending_limits (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scope          VARCHAR(20) NOT NULL,
  scope_id       INT UNSIGNED NOT NULL,
  daily_limit    INT UNSIGNED NOT NULL DEFAULT 50,
  hourly_limit   INT UNSIGNED NOT NULL DEFAULT 10,
  start_time     TIME NULL DEFAULT NULL,
  end_time       TIME NULL DEFAULT NULL,
  allowed_weekdays VARCHAR(30) DEFAULT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sending_limits (scope, scope_id)
) ENGINE=InnoDB;

-- lead_imports
CREATE TABLE IF NOT EXISTS lead_imports (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  filename   VARCHAR(255) NOT NULL,
  total_rows INT UNSIGNED NOT NULL DEFAULT 0,
  imported   INT UNSIGNED NOT NULL DEFAULT 0,
  duplicates INT UNSIGNED NOT NULL DEFAULT 0,
  invalid    INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_imports_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;