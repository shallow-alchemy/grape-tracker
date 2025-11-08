CREATE TABLE IF NOT EXISTS vine (
  id TEXT PRIMARY KEY,
  block TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  variety TEXT NOT NULL,
  "plantingDate" BIGINT NOT NULL,
  health TEXT NOT NULL,
  notes TEXT NOT NULL,
  "qrGenerated" BIGINT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vine_block ON vine(block);
CREATE INDEX IF NOT EXISTS idx_vine_variety ON vine(variety);
