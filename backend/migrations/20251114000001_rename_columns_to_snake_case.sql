-- Migration to rename all camelCase columns to snake_case
-- This ensures consistency with the Zero schema

-- Vineyard table
ALTER TABLE vineyard RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE vineyard RENAME COLUMN "updatedAt" TO updated_at;

-- Block table
ALTER TABLE block RENAME COLUMN "sizeAcres" TO size_acres;
ALTER TABLE block RENAME COLUMN "soilType" TO soil_type;
ALTER TABLE block RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE block RENAME COLUMN "updatedAt" TO updated_at;

-- Vine table
ALTER TABLE vine RENAME COLUMN "sequenceNumber" TO sequence_number;
ALTER TABLE vine RENAME COLUMN "plantingDate" TO planting_date;
ALTER TABLE vine RENAME COLUMN "qrGenerated" TO qr_generated;
ALTER TABLE vine RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE vine RENAME COLUMN "updatedAt" TO updated_at;
