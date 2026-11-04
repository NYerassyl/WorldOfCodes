-- Add GPT 3 requested Match(status, type) index.
-- The initial learning migration and first Battle migration are deliberately immutable.
CREATE INDEX "Match_status_type_idx" ON "Match"("status", "type");
