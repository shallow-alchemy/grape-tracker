-- Create alert_settings table for vineyard-specific alert configurations
-- Supports multiple alert types (weather, tasks, vine_health, etc.)
CREATE TABLE IF NOT EXISTS alert_settings (
  vineyard_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  settings JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (vineyard_id, alert_type)
);

-- Create index on alert_type for efficient querying by type
CREATE INDEX IF NOT EXISTS idx_alert_settings_type ON alert_settings(alert_type);

-- Create index on updated_at for potential future queries
CREATE INDEX IF NOT EXISTS idx_alert_settings_updated_at ON alert_settings(updated_at);
