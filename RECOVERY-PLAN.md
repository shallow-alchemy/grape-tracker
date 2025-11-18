# Production Data Recovery Plan

## Issue Summary

**Problem**: Vineyard data disappeared from production UI
**Root Cause**: Zero logical replication failing with "invalid standby message type 'f'" error
**Diagnosis**: PostgreSQL replication slots are broken, preventing Zero from syncing changes
**Status**: Data likely still exists in database, but Zero sync is broken

## Recovery Steps

### Step 1: Verify Data Still Exists

Connect to Railway PostgreSQL and run these queries:

```sql
-- Check if your vineyard data exists
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

-- Check vine data
SELECT id, variety, block, sequence_number, created_at
FROM vine
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result**: If data exists, you should see your vineyard records with timestamps.

### Step 2: Check Current Replication Slots

```sql
-- View all replication slots
SELECT
  slot_name,
  slot_type,
  active,
  active_pid,
  restart_lsn,
  confirmed_flush_lsn
FROM pg_replication_slots;
```

**Look for**:
- Multiple `zero_*` slots with different timestamps
- Slots with `active = false` (broken connections)
- Slots with NULL `active_pid` (no process connected)

### Step 3: Clean Up Broken Replication Slots

**WARNING**: Only do this if Step 1 confirmed your data exists!

```sql
-- Drop all Zero replication slots
-- This will force Zero to create a fresh slot on next connection
DO $$
DECLARE
  slot_rec RECORD;
BEGIN
  FOR slot_rec IN
    SELECT slot_name
    FROM pg_replication_slots
    WHERE slot_name LIKE 'zero_%'
  LOOP
    EXECUTE format('SELECT pg_drop_replication_slot(%L)', slot_rec.slot_name);
    RAISE NOTICE 'Dropped slot: %', slot_rec.slot_name;
  END LOOP;
END $$;
```

**Alternative** (if the above fails, drop slots one by one):

```sql
-- List all zero slots first
SELECT slot_name FROM pg_replication_slots WHERE slot_name LIKE 'zero_%';

-- Then drop each one manually (replace slot_name with actual name)
SELECT pg_drop_replication_slot('zero_0_1763245318300');
SELECT pg_drop_replication_slot('zero_0_1763338192465');
-- ... repeat for each slot
```

### Step 4: Verify wal_level is Still Logical

```sql
SHOW wal_level;
```

**Expected**: Should return `logical`

If it returns `replica` or `minimal`, you need to reset it:

```sql
ALTER SYSTEM SET wal_level = logical;
```

Then restart the PostgreSQL service in Railway (Settings → Restart Database).

### Step 5: Restart Zero-Cache on Railway

1. Go to Railway dashboard → Your project
2. Find the `zero-cache` service
3. Click on it → Deployments tab
4. Click "Redeploy" on the latest deployment

**OR** trigger a new deployment:

```bash
# In your local repo
git commit --allow-empty -m "Restart zero-cache"
git push
```

This forces Railway to restart the zero-cache service, which will:
1. Connect to PostgreSQL
2. Create a fresh replication slot
3. Start syncing changes again

### Step 6: Clear Client-Side Cache

In your browser on the production site:

1. Open DevTools (F12)
2. Go to Application tab
3. Storage → IndexedDB
4. Delete all Zero databases (usually named like `zero-*`)
5. Storage → Local Storage
6. Clear all entries for your site
7. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Step 7: Verify Sync is Working

1. Sign in to production site
2. Create a new test vineyard or vintage
3. Open another browser/device and sign in
4. Verify the new data appears on both devices
5. If it works, your sync is restored!

## Troubleshooting

### If Data Doesn't Exist in Step 1

Data was actually deleted. Possible causes:
- Manual deletion in database console
- Migration bug (unlikely - we checked all migrations)
- Database rollback/restore

**Recovery**: No automatic backup exists. Need to recreate data manually.

### If Dropping Replication Slots Fails

Error: "replication slot is active"

```sql
-- Find the process using the slot
SELECT active_pid FROM pg_replication_slots WHERE slot_name = 'zero_0_xxx';

-- Terminate the process (replace PID with actual number)
SELECT pg_terminate_backend(12345);

-- Now try dropping the slot again
SELECT pg_drop_replication_slot('zero_0_xxx');
```

### If Zero Still Won't Connect After Restart

Check Zero-Cache logs in Railway:

1. Railway dashboard → zero-cache service → Logs
2. Look for connection errors
3. Common issues:
   - `ZERO_UPSTREAM_DB` environment variable incorrect
   - PostgreSQL not allowing connections
   - Network/firewall issues

### If Sync Starts Working But Old Data Missing

This means:
1. Data WAS deleted from database
2. Zero sync is now working for NEW data only

**Solution**: Re-enter historical data manually or restore from a backup if available.

## Prevention

### Add Database Backups

1. Railway dashboard → PostgreSQL service
2. Enable automated backups (if available in your plan)
3. Or set up manual backup cron job

### Monitor Replication Health

Add to your backend health check:

```sql
-- Query to monitor replication lag
SELECT
  slot_name,
  active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as replication_lag
FROM pg_replication_slots
WHERE slot_name LIKE 'zero_%';
```

If `replication_lag` grows beyond 100MB, investigate immediately.

### Update Zero Version

Current version: `@rocicorp/zero@0.24.2025101500`

Check for updates:
```bash
yarn upgrade @rocicorp/zero --latest
```

Newer versions may have bug fixes for replication issues.

## How to Connect to Railway PostgreSQL

### Method 1: Railway Web Console (Easiest)

1. Railway dashboard → PostgreSQL service
2. Click "Data" tab
3. Use the built-in SQL editor

### Method 2: Local psql Client

1. Railway dashboard → PostgreSQL service → Variables
2. Copy `DATABASE_URL`
3. In terminal:

```bash
psql "postgresql://user:password@host:port/database"
```

### Method 3: TablePlus or pgAdmin

1. Get connection details from Railway Variables:
   - Host
   - Port
   - Database
   - Username
   - Password
2. Create new connection in your GUI tool

## Timeline for Recovery

1. **Step 1-2**: 5 minutes (verify data and check slots)
2. **Step 3**: 2 minutes (clean up slots)
3. **Step 4-5**: 5 minutes (restart services)
4. **Step 6-7**: 5 minutes (clear cache and test)

**Total**: ~20 minutes if everything goes smoothly

## Success Criteria

✅ Data visible in PostgreSQL (Step 1)
✅ Old replication slots dropped (Step 3)
✅ Zero-cache restarted successfully (Step 5)
✅ New data syncs between devices (Step 7)
✅ Historical data appears in UI

If all criteria met, issue is resolved.

## Next Steps After Recovery

1. Document what caused the initial replication failure
2. Set up monitoring for replication lag
3. Enable database backups
4. Consider updating Zero to latest version
5. Add health checks for replication slot status

---

**Created**: 2025-11-17
**Issue**: Production data loss due to Zero replication failure
**Status**: Recovery plan ready for execution
