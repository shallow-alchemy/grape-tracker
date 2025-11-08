# Gilbert - Troubleshooting Guide

## Zero Sync Engine Issues (Main Branch)

### Issue: "wal_level = replica" error when starting zero-cache

**Symptoms:**
```
Error: Postgres must be configured with "wal_level = logical" (currently: "replica")
```

**Root Cause:**
PostgreSQL's `wal_level` setting controls Write-Ahead Logging detail level. Zero requires `logical` level for replication, but Homebrew PostgreSQL defaults to `replica`.

**Solution:**
```bash
# 1. Set wal_level in PostgreSQL
psql postgres -c "ALTER SYSTEM SET wal_level = logical;"

# 2. CRITICAL: Must fully restart PostgreSQL
brew services restart postgresql@15

# 3. Verify the change took effect
psql postgres -c "SHOW wal_level;"
# Should output: logical
```

**If restart doesn't work:**
```bash
# Force kill all postgres processes
pkill -9 postgres

# Wait
sleep 2

# Start fresh
/opt/homebrew/opt/postgresql@15/bin/pg_ctl -D /opt/homebrew/var/postgresql@15 start

# Verify
psql postgres -c "SHOW wal_level;"
```

**Why ALTER SYSTEM might not work:**
- PostgreSQL caches settings and requires full restart
- `brew services restart` sometimes doesn't fully stop the process
- The setting is written to `postgresql.auto.conf` but not applied until restart

---

### Issue: "No schema found at schema.js" warning

**Symptoms:**
```
No schema found at schema.js, so could not deploy permissions.
Replicating data, but no tables will be syncable.
```

**Root Cause:**
Zero's `zero-cache-dev` command looks for `schema.js`, but the codebase uses TypeScript with `schema.ts`.

**Solution:**
```bash
# Compile TypeScript schema to JavaScript
npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler

# Verify schema.js was created
ls -la schema.js

# Restart zero-cache
# Ctrl+C to stop, then:
yarn zero-cache
```

**What this does:**
- Compiles TypeScript to JavaScript
- Preserves ES module syntax (needed for Zero)
- Creates `schema.js` that zero-cache can read

**Why this is needed:**
- Zero's permission system reads the schema file at startup
- Without permissions deployed, Zero replicates data but doesn't sync to clients
- This is why vines appear in PostgreSQL but not in the UI

---

### Issue: Vines inserted but not appearing in UI

**Symptoms:**
- Can insert vines into PostgreSQL via SQL
- Vines appear in `gilbert.vine` table
- UI shows empty list
- No sync errors in console

**Possible Causes:**

1. **Permissions not deployed** (most common)
   - Check zero-cache output for "No schema found" warning
   - Solution: Compile schema.ts to schema.js (see above)

2. **Wrong database connection**
   - Verify `.env` has correct `ZERO_UPSTREAM_DB`
   - Should be: `postgresql://mattpardini@127.0.0.1:5432/gilbert`
   - Restart zero-cache after .env changes

3. **Cached replica out of sync**
   ```bash
   # Clear Zero's replica cache
   rm -rf /tmp/sync-replica.db*
   rm -rf node_modules/.cache

   # Restart zero-cache
   yarn zero-cache
   ```

4. **Browser cache issues**
   - Clear IndexedDB in browser DevTools
   - Hard refresh (Cmd+Shift+R)
   - Check browser console for sync errors

5. **Schema mismatch**
   - Ensure `schema.ts` matches actual PostgreSQL table structure
   - Column names must match exactly (case-sensitive)
   - Data types must be compatible

---

### Issue: PostgreSQL connection refused

**Symptoms:**
```
connection to server on socket "/tmp/.s.PGSQL.5432" failed: No such file or directory
```

**Root Cause:**
PostgreSQL service isn't running.

**Solution:**
```bash
# Start PostgreSQL
brew services start postgresql@15

# Wait for it to start
sleep 3

# Verify it's running
brew services list | grep postgresql
# Should show: started (green)

# Test connection
psql postgres -c "SELECT version();"
```

---

## ElectricSQL Issues (electricsql Branch)

### Issue: "Missing headers" error (electric-offset, electric-handle, electric-schema)

**Symptoms:**
```
MissingHeadersError: The response for the shape request to http://localhost:3000/v1/shape?table=vine
didn't include the following required headers:
- electric-offset
- electric-handle
- electric-schema
```

**Root Causes:**

1. **Port conflict** (most common)
   - Both Rsbuild dev server AND Electric use port 3000
   - Browser hits Rsbuild instead of Electric

   **Solution:**
   ```bash
   # Edit docker-compose.yml
   # Change Electric port mapping to: 3002:3000

   # Update .env
   PUBLIC_ELECTRIC_URL="http://localhost:3002"

   # Restart services
   docker-compose down
   docker-compose up -d

   # Restart dev server to pick up new env
   ```

2. **Electric service not running**
   ```bash
   # Check if Electric is running
   docker-compose ps

   # Should see both postgres and electric with status "Up"

   # If electric is missing or crashed:
   docker-compose logs electric
   ```

3. **Electric missing ELECTRIC_INSECURE env var**
   ```bash
   # Check docker-compose.yml has:
   environment:
     ELECTRIC_INSECURE: true

   # Restart if added
   docker-compose down
   docker-compose up -d
   ```

---

### Issue: "Table does not exist" error from Electric

**Symptoms:**
```
HTTP Error 400: {"message":"Invalid request","errors":{"table":["Table \"public\".\"vine\" does not exist"]}}
```

**Root Cause:**
Migration wasn't run or table is in wrong schema.

**Solution:**
```bash
# 1. Check if table exists
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric -c "\dt"

# If table is missing:
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric < migrations/001_create_vine_table.sql

# Verify table created
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric -c "\dt"
# Should show: public | vine | table | postgres
```

---

### Issue: Backend API connection refused (port 3001)

**Symptoms:**
```
POST http://localhost:3001/api/vine net::ERR_CONNECTION_REFUSED
```

**Root Cause:**
Backend API server isn't running.

**Solution:**
```bash
# Terminal 1: Start API server
yarn api

# Should output:
# API server running on port 3001

# Terminal 2: Start dev server
yarn dev
```

**Why both are needed:**
- Electric only handles READS (syncing data to clients)
- Backend API handles WRITES (inserting/updating data)
- Flow: Browser → API → PostgreSQL → Electric → All clients

---

### Issue: BigInt conversion error

**Symptoms:**
```
Uncaught TypeError: Cannot convert a BigInt value to a number
at new Date (<anonymous>)
```

**Root Cause:**
PostgreSQL BIGINT columns return as JavaScript `BigInt` type, but `new Date()` expects `number`.

**Solution:**
```typescript
// Wrong:
plantingDate: new Date(vine.plantingDate)

// Correct:
plantingDate: new Date(Number(vine.plantingDate))
```

**Where to fix:**
In `App.tsx`, the `vinesData.map()` that transforms Electric data must convert all BIGINT fields:
```typescript
const vines = vinesData.map((vine: any) => ({
  plantingDate: new Date(Number(vine.plantingDate)),
  qrGenerated: Number(vine.qrGenerated) > 0,
  createdAt: Number(vine.createdAt),
  updatedAt: Number(vine.updatedAt),
}));
```

---

## General Issues

### Issue: Environment variables not updating

**Symptoms:**
Changed `.env` file but app still uses old values.

**Solution:**
Both Rsbuild and zero-cache only read `.env` at startup:

```bash
# Stop both servers (Ctrl+C)

# Restart zero-cache
yarn zero-cache

# Restart dev server
yarn dev
```

---

### Issue: Git SSH authentication failed

**Symptoms:**
```
Load key "/Users/mattpardini/.ssh/id_ed25519.pub": invalid format
Permission denied (publickey)
```

**Root Cause:**
SSH config pointing to public key (.pub) instead of private key.

**Solution:**
```bash
# Edit ~/.ssh/config
nano ~/.ssh/config

# Change:
IdentityFile ~/.ssh/id_ed25519.pub

# To:
IdentityFile ~/.ssh/id_ed25519

# Save and try again
git push
```

---

## Debugging Tips

### Check which services are running

```bash
# Homebrew PostgreSQL
brew services list | grep postgresql

# Docker services
docker-compose ps

# Ports in use
lsof -i :3000  # Rsbuild dev server
lsof -i :3001  # Backend API
lsof -i :3002  # Electric sync
lsof -i :4848  # Zero cache
lsof -i :5432  # PostgreSQL
```

### View logs

```bash
# Zero cache (already visible in terminal)

# Electric
docker-compose logs electric --tail 50

# PostgreSQL (Homebrew)
tail -f /opt/homebrew/var/log/postgresql@15.log

# PostgreSQL (Docker)
docker-compose logs postgres --tail 50

# Backend API (already visible in terminal)
```

### Reset everything (nuclear option)

**Zero (main branch):**
```bash
# Stop services
brew services stop postgresql@15
# Ctrl+C to stop zero-cache and dev server

# Clear all caches
rm -rf /tmp/sync-replica.db*
rm -rf node_modules/.cache

# Drop and recreate database
psql postgres -c "DROP DATABASE gilbert;"
psql postgres -c "CREATE DATABASE gilbert;"

# Recreate table (in psql gilbert)
# Run CREATE TABLE commands from docs/context.md

# Restart
brew services start postgresql@15
yarn zero-cache
yarn dev
```

**Electric (electricsql branch):**
```bash
# Stop everything
docker-compose down -v  # -v removes volumes
# Ctrl+C to stop API and dev servers

# Start fresh
docker-compose up -d
sleep 5
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric < migrations/001_create_vine_table.sql

# Restart servers
yarn api
yarn dev
```

---

## When to use which branch

**Use main (Zero) when:**
- Developing on your local machine
- Don't want Docker overhead
- Prototyping/experimenting
- Simpler deployment (just PostgreSQL)

**Use electricsql when:**
- Need proven sync technology
- Want better documentation
- Planning production deployment
- Need separation of concerns (backend API)

**Current recommendation:**
Development is currently on **main branch with Zero** until the vine sync issue is resolved. The **electricsql branch** is fully functional and ready as a backup.
