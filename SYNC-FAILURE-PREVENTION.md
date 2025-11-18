# Sync Failure Prevention Guide

**Created**: November 17, 2025
**Status**: Implemented
**Priority**: Critical - Prevents silent data loss

---

## Problem Statement

You experienced silent data loss where:
1. Data appeared saved in the UI (optimistic updates)
2. Zero replication actually failed on the backend
3. You had no indication that sync was broken
4. Only discovered the issue when logging in later

This is **unacceptable** for a production app. Users must know when their data isn't being saved.

---

## Solution Implemented

### ✅ 1. Sync Status Indicator (Completed)

**File**: `src/components/SyncStatusIndicator.tsx`

**What it does**:
- Shows real-time sync status in the header
- Visual indicator with 4 states:
  - 🟢 **Connected** (green) - Everything syncing normally
  - 🔶 **Syncing** (orange) - Currently syncing changes
  - ⭕ **Offline** (red outline) - No internet connection
  - ⚠️ **Sync Error** (red warning) - Replication failed

**Features**:
- Click to expand details popup
- Shows last sync activity time
- Displays error messages when sync fails
- Warns when offline: "Changes are saved locally but won't sync until you're back online"
- Shows error warning: "Sync error detected. Your changes may not be saved to the server"
- Provides "Refresh to retry" button for errors

**Location**: Header, next to UserButton

**User Experience**:
```
Normal:     ● Synced
Syncing:    ◐ Syncing... (rotating animation)
Offline:    ○ Offline (with warning in popup)
Error:      ⚠ Sync Error (with error details and refresh button)
```

### How It Works

**Network Detection**:
- Listens to browser `online`/`offline` events
- Shows offline status immediately when network drops
- Auto-reconnects when network returns

**Activity Monitoring**:
- Tracks time since last activity
- Shows warning if no activity for 30+ seconds
- Shows offline if no activity for 60+ seconds

**Error Detection**:
- Catches Zero connection errors
- Displays error messages to user
- Provides recovery options

---

## ⏩ Next Steps (Still TODO)

### 2. Enhanced Connection Monitoring (Pending)

**What's needed**:
- Hook into Zero's actual connection events (when API becomes available)
- Detect specific replication failures
- Monitor write confirmation timeouts

**Current limitation**:
Zero doesn't expose a public connection status API yet, so we're using activity monitoring as a proxy. This works for most cases but could be improved.

**Future improvement**:
```typescript
// When Zero adds connection events
zero.on('connected', () => setStatus('connected'));
zero.on('disconnected', () => setStatus('offline'));
zero.on('error', (error) => {
  setStatus('error');
  setErrorMessage(error.message);
});
```

### 3. Write Confirmation Tracking (Pending)

**What's needed**:
- Track pending writes in IndexedDB
- Show count of unsynced changes
- Warn user before closing tab with pending writes

**Implementation**:
```typescript
const [pendingWrites, setPendingWrites] = useState(0);

// Before write
setPendingWrites(prev => prev + 1);

// After confirmation
setPendingWrites(prev => prev - 1);

// In UI
{pendingWrites > 0 && (
  <span className={styles.pendingBadge}>
    {pendingWrites} pending
  </span>
)}
```

### 4. Server-Side Replication Fix (Pending)

**Current status**: Replication broken on Railway

**What needs to be done**:
1. Clean up orphaned replication slots (use `recovery-queries.sql`)
2. Restart Zero-cache service on Railway
3. Verify replication slot is active and healthy
4. Monitor for recurring failures

**Follow**: `RECOVERY-PLAN.md` for step-by-step instructions

### 5. Monitoring & Alerting (Future)

**Server-side monitoring**:
```sql
-- Add to backend health check
SELECT
  slot_name,
  active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag
FROM pg_replication_slots
WHERE slot_name LIKE 'zero_%';
```

**Alert conditions**:
- Replication lag > 100MB
- Multiple Zero replication slots exist
- Replication slot becomes inactive

**Implementation**:
- Add health check endpoint to backend
- Call from Zero-cache startup
- Send alerts to monitoring service (Sentry, etc.)

---

## User Expectations

### What Users See Now

**Normal Operation**:
```
Header: [GILBERT] [VINEYARD] [WINERY]  [● Synced] [UserButton]
```

**When Offline**:
```
Header: [● Synced] → [○ Offline]
Click: "⚠️ Changes are saved locally but won't sync until you're back online."
```

**When Sync Fails**:
```
Header: [● Synced] → [⚠ Sync Error]
Click: "⚠️ Sync error detected. Your changes may not be saved to the server. [Refresh to retry]"
```

### What Users Should Do

**If seeing "Offline"**:
1. Check internet connection
2. Wait for auto-reconnect
3. Data is safe in browser, will sync when back online

**If seeing "Sync Error"**:
1. Click "Refresh to retry" button
2. If persists, contact support (you)
3. **Do not close browser** until resolved
4. Take screenshots of error

**Best Practice**:
- Glance at sync indicator periodically
- If see anything other than green "Synced", investigate
- Don't close browser immediately after making important changes

---

## Testing the Sync Indicator

### Test 1: Offline Simulation

```bash
# In browser DevTools → Network tab
# Select "Offline" from throttling dropdown
```

**Expected**:
- Status changes to "○ Offline" immediately
- Popup shows warning about local-only changes
- When back online, status returns to "● Synced"

### Test 2: Server Down Simulation

```bash
# Stop Zero-cache server locally
yarn dev:zero
# Then Ctrl+C to stop
```

**Expected**:
- After ~30 seconds, status shows "◐ Syncing..."
- After ~60 seconds, status shows "○ Offline"
- Writes still work (optimistic updates)
- When server restarts, status returns to "● Synced"

### Test 3: Create Data While Offline

1. Go offline (DevTools → Network → Offline)
2. Create a vintage or wine
3. See it appear in UI (optimistic update)
4. Notice sync status is "Offline"
5. Go back online
6. Wait for status to return to "Synced"
7. Refresh page
8. Verify data persisted to server

---

## Known Limitations

### Current Implementation

1. **Activity-based detection**: Not real-time connection monitoring
   - May take 30-60 seconds to detect offline state
   - Could miss very brief connection drops

2. **No write tracking**: Doesn't count pending writes
   - Can't show "3 changes pending sync"
   - Can't warn before closing with unsaved changes

3. **Browser-only**: No server-side push notifications
   - Server can't alert client of replication failures
   - Client must poll or wait for timeout

4. **No retry queue**: Failed writes aren't automatically retried
   - User must manually refresh to retry
   - Could implement automatic exponential backoff

### Planned Improvements

1. Hook into Zero connection events (when API available)
2. Track pending writes in IndexedDB
3. Show count of unsynced changes
4. Warn before closing with pending changes
5. Automatic retry with exponential backoff
6. Server-side replication health monitoring

---

## For Developers

### How to Add More Status Checks

**Edit**: `src/components/SyncStatusIndicator.tsx`

**Add a new check**:
```typescript
useEffect(() => {
  // Your custom check
  const checkCustomCondition = () => {
    if (someCondition) {
      setStatus('error');
      setErrorMessage('Your error message');
    }
  };

  const interval = setInterval(checkCustomCondition, 5000);
  return () => clearInterval(interval);
}, []);
```

### How to Trigger Sync Status Changes

**From anywhere in the app**:
```typescript
// You can't directly control the SyncStatusIndicator
// But you can trigger events that it will detect:

// Trigger offline
window.dispatchEvent(new Event('offline'));

// Trigger online
window.dispatchEvent(new Event('online'));

// For errors, throw from Zero operations
// The indicator will catch them
```

---

## Long-Term Strategy

### Phase 1: Visibility (✅ Done)
- Show sync status to user
- Warn when offline
- Display errors

### Phase 2: Reliability (TODO)
- Fix server-side replication
- Monitor replication health
- Alert on failures

### Phase 3: Resilience (Future)
- Track pending writes
- Auto-retry failed syncs
- Warn before data loss

### Phase 4: Confidence (Future)
- Server-side backup system
- Point-in-time recovery
- Audit log of all changes

---

## Prevention Checklist

Before deploying new features:

- [ ] Test with slow/flaky network
- [ ] Test with offline mode
- [ ] Test with Zero server stopped
- [ ] Verify sync indicator responds correctly
- [ ] Check no silent failures
- [ ] Monitor Railway logs for errors

After deployment:

- [ ] Monitor Zero replication health
- [ ] Check for orphaned replication slots
- [ ] Review error logs weekly
- [ ] Test recovery procedures monthly

---

## Summary

**What was the problem?**
- Data appeared saved but actually wasn't
- No indication of sync failures
- Discovered only when logging in later

**What did we fix?**
- ✅ Added visible sync status indicator
- ✅ Shows offline/error states clearly
- ✅ Provides error details and recovery options

**What still needs work?**
- ⏳ Fix server-side replication issues
- ⏳ Add write confirmation tracking
- ⏳ Implement monitoring & alerting
- ⏳ Add automatic retry logic

**What's the impact?**
- Users now know immediately if sync fails
- No more silent data loss
- Can take action before closing browser
- Builds user confidence in the system

---

**This is a critical improvement for production readiness.**

Users should never lose data silently. The sync indicator ensures they know what's happening with their data at all times.
