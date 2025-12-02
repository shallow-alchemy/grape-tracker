-- Migration: Create general_task_template table for recurring/one-time tasks
-- These are tasks not tied to any specific stage, but attached to either vineyard or winery

CREATE TABLE IF NOT EXISTS general_task_template (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'vineyard',  -- 'vineyard' or 'winery'
  frequency TEXT NOT NULL DEFAULT 'once',   -- 'once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'
  frequency_count INTEGER DEFAULT 1,
  frequency_unit TEXT,                       -- 'days', 'weeks', 'months'
  is_enabled BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_general_task_template_user_id ON general_task_template(user_id);
CREATE INDEX IF NOT EXISTS idx_general_task_template_scope ON general_task_template(scope);

-- Create general_task table for instances of general task templates
CREATE TABLE IF NOT EXISTS general_task (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT REFERENCES general_task_template(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'vineyard',
  due_date BIGINT,
  completed_at BIGINT,
  skipped BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_general_task_user_id ON general_task(user_id);
CREATE INDEX IF NOT EXISTS idx_general_task_due_date ON general_task(due_date);
CREATE INDEX IF NOT EXISTS idx_general_task_completed ON general_task(completed_at);

-- Seed some example general task templates
INSERT INTO general_task_template (id, user_id, name, description, scope, frequency, frequency_count, frequency_unit, is_enabled, is_archived, sort_order, created_at, updated_at) VALUES
  -- Vineyard general tasks
  ('gt_check_irrigation', '', 'Check irrigation system', 'Walk the vineyard and inspect drip lines, emitters, and connections for leaks or clogs.', 'vineyard', 'biweekly', 1, 'weeks', TRUE, FALSE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('gt_inspect_trellis', '', 'Inspect trellis posts and wires', 'Check for leaning posts, loose wires, and damaged anchors. Note repairs needed.', 'vineyard', 'monthly', 1, 'months', TRUE, FALSE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('gt_mow_cover_crop', '', 'Mow cover crop', 'Mow cover crop between rows to appropriate height for the season.', 'vineyard', 'weekly', 2, 'weeks', TRUE, FALSE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('gt_wildlife_check', '', 'Check wildlife deterrents', 'Inspect deer fencing, bird netting, and rodent control measures.', 'vineyard', 'monthly', 1, 'months', TRUE, FALSE, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Winery general tasks
  ('gt_clean_equipment', '', 'Clean fermentation equipment', 'Thoroughly clean and sanitize fermentation vessels, pumps, hoses, and crush equipment.', 'winery', 'weekly', 1, 'weeks', TRUE, FALSE, 10, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('gt_check_barrel_room', '', 'Check barrel room conditions', 'Monitor temperature and humidity in barrel storage. Check for leaks or ullage issues.', 'winery', 'weekly', 1, 'weeks', TRUE, FALSE, 11, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('gt_inventory_supplies', '', 'Inventory winemaking supplies', 'Check stock levels of SO2, yeast, nutrients, fining agents, bottles, corks, etc.', 'winery', 'monthly', 1, 'months', TRUE, FALSE, 12, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('gt_calibrate_equipment', '', 'Calibrate measuring equipment', 'Calibrate pH meter, refractometer, and thermometers. Replace buffers as needed.', 'winery', 'monthly', 1, 'months', TRUE, FALSE, 13, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)

ON CONFLICT (id) DO NOTHING;
