# Partial Data Loss Analysis

**Status**: Some data exists, but recent additions are missing
**Updated**: November 17, 2025

---

## What This Tells Us

**Good news**: Database wasn't completely wiped
**Bad news**: Recent data was lost, suggesting one of these scenarios:

1. **Replication broke mid-session** (Most likely - 60%)
2. **Database rollback/restore** (Possible - 30%)
3. **Optimistic updates never synced** (Less likely - 10%)

---

## Immediate Investigation Steps

### Step 1: Find the Data Cutoff Point

Run these queries in Railway PostgreSQL to find when data stops:

```sql
-- Find most recent records across all tables
SELECT 'vineyard' as table_name, MAX(created_at) as last_record, COUNT(*) as total_records
FROM vineyard
UNION ALL
SELECT 'vintage', MAX(created_at), COUNT(*) FROM vintage
UNION ALL
SELECT 'wine', MAX(created_at), COUNT(*) FROM wine
UNION ALL
SELECT 'task', MAX(created_at), COUNT(*) FROM task
UNION ALL
SELECT 'measurement', MAX(created_at), COUNT(*) FROM measurement;
```

**What to look for**:
- Note the timestamp of the most recent record
- Compare to when you last added data
- Calculate the gap

```sql
-- Convert timestamp to readable date (most recent vineyard)
SELECT
  id,
  name,
  created_at,
  to_timestamp(created_at / 1000) as created_date
FROM vineyard
ORDER BY created_at DESC
LIMIT 5;

-- Same for vintage
SELECT
  id,
  vintage_year,
  variety,
  created_at,
  to_timestamp(created_at / 1000) as created_date
FROM vintage
ORDER BY created_at DESC
LIMIT 5;

-- Same for wine
SELECT
  id,
  name,
  wine_type,
  created_at,
  to_timestamp(created_at / 1000) as created_date
FROM wine
ORDER BY created_at DESC
LIMIT 5;
```

**Record your findings**:
- Last record in database: _________________ (date/time)
- When you last added data: _________________ (date/time)
- Gap: _________________ (hours/days)

---

## Step 2: Check Railway Event History

**Where**: Railway Dashboard → Project → Activity Tab

**Look for**:
- [ ] Any "Database restored" events
- [ ] Any "Service restarted" events
- [ ] Any "Rollback" events
- [ ] Any maintenance windows

**If you find a restore/rollback**:
- Note the timestamp
- Compare to data cutoff point
- This explains the data loss (Railway restored to earlier state)

---

## Step 3: Check Zero-Cache Logs

**Where**: Railway Dashboard → zero-cache service → Logs

**Search for** (use log search/filter):
- "replication" errors
- "failed to sync"
- "connection lost"
- "slot" errors

**Find the first error**:
- Note the timestamp
- Compare to data cutoff point
- This shows when sync broke

**Example log search**:
```
Filter logs by keyword: error
```

Look for patterns like:
```
[timestamp] ERROR invalid standby message type "f"
[timestamp] ERROR failed to connect to replication slot
[timestamp] WARN replication lag exceeding threshold
```

---

## Scenario Analysis

### Scenario A: Replication Broke During Your Session (Most Likely)

**What happened**:
1. You were adding vineyard data to production
2. First few records synced successfully to PostgreSQL
3. Replication broke mid-session (network issue, Zero bug, etc.)
4. Subsequent records went to browser IndexedDB only
5. Zero showed them in UI (optimistic updates)
6. But never confirmed sync to server
7. You closed browser thinking data was saved
8. Later, browser cache was cleared (or expired)
9. IndexedDB data lost, only PostgreSQL data remains

**How to verify**:
- [ ] Check Zero logs - error timestamp matches data cutoff
- [ ] No Railway restore events in that timeframe
- [ ] You don't remember seeing sync errors

**Recovery potential**: ❌ Lost data cannot be recovered
- Was only in browser IndexedDB
- Never made it to PostgreSQL
- No server-side backup

**Prevention**:
- Add visible sync status indicator
- Show error if write fails
- Retry failed syncs
- Periodic sync health check

---

### Scenario B: Railway Database Restore (Possible)

**What happened**:
1. You added all your data successfully
2. Data synced to PostgreSQL correctly
3. Railway had an issue (crash, corruption, etc.)
4. Railway automatically restored database from backup
5. Backup was from earlier point in time
6. Recent data lost in restore

**How to verify**:
- [ ] Railway Activity shows restore event
- [ ] Restore timestamp matches data cutoff
- [ ] All data after that point is missing (not just some)

**Recovery potential**: ⚠️ Maybe, if Railway has backups
- Contact Railway support
- Ask about backup/restore history
- They may have more recent backup

**Prevention**:
- Enable manual backups
- Export critical data regularly
- Monitor Railway status

---

### Scenario C: Optimistic Updates Never Synced (Less Likely)

**What happened**:
1. You added data while offline or during network issues
2. Zero did optimistic updates (showed in UI)
3. Sync queue built up in IndexedDB
4. Network never recovered before you closed browser
5. Sync queue lost when cache cleared

**How to verify**:
- [ ] You remember being on spotty network
- [ ] Zero logs show "offline" or "reconnecting" at that time
- [ ] No actual errors, just network unavailability

**Recovery potential**: ❌ Cannot recover
- Data never left the browser
- No server-side copy exists

**Prevention**:
- Show "offline" indicator clearly
- Persist sync queue more reliably
- Retry on reconnect
- Warning before closing with pending syncs

---

## What Data Can You Recover?

### From PostgreSQL ✅

All data currently in the database is safe and can be recovered by:
1. Completing the original recovery plan (fix replication)
2. Clear browser cache
3. Fresh sync from PostgreSQL

### From Browser IndexedDB ❌

If you still have a browser session open that hasn't been refreshed:
- **DO NOT refresh or close that browser tab!**
- Open DevTools → Application → IndexedDB
- Export the Zero databases to JSON
- We can manually insert that data to PostgreSQL

But if you already:
- Closed all browser tabs
- Cleared cache
- Hard refreshed

Then browser data is gone forever.

### From Railway Backups ⚠️

If Railway has backups and the data was in PostgreSQL:
- Contact Railway support
- Provide the timestamp of missing data
- Ask if they can recover from point-in-time backup
- May require paid plan for point-in-time recovery

---

## Recommended Next Steps

### 1. Document What's Missing

Create a list:
- What data do you remember adding?
- When did you add it?
- How much data (rough estimate)?

Example:
```
Missing data:
- 2024 Cabernet Sauvignon vintage (harvest date: Oct 15)
- Fermentation start: Oct 20
- 3 measurements (dates: Oct 22, Oct 25, Oct 28)
- 2 tasks created
- etc.
```

### 2. Check If You Have Browser Session Still Open

- Any other devices logged in?
- Any browser windows you didn't close?
- Any mobile devices with the app open?

If yes:
1. **DO NOT refresh or close!**
2. Export IndexedDB data immediately
3. We can recover from that

### 3. Contact Railway Support (Optional)

If data was valuable and you think it made it to PostgreSQL:

**Email**: support@railway.app

**Subject**: "Request for point-in-time database recovery"

**Body**:
```
Project: [your project name]
Service: PostgreSQL
Database: gilbert

I need to recover data that was present at [timestamp] but is now missing.

Current latest record: [timestamp from Step 1]
Missing data timeframe: [start] to [end]

Was there a database restore or rollback on [date]?
Do you have backups from [timestamp]?

Can you help me recover this data?
```

### 4. Complete Original Recovery Plan

Even though recent data is missing, you should still:
1. Fix the replication issue (so it doesn't happen again)
2. Recover the data that DOES exist in PostgreSQL
3. Prevent future data loss

Follow `RECOVERY-PLAN.md` steps 2-7.

### 5. Re-enter Missing Data

Unfortunately, if:
- Data never made it to PostgreSQL
- No browser session has it in IndexedDB
- Railway has no backups

Then you'll need to manually re-enter the missing data.

---

## Updated Recovery Priority

**Phase 1**: Investigate (do these NOW)
- [ ] Run Step 1 queries (find data cutoff timestamp)
- [ ] Check Railway Activity for restore events
- [ ] Check Zero logs for first error timestamp
- [ ] Check if any browser sessions still open

**Phase 2**: Attempt Recovery
- [ ] If browser session open → export IndexedDB
- [ ] If Railway restore → contact support
- [ ] Document missing data

**Phase 3**: Fix Replication (prevent recurrence)
- [ ] Complete original recovery plan steps 2-7
- [ ] Get existing data syncing again
- [ ] Add sync monitoring

**Phase 4**: Rebuild
- [ ] Re-enter missing data manually
- [ ] Implement backup strategy
- [ ] Add sync status indicators

---

## Key Questions to Answer

Please run the queries above and tell me:

1. **What's the timestamp of your most recent database record?**
   (From Step 1 queries)

2. **When did you last add data?**
   (Your memory of when you were working)

3. **What does Railway Activity show?**
   (Any restore/rollback events?)

4. **What do Zero logs show?**
   (First error timestamp?)

5. **Do you have any browser sessions still open?**
   (Any chance to export IndexedDB?)

With these answers, I can give you a more specific recovery strategy.

---

## Bottom Line

- ✅ Data in PostgreSQL can be recovered
- ❌ Data that never synced to PostgreSQL is likely lost
- ⚠️ Railway might have backups (contact support)
- 🔧 Fix replication so this doesn't happen again
- 📝 Document and re-enter missing data as needed

The good news: You haven't lost EVERYTHING, and we can prevent this from happening again.
