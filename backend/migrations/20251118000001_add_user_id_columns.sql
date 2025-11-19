-- Add user_id columns for multi-tenant isolation
-- Migration: 20251118000001_add_user_id_columns.sql

-- Add user_id to vineyard table
ALTER TABLE vineyard ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_vineyard_user_id ON vineyard(user_id);

-- Add user_id to block table
ALTER TABLE block ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_block_user_id ON block(user_id);

-- Add user_id to vine table
ALTER TABLE vine ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_vine_user_id ON vine(user_id);

-- Add user_id to vintage table
ALTER TABLE vintage ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_vintage_user_id ON vintage(user_id);

-- Add user_id to wine table
ALTER TABLE wine ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_wine_user_id ON wine(user_id);

-- Add user_id to stage_history table
ALTER TABLE stage_history ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_stage_history_user_id ON stage_history(user_id);

-- Add user_id to task_template table
ALTER TABLE task_template ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_task_template_user_id ON task_template(user_id);

-- Add user_id to task table
ALTER TABLE task ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_task_user_id ON task(user_id);

-- Add user_id to measurement table
ALTER TABLE measurement ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX idx_measurement_user_id ON measurement(user_id);

-- Note: measurement_range table does NOT get user_id as it contains global reference data
