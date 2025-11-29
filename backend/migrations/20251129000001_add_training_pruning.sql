-- Add training method and pruning log for vine management
-- Migration: 20251129000001_add_training_pruning.sql

-- Create training method enum type
CREATE TYPE training_method AS ENUM (
  'HEAD_TRAINING',
  'BILATERAL_CORDON',
  'VERTICAL_CORDON',
  'FOUR_ARM_KNIFFEN',
  'GENEVA_DOUBLE_CURTAIN',
  'UMBRELLA_KNIFFEN',
  'CANE_PRUNED',
  'VSP',
  'SCOTT_HENRY',
  'LYRE',
  'OTHER'
);

-- Create pruning type enum
CREATE TYPE pruning_type AS ENUM (
  'dormant',
  'summer',
  'corrective',
  'training'
);

-- Add training method columns to vine table
ALTER TABLE vine ADD COLUMN training_method training_method;
ALTER TABLE vine ADD COLUMN training_method_other VARCHAR(500);

-- Create pruning_log table
CREATE TABLE pruning_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  vine_id VARCHAR(36) NOT NULL REFERENCES vine(id) ON DELETE CASCADE,
  date BIGINT NOT NULL,
  pruning_type pruning_type NOT NULL,
  spurs_left INTEGER,
  canes_before INTEGER,
  canes_after INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  photo_id VARCHAR(36),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Add indexes for efficient queries
CREATE INDEX idx_pruning_log_user_id ON pruning_log(user_id);
CREATE INDEX idx_pruning_log_vine_id ON pruning_log(vine_id);
CREATE INDEX idx_pruning_log_date ON pruning_log(date);
CREATE INDEX idx_vine_training_method ON vine(training_method);
