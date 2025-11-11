-- Initial schema migration for Gilbert
-- Creates vineyard, block, and vine tables

CREATE TABLE IF NOT EXISTS vineyard (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  varieties TEXT[],
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS block (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  "sizeAcres" NUMERIC,
  "soilType" TEXT,
  notes TEXT,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

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
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT fk_block FOREIGN KEY (block) REFERENCES block(id)
);

CREATE INDEX IF NOT EXISTS idx_vine_block ON vine(block);
CREATE INDEX IF NOT EXISTS idx_vine_variety ON vine(variety);
