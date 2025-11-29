-- Add training method to block table
-- Training method is set at block level and inherited by vines
-- Migration: 20251129000002_add_training_method_to_block.sql

-- Add training method columns to block table
-- Reuses the training_method enum created in 20251129000001_add_training_pruning.sql
ALTER TABLE block ADD COLUMN training_method training_method;
ALTER TABLE block ADD COLUMN training_method_other VARCHAR(500);

-- Add index for efficient queries
CREATE INDEX idx_block_training_method ON block(training_method);

-- Note: vine.training_method will remain for now but become read-only in UI
-- Future migration may remove it once block is confirmed as source of truth
