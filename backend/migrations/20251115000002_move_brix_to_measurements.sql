-- Move brix_at_harvest to measurements table for single source of truth
-- This ensures harvest measurements (brix, pH, TA) are all tracked in one place

-- Drop the brix_at_harvest column from vintage table
ALTER TABLE vintage DROP COLUMN IF EXISTS brix_at_harvest;

-- Add comment for clarity
COMMENT ON TABLE measurement IS 'Tracks all measurements (brix, pH, TA, temperature) for vintages and wines at different stages. Use stage=harvest for initial harvest measurements.';
