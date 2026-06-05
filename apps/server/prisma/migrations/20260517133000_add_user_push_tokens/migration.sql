CREATE TABLE "user_push_tokens" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "token" VARCHAR(256) NOT NULL,
  "platform" VARCHAR(16),
  "device_id" VARCHAR(128),
  "status" VARCHAR(16) NOT NULL DEFAULT 'active',
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_push_tokens_token_key" ON "user_push_tokens"("token");
CREATE INDEX "user_push_tokens_user_id_idx" ON "user_push_tokens"("user_id");
CREATE INDEX "user_push_tokens_status_idx" ON "user_push_tokens"("status");
