-- Existing Difficulty remains the three-value Battle contract. Practice has five levels.
ALTER TABLE "Problem" ADD COLUMN "practiceLevel" INTEGER, ADD COLUMN "editorial" TEXT;
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_practiceLevel_check" CHECK ("practiceLevel" BETWEEN 1 AND 5);
ALTER TABLE "Lesson" ADD COLUMN "prerequisiteId" TEXT, ADD COLUMN "exampleJson" TEXT;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_not_self_prerequisite" CHECK ("prerequisiteId" <> id);
CREATE INDEX "Lesson_prerequisiteId_idx" ON "Lesson"("prerequisiteId");
