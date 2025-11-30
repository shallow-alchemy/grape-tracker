-- Create seasonal_task table for weekly AI-generated vineyard tasks
CREATE TABLE IF NOT EXISTS seasonal_task (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    week_start BIGINT NOT NULL,           -- Monday of the week (timestamp in ms)
    season TEXT NOT NULL,                  -- e.g., "Post-Harvest/Early Dormant"
    priority INTEGER NOT NULL,             -- 1, 2, 3, etc.
    task_name TEXT NOT NULL,
    timing TEXT NOT NULL,                  -- e.g., "Immediately", "This week"
    details TEXT NOT NULL,
    completed_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Index for efficient lookups by user and week
CREATE INDEX IF NOT EXISTS idx_seasonal_task_user_week ON seasonal_task(user_id, week_start);
