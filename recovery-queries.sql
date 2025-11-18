-- ============================================================================
-- Production Data Recovery SQL Queries
-- ============================================================================
-- Execute these queries in Railway PostgreSQL console
-- Follow the steps in RECOVERY-PLAN.md for complete instructions
-- ============================================================================

-- STEP 1: Verify Data Still Exists
-- ============================================================================

-- Check vineyard data
SELECT id, name, location, created_at
FROM vineyard
ORDER BY created_at DESC
LIMIT 10;

-- Check vintage data
SELECT id, vintage_year, variety, current_stage, created_at
FROM vintage
ORDER BY created_at DESC
LIMIT 10;

-- Check wine data
SELECT id, name, wine_type, current_stage, created_at
FROM wine
ORDER BY created_at DESC
LIMIT 10;

-- Check vine data (if you were tracking individual vines)
SELECT id, variety, block, sequence_number, created_at
FROM vine
ORDER BY created_at DESC
LIMIT 10;

-- Check task data
SELECT id, name, entity_type, entity_id, due_date, completed_at
FROM task
ORDER BY created_at DESC
LIMIT 10;

-- Check measurement data
SELECT id, entity_type, entity_id, date, ph, brix
FROM measurement
ORDER BY date DESC
LIMIT 10;

-- Count total records per table
SELECT
  'vineyard' as table_name,
  COUNT(*) as record_count
FROM vineyard
UNION ALL
SELECT 'vintage', COUNT(*) FROM vintage
UNION ALL
SELECT 'wine', COUNT(*) FROM wine
UNION ALL
SELECT 'vine', COUNT(*) FROM vine
UNION ALL
SELECT 'task', COUNT(*) FROM task
UNION ALL
SELECT 'measurement', COUNT(*) FROM measurement;

-- STEP 2: Check Replication Slots
-- ============================================================================

-- View all replication slots with details
SELECT
  slot_name,
  slot_type,
  active,
  active_pid,
  restart_lsn,
  confirmed_flush_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag
FROM pg_replication_slots;

-- List only Zero replication slots
SELECT slot_name, active, active_pid
FROM pg_replication_slots
WHERE slot_name LIKE 'zero_%';

-- STEP 3: Clean Up Broken Replication Slots
-- ============================================================================

-- WARNING: Only run this if Step 1 confirmed your data exists!
-- This drops all Zero replication slots

-- Option A: Drop all zero slots at once (automated)
DO $$
DECLARE
  slot_rec RECORD;
BEGIN
  FOR slot_rec IN
    SELECT slot_name
    FROM pg_replication_slots
    WHERE slot_name LIKE 'zero_%'
  LOOP
    BEGIN
      EXECUTE format('SELECT pg_drop_replication_slot(%L)', slot_rec.slot_name);
      RAISE NOTICE 'Dropped slot: %', slot_rec.slot_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to drop slot %: %', slot_rec.slot_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Option B: Drop slots manually one by one
-- First, list all slots to get their names:
-- SELECT slot_name FROM pg_replication_slots WHERE slot_name LIKE 'zero_%';
--
-- Then drop each one (uncomment and replace with actual slot names):
-- SELECT pg_drop_replication_slot('zero_0_1763245318300');
-- SELECT pg_drop_replication_slot('zero_0_1763338192465');
-- SELECT pg_drop_replication_slot('zero_0_1763344344144');

-- STEP 3b: Force Drop Active Slots (if needed)
-- ============================================================================

-- If dropping fails with "replication slot is active" error:

-- 1. Find active PIDs
SELECT slot_name, active_pid
FROM pg_replication_slots
WHERE slot_name LIKE 'zero_%' AND active = true;

-- 2. Terminate the processes (replace PID numbers with actual values)
-- SELECT pg_terminate_backend(12345);
-- SELECT pg_terminate_backend(67890);

-- 3. Wait 5 seconds, then try dropping slots again

-- STEP 4: Verify Configuration
-- ============================================================================

-- Check wal_level is logical
SHOW wal_level;
-- Should return: logical

-- If not, set it (then restart PostgreSQL in Railway):
-- ALTER SYSTEM SET wal_level = logical;

-- Check PostgreSQL version
SELECT version();

-- Check max replication slots
SHOW max_replication_slots;
-- Should be at least 10

-- MONITORING QUERIES (Optional)
-- ============================================================================

-- Monitor replication lag in real-time
SELECT
  slot_name,
  active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as replication_lag,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) as flush_lag
FROM pg_replication_slots
WHERE slot_name LIKE 'zero_%';

-- Check WAL file count (high count = replication falling behind)
SELECT count(*) as wal_file_count
FROM pg_ls_waldir();

-- Check database size
SELECT
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- List all tables and their sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- VERIFICATION QUERIES (After Recovery)
-- ============================================================================

-- Verify replication slot recreated successfully
SELECT slot_name, active, restart_lsn
FROM pg_replication_slots
WHERE slot_name LIKE 'zero_%';

-- Should show ONE slot with active = true

-- Check for WAL sender processes
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  sync_state
FROM pg_stat_replication;

-- BACKUP QUERIES (Prevention)
-- ============================================================================

-- Create a backup of your vineyard data (example)
-- Run before making risky changes

-- Copy to a backup table
-- CREATE TABLE vineyard_backup AS SELECT * FROM vineyard;
-- CREATE TABLE vintage_backup AS SELECT * FROM vintage;
-- CREATE TABLE wine_backup AS SELECT * FROM wine;

-- Restore from backup (if needed)
-- TRUNCATE vineyard;
-- INSERT INTO vineyard SELECT * FROM vineyard_backup;

-- ============================================================================
-- End of Recovery Queries
-- ============================================================================
