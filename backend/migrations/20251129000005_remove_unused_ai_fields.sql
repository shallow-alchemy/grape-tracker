-- Remove unused AI context fields that were prematurely added
-- Keeping: available_labor_hours (useful for AI recommendations)
-- Removing: production_goal, experience_level (belong in future planning module)
-- Removing: observed_vigor (wrong abstraction - vigor is per-vine, not per-block)

-- Drop vineyard fields
ALTER TABLE vineyard DROP COLUMN IF EXISTS production_goal;
ALTER TABLE vineyard DROP COLUMN IF EXISTS experience_level;

-- Drop block field
ALTER TABLE block DROP COLUMN IF EXISTS observed_vigor;
