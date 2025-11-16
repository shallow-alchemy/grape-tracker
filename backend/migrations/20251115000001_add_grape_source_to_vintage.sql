-- Add grape source tracking to vintage table
-- Allows tracking both vineyard grapes and purchased grapes

ALTER TABLE vintage ADD COLUMN grape_source TEXT DEFAULT 'own_vineyard';
ALTER TABLE vintage ADD COLUMN supplier_name TEXT;

-- Update unique constraint to allow multiple suppliers for same variety+year
ALTER TABLE vintage DROP CONSTRAINT IF EXISTS vintage_vineyard_id_variety_vintage_year_key;
ALTER TABLE vintage ADD CONSTRAINT vintage_unique_source
  UNIQUE (vineyard_id, variety, vintage_year, grape_source, supplier_name);

-- Add comment for clarity
COMMENT ON COLUMN vintage.grape_source IS 'Source of grapes: own_vineyard or purchased';
COMMENT ON COLUMN vintage.supplier_name IS 'Supplier name for purchased grapes (nullable)';
