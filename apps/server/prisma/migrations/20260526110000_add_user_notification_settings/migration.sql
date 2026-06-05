CREATE TABLE "user_notification_settings" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "chat_messages" BOOLEAN NOT NULL DEFAULT true,
  "menu_applications" BOOLEAN NOT NULL DEFAULT true,
  "anniversary_reminders" BOOLEAN NOT NULL DEFAULT true,
  "period_reminders" BOOLEAN NOT NULL DEFAULT true,
  "quiet_hours" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_notification_settings_user_id_key" ON "user_notification_settings"("user_id");
