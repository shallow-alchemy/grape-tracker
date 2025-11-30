-- Migration: Create stage table for user-customizable winemaking stages
-- Replaces hardcoded WINE_STAGES with database-backed stages
-- Supports soft delete (is_archived) and reset to defaults

CREATE TABLE IF NOT EXISTS stage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',  -- '' = global default, user_id = user-specific
  entity_type TEXT NOT NULL,         -- 'wine' or 'vintage'
  value TEXT NOT NULL,               -- Stage identifier (e.g., 'crush', 'primary_fermentation')
  label TEXT NOT NULL,               -- Display name (e.g., 'Crush', 'Primary Fermentation')
  description TEXT,
  sort_order INTEGER NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT TRUE,   -- TRUE = came from system defaults
  applicability JSONB,               -- Wine type applicability: {"red": "required", "white": "optional", ...}
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_stage_user_id ON stage(user_id);
CREATE INDEX IF NOT EXISTS idx_stage_entity_type ON stage(entity_type);
CREATE INDEX IF NOT EXISTS idx_stage_value ON stage(value);
CREATE INDEX IF NOT EXISTS idx_stage_sort_order ON stage(sort_order);
CREATE INDEX IF NOT EXISTS idx_stage_is_archived ON stage(is_archived);

-- Unique constraint: each user can only have one stage with a given value per entity type
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_unique_per_user
  ON stage(user_id, entity_type, value)
  WHERE is_archived = FALSE;

-- Seed default wine stages (user_id = '' for global defaults)
INSERT INTO stage (id, user_id, entity_type, value, label, description, sort_order, is_archived, is_default, applicability, created_at, updated_at) VALUES
  ('stage_crush', '', 'wine', 'crush', 'Crush', 'Grapes crushed, juice extracted', 1, FALSE, TRUE,
   '{"red": "required", "white": "required", "rose": "required", "sparkling": "required", "dessert": "required", "fortified": "required"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_pre_fermentation', '', 'wine', 'pre_fermentation', 'Pre-Fermentation', 'Cold soak (reds), cold settle (whites), pressing (whites)', 2, FALSE, TRUE,
   '{"red": "optional", "white": "required", "rose": "required", "sparkling": "required", "dessert": "optional", "fortified": "optional"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_primary_fermentation', '', 'wine', 'primary_fermentation', 'Primary Fermentation', 'Alcoholic fermentation (sugar to alcohol)', 3, FALSE, TRUE,
   '{"red": "required", "white": "required", "rose": "required", "sparkling": "required", "dessert": "required", "fortified": "required"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_press', '', 'wine', 'press', 'Press', 'Separate wine from skins/seeds (post-ferment for reds)', 4, FALSE, TRUE,
   '{"red": "required", "white": "hidden", "rose": "hidden", "sparkling": "hidden", "dessert": "optional", "fortified": "optional"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_malolactic_fermentation', '', 'wine', 'malolactic_fermentation', 'Malolactic Fermentation', 'Convert malic to lactic acid (softens wine)', 5, FALSE, TRUE,
   '{"red": "required", "white": "optional", "rose": "optional", "sparkling": "optional", "dessert": "optional", "fortified": "hidden"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_aging', '', 'wine', 'aging', 'Aging', 'Bulk aging in barrel, tank, or carboy', 6, FALSE, TRUE,
   '{"red": "required", "white": "required", "rose": "optional", "sparkling": "required", "dessert": "required", "fortified": "required"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_racking', '', 'wine', 'racking', 'Racking', 'Transfer wine off sediment (lees)', 7, FALSE, TRUE,
   '{"red": "required", "white": "required", "rose": "required", "sparkling": "required", "dessert": "required", "fortified": "required"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_fining_filtering', '', 'wine', 'fining_filtering', 'Fining & Filtering', 'Clarification and stabilization', 8, FALSE, TRUE,
   '{"red": "optional", "white": "required", "rose": "required", "sparkling": "required", "dessert": "optional", "fortified": "optional"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_blending', '', 'wine', 'blending', 'Blending', 'Combine lots for balance and complexity', 9, FALSE, TRUE,
   '{"red": "optional", "white": "optional", "rose": "optional", "sparkling": "optional", "dessert": "optional", "fortified": "optional"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_bottling', '', 'wine', 'bottling', 'Bottling', 'Wine packaged in bottles', 10, FALSE, TRUE,
   '{"red": "required", "white": "required", "rose": "required", "sparkling": "required", "dessert": "required", "fortified": "required"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_bottle_aging', '', 'wine', 'bottle_aging', 'Bottle Aging', 'Post-bottling maturation', 11, FALSE, TRUE,
   '{"red": "required", "white": "optional", "rose": "hidden", "sparkling": "optional", "dessert": "optional", "fortified": "optional"}',
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Vintage stages
  ('stage_harvested', '', 'vintage', 'harvested', 'Harvested', 'Grapes harvested and available', 1, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_allocated', '', 'vintage', 'allocated', 'Allocated', 'All grapes allocated to wines', 2, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- Add is_archived column to task_template for soft delete
ALTER TABLE task_template ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_task_template_is_archived ON task_template(is_archived);
