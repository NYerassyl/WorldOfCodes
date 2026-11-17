-- Username becomes a first-class, user-chosen handle. Existing rows inherit the
-- unique normalized nickname they already had, so the backfill cannot collide.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = "normalizedNickname" WHERE "username" IS NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");
CREATE INDEX "Follow_followerId_createdAt_idx" ON "Follow"("followerId", "createdAt");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
