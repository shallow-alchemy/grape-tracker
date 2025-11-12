-- Insert default vineyard record
-- This ensures the vineyard settings modal has data to display

INSERT INTO vineyard (id, name, location, varieties, "createdAt", "updatedAt")
VALUES (
  'default',
  'My Vineyard',
  '',
  '[]'::jsonb,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000
)
ON CONFLICT (id) DO NOTHING;
