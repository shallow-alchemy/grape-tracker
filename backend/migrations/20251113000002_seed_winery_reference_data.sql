-- Seed reference data for winery tables
-- Measurement ranges and default task templates

-- Measurement ranges for different wine types
INSERT INTO measurement_range (id, wine_type, measurement_type, min_value, max_value, ideal_min, ideal_max, low_warning, high_warning, created_at) VALUES
  -- pH ranges
  ('ph_red', 'red', 'ph', 3.2, 3.8, 3.4, 3.5, 'Risk of bacterial growth. Consider MLF or monitoring closely', 'Consider tartaric acid addition to lower pH', extract(epoch from now()) * 1000),
  ('ph_white', 'white', 'ph', 2.9, 3.6, 3.1, 3.3, 'May be too tart. Consider deacidification', 'Consider tartaric acid addition', extract(epoch from now()) * 1000),
  ('ph_rose', 'rosé', 'ph', 3.0, 3.5, 3.2, 3.3, 'May be too tart. Monitor taste', 'Consider tartaric acid addition', extract(epoch from now()) * 1000),
  ('ph_dessert', 'dessert', 'ph', 3.3, 3.7, 3.4, 3.6, 'Risk of instability', 'Consider acid addition', extract(epoch from now()) * 1000),
  ('ph_sparkling', 'sparkling', 'ph', 2.9, 3.3, 3.0, 3.2, 'May affect secondary fermentation', 'Consider acid adjustment', extract(epoch from now()) * 1000),

  -- TA (titratable acidity) ranges in g/L
  ('ta_red', 'red', 'ta', 5.0, 9.0, 6.0, 8.0, 'Consider acid addition (tartaric or citric)', 'Consider deacidification or cold stabilization', extract(epoch from now()) * 1000),
  ('ta_white', 'white', 'ta', 6.0, 10.0, 7.0, 9.0, 'Consider acid addition', 'Consider deacidification', extract(epoch from now()) * 1000),
  ('ta_rose', 'rosé', 'ta', 5.5, 9.5, 6.5, 8.5, 'Consider acid addition', 'Consider deacidification', extract(epoch from now()) * 1000),
  ('ta_dessert', 'dessert', 'ta', 6.0, 9.0, 6.5, 8.0, 'May lack structure', 'May be too tart for style', extract(epoch from now()) * 1000),
  ('ta_sparkling', 'sparkling', 'ta', 7.0, 11.0, 8.0, 10.0, 'May lack freshness', 'Good for sparkling, monitor taste', extract(epoch from now()) * 1000),

  -- Brix (sugar content) ranges
  ('brix_red', 'red', 'brix', 20.0, 28.0, 22.0, 26.0, 'Low sugar. Consider chaptalization or longer hang time next year', 'Very high sugar. May produce high alcohol wine', extract(epoch from now()) * 1000),
  ('brix_white', 'white', 'brix', 18.0, 26.0, 20.0, 24.0, 'Low sugar. Consider chaptalization', 'High sugar. Monitor fermentation carefully', extract(epoch from now()) * 1000),
  ('brix_rose', 'rosé', 'brix', 18.0, 24.0, 19.0, 22.0, 'May produce light wine', 'Monitor to avoid high alcohol', extract(epoch from now()) * 1000),
  ('brix_dessert', 'dessert', 'brix', 24.0, 35.0, 26.0, 32.0, 'Too low for dessert style', 'Excellent for dessert wine', extract(epoch from now()) * 1000),
  ('brix_sparkling', 'sparkling', 'brix', 17.0, 22.0, 18.0, 20.0, 'May lack body', 'Too high, may be too alcoholic', extract(epoch from now()) * 1000)
ON CONFLICT (wine_type, measurement_type) DO NOTHING;

-- Default task templates for the default vineyard
-- Note: These are just examples. Users can customize via settings.

-- Vintage stage task templates
INSERT INTO task_template (id, vineyard_id, stage, entity_type, wine_type, name, description, frequency, frequency_count, frequency_unit, default_enabled, sort_order, created_at, updated_at) VALUES
  -- Bud break
  ('tt_bud_break_1', 'default', 'bud_break', 'vintage', NULL, 'Inspect vines for frost damage', 'Check for any frost damage on new buds', 'weekly', 1, 'weeks', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bud_break_2', 'default', 'bud_break', 'vintage', NULL, 'Apply sulfur spray', 'Preventative fungicide application', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Flowering
  ('tt_flowering_1', 'default', 'flowering', 'vintage', NULL, 'Monitor weather for frost', 'Check forecast daily for frost risk', 'daily', 1, 'days', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_flowering_2', 'default', 'flowering', 'vintage', NULL, 'Inspect for pests', 'Check for mites, beetles, and other pests', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Fruiting
  ('tt_fruiting_1', 'default', 'fruiting', 'vintage', NULL, 'Thin clusters if needed', 'Remove excess clusters for better fruit quality', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_fruiting_2', 'default', 'fruiting', 'vintage', NULL, 'Monitor for disease', 'Check for powdery mildew, downy mildew', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Veraison
  ('tt_veraison_1', 'default', 'veraison', 'vintage', NULL, 'Net vines against birds', 'Install bird netting to protect ripening fruit', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_veraison_2', 'default', 'veraison', 'vintage', NULL, 'Monitor ripeness', 'Check color change and berry development', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Pre-harvest
  ('tt_pre_harvest_1', 'default', 'pre_harvest', 'vintage', NULL, 'Measure brix', 'Test sugar levels in grapes', 'twice_weekly', 2, 'weeks', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_pre_harvest_2', 'default', 'pre_harvest', 'vintage', NULL, 'Taste grapes', 'Sample grapes for flavor development', 'twice_weekly', 2, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_pre_harvest_3', 'default', 'pre_harvest', 'vintage', NULL, 'Prepare harvest equipment', 'Clean and ready bins, crusher, press', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Harvest
  ('tt_harvest_1', 'default', 'harvest', 'vintage', NULL, 'Pick grapes', 'Harvest grapes at optimal ripeness', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_harvest_2', 'default', 'harvest', 'vintage', NULL, 'Weigh harvest', 'Record total weight of harvested grapes', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_harvest_3', 'default', 'harvest', 'vintage', NULL, 'Take final brix measurement', 'Measure sugar content of harvested grapes', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000);

-- Wine stage task templates (wine-type specific)
INSERT INTO task_template (id, vineyard_id, stage, entity_type, wine_type, name, description, frequency, frequency_count, frequency_unit, default_enabled, sort_order, created_at, updated_at) VALUES
  -- Crush (all wine types)
  ('tt_crush_1', 'default', 'crush', 'wine', NULL, 'Crush and destem grapes', 'Process grapes through crusher/destemmer', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_crush_2', 'default', 'crush', 'wine', NULL, 'Add SO2', 'Sulfite addition for preservation', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_crush_3', 'default', 'crush', 'wine', NULL, 'Take initial measurements', 'Measure pH, TA, and brix of must', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Primary fermentation (red)
  ('tt_primary_red_1', 'default', 'primary_fermentation', 'wine', 'red', 'Inoculate with yeast', 'Add selected yeast strain to must', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_red_2', 'default', 'primary_fermentation', 'wine', 'red', 'Punch down cap', 'Push cap down into must to extract color and tannins', 'twice_daily', 2, 'days', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_red_3', 'default', 'primary_fermentation', 'wine', 'red', 'Monitor temperature', 'Check fermentation temperature stays in range', 'twice_daily', 2, 'days', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_red_4', 'default', 'primary_fermentation', 'wine', 'red', 'Measure pH/TA/Brix', 'Take chemistry measurements', 'daily', 1, 'days', TRUE, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Primary fermentation (white)
  ('tt_primary_white_1', 'default', 'primary_fermentation', 'wine', 'white', 'Inoculate with yeast', 'Add selected yeast strain to juice', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_white_2', 'default', 'primary_fermentation', 'wine', 'white', 'Monitor temperature', 'Keep fermentation cool (55-65°F)', 'daily', 1, 'days', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_white_3', 'default', 'primary_fermentation', 'wine', 'white', 'Measure pH/TA/Brix', 'Take chemistry measurements', 'daily', 1, 'days', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Primary fermentation (rosé)
  ('tt_primary_rose_1', 'default', 'primary_fermentation', 'wine', 'rosé', 'Inoculate with yeast', 'Add selected yeast strain', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_rose_2', 'default', 'primary_fermentation', 'wine', 'rosé', 'Monitor temperature', 'Keep fermentation cool (60-70°F)', 'daily', 1, 'days', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_primary_rose_3', 'default', 'primary_fermentation', 'wine', 'rosé', 'Measure pH/TA/Brix', 'Take chemistry measurements', 'daily', 1, 'days', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Secondary fermentation (MLF - red/rosé)
  ('tt_secondary_red_1', 'default', 'secondary_fermentation', 'wine', 'red', 'Inoculate with ML bacteria', 'Add malolactic bacteria culture', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_secondary_red_2', 'default', 'secondary_fermentation', 'wine', 'red', 'Monitor MLF progress', 'Test for malic acid conversion', 'weekly', 1, 'weeks', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_secondary_rose_1', 'default', 'secondary_fermentation', 'wine', 'rosé', 'Inoculate with ML bacteria', 'Add malolactic bacteria culture', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Racking (all types)
  ('tt_racking_1', 'default', 'racking', 'wine', NULL, 'Rack wine off lees', 'Transfer wine to clean vessel, leaving sediment', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_racking_2', 'default', 'racking', 'wine', NULL, 'Measure volume', 'Record current volume after racking', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_racking_3', 'default', 'racking', 'wine', NULL, 'Add SO2', 'Sulfite addition for preservation', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_racking_4', 'default', 'racking', 'wine', NULL, 'Take measurements', 'Measure pH and TA', 'once', NULL, NULL, TRUE, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Oaking (red)
  ('tt_oaking_red_1', 'default', 'oaking', 'wine', 'red', 'Transfer to oak barrel', 'Move wine into oak barrel for aging', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_oaking_red_2', 'default', 'oaking', 'wine', 'red', 'Top up barrel', 'Add wine to keep barrel full and prevent oxidation', 'monthly', 1, 'months', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_oaking_red_3', 'default', 'oaking', 'wine', 'red', 'Taste and evaluate', 'Sample wine to monitor oak integration', 'monthly', 1, 'months', TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Aging (all types)
  ('tt_aging_1', 'default', 'aging', 'wine', NULL, 'Monitor storage conditions', 'Check temperature and humidity', 'weekly', 1, 'weeks', TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_aging_2', 'default', 'aging', 'wine', NULL, 'Taste and take notes', 'Evaluate wine development', 'monthly', 1, 'months', TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

  -- Bottling (all types)
  ('tt_bottling_1', 'default', 'bottling', 'wine', NULL, 'Sanitize bottles and equipment', 'Clean and sanitize all bottling equipment', 'once', NULL, NULL, TRUE, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_2', 'default', 'bottling', 'wine', NULL, 'Final SO2 adjustment', 'Adjust sulfite levels before bottling', 'once', NULL, NULL, TRUE, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_3', 'default', 'bottling', 'wine', NULL, 'Bottle wine', 'Fill and cork bottles', 'once', NULL, NULL, TRUE, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_4', 'default', 'bottling', 'wine', NULL, 'Label bottles', 'Apply labels to finished bottles', 'once', NULL, NULL, TRUE, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('tt_bottling_5', 'default', 'bottling', 'wine', NULL, 'Record final bottle count', 'Count and record total bottles produced', 'once', NULL, NULL, TRUE, 5, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;
