# Gilbert - Local Development Setup

> **Purpose**: This document explains how to run Gilbert locally on your machine. Follow these instructions to set up PostgreSQL, Zero/Electric, and the dev servers.

## Prerequisites

- **Node.js**: v18 or higher
- **Yarn**: Package manager (NOT npm)
- **PostgreSQL**: v14 or higher (Homebrew recommended for macOS)
- **Docker**: Required for electricsql branch only

## Branch-Specific Setup

**IMPORTANT**: Gilbert has two branches with different sync engines. Check which branch you're on before starting:

```bash
git branch --show-current
```

- **main**: Uses Rocicorp Zero with local PostgreSQL
- **electricsql**: Uses ElectricSQL with Docker PostgreSQL

## Setup: Main Branch (Rocicorp Zero)

### 1. Install PostgreSQL (Homebrew)

```bash
# Install PostgreSQL 15
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify it's running
psql postgres -c "SELECT version();"
```

### 2. Configure PostgreSQL for Zero

Zero requires `wal_level=logical` for logical replication.

```bash
# Connect to postgres database
psql postgres

# In psql, run these commands:
CREATE DATABASE gilbert;

# Enable logical replication (REQUIRED)
ALTER SYSTEM SET wal_level = logical;

# Exit psql
\q

# MUST restart PostgreSQL for wal_level change to take effect
brew services restart postgresql@15

# Verify setting (should show "logical")
psql postgres -c "SHOW wal_level;"
```

**Expected output**: `wal_level | logical`

If it still shows `replica`, PostgreSQL didn't restart properly:
```bash
# Force kill and restart
pkill -9 postgres
brew services start postgresql@15
```

### 3. Create Vine Table

```bash
# Connect to gilbert database
psql gilbert

# Create table
CREATE TABLE IF NOT EXISTS vine (
  id TEXT PRIMARY KEY,
  block TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  variety TEXT NOT NULL,
  "plantingDate" BIGINT NOT NULL,
  health TEXT NOT NULL,
  notes TEXT NOT NULL,
  "qrGenerated" BIGINT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vine_block ON vine(block);
CREATE INDEX IF NOT EXISTS idx_vine_variety ON vine(variety);

# Verify table exists
\dt
\d vine

# Exit psql
\q
```

### 4. Install Dependencies

```bash
cd /path/to/grape-tracker
yarn install
```

### 5. Configure Environment Variables

Create `.env` file in project root:

```bash
ZERO_UPSTREAM_DB="postgresql://mattpardini@127.0.0.1:5432/gilbert"
ZERO_REPLICA_FILE="/tmp/sync-replica.db"
ZERO_AUTH_SECRET="dev-secret-key-change-in-production"
PUBLIC_ZERO_SERVER="http://localhost:4848"
PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dGVhY2hpbmctY2FsZi00My5jbGVyay5hY2NvdW50cy5kZXYk"
```

**Note**: Replace `mattpardini` with your macOS username (Homebrew default PostgreSQL user)

### 6. Compile Zero Schema

Zero requires `schema.js` but codebase uses TypeScript:

```bash
npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler
```

**Must recompile after any `schema.ts` changes!**

### 7. Start Development Servers

**Terminal 1: zero-cache**
```bash
# Clean caches first (recommended)
rm -rf /tmp/sync-replica.db* node_modules/.cache

# Start zero-cache
yarn zero-cache
```

Wait for: `Zero cache server started on port 4848`

**Terminal 2: Frontend dev server**
```bash
yarn dev
```

Wait for: `Local: http://localhost:3000`

### 8. Verify Setup

Open http://localhost:3000 in browser:
1. Sign in with Clerk
2. Navigate to Vineyard page
3. Create a test vine
4. Verify it appears in UI

Check PostgreSQL:
```bash
psql gilbert -c "SELECT * FROM vine;"
```

Should see your test vine.

## Setup: electricsql Branch (ElectricSQL)

### 1. Install Docker

Download and install Docker Desktop from https://www.docker.com/products/docker-desktop

### 2. Install Dependencies

```bash
cd /path/to/grape-tracker
git checkout electricsql
yarn install
```

### 3. Configure Environment Variables

Create `.env` file in project root:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:54321/electric"
PUBLIC_ELECTRIC_URL="http://localhost:3002"
PUBLIC_API_URL="http://localhost:3001"
PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dGVhY2hpbmctY2FsZi00My5jbGVyay5hY2NvdW50cy5kZXYk"
```

### 4. Start Docker Services

```bash
# Start PostgreSQL and Electric
docker-compose up -d

# Wait for services to initialize
sleep 5

# Verify services running
docker-compose ps
```

Expected output:
- `grape-tracker-postgres-1` - Up on port 54321
- `grape-tracker-electric-1` - Up on port 3002

### 5. Run Database Migration

```bash
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric < migrations/001_create_vine_table.sql
```

### 6. Start Development Servers

**Terminal 1: Backend API**
```bash
yarn api
```

Wait for: `Server running on port 3001`

**Terminal 2: Frontend dev server**
```bash
yarn dev
```

Wait for: `Local: http://localhost:3000`

### 7. Verify Setup

Open http://localhost:3000 in browser:
1. Sign in with Clerk
2. Navigate to Vineyard page
3. Create a test vine
4. Verify it appears in UI

Check PostgreSQL:
```bash
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric -c "SELECT * FROM vine;"
```

Should see your test vine.

## Common Issues & Solutions

### Zero (Main Branch)

**Issue**: `wal_level must be set to 'logical'`

**Solution**:
```bash
# PostgreSQL didn't restart properly
brew services restart postgresql@15

# Or force restart
pkill -9 postgres
brew services start postgresql@15

# Verify
psql postgres -c "SHOW wal_level;"
```

---

**Issue**: `Warning: No schema found`

**Solution**:
```bash
# schema.js doesn't exist - compile from TypeScript
npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler

# Restart zero-cache
yarn zero-cache
```

---

**Issue**: Vines not syncing to UI

**Solution**:
```bash
# Permissions not deployed - ensure schema.js exists
ls schema.js

# Clean caches and restart
rm -rf /tmp/sync-replica.db* node_modules/.cache
yarn zero-cache
```

---

**Issue**: `ECONNREFUSED` when connecting to PostgreSQL

**Solution**:
```bash
# PostgreSQL not running
brew services start postgresql@15

# Or check if it's on different port
lsof -i :5432
```

### Electric (electricsql Branch)

**Issue**: `Missing required request headers`

**Solution**:
```bash
# Electric service not running or wrong port
docker-compose ps

# If not running, start it
docker-compose up -d

# Verify PUBLIC_ELECTRIC_URL in .env
cat .env | grep ELECTRIC_URL
```

---

**Issue**: Port conflicts (3000, 3002, 54321)

**Solution**:
```bash
# Find what's using the port
lsof -i :3000
lsof -i :3002
lsof -i :54321

# Kill the process
kill -9 <PID>

# Or change ports in docker-compose.yml and .env
```

---

**Issue**: `Table "vine" does not exist`

**Solution**:
```bash
# Migration not run or wrong schema
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric < migrations/001_create_vine_table.sql

# Verify table in public schema
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric -c "\dt public.*"
```

---

**Issue**: `BigInt conversion error`

**Solution**:
```javascript
// PostgreSQL BIGINT returns as JavaScript BigInt
// Must convert before using in Date constructor

// ❌ Bad
new Date(row.createdAt)  // Error if createdAt is BigInt

// ✅ Good
new Date(Number(row.createdAt))
```

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run specific test file
yarn test VineyardView.test.tsx
```

## Building for Production

```bash
# Build frontend
yarn build

# Output in dist/ directory
ls dist/
```

## Cleaning Up

### Zero (Main Branch)

```bash
# Stop PostgreSQL
brew services stop postgresql@15

# Clean Zero cache
rm -rf /tmp/sync-replica.db* node_modules/.cache

# Drop database (if needed)
psql postgres -c "DROP DATABASE gilbert;"
```

### Electric (electricsql Branch)

```bash
# Stop Docker services
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v

# Remove Docker images
docker-compose down --rmi all
```

## Development Workflow

### Adding a New Feature

1. Check current branch: `git branch --show-current`
2. Start dev servers (see above)
3. Make changes in `src/`
4. Hot reload updates browser automatically
5. Test in browser
6. Commit changes

### Modifying Database Schema

**Zero (Main Branch)**:
```bash
# 1. Edit schema.ts
vim schema.ts

# 2. Recompile to schema.js
npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler

# 3. Clean caches
rm -rf /tmp/sync-replica.db* node_modules/.cache

# 4. Restart zero-cache
yarn zero-cache
```

**Electric (electricsql Branch)**:
```bash
# 1. Create migration file
touch migrations/002_my_migration.sql

# 2. Write SQL
vim migrations/002_my_migration.sql

# 3. Run migration
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric < migrations/002_my_migration.sql

# 4. Restart Electric
docker-compose restart electric
```

## Port Reference

| Service | Port | Branch |
|---------|------|--------|
| Frontend (Rsbuild) | 3000 | Both |
| Backend API | 3001 | Electric only |
| Electric Sync | 3002 | Electric only |
| zero-cache | 4848 | Zero only |
| PostgreSQL (local) | 5432 | Zero only |
| PostgreSQL (Docker) | 54321 | Electric only |

## Environment Variables Reference

### Zero (Main Branch)
```bash
ZERO_UPSTREAM_DB="postgresql://user@host:5432/gilbert"
ZERO_REPLICA_FILE="/tmp/sync-replica.db"
ZERO_AUTH_SECRET="dev-secret-key-change-in-production"
PUBLIC_ZERO_SERVER="http://localhost:4848"
PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

### Electric (electricsql Branch)
```bash
DATABASE_URL="postgresql://postgres:password@localhost:54321/electric"
PUBLIC_ELECTRIC_URL="http://localhost:3002"
PUBLIC_API_URL="http://localhost:3001"
PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

## Useful Commands

```bash
# PostgreSQL
psql gilbert                          # Connect to gilbert database
psql gilbert -c "SELECT * FROM vine;" # Run query
brew services restart postgresql@15    # Restart PostgreSQL

# Docker
docker-compose ps                     # Show running services
docker-compose logs electric          # View Electric logs
docker-compose logs postgres          # View PostgreSQL logs
docker exec -it grape-tracker-postgres-1 psql -U postgres -d electric  # Connect to PostgreSQL

# Development
yarn dev                              # Start frontend
yarn api                              # Start backend (Electric only)
yarn zero-cache                       # Start zero-cache (Zero only)
yarn test                             # Run tests
yarn build                            # Build for production

# Cleanup
rm -rf /tmp/sync-replica.db*         # Clean Zero cache
rm -rf node_modules/.cache            # Clean build cache
lsof -i :3000                         # Check what's using port 3000
kill -9 <PID>                         # Kill process by PID
```

## Related Documentation

- **System Architecture**: See `../02-architecture/system-architecture.md` for how services connect
- **Database Schema**: See `../02-architecture/database-schema.md` for table definitions
- **Engineering Principles**: See `../engineering-principles.md` for code standards
