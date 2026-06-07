CREATE TABLE "admin_users" (
  "id" BIGSERIAL NOT NULL,
  "username" VARCHAR(64) NOT NULL,
  "password_hash" VARCHAR(256) NOT NULL,
  "display_name" VARCHAR(64),
  "status" VARCHAR(16) NOT NULL DEFAULT 'active',
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

CREATE TABLE "system_settings" (
  "id" BIGSERIAL NOT NULL,
  "key" VARCHAR(128) NOT NULL,
  "value_json" JSONB NOT NULL,
  "description" TEXT,
  "updated_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

CREATE TABLE "app_releases" (
  "id" BIGSERIAL NOT NULL,
  "platform" VARCHAR(16) NOT NULL,
  "version_name" VARCHAR(32) NOT NULL,
  "build_number" INTEGER NOT NULL,
  "title" VARCHAR(128) NOT NULL,
  "release_notes" JSONB NOT NULL,
  "download_url" VARCHAR(512) NOT NULL,
  "object_key" VARCHAR(512),
  "file_size" BIGINT,
  "sha256" VARCHAR(128),
  "is_force_update" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMP(3),
  "created_by_admin_id" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_releases_platform_build_number_key" ON "app_releases"("platform", "build_number");
CREATE INDEX "app_releases_platform_idx" ON "app_releases"("platform");
CREATE INDEX "app_releases_platform_is_active_idx" ON "app_releases"("platform", "is_active");
CREATE INDEX "app_releases_status_idx" ON "app_releases"("status");

CREATE TABLE "deploy_logs" (
  "id" BIGSERIAL NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'running',
  "branch" VARCHAR(64),
  "before_commit" VARCHAR(64),
  "target_commit" VARCHAR(64),
  "started_by" BIGINT,
  "process_id" INTEGER,
  "log_text" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "deploy_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deploy_logs_status_idx" ON "deploy_logs"("status");
CREATE INDEX "deploy_logs_started_at_idx" ON "deploy_logs"("started_at");

CREATE TABLE "api_error_logs" (
  "id" BIGSERIAL NOT NULL,
  "request_id" VARCHAR(64),
  "method" VARCHAR(16) NOT NULL,
  "path" VARCHAR(512) NOT NULL,
  "query_json" JSONB,
  "body_json" JSONB,
  "user_id" BIGINT,
  "ip" VARCHAR(64),
  "user_agent" TEXT,
  "status_code" INTEGER NOT NULL,
  "error_name" VARCHAR(128),
  "error_message" TEXT,
  "error_stack" TEXT,
  "is_resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "api_error_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_error_logs_path_idx" ON "api_error_logs"("path");
CREATE INDEX "api_error_logs_status_code_idx" ON "api_error_logs"("status_code");
CREATE INDEX "api_error_logs_created_at_idx" ON "api_error_logs"("created_at");
CREATE INDEX "api_error_logs_is_resolved_idx" ON "api_error_logs"("is_resolved");

CREATE TABLE "admin_audit_logs" (
  "id" BIGSERIAL NOT NULL,
  "admin_user_id" BIGINT,
  "admin_username" VARCHAR(64),
  "action" VARCHAR(64) NOT NULL,
  "target_type" VARCHAR(64),
  "target_id" VARCHAR(64),
  "summary" TEXT,
  "before_json" JSONB,
  "after_json" JSONB,
  "ip" VARCHAR(64),
  "user_agent" TEXT,
  "request_id" VARCHAR(64),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs"("admin_user_id");
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");
CREATE INDEX "admin_audit_logs_target_type_idx" ON "admin_audit_logs"("target_type");
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");
