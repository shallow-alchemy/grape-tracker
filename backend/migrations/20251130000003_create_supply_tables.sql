-- Create supply_template table
-- Supply templates are attached to task templates and define what supplies are needed
CREATE TABLE IF NOT EXISTS supply_template (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_template_id TEXT NOT NULL REFERENCES task_template(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity_formula TEXT,                    -- e.g., "1 per 30 lbs grapes"
    quantity_fixed NUMERIC DEFAULT 1,         -- Fallback quantity
    lead_time_days INTEGER DEFAULT 7,         -- Days before task to surface
    notes TEXT DEFAULT '',
    is_archived BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Create supply_instance table
-- Supply instances are created when a task is instantiated for a specific wine/vintage
CREATE TABLE IF NOT EXISTS supply_instance (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    supply_template_id TEXT NOT NULL REFERENCES supply_template(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,                -- 'wine' or 'vintage'
    entity_id TEXT NOT NULL,
    calculated_quantity NUMERIC,              -- Computed from formula if possible
    verified_at BIGINT,                       -- When user confirmed they have it
    verified_by TEXT,                         -- User who verified
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_supply_template_task ON supply_template(task_template_id);
CREATE INDEX IF NOT EXISTS idx_supply_template_user ON supply_template(user_id);
CREATE INDEX IF NOT EXISTS idx_supply_instance_task ON supply_instance(task_id);
CREATE INDEX IF NOT EXISTS idx_supply_instance_entity ON supply_instance(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_supply_instance_user ON supply_instance(user_id);
