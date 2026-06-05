ALTER TABLE "menstrual_profiles"
DROP COLUMN IF EXISTS "current_phase",
DROP COLUMN IF EXISTS "current_cycle_day",
DROP COLUMN IF EXISTS "confidence_level";
