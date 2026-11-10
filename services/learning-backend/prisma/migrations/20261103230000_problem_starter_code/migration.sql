-- Add editor starter code without modifying previous migrations.
-- Empty default preserves existing Problem rows until they are backfilled by the reviewed seed.
ALTER TABLE "Problem" ADD COLUMN "starterCode" TEXT NOT NULL DEFAULT '';
