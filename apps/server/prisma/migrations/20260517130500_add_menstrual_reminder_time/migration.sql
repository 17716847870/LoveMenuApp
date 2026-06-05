ALTER TABLE "menstrual_reminder_settings"
ADD COLUMN "reminder_hour" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "reminder_minute" INTEGER NOT NULL DEFAULT 0;
