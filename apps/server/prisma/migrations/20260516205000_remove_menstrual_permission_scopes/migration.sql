UPDATE "menstrual_profiles"
SET "male_view_enabled" = (
  "male_view_enabled"
  OR "male_phase_enabled"
  OR "male_prediction_enabled"
  OR "male_summary_enabled"
  OR "male_edit_enabled"
);

ALTER TABLE "menstrual_profiles"
  DROP COLUMN "male_phase_enabled",
  DROP COLUMN "male_prediction_enabled",
  DROP COLUMN "male_summary_enabled";
