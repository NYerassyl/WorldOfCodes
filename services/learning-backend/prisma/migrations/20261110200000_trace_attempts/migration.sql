-- Store user-owned Python Trace guesses without duplicating the static catalog.
-- Additive-only migration: never resets User, auth sessions or previous progress.
CREATE TABLE "TraceAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "submittedOutput" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraceAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TraceAttempt_userId_exerciseId_createdAt_idx" ON "TraceAttempt"("userId", "exerciseId", "createdAt");

ALTER TABLE "TraceAttempt"
    ADD CONSTRAINT "TraceAttempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
