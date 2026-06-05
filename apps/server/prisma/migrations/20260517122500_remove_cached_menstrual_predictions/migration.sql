ALTER TABLE "menstrual_profiles"
  DROP COLUMN IF EXISTS "next_predicted_period_start",
  DROP COLUMN IF EXISTS "next_predicted_period_end",
  DROP COLUMN IF EXISTS "next_predicted_ovulation_date";
