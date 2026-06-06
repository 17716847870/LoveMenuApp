ALTER TABLE "users" ADD COLUMN "password_hash" VARCHAR(256);
ALTER TABLE "users" ADD COLUMN "profile_completed" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
