-- Migration: Add blend_components to wine table
-- Date: 2025-11-16
-- Description: Add optional blend_components field to support multi-vintage blends

ALTER TABLE wine ADD COLUMN IF NOT EXISTS blend_components JSONB;

COMMENT ON COLUMN wine.blend_components IS 'Array of blend components for multi-vintage wines: [{vintage_id: string, percentage: number}]. Null for single-vintage wines.';
