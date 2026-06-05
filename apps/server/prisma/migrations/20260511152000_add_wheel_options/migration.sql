CREATE TABLE "wheel_options" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "creator_user_id" BIGINT NOT NULL,
    "title" VARCHAR(64) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "selected_count" INTEGER NOT NULL DEFAULT 0,
    "last_selected_at" TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wheel_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wheel_options_relationship_id_idx" ON "wheel_options"("relationship_id");
CREATE INDEX "wheel_options_creator_user_id_idx" ON "wheel_options"("creator_user_id");
CREATE INDEX "wheel_options_status_idx" ON "wheel_options"("status");
