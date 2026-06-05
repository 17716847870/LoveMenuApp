ALTER TABLE "menstrual_profiles"
  ADD COLUMN "male_phase_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "male_prediction_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "male_summary_enabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "menstrual_profiles"
SET
  "male_phase_enabled" = "male_view_enabled",
  "male_prediction_enabled" = "male_view_enabled",
  "male_summary_enabled" = "male_view_enabled";
