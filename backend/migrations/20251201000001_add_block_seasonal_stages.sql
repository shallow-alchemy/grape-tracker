-- Migration: Add vineyard seasonal stage tracking to blocks
-- Blocks track which seasonal stage they are in (Dormant, Bud Break, etc.)

-- Add stage fields to block table
ALTER TABLE block ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'dormant';
ALTER TABLE block ADD COLUMN IF NOT EXISTS stage_entered_at BIGINT;

-- Update existing blocks to have stage_entered_at set to their created_at
UPDATE block SET stage_entered_at = created_at WHERE stage_entered_at IS NULL;

-- Create block_stage_history table to track stage transitions
CREATE TABLE IF NOT EXISTS block_stage_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  block_id TEXT NOT NULL REFERENCES block(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  completed_at BIGINT,
  notes TEXT,
  triggered_by TEXT,  -- 'manual' | 'ai_suggestion' | 'auto' (future)
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_block_stage_history_user_id ON block_stage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_block_stage_history_block_id ON block_stage_history(block_id);
CREATE INDEX IF NOT EXISTS idx_block_stage_history_stage ON block_stage_history(stage);
CREATE INDEX IF NOT EXISTS idx_block_stage_history_started_at ON block_stage_history(started_at);

-- Add vineyard seasonal stages to stage table (entity_type = 'block')
-- Stages: Dormant → Bud Break → Flowering → Fruit Set → Veraison → Ripening → Harvest → Post-Harvest
INSERT INTO stage (id, user_id, entity_type, value, label, description, sort_order, is_archived, is_default, applicability, created_at, updated_at) VALUES
  ('stage_block_dormant', '', 'block', 'dormant', 'Dormant', 'Winter rest period. Vines have dropped leaves and are conserving energy. Ideal time for pruning.', 1, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_block_bud_break', '', 'block', 'bud_break', 'Bud Break', 'Spring awakening. Buds swell and green shoots emerge. Critical frost protection period.', 2, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_block_flowering', '', 'block', 'flowering', 'Flowering', 'Tiny flowers appear on the shoots. Pollination occurs. Weather-sensitive period.', 3, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_block_fruit_set', '', 'block', 'fruit_set', 'Fruit Set', 'Flowers become small green berries. Cluster size established. Canopy management begins.', 4, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_block_veraison', '', 'block', 'veraison', 'Veraison', 'Berries change color and soften. Sugar accumulation begins. Critical ripening period starts.', 5, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_block_ripening', '', 'block', 'ripening', 'Ripening', 'Sugar levels rise, acids drop. Monitor Brix closely. Prepare for harvest.', 6, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_block_harvest', '', 'block', 'harvest', 'Harvest', 'Grapes at optimal ripeness. Pick based on chemistry and taste. Active harvest operations.', 7, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  ('stage_block_post_harvest', '', 'block', 'post_harvest', 'Post-Harvest', 'Leaves yellow and drop. Vines prepare for dormancy. Cover crop and soil management.', 8, FALSE, TRUE, NULL,
   extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;
