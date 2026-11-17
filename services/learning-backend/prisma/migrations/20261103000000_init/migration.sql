-- DRAFT: apply only after GPT 1/GPT 3 integration review; generated against learning-backend Prisma model.
CREATE TYPE "Difficulty" AS ENUM ('EASY','MEDIUM','HARD');
CREATE TYPE "SubmissionStatus" AS ENUM ('ACCEPTED','WRONG_ANSWER','RUNTIME_ERROR','TIME_LIMIT');
CREATE TYPE "RewardKind" AS ENUM ('PROBLEM','COPY');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "nickname" TEXT NOT NULL,
  "normalizedNickname" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "coins" INTEGER NOT NULL DEFAULT 0,
  "nicknameChanges" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Topic" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "theoryMd" TEXT NOT NULL,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Problem" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT,
  "title" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'python',
  "topicSlug" TEXT NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "functionName" TEXT NOT NULL,
  "rewardXp" INTEGER NOT NULL DEFAULT 20,
  "rewardCoins" INTEGER NOT NULL DEFAULT 5,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TestCase" (
  "id" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "argsJson" TEXT NOT NULL,
  "expectedJson" TEXT NOT NULL,
  "isSample" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Submission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "sourceCode" TEXT NOT NULL,
  "status" "SubmissionStatus" NOT NULL,
  "passedCases" INTEGER NOT NULL,
  "totalCases" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProblemCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProblemCompletion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CopyExercise" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'python',
  "description" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "rewardXp" INTEGER NOT NULL DEFAULT 5,
  "rewardCoins" INTEGER NOT NULL DEFAULT 1,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "CopyExercise_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CopyAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "isExact" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopyAttempt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CopyCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopyCompletion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RewardLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "RewardKind" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "xp" INTEGER NOT NULL,
  "coins" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_normalizedNickname_key" ON "User"("normalizedNickname");
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE UNIQUE INDEX "Topic_courseId_position_key" ON "Topic"("courseId","position");
CREATE UNIQUE INDEX "Lesson_topicId_position_key" ON "Lesson"("topicId","position");
CREATE UNIQUE INDEX "TestCase_problemId_position_key" ON "TestCase"("problemId","position");
CREATE UNIQUE INDEX "ProblemCompletion_userId_problemId_key" ON "ProblemCompletion"("userId","problemId");
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId","lessonId");
CREATE UNIQUE INDEX "CopyCompletion_userId_exerciseId_key" ON "CopyCompletion"("userId","exerciseId");
CREATE UNIQUE INDEX "RewardLedger_userId_kind_sourceId_key" ON "RewardLedger"("userId","kind","sourceId");
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId","expiresAt");
CREATE INDEX "Problem_topicSlug_difficulty_isPublished_idx" ON "Problem"("topicSlug","difficulty","isPublished");
CREATE INDEX "Problem_lessonId_idx" ON "Problem"("lessonId");
CREATE INDEX "Submission_userId_createdAt_idx" ON "Submission"("userId","createdAt");
CREATE INDEX "Submission_problemId_createdAt_idx" ON "Submission"("problemId","createdAt");
CREATE INDEX "CopyAttempt_userId_createdAt_idx" ON "CopyAttempt"("userId","createdAt");
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProblemCompletion" ADD CONSTRAINT "ProblemCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProblemCompletion" ADD CONSTRAINT "ProblemCompletion_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CopyAttempt" ADD CONSTRAINT "CopyAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CopyAttempt" ADD CONSTRAINT "CopyAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "CopyExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CopyCompletion" ADD CONSTRAINT "CopyCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CopyCompletion" ADD CONSTRAINT "CopyCompletion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "CopyExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
