-- Canonical content authors; existing seeded content remains system-owned (NULL).
ALTER TABLE "Lesson" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Problem" ADD COLUMN "createdById" TEXT;
CREATE INDEX "Lesson_createdById_idx" ON "Lesson"("createdById");
CREATE INDEX "Problem_createdById_idx" ON "Problem"("createdById");
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
