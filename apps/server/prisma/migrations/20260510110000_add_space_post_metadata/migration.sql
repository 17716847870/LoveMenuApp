ALTER TABLE "space_posts"
ADD COLUMN "location_name" VARCHAR(128),
ADD COLUMN "visibility" VARCHAR(16) NOT NULL DEFAULT 'couple',
ADD COLUMN "record_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "space_posts_relationship_id_idx" ON "space_posts"("relationship_id");
CREATE INDEX "space_posts_creator_user_id_idx" ON "space_posts"("creator_user_id");
CREATE INDEX "space_posts_posted_at_idx" ON "space_posts"("posted_at");
