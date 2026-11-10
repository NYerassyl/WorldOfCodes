-- Battle schema extension. Depends on 20261103000000_init; that migration is not modified.
-- MatchType/MatchStatus values are proposed pending GPT 3 approval.
-- PostgreSQL only: GPT 1 must resolve the SQLite/PostgreSQL draft-stack conflict before deployment.
CREATE TYPE "MatchType" AS ENUM ('RANKED', 'FRIENDLY');
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "type" "MatchType" NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
  "problemId" TEXT NOT NULL,
  "winnerId" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchPlayer" (
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seat" INTEGER NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "verdict" "SubmissionStatus",
  "ratingBefore" INTEGER,
  "ratingDelta" INTEGER,
  CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("matchId", "userId")
);

CREATE TABLE "Rating" (
  "userId" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 1000,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rating_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "FriendBattle" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FriendBattle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Match_problemId_idx" ON "Match"("problemId");
CREATE INDEX "Match_winnerId_idx" ON "Match"("winnerId");
CREATE INDEX "Match_type_status_idx" ON "Match"("type", "status");
CREATE UNIQUE INDEX "MatchPlayer_matchId_seat_key" ON "MatchPlayer"("matchId", "seat");
CREATE INDEX "MatchPlayer_userId_idx" ON "MatchPlayer"("userId");
CREATE UNIQUE INDEX "FriendBattle_matchId_key" ON "FriendBattle"("matchId");
CREATE UNIQUE INDEX "FriendBattle_inviteCode_key" ON "FriendBattle"("inviteCode");
CREATE INDEX "FriendBattle_createdById_idx" ON "FriendBattle"("createdById");
CREATE INDEX "FriendBattle_expiresAt_idx" ON "FriendBattle"("expiresAt");

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_problemId_fkey"
  FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_winnerId_fkey"
  FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchPlayer"
  ADD CONSTRAINT "MatchPlayer_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchPlayer"
  ADD CONSTRAINT "MatchPlayer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Rating"
  ADD CONSTRAINT "Rating_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendBattle"
  ADD CONSTRAINT "FriendBattle_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendBattle"
  ADD CONSTRAINT "FriendBattle_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
