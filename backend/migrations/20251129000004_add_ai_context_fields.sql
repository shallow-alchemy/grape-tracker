-- Add fields to provide richer context for AI recommendations
-- Migration: 20251129000004_add_ai_context_fields.sql

-- Vineyard-level fields
ALTER TABLE vineyard ADD COLUMN IF NOT EXISTS production_goal TEXT;
-- Values: 'quality_focused', 'high_yield', 'balanced'

ALTER TABLE vineyard ADD COLUMN IF NOT EXISTS experience_level TEXT;
-- Values: 'beginner', 'intermediate', 'experienced'

ALTER TABLE vineyard ADD COLUMN IF NOT EXISTS available_labor_hours INTEGER;
-- Weekly hours available for vineyard work

-- Block-level fields
ALTER TABLE block ADD COLUMN IF NOT EXISTS observed_vigor TEXT;
-- Values: 'low', 'medium', 'high', 'unknown'

-- Add to Zero replication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = '_zero_public_0') THEN
    CREATE PUBLICATION _zero_public_0;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
