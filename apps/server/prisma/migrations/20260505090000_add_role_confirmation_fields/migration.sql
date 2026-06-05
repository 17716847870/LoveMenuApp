ALTER TABLE "couple_relationships"
ADD COLUMN "role_confirmation_status" VARCHAR(16) NOT NULL DEFAULT 'pending',
ADD COLUMN "role_proposer_user_id" BIGINT,
ADD COLUMN "proposed_publisher_user_id" BIGINT,
ADD COLUMN "proposed_consumer_user_id" BIGINT;

CREATE INDEX "couple_relationships_role_confirmation_status_idx" ON "couple_relationships"("role_confirmation_status");
