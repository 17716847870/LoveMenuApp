ALTER TABLE "reminders"
ADD COLUMN "date_rule_type" VARCHAR(32),
ADD COLUMN "rule_month" INTEGER,
ADD COLUMN "rule_day" INTEGER,
ADD COLUMN "rule_week_of_month" INTEGER,
ADD COLUMN "rule_weekday" INTEGER;
