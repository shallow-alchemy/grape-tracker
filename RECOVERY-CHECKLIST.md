# Production Data Recovery Checklist

Quick reference for executing the recovery plan. Check off each step as you complete it.

---

## Prerequisites

- [ ] Railway account access
- [ ] Access to Railway PostgreSQL console
- [ ] Production site URL ready
- [ ] Browser DevTools knowledge (F12)

**Estimated Time**: 20 minutes

---

## Step 1: Verify Data Exists (5 min)

**Where**: Railway Dashboard → PostgreSQL Service → Data Tab

**Query to run**:
```sql
SELECT id, name, location, created_at
FROM vineyard
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result**: See your vineyard records with dates

- [ ] Data exists in `vineyard` table
- [ ] Data exists in `vintage` table (if applicable)
- [ ] Data exists in `wine` table (if applicable)

**If NO data found**: ⚠️ STOP - Data was actually deleted. See alternative recovery options.

**If data found**: ✅ Proceed to Step 2

---

## Step 2: Check Replication Slots (2 min)

**Where**: Railway PostgreSQL → Data Tab

**Query to run**:
```sql
SELECT slot_name, active, active_pid
FROM pg_replication_slots
WHERE slot_name LIKE 'zero_%';
```

**What to look for**:
- Multiple slots with names like `zero_0_1763245318300`
- Slots with `active = false`
- Slots with `active_pid = NULL`

**Record findings**:
- [ ] Number of Zero slots found: _______
- [ ] Any active slots? (Yes/No): _______

---

## Step 3: Drop Broken Replication Slots (2 min)

**Where**: Railway PostgreSQL → Data Tab

**⚠️ WARNING**: Only proceed if Step 1 confirmed data exists!

**Query to run**:
```sql
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
```

- [ ] Query executed successfully
- [ ] All Zero slots dropped (verify with Step 2 query)

**If fails with "slot is active" error**:
- [ ] Find active PID: `SELECT active_pid FROM pg_replication_slots WHERE active = true;`
- [ ] Terminate process: `SELECT pg_terminate_backend(PID);`
- [ ] Wait 10 seconds
- [ ] Retry drop query

---

## Step 4: Verify Configuration (1 min)

**Where**: Railway PostgreSQL → Data Tab

**Query to run**:
```sql
SHOW wal_level;
```

**Expected**: Should return `logical`

- [ ] wal_level is `logical`

**If not logical**:
- [ ] Run: `ALTER SYSTEM SET wal_level = logical;`
- [ ] Railway Dashboard → PostgreSQL → Settings → Restart Database
- [ ] Wait 2 minutes
- [ ] Verify again: `SHOW wal_level;`

---

## Step 5: Restart Zero-Cache Service (3 min)

**Where**: Railway Dashboard → Zero-Cache Service

**Option A - Redeploy**:
- [ ] Click on zero-cache service
- [ ] Go to Deployments tab
- [ ] Click "Redeploy" on latest deployment
- [ ] Wait for deployment to complete (watch logs)

**Option B - Git Push**:
```bash
git commit --allow-empty -m "Restart zero-cache"
git push
```
- [ ] Push committed
- [ ] Railway detects push
- [ ] Deployment started
- [ ] Deployment completed

**Verify in logs**:
- [ ] Zero-cache started successfully
- [ ] Connected to PostgreSQL
- [ ] Created new replication slot
- [ ] No connection errors

---

## Step 6: Clear Client-Side Cache (5 min)

**Where**: Production site in browser

1. Open production site
2. Open DevTools (F12)
3. Go to Application tab

**Clear IndexedDB**:
- [ ] Storage → IndexedDB
- [ ] Find databases starting with `zero-`
- [ ] Right-click each → Delete
- [ ] Confirm deletion

**Clear Local Storage**:
- [ ] Storage → Local Storage
- [ ] Click on your site URL
- [ ] Right-click → Clear
- [ ] Confirm deletion

**Clear Session Storage** (optional):
- [ ] Storage → Session Storage
- [ ] Click on your site URL
- [ ] Right-click → Clear

**Hard Refresh**:
- [ ] Mac: Cmd + Shift + R
- [ ] Windows: Ctrl + Shift + R
- [ ] Or: Ctrl + F5

---

## Step 7: Verify Recovery (5 min)

**Test 1 - See Existing Data**:
- [ ] Sign in to production site
- [ ] Navigate to vineyard/winery section
- [ ] Can you see your old data?

**Test 2 - Create New Data**:
- [ ] Create a new vineyard or vintage
- [ ] Data saves successfully
- [ ] No errors in console

**Test 3 - Multi-Device Sync**:
- [ ] Open site in second browser/device
- [ ] Sign in with same account
- [ ] Create data on Device 1
- [ ] Wait 5 seconds
- [ ] Verify data appears on Device 2

**Test 4 - Check Console**:
- [ ] No errors in browser console
- [ ] No "Failed to connect" messages
- [ ] No "replication failed" messages

---

## Success Criteria

All of these should be ✅:

- [ ] Data exists in PostgreSQL
- [ ] Broken replication slots removed
- [ ] Zero-cache restarted successfully
- [ ] Exactly ONE active replication slot
- [ ] Old data visible in UI
- [ ] New data syncs in real-time
- [ ] No console errors
- [ ] Multi-device sync working

**If all checked**: 🎉 Recovery successful!

**If any unchecked**: Review specific step, check logs, see troubleshooting in RECOVERY-PLAN.md

---

## Post-Recovery Tasks

- [ ] Document when issue started (check logs)
- [ ] Enable Railway database backups
- [ ] Add replication monitoring query to backend
- [ ] Update Zero to latest version
- [ ] Test backup/restore procedure
- [ ] Create ticket for recurring monitoring

---

## Rollback Plan

If recovery makes things worse (unlikely):

1. **Stop Zero-cache service**:
   - Railway → zero-cache → Settings → Pause

2. **Verify data still in database**:
   - Run Step 1 queries again
   - Confirm nothing deleted

3. **Restore replication slots** (if you have slot names):
   - Can't restore automatically
   - Need to restart from scratch

4. **Clear browser cache again**:
   - Might have partial/corrupted data

5. **Ask for help**:
   - Zero community Discord
   - Railway support
   - Open GitHub issue

---

## Emergency Contacts

- **Zero Discord**: https://discord.gg/zero
- **Railway Support**: help@railway.app
- **Zero GitHub Issues**: https://github.com/rocicorp/zero/issues

---

**Created**: November 17, 2025
**Last Updated**: November 17, 2025
**Version**: 1.0
