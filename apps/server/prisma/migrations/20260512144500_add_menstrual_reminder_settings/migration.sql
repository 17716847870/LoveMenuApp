CREATE TABLE "menstrual_reminder_settings" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "period_start_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "period_start_reminder_offset_days" INTEGER NOT NULL DEFAULT 2,
    "period_due_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "period_end_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "shared_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_reminder_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "menstrual_reminder_settings_relationship_id_key" ON "menstrual_reminder_settings"("relationship_id");
