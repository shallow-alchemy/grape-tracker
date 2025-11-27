-- Fix task_template foreign key constraint that prevents seeding default templates
-- The default templates use vineyard_id = 'default' as a marker, but the FK constraint
-- requires a real vineyard to exist. Since templates are global reference data,
-- we remove the FK constraint.

-- Drop the foreign key constraint
ALTER TABLE task_template DROP CONSTRAINT IF EXISTS task_template_vineyard_id_fkey;

-- Re-seed the default task templates (same data as original seed, but now it will work)

-- Vintage stage task templates
INSERT INTO task_template (id, user_id, vineyard_id, stage, entity_type, wine_type, name, description, frequency, frequency_count, frequency_unit, default_enabled, sort_order, created_at, updated_at) VALUES
  -- Bud break
  ('tt_bud_break_1', '', 'default', 'bud_break', 'vintage', NULL, 'Inspect vines for frost damage', 'Check for any frost damage on new buds', 'weekly', 1, 'weeks', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bud_break_2', '', 'default', 'bud_break', 'vintage', NULL, 'Apply sulfur spray', 'Preventative fungicide application', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Flowering
  ('tt_flowering_1', '', 'default', 'flowering', 'vintage', NULL, 'Monitor weather for frost', 'Check forecast daily for frost risk', 'daily', 1, 'days', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_flowering_2', '', 'default', 'flowering', 'vintage', NULL, 'Inspect for pests', 'Check for mites, beetles, and other pests', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Fruiting
  ('tt_fruiting_1', '', 'default', 'fruiting', 'vintage', NULL, 'Thin clusters if needed', 'Remove excess clusters for better fruit quality', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_fruiting_2', '', 'default', 'fruiting', 'vintage', NULL, 'Monitor for disease', 'Check for powdery mildew, downy mildew', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Veraison
  ('tt_veraison_1', '', 'default', 'veraison', 'vintage', NULL, 'Net vines against birds', 'Install bird netting to protect ripening fruit', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_veraison_2', '', 'default', 'veraison', 'vintage', NULL, 'Monitor ripeness', 'Check color change and berry development', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Pre-harvest
  ('tt_pre_harvest_1', '', 'default', 'pre_harvest', 'vintage', NULL, 'Measure brix', 'Test sugar levels in grapes', 'twice_weekly', 2, 'weeks', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_pre_harvest_2', '', 'default', 'pre_harvest', 'vintage', NULL, 'Taste grapes', 'Sample grapes for flavor development', 'twice_weekly', 2, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_pre_harvest_3', '', 'default', 'pre_harvest', 'vintage', NULL, 'Prepare harvest equipment', 'Clean and ready bins, crusher, press', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Harvest
  ('tt_harvest_1', '', 'default', 'harvest', 'vintage', NULL, 'Pick grapes', 'Harvest grapes at optimal ripeness', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_harvest_2', '', 'default', 'harvest', 'vintage', NULL, 'Weigh harvest', 'Record total weight of harvested grapes', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_harvest_3', '', 'default', 'harvest', 'vintage', NULL, 'Take final brix measurement', 'Measure sugar content of harvested grapes', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  frequency = EXCLUDED.frequency,
  frequency_count = EXCLUDED.frequency_count,
  default_enabled = EXCLUDED.default_enabled,
  updated_at = EXCLUDED.updated_at;

-- Wine stage task templates
INSERT INTO task_template (id, user_id, vineyard_id, stage, entity_type, wine_type, name, description, frequency, frequency_count, frequency_unit, default_enabled, sort_order, created_at, updated_at) VALUES
  -- Crush (all wine types)
  ('tt_crush_1', '', 'default', 'crush', 'wine', NULL, 'Crush and destem grapes', 'Process grapes through crusher/destemmer', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_crush_2', '', 'default', 'crush', 'wine', NULL, 'Add SO2', 'Sulfite addition for preservation', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_crush_3', '', 'default', 'crush', 'wine', NULL, 'Take initial measurements', 'Measure pH, TA, and brix of must', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Primary fermentation (red)
  ('tt_primary_red_1', '', 'default', 'primary_fermentation', 'wine', 'red', 'Inoculate with yeast', 'Add selected yeast strain to must', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_red_2', '', 'default', 'primary_fermentation', 'wine', 'red', 'Punch down cap', 'Push cap down into must to extract color and tannins', 'twice_daily', 2, 'days', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_red_3', '', 'default', 'primary_fermentation', 'wine', 'red', 'Monitor temperature', 'Check fermentation temperature stays in range', 'twice_daily', 2, 'days', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_red_4', '', 'default', 'primary_fermentation', 'wine', 'red', 'Measure pH/TA/Brix', 'Take chemistry measurements', 'daily', 1, 'days', TRUE, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Primary fermentation (white)
  ('tt_primary_white_1', '', 'default', 'primary_fermentation', 'wine', 'white', 'Inoculate with yeast', 'Add selected yeast strain to juice', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_white_2', '', 'default', 'primary_fermentation', 'wine', 'white', 'Monitor temperature', 'Keep fermentation cool (55-65°F)', 'daily', 1, 'days', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_white_3', '', 'default', 'primary_fermentation', 'wine', 'white', 'Measure pH/TA/Brix', 'Take chemistry measurements', 'daily', 1, 'days', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Primary fermentation (rosé)
  ('tt_primary_rose_1', '', 'default', 'primary_fermentation', 'wine', 'rosé', 'Inoculate with yeast', 'Add selected yeast strain', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_rose_2', '', 'default', 'primary_fermentation', 'wine', 'rosé', 'Monitor temperature', 'Keep fermentation cool (60-70°F)', 'daily', 1, 'days', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_rose_3', '', 'default', 'primary_fermentation', 'wine', 'rosé', 'Measure pH/TA/Brix', 'Take chemistry measurements', 'daily', 1, 'days', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Secondary fermentation (MLF - red/rosé)
  ('tt_secondary_red_1', '', 'default', 'secondary_fermentation', 'wine', 'red', 'Inoculate with ML bacteria', 'Add malolactic bacteria culture', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_secondary_red_2', '', 'default', 'secondary_fermentation', 'wine', 'red', 'Monitor MLF progress', 'Test for malic acid conversion', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_secondary_rose_1', '', 'default', 'secondary_fermentation', 'wine', 'rosé', 'Inoculate with ML bacteria', 'Add malolactic bacteria culture', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Racking (all types)
  ('tt_racking_1', '', 'default', 'racking', 'wine', NULL, 'Rack wine off lees', 'Transfer wine to clean vessel, leaving sediment', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_racking_2', '', 'default', 'racking', 'wine', NULL, 'Measure volume', 'Record current volume after racking', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_racking_3', '', 'default', 'racking', 'wine', NULL, 'Add SO2', 'Sulfite addition for preservation', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_racking_4', '', 'default', 'racking', 'wine', NULL, 'Take measurements', 'Measure pH and TA', 'once', NULL, NULL, TRUE, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Oaking (red)
  ('tt_oaking_red_1', '', 'default', 'oaking', 'wine', 'red', 'Transfer to oak barrel', 'Move wine into oak barrel for aging', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_oaking_red_2', '', 'default', 'oaking', 'wine', 'red', 'Top up barrel', 'Add wine to keep barrel full and prevent oxidation', 'monthly', 1, 'months', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_oaking_red_3', '', 'default', 'oaking', 'wine', 'red', 'Taste and evaluate', 'Sample wine to monitor oak integration', 'monthly', 1, 'months', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Aging (all types)
  ('tt_aging_1', '', 'default', 'aging', 'wine', NULL, 'Monitor storage conditions', 'Check temperature and humidity', 'weekly', 1, 'weeks', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_aging_2', '', 'default', 'aging', 'wine', NULL, 'Taste and take notes', 'Evaluate wine development', 'monthly', 1, 'months', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Bottling (all types)
  ('tt_bottling_1', '', 'default', 'bottling', 'wine', NULL, 'Sanitize bottles and equipment', 'Clean and sanitize all bottling equipment', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_2', '', 'default', 'bottling', 'wine', NULL, 'Final SO2 adjustment', 'Adjust sulfite levels before bottling', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_3', '', 'default', 'bottling', 'wine', NULL, 'Bottle wine', 'Fill and cork bottles', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_4', '', 'default', 'bottling', 'wine', NULL, 'Label bottles', 'Apply labels to finished bottles', 'once', NULL, NULL, TRUE, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_5', '', 'default', 'bottling', 'wine', NULL, 'Record final bottle count', 'Count and record total bottles produced', 'once', NULL, NULL, TRUE, 5, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  frequency = EXCLUDED.frequency,
  frequency_count = EXCLUDED.frequency_count,
  default_enabled = EXCLUDED.default_enabled,
  updated_at = EXCLUDED.updated_at;
