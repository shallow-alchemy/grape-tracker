# Next Steps: Fixing Zero Vine Sync Issue

## Current Problem

**Symptoms:**
- Vines can be inserted into PostgreSQL `gilbert.vine` table ✅
- zero-cache server starts successfully ✅
- schema.js exists (compiled from schema.ts) ✅
- No errors in zero-cache or browser console ✅
- **BUT**: Vines don't appear in the UI vineyard list ❌

## What We Know

1. **Database is correct:**
   - PostgreSQL running with `wal_level = logical`
   - Database `gilbert` exists
   - Table `vine` exists with correct schema
   - Can manually insert vines with SQL

2. **Zero setup appears correct:**
   - `.env` has correct connection string
   - `schema.ts` matches database structure
   - `schema.js` compiled from `schema.ts`
   - Permissions defined in schema.ts with `ANYONE_CAN`

3. **zero-cache output when started:**
   ```
   Loading permissions from schema.js
   Deploying permissions for --app-id "zero" to upstream@127.0.0.1
   Deployed new permissions (hash=3b7da92)
   ```
   This suggests permissions ARE being deployed, unlike earlier when we got "No schema found"

## Possible Causes to Investigate

### 1. Verify Zero is actually syncing the vine table

**Check in zero-cache logs:**
- Look for lines mentioning "vine" table in replication
- Should see something like: `Copying table public.vine` or `Synced X rows from vine`

**Test:**
```sql
-- Insert a test vine directly in PostgreSQL
INSERT INTO vine (id, block, "sequenceNumber", variety, "plantingDate", health, notes, "qrGenerated", "createdAt", "updatedAt")
VALUES ('TEST-001', 'A', 1, 'TEST', 1699999999999, 'GOOD', 'test', 0, 1699999999999, 1699999999999);
```

Watch zero-cache logs - does it pick up the change?

### 2. Check browser IndexedDB

Open Chrome DevTools → Application → IndexedDB
- Look for a Zero database
- Check if vine table/data exists there
- If data IS there but not rendering, it's a React/UI issue
- If data is NOT there, it's a sync issue

### 3. Verify schema.js exports are correct

Check that schema.js has proper exports:
```javascript
// schema.js should have:
export const schema = createSchema({ tables: [vineTable] });
export const permissions = definePermissions(...);
```

Both exports are required for Zero to work.

### 4. Check Zero query in App.tsx

The component should be using Zero's query API correctly:
```typescript
const [vinesData, setVinesData] = useState<any[]>([]);

useEffect(() => {
  if (!z) return;
  const loadVines = async () => {
    const result = await z.query.vine.run();
    setVinesData(result);
  };
  loadVines();
}, [z]);
```

Check:
- Is `z` (Zero instance) actually initialized?
- Is the useEffect running?
- Add console.log to see what `result` contains
- Is there a subscription needed instead of just a query?

### 5. Schema namespace issue

Check if Zero is looking for table in a different schema:
- Table is in `public.vine`
- But schema.ts just says `table('vine')`
- Does Zero need `table('public.vine')` or app_id prefix?

Check zero-cache logs for schema it's using - might be `zero_0.vine` vs `public.vine`

### 6. Authentication/Authorization

Even though permissions say `ANYONE_CAN`, verify:
- Is Clerk user authenticated properly?
- Does Zero instance have auth token?
- Check if Zero query is even reaching the server

### 7. Check replication slot

```sql
-- In psql gilbert
SELECT * FROM pg_replication_slots;
```

Should see a replication slot created by Zero. If not, replication isn't active.

## Debugging Steps (Priority Order)

1. **Add extensive logging to App.tsx:**
   ```typescript
   useEffect(() => {
     console.log('Zero instance:', z);
     if (!z) {
       console.log('Zero not initialized yet');
       return;
     }

     const loadVines = async () => {
       console.log('Loading vines...');
       try {
         const result = await z.query.vine.run();
         console.log('Vines loaded:', result);
         setVinesData(result);
       } catch (error) {
         console.error('Error loading vines:', error);
       }
     };
     loadVines();
   }, [z]);
   ```

2. **Check browser console** - what logs appear? What's the value of `result`?

3. **Check browser IndexedDB** - is data there?

4. **Check zero-cache logs** - is vine table being replicated?

5. **Try manual subscription instead of query:**
   ```typescript
   useEffect(() => {
     if (!z) return;

     const unsubscribe = z.query.vine.subscribe((vines) => {
       console.log('Vines subscription update:', vines);
       setVinesData(vines);
     });

     return () => unsubscribe();
   }, [z]);
   ```

6. **Verify schema.js matches schema.ts** - did tsc compile correctly?

7. **Nuclear option:** Clear everything and start fresh
   ```bash
   # Stop zero-cache
   rm -rf /tmp/sync-replica.db*
   rm -rf node_modules/.cache
   rm schema.js

   # Recompile
   npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler

   # Restart
   yarn zero-cache
   ```

## Alternative: Check if ElectricSQL Branch Works

The electricsql branch is reported as fully functional. Could switch to that branch to verify the vine tracking UI logic works correctly, then return to debug Zero specifically.

```bash
git stash
git checkout electricsql

# Follow docs/context.md ElectricSQL setup
# Test if vine creation and listing works there
# If yes, the UI logic is fine - it's definitely a Zero sync issue
```

## Reference Files

- `docs/context.md` - Full database setup instructions
- `docs/troubleshooting.md` - Common Zero issues
- `schema.ts` - Schema definition
- `src/App.tsx` - VineyardView component with Zero queries

## Environment Check

Before debugging, verify:
```bash
# PostgreSQL running
brew services list | grep postgresql
# Should show: started

# wal_level is logical
psql gilbert -c "SHOW wal_level;"
# Should show: logical

# vine table exists
psql gilbert -c "\dt"
# Should show: vine table

# schema.js exists
ls -la schema.js
# Should exist with recent timestamp

# .env is correct
cat .env
# Verify ZERO_UPSTREAM_DB points to gilbert
```

## Success Criteria

You'll know it's fixed when:
1. Insert a vine via UI
2. Vine appears in vineyard list immediately
3. Refresh page - vine still shows
4. Check PostgreSQL - vine is in database
5. Check browser IndexedDB - vine data is there

---

**Last Updated:** Nov 7, 2025
**Current Status:** Zero starts but vines don't sync to UI
**Next Claude Session:** Start here and work through debugging steps above
