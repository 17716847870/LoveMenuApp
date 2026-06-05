ALTER TABLE "reminders"
ADD COLUMN "permission_type" VARCHAR(24) NOT NULL DEFAULT 'partner_visible';
