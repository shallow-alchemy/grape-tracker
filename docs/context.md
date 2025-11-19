# Gilbert - Project Context

## Project Overview

**Gilbert** is a mobile-first grape tracking application with an 80s hacker terminal aesthetic. It helps vineyard workers and grape growers track their operations, view weather conditions, manage tasks, and scan QR codes for grape tracking.

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Rsbuild
- **Testing**: rstest (Rspack-based testing framework)
- **Routing**: Wouter (minimal router, ~1.5kb)
- **Authentication**: Clerk
- **Data Sync**: Rocicorp Zero
- **Backend**: Rust/Axum server on Railway
- **Database**: PostgreSQL on Railway with logical replication
- **UI Components**: React Aria Components
- **QR Scanning**: qr-scanner v1.4.2 (nimiq)
- **Weather API**: Open-Meteo (free, open-source, government weather models)
- **Location API**: Nominatim/OpenStreetMap (reverse geocoding for city/state display)
- **Icons**: react-icons (GiGrapes for sign-in, wi for weather icons)
- **Styling**: CSS Modules with CSS custom properties

## Theme System

### Design Philosophy
- **80s Hacker Terminal**: Faded black backgrounds, muted greens, monospace fonts
- **Mobile-First**: Primary platform is mobile, desktop is secondary
- **Subtle Effects**: Glows, shadows, and terminal aesthetics without overwhelming
- **Accessibility**: High contrast, large touch targets (44px minimum)

### Theme Implementation
- **Source**: `docs/theme.json` contains all design tokens
- **Variables**: Hardcoded in `src/index.css` as CSS custom properties
- **Colors**: Faded black (#1a1c1a), muted greens (#3a7a3a, #65a165)
- **Typography**: Monospace exclusively (Monaco, SF Mono, Menlo)
- **Spacing**: Consistent scale from xs to 5xl

### Key Theme Tokens
- `--color-background`: #1a1c1a (faded black)
- `--color-primary-600`: #3a7a3a (primary green)
- `--color-text-accent`: #65a165 (bright green)
- `--font-body`: SF Mono, Monaco, Inconsolata
- `--spacing-*`: Consistent spacing scale

## Architecture & Engineering Standards

### Code Style (from engineering-principles.md)
1. **Fat arrow functions**: All functions use `const myFunc = () => {}`
2. **Named exports**: Use `export const` instead of `export default`
3. **Monolithic files**: Keep related components in single file, only split at 500-600 lines
4. **CSS Modules only**: All styling via CSS Modules with theme tokens
5. **No comments**: Code should be self-explanatory
6. **Minimal changes**: Only modify what's explicitly requested
7. **Component data fetching**: Components fetch their own data using hooks instead of prop drilling

### File Structure
```
src/
├── App.tsx              # Main app with WeatherSection, QRScanButton, App components
├── App.module.css       # Dashboard styles
├── index.tsx            # Entry point with auth routing
├── index.module.css     # Sign-in page styles
├── index.css            # Global styles + CSS variables
└── global.d.ts          # Type definitions

docs/
├── engineering-principles.md  # Code standards
├── theme.md                   # Theme design philosophy
├── theme.json                 # Design tokens
└── context.md                 # This file
```

## Routing Structure

- `/` - Dashboard/Home (weather + task overview)
- `/vineyard` - Vineyard management page (placeholder)
- `/winery` - Winery management page (placeholder)
- Navigation via wouter `<Link>` components
- "GILBERT" title in header links back to home

## Backend Architecture

### Services Deployed on Railway

```
┌─────────────────────────────────────────────────┐
│ Railway Project (Production)                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  PostgreSQL (wal_level=logical)                │
│      ↑           ↑                              │
│      │           │                              │
│  zero-cache   axum-backend                     │
│   (port 4848)  (port 3001)                     │
│      ↑           ↑                              │
└──────┼───────────┼──────────────────────────────┘
       │           │
   ┌───┴───────────┴────┐
   │   Netlify Frontend │
   │   - Zero sync      │
   │   - Clerk auth     │
   └────────────────────┘
```

**Service Responsibilities:**
1. **PostgreSQL**: Source of truth for all data, logical replication enabled
2. **zero-cache**: Real-time sync server, broadcasts changes to all connected clients
3. **axum-backend**: Runs database migrations, provides REST APIs for server-side operations (weather, etc.)
4. **Frontend**: React app, connects to both zero-cache (sync) and backend (APIs)

**Why Zero Needs `wal_level=logical`:**
- PostgreSQL has 3 wal_level settings: `minimal`, `replica`, `logical`
- **`replica`** logs physical changes (disk bytes) - cannot decode what changed
- **`logical`** logs semantic changes (INSERT/UPDATE/DELETE with table/column/value data)
- Zero uses **logical replication slots** to stream decoded changes in real-time
- Without logical level, Zero cannot understand what changed to broadcast to clients
- Performance impact: <1% CPU, ~3-5% larger WAL files (negligible for most workloads)

**Backend API vs Zero:**
- **Zero handles**: All CRUD operations on domain data (vines, vintages, wines, tasks, measurements)
- **Backend handles**: Server-side logic (weather API, migrations, future: emails, reports, analytics)
- Frontend connects to both services simultaneously

## Current Features

### Sign-In Page (`index.tsx`)
- "GILBERT" title with terminal styling and green glow
- Themed "SIGN IN" button using Clerk modal
- Large purple grape icon (GiGrapes, 4rem) below button
- Full 80s terminal aesthetic with faded black background

### Mobile Layout (`App.tsx`)

**Header (all routes):**
- "GILBERT" title (clickable, returns to home)
- Navigation: "VINEYARD" | "WINERY" links
- UserButton (Clerk)

**Dashboard View (/):**

1. **Weather Warnings** (single item, conditional with `.hidden` class):
   - Enhanced visual: 2px orange border, elevated background, orange glow shadow
   - Shows ONLY the next critical warning
   - Example: "FROST WARNING: NOV 15-17"

2. **What's Next** (single item):
   - Standard styling with green border
   - Shows ONLY the next task
   - Terminal-style `>` prompt
   - Text truncates with ellipsis if too long
   - Example: "> HARVEST GRAPES BEFORE NOV 20"

3. **Current Weather**:
   - Large temperature display (72°F)
   - Condition and location
   - Green accent colors

4. **10-Day Forecast**:
   - 5x2 grid of daily forecasts
   - Day label + temperature
   - Compact design
   - **Location indicator** (desktop only): Shows city/state from reverse geocoding (e.g., "SANDY, UTAH")
     - Positioned after temp toggle button
     - Right-aligned, nowrap, can overflow for long names
     - Hidden on mobile to save space

5. **QR Scan Button** (bottom 33.33vh):
   - Large green button optimized for thumb reach
   - Fixed at bottom, always visible
   - Opens fullscreen QR scanner on click
   - Scans vine QR codes to navigate to vine details

**Mobile Layout Behavior:**
- Full viewport height with no page scrolling
- Weather section scrolls independently
- QR button fixed at bottom (flex-shrink: 0)
- Consistent 32px spacing from nav to first box (warnings or what's next)

### Desktop Layout (768px+)

Desktop uses a priority-first vertical scrolling layout with 1400px max-width app canvas.

**Weather Section (top, no flex):**
1. **Weather Warnings** - Full width banner (auto height, conditionally hidden)
2. **What's Next** - Full width banner (auto height, single item)
3. **Forecast + Today's Weather** - Full width, larger section:
   - Left: Today's weather card (200px, green accent border, elevated)
   - Right: 10-day forecast in horizontal row (10 columns)

**Desktop Dashboard (bottom, 2x2 grid, 400px min-height):**

**Row 1:**
- **Recent Activity** - Timestamped scan/update feed
- **Vine Status** - 3-column grid stats (Active/Harvested/Pending)

**Row 2:**
- **Supplies Needed** - Task-driven supply list with "VIEW INVENTORY" link
  - Supply name + reason (linked to upcoming tasks)
  - Example: "YEAST (RED STAR)" for "HARVEST - NOV 20"
- **Task Management** - Expanded todo list with checkboxes and dates

**Desktop-Specific Behaviors:**
- Current Weather hidden (shown in forecast section as "Today")
- QR Scan button hidden
- Page scrolls vertically (not constrained to viewport)
- Generous spacing: 32px gaps, 40px padding
- All panels have overflow-y: auto for long content

**Desktop Spacing:**
- Section gaps: `var(--spacing-3xl)` (32px)
- Outer padding: `var(--spacing-4xl)` (40px)
- First visible box always 32px from nav (using `:first-child` margin-top)

## Key Components

### `App.tsx` Exports (all use fat arrow + named exports)
- `WeatherSection`: Main weather display with warnings, what's next, current, forecast
- `QRScanButton`: Large bottom button for QR scanning (mobile only)
- `RecentActivity`: Desktop panel - activity feed
- `VineStatus`: Desktop panel - vine statistics grid
- `SuppliesNeeded`: Desktop panel - task-driven supply checklist
- `TaskManagement`: Desktop panel - detailed todo list with checkboxes
- `DesktopDashboard`: Container for 2x2 desktop panel grid
- `DashboardView`: Main dashboard view combining weather + desktop panels + QR scanner
- `VineyardView`: Placeholder for vineyard page
- `WineryView`: Placeholder for winery page
- `App`: Root app component with routing and auth

### `QRScanner.tsx` (`src/components/QRScanner.tsx`)
- **Library**: html5-qrcode v2.3.8
- **Component**: `QRScanner` - Fullscreen QR code scanner
- **Features**:
  - Fullscreen camera view with back camera on mobile (`facingMode: 'environment'`)
  - Green corner bracket overlay for targeting guidance
  - Automatic QR code detection (10 FPS)
  - 250x250px scan box for focused detection
  - Handles both full vine URLs and vine IDs
  - Navigates to `/vineyard/vine/:id` on successful scan
  - Error handling for camera permissions and device issues
  - Close button (✕) to exit scanner
  - Proper scanner cleanup on unmount
- **Configuration**: 10 FPS, 250x250px qrbox
- **Status**: ✅ Working reliably on mobile

## Authentication Flow

1. Unauthenticated: Show sign-in page with themed button
2. Authenticated: Show dashboard with weather + QR button
3. Clerk handles all auth logic via modal

## Data Layer

- **Zero instance**: Created in App component but not yet utilized
- **Schema**: Defined in `schema.ts` at root
- Future: Will sync grape tracking data

## Styling Patterns

### CSS Module Usage
```css
/* Always use theme tokens */
.element {
  background: var(--color-surface);
  color: var(--color-text-primary);
  padding: var(--spacing-lg);
  font-family: var(--font-body);
}
```

### Terminal Aesthetic
- Uppercase text with letter spacing
- Subtle glows on interactive elements
- Monospace fonts throughout
- Muted green accents
- Faded borders and backgrounds

## Development Roadmap

See **`docs/roadmap.md`** for the complete development roadmap.

**Current Status (as of Nov 9, 2025):**
Phase 1 (Core Vine Management) is **complete**! All vine and block management features are fully functional.

**Current Priority:**
Phase 2: QR Code → STL conversion for 3D printable vine tags

**Completed Features:**
1. ✅ Vine creation with validation and batch support (quantity field)
2. ✅ Block management system (create/edit/delete blocks with vine migration)
3. ✅ Real-time sync with PostgreSQL via Zero
4. ✅ Self-contained component architecture with minimal prop drilling

**Upcoming Features:**
1. QR code → STL conversion for 3D printable vine tags
2. QR code scanning functionality
3. Weather API integration
4. Enhanced grape tracking features

## Important Notes

- **Theme is hardcoded**: CSS variables manually defined in index.css
- **Mock data**: All weather/task data is placeholder
- **Mobile-first**: Design optimized for smartphone use
- **Single file components**: Related components kept together per engineering principles
- **No over-engineering**: Minimal implementation, features added only when needed

## Database Setup & Sync Engines

### Two Branch Strategy

**Main Branch**: Uses Rocicorp Zero with local PostgreSQL
**electricsql Branch**: Uses ElectricSQL with Docker PostgreSQL + backend API

### Zero Setup (Main Branch)

**Required Services:**
1. PostgreSQL (Homebrew, local installation)
2. zero-cache server (port 4848)
3. Rsbuild dev server (port 3000)

**PostgreSQL Configuration:**
- Database: `gilbert`
- User: `mattpardini` (Homebrew default)
- Port: 5432 (standard)
- Required setting: `wal_level = logical` (for logical replication)

**Environment Variables (.env):**
```
ZERO_UPSTREAM_DB="postgresql://mattpardini@127.0.0.1:5432/gilbert"
ZERO_REPLICA_FILE="/tmp/sync-replica.db"
ZERO_AUTH_SECRET="dev-secret-key-change-in-production"
PUBLIC_ZERO_SERVER="http://localhost:4848"
PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dGVhY2hpbmctY2FsZi00My5jbGVyay5hY2NvdW50cy5kZXYk"
```

**Critical PostgreSQL Setup:**
```sql
-- In psql, connect to postgres first
CREATE DATABASE gilbert;

-- Enable logical replication (REQUIRED for Zero)
ALTER SYSTEM SET wal_level = logical;

-- Must restart PostgreSQL after this change
-- brew services restart postgresql@15

-- Verify setting took effect
SHOW wal_level;  -- Must show "logical"

-- Create vine table
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
```

**Schema Compilation:**
Zero requires `schema.js` but codebase has `schema.ts`. Must compile before starting zero-cache:
```bash
npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler
```

**Starting Zero (correct order):**
```bash
# Terminal 1: Start PostgreSQL
brew services start postgresql@15

# Terminal 2: Clean caches and start zero-cache
rm -rf /tmp/sync-replica.db* node_modules/.cache
yarn zero-cache

# Terminal 3: Start dev server
yarn dev
```

**Common Zero Issues:**
1. **"wal_level = replica" error**: PostgreSQL didn't restart properly after setting logical
   - Solution: `brew services restart postgresql@15` or `pkill -9 postgres` then restart
2. **"No schema found" warning**: schema.js doesn't exist
   - Solution: Compile schema.ts to schema.js with tsc
3. **Vines not syncing**: Permissions not deployed (no schema.js)
   - Solution: Ensure schema.js exists and restart zero-cache

### ElectricSQL Setup (electricsql Branch)

**Required Services:**
1. PostgreSQL (Docker, port 54321)
2. Electric sync service (Docker, port 3002)
3. Backend API server (Express, port 3001)
4. Rsbuild dev server (port 3000)

**Environment Variables (.env):**
```
DATABASE_URL="postgresql://postgres:password@localhost:54321/electric"
PUBLIC_ELECTRIC_URL="http://localhost:3002"
PUBLIC_API_URL="http://localhost:3001"
PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dGVhY2hpbmctY2FsZi00My5jbGVyay5hY2NvdW50cy5kZXYk"
```

**Docker Setup (docker-compose.yml):**
- PostgreSQL: Port 54321 (not 5432 to avoid conflict with local)
- Electric: Port 3002 (not 3000 to avoid conflict with Rsbuild)
- Both configured with logical replication

**Database Schema:**
Tables must be in `public` schema (not `zero_0`). Migration file: `migrations/001_create_vine_table.sql`

**Architecture:**
- **Reads**: Browser → Electric HTTP API → PostgreSQL (real-time sync)
- **Writes**: Browser → Backend API (Express) → PostgreSQL → Electric → All clients

**Starting ElectricSQL (correct order):**
```bash
# Start Docker services
docker-compose up -d

# Wait for services
sleep 5

# Run migration
docker exec -i grape-tracker-postgres-1 psql -U postgres -d electric < migrations/001_create_vine_table.sql

# Terminal 1: Start API server
yarn api

# Terminal 2: Start dev server
yarn dev
```

**Common Electric Issues:**
1. **Port conflicts**: Electric and Rsbuild both use 3000
   - Solution: Electric on 3002, Rsbuild on 3000
2. **Missing headers error**: Electric service not running or wrong port
   - Solution: Check `docker-compose ps`, verify Electric on correct port
3. **Table not found**: Migration not run or wrong schema
   - Solution: Run migration, ensure table in `public` schema
4. **BigInt conversion error**: PostgreSQL BIGINT returns as JavaScript BigInt
   - Solution: Convert with `Number(value)` before using in Date constructor

### Zero vs Electric Comparison

**Zero (Main Branch):**
- ✅ Simpler setup (no Docker, no backend API)
- ✅ Works with local PostgreSQL
- ✅ Built-in permissions system
- ❌ Requires schema.js compilation
- ❌ More finicky with PostgreSQL configuration
- ❌ Less documentation/smaller community

**Electric (electricsql Branch):**
- ✅ Modern HTTP-based sync
- ✅ Better documentation
- ✅ TypeScript support out of box
- ❌ Requires Docker setup
- ❌ Requires separate backend API for writes
- ❌ More complex architecture (3 services + DB)

### Current Status (as of Nov 2025)

**Main Branch (Zero):**
- PostgreSQL configured with wal_level=logical ✅
- gilbert database created ✅
- vine table created ✅
- schema.ts exists ✅
- schema.js compiled ✅
- zero-cache starts successfully ✅
- **ISSUE**: Vines not appearing in UI after insert - permissions may not be deployed correctly

**electricsql Branch:**
- Full stack working ✅
- Real-time sync functional ✅
- Writes through backend API working ✅
- Ready for testing

### Winery Database Schema

**Status**: Backend complete (Nov 13, 2025), frontend planning phase

**Core Concept**: Vintage (harvest) → Wine (finished product)

**Tables Created** (migrations: `20251113000001_create_winery_tables.sql`):

1. **vintage** - Harvest records
   - Tracks growing season from bud_break through harvest
   - Stages: `bud_break | flowering | fruiting | veraison | pre_harvest | harvest`
   - Fields: vintage_year, variety, block_ids (array), harvest_weight_lbs, harvest_volume_gallons, brix_at_harvest
   - One vintage per variety per year (unique constraint)

2. **wine** - Finished wine products made from vintages
   - Tracks winemaking process from crush through bottling
   - Stages: `crush | primary_fermentation | secondary_fermentation | racking | oaking | aging | bottling`
   - Fields: vintage_id (FK), **name (required)**, wine_type (red|white|rosé|dessert|sparkling), volume_gallons, current_volume_gallons, status
   - Multiple wines can be created from one vintage (e.g., red + rosé from same harvest)

3. **stage_history** - Tracks stage transitions for vintages and wines
   - Records when each stage started/completed
   - Fields: entity_type (vintage|wine), entity_id, stage, started_at, completed_at, skipped, notes

4. **task_template** - Configurable tasks per stage and wine type
   - Defines default tasks for each stage
   - Wine-type specific (red tasks ≠ white tasks ≠ rosé tasks)
   - Fields: stage, entity_type, wine_type, name, description, frequency, default_enabled, sort_order
   - Examples: "Punch cap" (2x daily for red primary fermentation), "Monitor temperature" (daily for white)

5. **task** - Actual task instances
   - Created from templates when user transitions to new stage
   - Supports ad-hoc tasks (task_template_id = null)
   - Fields: entity_type, entity_id, stage, name, due_date, completed_at, completed_by, notes, skipped

6. **measurement** - Chemistry and tasting measurements
   - Can be taken at any vintage or wine stage
   - Fields: entity_type, entity_id, date, stage, ph, ta (titratable acid), brix, temperature, tasting_notes, notes

7. **measurement_range** - Reference data for measurement validation
   - Defines ideal ranges and warnings for each wine type
   - Fields: wine_type, measurement_type, min_value, max_value, ideal_min, ideal_max, low_warning, high_warning
   - Seeded with ranges for red, white, rosé, dessert, sparkling wines

**Data Flow Example**:
```
Vintage: 2025 Cab Franc Harvest
  ├─ harvest_weight_lbs: 150
  ├─ harvest_volume_gallons: 12
  ├─ current_stage: harvest
  └─ Wines:
       ├─ Wine: "Lodi" (red, 8 gallons)
       │    ├─ current_stage: primary_fermentation
       │    ├─ Tasks: ["Inoculate yeast", "Punch cap 2x daily", "Measure pH/TA/Brix"]
       │    └─ Measurements: [pH: 3.4, TA: 6.2, Brix: 12]
       │
       └─ Wine: "Azure" (rosé, 4 gallons)
            ├─ current_stage: secondary_fermentation
            └─ Tasks: ["Monitor MLF progress"]
```

**Key Design Principles**:
- **Vintages track grapes**, wines track finished products
- **Wine names are required** to provide UI labels (can't just be "2025 Cab Franc Red")
- **Task templates are wine-type specific** because red ≠ white ≠ rosé processes
- **User confirms tasks** when transitioning stages (not auto-created)
- **All operations through Zero** - no backend APIs needed for winery features
- **Measurements validate in real-time** using measurement_range table

**Seed Data Provided**:
- Measurement ranges for all 5 wine types (pH, TA, Brix)
- ~40 default task templates across all vintage/wine stages
- Task templates for "default" vineyard (customizable per vineyard)

## Production Deployment & Sync Configuration

**Status**: ✅ Fully operational (Nov 18, 2025)

### Production Architecture

```
┌─────────────────────────────────────────────────┐
│ Netlify (Frontend)                              │
│ - React app (gilbertgrape.netlify.app)         │
│ - Connects to zero-cache via WebSocket         │
│ - Clerk authentication                          │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓ (WebSocket: wss://)
┌─────────────────────────────────────────────────┐
│ Railway: zero-cache Service                    │
│ - Docker (rocicorp/zero:latest)                │
│ - Port: 4848                                    │
│ - Auto-deploys permissions on startup          │
│ - Connects to PostgreSQL via internal network  │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓ (postgres.railway.internal)
┌─────────────────────────────────────────────────┐
│ Railway: PostgreSQL                             │
│ - wal_level=logical (for replication)          │
│ - Gilbert database with all tables             │
│ - zero.permissions table for access control    │
└─────────────────────────────────────────────────┘
```

### Critical Configuration Files

**1. Dockerfile (zero-cache deployment)**

Location: `/Dockerfile`

```dockerfile
# Use official Zero Docker image
FROM rocicorp/zero:latest

# Copy schema file
COPY schema.cjs /app/schema.cjs

# Set working directory
WORKDIR /app

# Zero runs on port 4848
EXPOSE 4848

# Deploy permissions and start zero-cache
CMD ["sh", "-c", "zero-deploy-permissions --schema-path /app/schema.cjs --upstream-db \"$ZERO_UPSTREAM_DB\" && zero-cache --schema-path /app/schema.cjs"]
```

**Key Points**:
- Uses official `rocicorp/zero:latest` image
- Copies `schema.cjs` (NOT schema.js or schema.ts)
- **Auto-deploys permissions** on every container startup
- Zero-cache auto-detects environment variables (no explicit flags needed except schema-path)
- Simple CMD - complexity caused deployment failures

**2. railway.json (Railway build configuration)**

Location: `/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**3. Railway Environment Variables (zero-cache service)**

Required variables:
- `ZERO_UPSTREAM_DB` = `${{Postgres.DATABASE_URL}}` (Railway variable reference)
- `ZERO_REPLICA_FILE` = `./sync-replica.db` (relative path in container)
- `ZERO_AUTH_SECRET` = (secure secret, same value NOT needed on frontend)
- `ZERO_ADMIN_PASSWORD` = (secure password for /statz endpoint)
- `PORT` = `4848` (optional, Railway auto-detects)

**IMPORTANT**:
- Frontend does NOT need `ZERO_AUTH_SECRET` or `auth` prop in ZeroProvider
- Only `PUBLIC_ZERO_SERVER` needed on frontend (Netlify)
- Auth is handled server-side by zero-cache

**4. Netlify Environment Variables**

Required:
- `PUBLIC_ZERO_SERVER` = `https://grape-tracker-production.up.railway.app`
- `PUBLIC_CLERK_PUBLISHABLE_KEY` = (Clerk key)

**NOT needed**:
- ~~`PUBLIC_ZERO_AUTH_SECRET`~~ - Authentication handled by zero-cache, not frontend

### Zero Permissions System

**Critical Concept**: Zero uses explicit permissions stored in `zero.permissions` table in PostgreSQL. Without permissions, reads work but **writes are silently ignored**.

**Permissions Deployment**:

1. **Automatic** (preferred): Dockerfile deploys on every Railway deployment
2. **Manual** (for testing):
   ```bash
   # Generate SQL file
   npx zero-deploy-permissions --schema-path schema.cjs --output-file permissions.sql --output-format sql

   # Apply via Railway CLI
   railway connect Postgres
   \i permissions.sql
   ```

**Verifying Permissions**:

```sql
-- Check how many tables have permissions
SELECT count(*)
FROM (
  SELECT jsonb_object_keys(permissions->'tables') as table_name
  FROM zero.permissions
) tables;
-- Should return 10 (all tables)

-- View all tables with permissions
SELECT jsonb_object_keys(permissions->'tables') as table_name
FROM zero.permissions;
```

**Permission Structure** (from schema.cjs):

All tables use `ANYONE_CAN` for all operations:
- `vineyard`, `block`, `vine` (vineyard management)
- `vintage`, `wine` (winery management)
- `stage_history` (vintage/wine stage tracking)
- `task_template`, `task` (task management)
- `measurement`, `measurement_range` (chemistry tracking)

```typescript
permissions = definePermissions(schema, () => ({
  vineyard: {
    row: {
      select: ANYONE_CAN,
      insert: ANYONE_CAN,
      update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN },
      delete: ANYONE_CAN,
    },
  },
  // ... repeated for all 10 tables
}));
```

### Sync Failure Prevention

**Problem Solved** (Nov 18, 2025):
User experienced silent data loss where:
1. Data appeared saved in UI (optimistic updates working)
2. Zero replication failed on backend (PostgreSQL issues)
3. No user feedback - appeared to work but didn't persist
4. Discovered hours later when logging back in

**Solution Implemented**: Sync Status Indicator

**File**: `src/components/SyncStatusIndicator.tsx`

**Features**:
- Real-time connection status in header (next to UserButton)
- 4 visual states:
  - 🟢 **Connected** (green) - "Synced" - normal operation
  - 🔶 **Syncing** (orange, rotating) - "Syncing..." - temporary state
  - ⭕ **Offline** (red outline) - "Offline" - no internet connection
  - ⚠️ **Error** (red warning) - "Sync Error" - replication failed
- Click to expand details popup showing:
  - Current status
  - Error messages (if any)
  - Warning messages for offline/error states
  - "Refresh to retry" button for errors
- Detects connection failures via:
  - Console.error interception (catches Zero WebSocket failures)
  - Network online/offline events
  - Zero object availability checks (every 5 seconds)

**How It Works**:

```typescript
// Intercept console.error to detect Zero failures
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (message.includes('Failed to connect') ||
      message.includes('WebSocket') ||
      message.includes('Connect timed out')) {
    setStatus('error');
    setErrorMessage('Zero sync server not responding. Changes may not be saved.');
  }
  originalConsoleError.apply(console, args);
};

// Listen for network events
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// Periodic connection check
const checkConnectionStatus = () => {
  if (zero) {
    if (status !== 'error') setStatus('connected');
  } else {
    setStatus('offline');
  }
};
setInterval(checkConnectionStatus, 5000);
```

**User Experience**:
- **Normal**: Green "● Synced" in header - no action needed
- **Offline**: Red "○ Offline" with warning popup - data saves locally, syncs when back online
- **Error**: Red "⚠ Sync Error" with error details - user can refresh or contact support
- **User can't lose data silently** - always know sync status

**Documentation**: See `SYNC-FAILURE-PREVENTION.md` for complete guide

### Common Production Issues & Solutions

**1. Zero-cache won't start / Deploy logs show only "Starting Container"**

**Symptom**: Railway deploy succeeds but zero-cache doesn't run, no logs appear

**Causes**:
- Complex CMD with shell scripts failing silently
- Missing environment variables
- Wrong root directory in Railway settings
- npm/yarn not available in container

**Solution**:
- Keep Dockerfile CMD simple - just run zero-cache with schema-path
- Use official rocicorp/zero Docker image (has zero-cache binary)
- Ensure Railway root directory is empty or `/` (not `/backend`)
- Let zero-cache auto-detect env vars instead of passing them explicitly

**2. Permissions not updating when schema changes**

**Symptom**: New tables added to schema.cjs but writes still fail

**Causes**:
- Permissions not deployed to PostgreSQL
- Old permissions in database don't match schema

**Solution**:
- Dockerfile now auto-deploys permissions on startup
- For manual deploy: `railway connect Postgres` then `\i permissions.sql`
- Verify with: `SELECT count(*) FROM (SELECT jsonb_object_keys(permissions->'tables')...`

**3. Frontend shows "AuthInvalidated: Failed to decode auth token"**

**Symptom**: WebSocket connection fails with JWT decode errors

**Cause**: Frontend trying to pass raw `ZERO_AUTH_SECRET` as auth token (incorrect)

**Solution**:
- Remove `auth` prop from ZeroProvider entirely
- Zero-cache handles authentication server-side
- Frontend only needs `PUBLIC_ZERO_SERVER` environment variable

**4. Data appears in UI but doesn't persist after refresh**

**Symptom**: Optimistic updates work, but data doesn't survive page reload

**Causes**:
- Zero-cache not running or crashing
- Permissions not configured for table
- Replication not working (wal_level not logical)

**Solution**:
1. Check zero-cache Railway logs for errors
2. Verify permissions: `SELECT * FROM zero.permissions`
3. Check replication status: `SELECT * FROM pg_replication_slots WHERE slot_name LIKE 'zero_%'`
4. Ensure PostgreSQL has `wal_level = logical`

**5. WebSocket connections timeout (HTTP 499 errors)**

**Symptom**: Railway HTTP logs show `GET /sync/v37/connect 499` with 1-10s duration

**Causes**:
- Zero-cache not responding to connection requests
- Port not properly exposed
- Environment variables missing

**Solution**:
- Verify zero-cache is actually running (check deploy logs)
- Ensure `EXPOSE 4848` in Dockerfile
- Confirm all required env vars set in Railway
- Check zero-cache logs for startup errors

### Schema File Naming

**Critical**: Zero-cache expects CommonJS format

- ✅ `schema.cjs` - Use this in production (Dockerfile copies this)
- ✅ `schema.ts` - Source file (TypeScript)
- ❌ `schema.js` - Old file, deprecated
- ❌ Trying to use ES modules with Zero will fail

**Compilation** (if editing schema.ts):
```bash
# Build schema.cjs from schema.ts
npx tsc schema.ts --module commonjs --target es2020
```

### Deployment Checklist

**Before deploying schema changes**:
- [ ] Update `schema.ts` with new tables/fields
- [ ] Add permissions for new tables in `definePermissions` section
- [ ] Compile to `schema.cjs` if auto-build not working
- [ ] Commit both schema.ts and schema.cjs
- [ ] Push to GitHub (Railway auto-deploys)
- [ ] Verify zero-cache restarts successfully in Railway
- [ ] Check deploy logs for "Deploying permissions" message
- [ ] Test writes to new tables in production

**Monitoring zero-cache health**:
```bash
# Check if zero-cache is running
railway logs --service zero-cache

# Check PostgreSQL replication
railway connect Postgres
SELECT slot_name, active, restart_lsn FROM pg_replication_slots WHERE slot_name LIKE 'zero_%';

# Check permissions
SELECT count(*) FROM (SELECT jsonb_object_keys(permissions->'tables') FROM zero.permissions) t;
```

### Recovery Procedures

**If zero-cache is broken**:
1. Check Railway deploy logs for errors
2. Verify all environment variables are set
3. Simplify Dockerfile CMD if complex
4. Redeploy with `railway up`
5. Check PostgreSQL for orphaned replication slots

**If permissions are wrong**:
1. Generate fresh permissions.sql: `npx zero-deploy-permissions --schema-path schema.cjs --output-file permissions.sql`
2. Connect to Railway PostgreSQL: `railway connect Postgres`
3. Apply permissions: `\i permissions.sql`
4. Verify: `SELECT count(*) FROM (SELECT jsonb_object_keys(permissions->'tables')...`
5. Redeploy zero-cache to pick up changes

**If replication is broken**:
1. Check replication slots: `SELECT * FROM pg_replication_slots WHERE slot_name LIKE 'zero_%'`
2. Drop orphaned slots: `SELECT pg_drop_replication_slot('slot_name')`
3. Restart zero-cache service on Railway
4. New replication slot will be created automatically
5. Monitor logs for "Created replication slot" message

**Complete recovery guide**: See `RECOVERY-PLAN.md`

### Key Lessons Learned

1. **Keep Dockerfiles simple** - Complex shell scripts fail silently in containers
2. **Auto-deploy permissions** - Manual steps get forgotten during deployments
3. **Frontend doesn't need auth secrets** - Zero handles authentication server-side
4. **Use official Docker images** - rocicorp/zero:latest works better than custom Node setup
5. **Monitor sync status** - Silent failures are unacceptable in production
6. **Test with cleared storage** - Optimistic updates can hide sync failures
7. **Railway variable references work** - `${{Postgres.DATABASE_URL}}` is the correct syntax
8. **Permissions are required** - Zero blocks writes without explicit permissions, reads still work
9. **Schema.cjs not schema.js** - Zero-cache needs CommonJS format in production
10. **Root directory matters** - Railway needs to deploy from repo root, not `/backend`

## Getting Started for New Claude Instances

1. Read `docs/engineering-principles.md` - understand code standards
2. Read `docs/theme.md` - understand design philosophy
3. Review `docs/theme.json` - reference for all design tokens
4. Check `src/App.tsx` - see current component structure
5. **Check current git branch** - main (Zero) or electricsql (Electric)
6. Review database setup section above for current branch
7. All styling must use CSS variables from index.css
8. Follow fat arrow + named export patterns
9. Keep components in single files until they exceed 500-600 lines
10. Let components fetch their own data using hooks when possible
11. **Review Production Deployment section** - understand zero-cache config and sync status
12. **Check SYNC-FAILURE-PREVENTION.md** - understand sync monitoring and prevention measures
