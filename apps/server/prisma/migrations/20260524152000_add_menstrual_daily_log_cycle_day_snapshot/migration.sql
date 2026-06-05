ALTER TABLE "menstrual_daily_logs"
ADD COLUMN "cycle_day_snapshot" INTEGER,
ADD COLUMN "cycle_day_source" VARCHAR(32),
ADD COLUMN "cycle_day_locked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "menstrual_daily_logs" AS log
SET
  "cycle_day_snapshot" = (log."record_date" - cycle."started_on") + 1,
  "cycle_day_source" = 'auto',
  "cycle_day_locked" = false
FROM "menstrual_cycles" AS cycle
WHERE log."cycle_id" = cycle."id"
  AND log."record_date" >= cycle."started_on"
  AND (cycle."ended_on" IS NULL OR log."record_date" <= cycle."ended_on");
