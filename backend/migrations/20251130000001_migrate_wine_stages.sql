-- Migration: Update wine stages to new 11-stage system
-- Maps old stages to new stages:
--   secondary_fermentation -> malolactic_fermentation (renamed)
--   oaking -> aging (merged)
-- New stages available: pre_fermentation, press, fining_filtering, blending, bottle_aging

-- Update wine.current_stage
UPDATE wine
SET current_stage = 'malolactic_fermentation'
WHERE current_stage = 'secondary_fermentation';

UPDATE wine
SET current_stage = 'aging'
WHERE current_stage = 'oaking';

-- Update stage_history.stage
UPDATE stage_history
SET stage = 'malolactic_fermentation'
WHERE stage = 'secondary_fermentation' AND entity_type = 'wine';

UPDATE stage_history
SET stage = 'aging'
WHERE stage = 'oaking' AND entity_type = 'wine';

-- Update task_template.stage
UPDATE task_template
SET stage = 'malolactic_fermentation'
WHERE stage = 'secondary_fermentation';

UPDATE task_template
SET stage = 'aging'
WHERE stage = 'oaking';

-- Update task.stage
UPDATE task
SET stage = 'malolactic_fermentation'
WHERE stage = 'secondary_fermentation';

UPDATE task
SET stage = 'aging'
WHERE stage = 'oaking';

-- Update measurement.stage
UPDATE measurement
SET stage = 'malolactic_fermentation'
WHERE stage = 'secondary_fermentation';

UPDATE measurement
SET stage = 'aging'
WHERE stage = 'oaking';
