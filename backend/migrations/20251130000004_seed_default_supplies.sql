-- Seed default supply templates for existing task templates
-- These are linked to system default tasks (user_id = '')

-- Helper function to generate IDs
-- Format: st_{task_id}_{sequence}

-- ============================================
-- CRUSH STAGE
-- ============================================

-- Crush and destem grapes (tt_crush_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_crush_1_1', '', 'tt_crush_1', 'Crusher/destemmer', NULL, 1, 14, 'Or use food-grade buckets and feet for small batches', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_crush_1_2', '', 'tt_crush_1', 'Food-grade buckets', '1 per 30 lbs grapes', 2, 14, 'Food-grade plastic or stainless steel', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_crush_1_3', '', 'tt_crush_1', 'Garbage bags', NULL, 5, 7, 'For stems and waste', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Add SO2 (tt_crush_2)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_crush_2_1', '', 'tt_crush_2', 'Potassium metabisulfite', NULL, 1, 10, 'Campden tablets or powder', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_crush_2_2', '', 'tt_crush_2', 'Measuring spoons', NULL, 1, 7, 'Accurate measurement is critical', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_crush_2_3', '', 'tt_crush_2', 'Long stirring spoon', NULL, 1, 7, 'Food-grade plastic or stainless steel', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Take initial measurements (tt_crush_3)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_crush_3_1', '', 'tt_crush_3', 'pH meter or test strips', NULL, 1, 14, 'Digital pH meter preferred for accuracy', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_crush_3_2', '', 'tt_crush_3', 'TA testing kit', NULL, 1, 14, 'Titration kit for titratable acidity', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_crush_3_3', '', 'tt_crush_3', 'Hydrometer', NULL, 1, 14, 'For measuring Brix/sugar content', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_crush_3_4', '', 'tt_crush_3', 'Graduated cylinder', NULL, 1, 14, '100ml or 250ml for hydrometer readings', false, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- ============================================
-- PRIMARY FERMENTATION STAGE
-- ============================================

-- Inoculate with yeast - Red (tt_primary_red_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_red_1_1', '', 'tt_primary_red_1', 'Wine yeast', '1 packet per 5 gallons', 1, 10, 'Red wine yeast (e.g., RC212, BM45, D254)', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_red_1_2', '', 'tt_primary_red_1', 'Yeast nutrient', '1 tsp per gallon', 1, 10, 'Fermaid-O or similar', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_red_1_3', '', 'tt_primary_red_1', 'Yeast rehydration vessel', NULL, 1, 7, 'Small container for Go-Ferm rehydration', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Inoculate with yeast - White (tt_primary_white_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_white_1_1', '', 'tt_primary_white_1', 'Wine yeast', '1 packet per 5 gallons', 1, 10, 'White wine yeast (e.g., EC-1118, QA23, D47)', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_white_1_2', '', 'tt_primary_white_1', 'Yeast nutrient', '1 tsp per gallon', 1, 10, 'Fermaid-O or similar', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_white_1_3', '', 'tt_primary_white_1', 'Yeast rehydration vessel', NULL, 1, 7, 'Small container for Go-Ferm rehydration', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Inoculate with yeast - Rosé (tt_primary_rose_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_rose_1_1', '', 'tt_primary_rose_1', 'Wine yeast', '1 packet per 5 gallons', 1, 10, 'Rosé/white wine yeast (e.g., EC-1118, QA23)', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_rose_1_2', '', 'tt_primary_rose_1', 'Yeast nutrient', '1 tsp per gallon', 1, 10, 'Fermaid-O or similar', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_rose_1_3', '', 'tt_primary_rose_1', 'Yeast rehydration vessel', NULL, 1, 7, 'Small container for Go-Ferm rehydration', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Punch down cap (tt_primary_red_2)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_red_2_1', '', 'tt_primary_red_2', 'Punch-down tool', NULL, 1, 7, 'Stainless steel or food-grade plastic', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_red_2_2', '', 'tt_primary_red_2', 'Thermometer', NULL, 1, 7, 'Floating or probe thermometer', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Monitor temperature - Red (tt_primary_red_3)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_red_3_1', '', 'tt_primary_red_3', 'Thermometer', NULL, 1, 7, 'Floating or probe thermometer', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Monitor temperature - White (tt_primary_white_2)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_white_2_1', '', 'tt_primary_white_2', 'Thermometer', NULL, 1, 7, 'Floating or probe thermometer', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Monitor temperature - Rosé (tt_primary_rose_2)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_rose_2_1', '', 'tt_primary_rose_2', 'Thermometer', NULL, 1, 7, 'Floating or probe thermometer', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Measure pH/TA/Brix - Red (tt_primary_red_4)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_red_4_1', '', 'tt_primary_red_4', 'pH meter', NULL, 1, 7, 'Calibrated pH meter', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_red_4_2', '', 'tt_primary_red_4', 'Hydrometer', NULL, 1, 7, 'For tracking fermentation progress', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Measure pH/TA/Brix - White (tt_primary_white_3)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_white_3_1', '', 'tt_primary_white_3', 'pH meter', NULL, 1, 7, 'Calibrated pH meter', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_white_3_2', '', 'tt_primary_white_3', 'Hydrometer', NULL, 1, 7, 'For tracking fermentation progress', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Measure pH/TA/Brix - Rosé (tt_primary_rose_3)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_primary_rose_3_1', '', 'tt_primary_rose_3', 'pH meter', NULL, 1, 7, 'Calibrated pH meter', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_primary_rose_3_2', '', 'tt_primary_rose_3', 'Hydrometer', NULL, 1, 7, 'For tracking fermentation progress', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- ============================================
-- MALOLACTIC FERMENTATION STAGE
-- ============================================

-- Inoculate with ML bacteria - Red (tt_secondary_red_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_secondary_red_1_1', '', 'tt_secondary_red_1', 'Malolactic culture', '1 packet per 66 gallons', 1, 10, 'e.g., VP41, CH16', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_secondary_red_1_2', '', 'tt_secondary_red_1', 'Chromatography kit', NULL, 1, 14, 'To test MLF completion', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Inoculate with ML bacteria - Rosé (tt_secondary_rose_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_secondary_rose_1_1', '', 'tt_secondary_rose_1', 'Malolactic culture', '1 packet per 66 gallons', 1, 10, 'e.g., VP41, CH16', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_secondary_rose_1_2', '', 'tt_secondary_rose_1', 'Chromatography kit', NULL, 1, 14, 'To test MLF completion', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Monitor MLF progress (tt_secondary_red_2)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_secondary_red_2_1', '', 'tt_secondary_red_2', 'Chromatography paper', NULL, 1, 7, 'For testing MLF progress', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- ============================================
-- RACKING STAGE
-- ============================================

-- Rack wine off lees (tt_racking_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_racking_1_1', '', 'tt_racking_1', 'Racking cane', NULL, 1, 7, 'Stainless steel or food-grade plastic', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_racking_1_2', '', 'tt_racking_1', 'Silicone tubing', '6 feet', 1, 7, 'Food-grade silicone', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_racking_1_3', '', 'tt_racking_1', 'Clean carboy or vessel', NULL, 1, 7, 'Sanitized receiving vessel', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_racking_1_4', '', 'tt_racking_1', 'Sanitizer', NULL, 1, 7, 'Star San or similar no-rinse sanitizer', false, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Add SO2 (tt_racking_3)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_racking_3_1', '', 'tt_racking_3', 'Potassium metabisulfite', NULL, 1, 10, 'Campden tablets or powder', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_racking_3_2', '', 'tt_racking_3', 'Measuring spoons', NULL, 1, 7, 'For accurate SO2 dosing', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Take measurements (tt_racking_4)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_racking_4_1', '', 'tt_racking_4', 'pH meter', NULL, 1, 7, 'Calibrated pH meter', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_racking_4_2', '', 'tt_racking_4', 'Free SO2 test kit', NULL, 1, 14, 'Ripper or aeration-oxidation method', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- ============================================
-- AGING/OAKING STAGE
-- ============================================

-- Transfer to oak barrel (tt_oaking_red_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_oaking_red_1_1', '', 'tt_oaking_red_1', 'Oak barrel', NULL, 1, 21, 'New or neutral depending on desired oak influence', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_oaking_red_1_2', '', 'tt_oaking_red_1', 'Barrel bung', NULL, 1, 14, 'Silicone bung for aging', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_oaking_red_1_3', '', 'tt_oaking_red_1', 'Sanitizer', NULL, 1, 7, 'For barrel preparation', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Top up barrel (tt_oaking_red_2)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_oaking_red_2_1', '', 'tt_oaking_red_2', 'Reserve wine for topping', NULL, 1, 7, 'Same wine or similar variety', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Monitor storage conditions (tt_aging_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_aging_1_1', '', 'tt_aging_1', 'Thermometer/hygrometer', NULL, 1, 14, 'For monitoring cellar conditions', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- ============================================
-- BOTTLING STAGE
-- ============================================

-- Sanitize bottles and equipment (tt_bottling_1)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_bottling_1_1', '', 'tt_bottling_1', 'Sanitizer', NULL, 1, 7, 'Star San or similar no-rinse sanitizer', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_bottling_1_2', '', 'tt_bottling_1', 'Bottle brush', NULL, 1, 14, 'For cleaning bottles', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_bottling_1_3', '', 'tt_bottling_1', 'Bottle tree or drying rack', NULL, 1, 14, 'For draining sanitized bottles', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Final SO2 adjustment (tt_bottling_2)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_bottling_2_1', '', 'tt_bottling_2', 'Potassium metabisulfite', NULL, 1, 10, 'For final SO2 adjustment before bottling', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_bottling_2_2', '', 'tt_bottling_2', 'Free SO2 test kit', NULL, 1, 14, 'To verify SO2 levels', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Bottle wine (tt_bottling_3)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_bottling_3_1', '', 'tt_bottling_3', 'Wine bottles', '5 per gallon', 25, 14, 'Standard 750ml bottles', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_bottling_3_2', '', 'tt_bottling_3', 'Corks', '5 per gallon', 25, 14, '#9 natural or synthetic corks', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_bottling_3_3', '', 'tt_bottling_3', 'Corker', NULL, 1, 14, 'Floor corker or hand corker', false, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_bottling_3_4', '', 'tt_bottling_3', 'Bottle filler', NULL, 1, 14, 'Spring-tip bottle filler', false, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Label bottles (tt_bottling_4)
INSERT INTO supply_template (id, user_id, task_template_id, name, quantity_formula, quantity_fixed, lead_time_days, notes, is_archived, sort_order, created_at, updated_at)
VALUES
    ('st_bottling_4_1', '', 'tt_bottling_4', 'Wine labels', '5 per gallon', 25, 14, 'Custom or blank labels', false, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
    ('st_bottling_4_2', '', 'tt_bottling_4', 'Capsules/shrink caps', '5 per gallon', 25, 14, 'Heat-shrink or PVC capsules', false, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000);
