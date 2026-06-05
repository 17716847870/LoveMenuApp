CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "menstrual_cycles"
ADD CONSTRAINT "menstrual_cycles_valid_date_range"
CHECK ("ended_on" IS NULL OR "ended_on" >= "started_on");

CREATE UNIQUE INDEX "menstrual_cycles_one_active_per_profile"
ON "menstrual_cycles" ("profile_id")
WHERE "status" = 'in_progress';

ALTER TABLE "menstrual_cycles"
ADD CONSTRAINT "menstrual_cycles_no_overlapping_ranges"
EXCLUDE USING gist (
  "profile_id" WITH =,
  daterange("started_on", COALESCE("ended_on", 'infinity'::date), '[]') WITH &&
)
WHERE ("status" IN ('completed', 'in_progress'));
