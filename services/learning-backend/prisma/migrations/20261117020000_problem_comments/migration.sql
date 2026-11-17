-- Prisma owns this shared table. FastAPI maps it through SQLAlchemy.
CREATE TABLE "ProblemComment" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProblemComment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProblemComment_body_check" CHECK (length(btrim("body")) BETWEEN 1 AND 2000),
    CONSTRAINT "ProblemComment_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProblemComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProblemComment_problemId_createdAt_id_idx" ON "ProblemComment"("problemId", "createdAt", "id");
CREATE INDEX "ProblemComment_authorId_idx" ON "ProblemComment"("authorId");
