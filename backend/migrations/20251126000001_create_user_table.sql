-- Create user table for multi-tenant user management
-- Migration: 20251126000001_create_user_table.sql

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,                    -- Clerk ID as primary key
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  vineyard_id TEXT REFERENCES vineyard(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'owner',     -- 'owner' | 'member' (for future invites)
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_vineyard_id ON "user"(vineyard_id);

-- Add to Zero replication (required for Zero sync)
-- Use DO block to handle case where publication doesn't exist or table is already in it
DO $$
BEGIN
  -- Create publication if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = '_zero_public_0') THEN
    CREATE PUBLICATION _zero_public_0;
  END IF;

  -- Add table to publication
  ALTER PUBLICATION _zero_public_0 ADD TABLE "user";
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
