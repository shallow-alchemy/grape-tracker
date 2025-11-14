-- Winery tables migration
-- Creates vintage, wine, stage_history, task_template, task, measurement, measurement_range tables

-- Vintage table (represents harvest from a variety in a year)
CREATE TABLE IF NOT EXISTS vintage (
  id TEXT PRIMARY KEY,
  vineyard_id TEXT NOT NULL REFERENCES vineyard(id),
  vintage_year INTEGER NOT NULL,
  variety TEXT NOT NULL,
  block_ids TEXT[],
  current_stage TEXT NOT NULL,
  harvest_date BIGINT,
  harvest_weight_lbs REAL,
  harvest_volume_gallons REAL,
  brix_at_harvest REAL,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,

  CONSTRAINT unique_vintage_per_variety_year UNIQUE (vineyard_id, variety, vintage_year)
);

CREATE INDEX IF NOT EXISTS idx_vintage_vineyard ON vintage(vineyard_id);
CREATE INDEX IF NOT EXISTS idx_vintage_stage ON vintage(current_stage);
CREATE INDEX IF NOT EXISTS idx_vintage_year ON vintage(vintage_year);

-- Wine table (represents finished products made from vintages)
CREATE TABLE IF NOT EXISTS wine (
  id TEXT PRIMARY KEY,
  vintage_id TEXT NOT NULL REFERENCES vintage(id) ON DELETE CASCADE,
  vineyard_id TEXT NOT NULL REFERENCES vineyard(id),
  name TEXT NOT NULL,
  wine_type TEXT NOT NULL,
  volume_gallons REAL,
  current_volume_gallons REAL,
  current_stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_tasting_notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wine_vintage ON wine(vintage_id);
CREATE INDEX IF NOT EXISTS idx_wine_vineyard ON wine(vineyard_id);
CREATE INDEX IF NOT EXISTS idx_wine_stage ON wine(current_stage);
CREATE INDEX IF NOT EXISTS idx_wine_status ON wine(status);

-- Stage history table (tracks stage transitions for vintages and wines)
CREATE TABLE IF NOT EXISTS stage_history (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  completed_at BIGINT,
  skipped BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stage_history_entity ON stage_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_stage ON stage_history(stage);

-- Task template table (configurable tasks per stage and wine type)
CREATE TABLE IF NOT EXISTS task_template (
  id TEXT PRIMARY KEY,
  vineyard_id TEXT NOT NULL REFERENCES vineyard(id),
  stage TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  wine_type TEXT,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  frequency_count INTEGER,
  frequency_unit TEXT,
  default_enabled BOOLEAN DEFAULT TRUE,
  sort_order INTEGER,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_template_stage ON task_template(stage);
CREATE INDEX IF NOT EXISTS idx_task_template_vineyard ON task_template(vineyard_id);
CREATE INDEX IF NOT EXISTS idx_task_template_wine_type ON task_template(wine_type);

-- Task table (actual task instances)
CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY,
  task_template_id TEXT REFERENCES task_template(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  due_date BIGINT,
  completed_at BIGINT,
  completed_by TEXT,
  notes TEXT,
  skipped BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_entity ON task(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_task_stage ON task(stage);
CREATE INDEX IF NOT EXISTS idx_task_completed ON task(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_due ON task(due_date);

-- Measurement table (chemistry and tasting measurements)
CREATE TABLE IF NOT EXISTS measurement (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  date BIGINT NOT NULL,
  stage TEXT NOT NULL,
  ph REAL,
  ta REAL,
  brix REAL,
  temperature REAL,
  tasting_notes TEXT,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_measurement_entity ON measurement(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_measurement_date ON measurement(date);
CREATE INDEX IF NOT EXISTS idx_measurement_stage ON measurement(stage);

-- Measurement range table (reference data for validation)
CREATE TABLE IF NOT EXISTS measurement_range (
  id TEXT PRIMARY KEY,
  wine_type TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  min_value REAL,
  max_value REAL,
  ideal_min REAL,
  ideal_max REAL,
  low_warning TEXT,
  high_warning TEXT,
  created_at BIGINT NOT NULL,

  CONSTRAINT unique_range_per_type UNIQUE (wine_type, measurement_type)
);

CREATE INDEX IF NOT EXISTS idx_measurement_range_wine_type ON measurement_range(wine_type);
