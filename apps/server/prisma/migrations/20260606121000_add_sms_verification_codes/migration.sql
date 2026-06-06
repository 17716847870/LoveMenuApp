CREATE TABLE "sms_verification_codes" (
  "id" BIGSERIAL NOT NULL,
  "phone" VARCHAR(32) NOT NULL,
  "scene" VARCHAR(24) NOT NULL,
  "code_hash" VARCHAR(128) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
  "send_provider" VARCHAR(32),
  "send_request_id" VARCHAR(128),
  "send_biz_id" VARCHAR(128),
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sms_verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sms_verification_codes_phone_scene_status_idx" ON "sms_verification_codes"("phone", "scene", "status");
CREATE INDEX "sms_verification_codes_sent_at_idx" ON "sms_verification_codes"("sent_at");
