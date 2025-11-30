-- Create measurement_analysis table for caching AI analysis of wine measurements
CREATE TABLE IF NOT EXISTS measurement_analysis (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    measurement_id TEXT NOT NULL,          -- FK to measurement table
    summary TEXT NOT NULL,                  -- AI-generated summary
    metrics JSONB NOT NULL DEFAULT '[]',    -- Array of { name, value, status, analysis }
    projections TEXT,                       -- Optional future projections
    recommendations JSONB NOT NULL DEFAULT '[]',  -- Array of recommendation strings
    created_at BIGINT NOT NULL
);

-- Index for efficient lookups by measurement
CREATE INDEX IF NOT EXISTS idx_measurement_analysis_measurement_id ON measurement_analysis(measurement_id);
-- Index for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_measurement_analysis_user_id ON measurement_analysis(user_id);
