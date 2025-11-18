-- ============================================================================
-- Partial Data Loss Investigation Queries
-- ============================================================================
-- Run these to understand what data exists and when it stops
-- ============================================================================

-- STEP 1: Find the last record in each table
-- ============================================================================

SELECT
  'vineyard' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as first_record_ts,
  MAX(created_at) as last_record_ts,
  to_timestamp(MIN(created_at) / 1000) as first_record_date,
  to_timestamp(MAX(created_at) / 1000) as last_record_date
FROM vineyard
WHERE created_at IS NOT NULL

UNION ALL

SELECT
  'vintage',
  COUNT(*),
  MIN(created_at),
  MAX(created_at),
  to_timestamp(MIN(created_at) / 1000),
  to_timestamp(MAX(created_at) / 1000)
FROM vintage
WHERE created_at IS NOT NULL

UNION ALL

SELECT
  'wine',
  COUNT(*),
  MIN(created_at),
  MAX(created_at),
  to_timestamp(MIN(created_at) / 1000),
  to_timestamp(MAX(created_at) / 1000)
FROM wine
WHERE created_at IS NOT NULL

UNION ALL

SELECT
  'task',
  COUNT(*),
  MIN(created_at),
  MAX(created_at),
  to_timestamp(MIN(created_at) / 1000),
  to_timestamp(MAX(created_at) / 1000)
FROM task
WHERE created_at IS NOT NULL

UNION ALL

SELECT
  'measurement',
  COUNT(*),
  MIN(created_at),
  MAX(created_at),
  to_timestamp(MIN(created_at) / 1000),
  to_timestamp(MAX(created_at) / 1000)
FROM measurement
WHERE created_at IS NOT NULL

ORDER BY last_record_ts DESC;

-- STEP 2: View most recent records in detail
-- ============================================================================

-- Most recent vineyards
SELECT
  id,
  name,
  location,
  created_at,
  to_timestamp(created_at / 1000) as created_date,
  updated_at,
  to_timestamp(updated_at / 1000) as updated_date
FROM vineyard
ORDER BY created_at DESC
LIMIT 10;

-- Most recent vintages
SELECT
  id,
  vineyard_id,
  vintage_year,
  variety,
  current_stage,
  created_at,
  to_timestamp(created_at / 1000) as created_date,
  updated_at,
  to_timestamp(updated_at / 1000) as updated_date
FROM vintage
ORDER BY created_at DESC
LIMIT 10;

-- Most recent wines
SELECT
  id,
  vineyard_id,
  name,
  wine_type,
  current_stage,
  created_at,
  to_timestamp(created_at / 1000) as created_date,
  updated_at,
  to_timestamp(updated_at / 1000) as updated_date
FROM wine
ORDER BY created_at DESC
LIMIT 10;

-- Most recent tasks
SELECT
  id,
  name,
  entity_type,
  entity_id,
  stage,
  due_date,
  to_timestamp(due_date / 1000) as due_date_formatted,
  created_at,
  to_timestamp(created_at / 1000) as created_date
FROM task
ORDER BY created_at DESC
LIMIT 10;

-- Most recent measurements
SELECT
  id,
  entity_type,
  entity_id,
  stage,
  date as measurement_date,
  to_timestamp(date / 1000) as measurement_date_formatted,
  ph,
  brix,
  temperature,
  created_at,
  to_timestamp(created_at / 1000) as created_date
FROM measurement
ORDER BY created_at DESC
LIMIT 10;

-- STEP 3: Look for patterns in the data
-- ============================================================================

-- Check if there's a specific cutoff time where all tables stop
WITH latest_records AS (
  SELECT 'vineyard' as table_name, MAX(created_at) as last_ts FROM vineyard
  UNION ALL
  SELECT 'vintage', MAX(created_at) FROM vintage
  UNION ALL
  SELECT 'wine', MAX(created_at) FROM wine
  UNION ALL
  SELECT 'task', MAX(created_at) FROM task
  UNION ALL
  SELECT 'measurement', MAX(created_at) FROM measurement
)
SELECT
  table_name,
  last_ts,
  to_timestamp(last_ts / 1000) as last_date,
  -- Calculate hours ago
  ROUND((EXTRACT(EPOCH FROM NOW()) - (last_ts / 1000)) / 3600, 2) as hours_ago,
  -- Calculate days ago
  ROUND((EXTRACT(EPOCH FROM NOW()) - (last_ts / 1000)) / 86400, 2) as days_ago
FROM latest_records
ORDER BY last_ts DESC;

-- STEP 4: Check for all records by vineyard
-- ============================================================================

-- See which vineyard has data and which doesn't
SELECT
  v.id,
  v.name,
  v.location,
  to_timestamp(v.created_at / 1000) as created_date,
  (SELECT COUNT(*) FROM vintage WHERE vineyard_id = v.id) as vintage_count,
  (SELECT COUNT(*) FROM wine WHERE vineyard_id = v.id) as wine_count
FROM vineyard v
ORDER BY v.created_at DESC;

-- STEP 5: Timeline of all creation events
-- ============================================================================

-- See all creation events in chronological order
SELECT created_at, to_timestamp(created_at / 1000) as date, 'vineyard' as type, id, name
FROM vineyard

UNION ALL

SELECT created_at, to_timestamp(created_at / 1000), 'vintage', id, variety || ' ' || vintage_year::text
FROM vintage

UNION ALL

SELECT created_at, to_timestamp(created_at / 1000), 'wine', id, name
FROM wine

UNION ALL

SELECT created_at, to_timestamp(created_at / 1000), 'task', id, name
FROM task

UNION ALL

SELECT created_at, to_timestamp(created_at / 1000), 'measurement', id, entity_type || ' measurement'
FROM measurement

ORDER BY created_at DESC
LIMIT 50;

-- STEP 6: Check for orphaned records
-- ============================================================================

-- Vintages without a vineyard (shouldn't exist, but check)
SELECT
  v.id,
  v.vintage_year,
  v.variety,
  v.vineyard_id,
  'Missing vineyard: ' || v.vineyard_id as issue
FROM vintage v
LEFT JOIN vineyard vy ON v.vineyard_id = vy.id
WHERE vy.id IS NULL;

-- Wines without a vintage (might be blends)
SELECT
  w.id,
  w.name,
  w.vintage_id,
  CASE
    WHEN w.blend_components IS NOT NULL THEN 'Blend wine (OK)'
    ELSE 'Missing vintage: ' || w.vintage_id
  END as issue
FROM wine w
LEFT JOIN vintage v ON w.vintage_id = v.id
WHERE v.id IS NULL;

-- Tasks without an entity
SELECT
  t.id,
  t.name,
  t.entity_type,
  t.entity_id,
  'Missing ' || t.entity_type || ': ' || t.entity_id as issue
FROM task t
WHERE
  (t.entity_type = 'wine' AND NOT EXISTS (SELECT 1 FROM wine WHERE id = t.entity_id))
  OR
  (t.entity_type = 'vintage' AND NOT EXISTS (SELECT 1 FROM vintage WHERE id = t.entity_id));

-- STEP 7: Check update timestamps vs create timestamps
-- ============================================================================

-- Find records that were updated after creation (shows activity)
SELECT
  'vineyard' as table_name,
  id,
  name,
  to_timestamp(created_at / 1000) as created,
  to_timestamp(updated_at / 1000) as updated,
  ROUND((updated_at - created_at) / 1000.0 / 60, 2) as minutes_between
FROM vineyard
WHERE updated_at > created_at

UNION ALL

SELECT
  'vintage',
  id,
  variety || ' ' || vintage_year::text,
  to_timestamp(created_at / 1000),
  to_timestamp(updated_at / 1000),
  ROUND((updated_at - created_at) / 1000.0 / 60, 2)
FROM vintage
WHERE updated_at > created_at

UNION ALL

SELECT
  'wine',
  id,
  name,
  to_timestamp(created_at / 1000),
  to_timestamp(updated_at / 1000),
  ROUND((updated_at - created_at) / 1000.0 / 60, 2)
FROM wine
WHERE updated_at > created_at

ORDER BY updated DESC
LIMIT 20;

-- STEP 8: Summary report
-- ============================================================================

-- Generate a summary of what data you have
WITH counts AS (
  SELECT
    (SELECT COUNT(*) FROM vineyard) as vineyards,
    (SELECT COUNT(*) FROM vintage) as vintages,
    (SELECT COUNT(*) FROM wine) as wines,
    (SELECT COUNT(*) FROM task) as tasks,
    (SELECT COUNT(*) FROM measurement) as measurements
),
latest AS (
  SELECT
    (SELECT MAX(created_at) FROM vineyard) as last_vineyard,
    (SELECT MAX(created_at) FROM vintage) as last_vintage,
    (SELECT MAX(created_at) FROM wine) as last_wine,
    (SELECT MAX(created_at) FROM task) as last_task,
    (SELECT MAX(created_at) FROM measurement) as last_measurement
)
SELECT
  'Total vineyards: ' || c.vineyards || ' | Last created: ' ||
    COALESCE(to_char(to_timestamp(l.last_vineyard / 1000), 'YYYY-MM-DD HH24:MI:SS'), 'None') as vineyard_summary,
  'Total vintages: ' || c.vintages || ' | Last created: ' ||
    COALESCE(to_char(to_timestamp(l.last_vintage / 1000), 'YYYY-MM-DD HH24:MI:SS'), 'None') as vintage_summary,
  'Total wines: ' || c.wines || ' | Last created: ' ||
    COALESCE(to_char(to_timestamp(l.last_wine / 1000), 'YYYY-MM-DD HH24:MI:SS'), 'None') as wine_summary,
  'Total tasks: ' || c.tasks || ' | Last created: ' ||
    COALESCE(to_char(to_timestamp(l.last_task / 1000), 'YYYY-MM-DD HH24:MI:SS'), 'None') as task_summary,
  'Total measurements: ' || c.measurements || ' | Last created: ' ||
    COALESCE(to_char(to_timestamp(l.last_measurement / 1000), 'YYYY-MM-DD HH24:MI:SS'), 'None') as measurement_summary
FROM counts c, latest l;

-- ============================================================================
-- Results to note:
-- ============================================================================
-- 1. What's the latest timestamp across all tables?
-- 2. How many records do you have total?
-- 3. When were you last working on adding data?
-- 4. What's the gap between latest DB record and when you worked?
--
-- Share these results to determine next steps for recovery.
-- ============================================================================
