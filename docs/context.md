# Gilbert - Project Context

## Project Overview

**Gilbert** is a mobile-first grape tracking application with an 80s hacker terminal aesthetic. It helps vineyard workers and grape growers track their operations, view weather conditions, manage tasks, and scan QR codes for grape tracking.

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Rsbuild
- **Routing**: Wouter (minimal router, ~1.5kb)
- **Authentication**: Clerk
- **Data Sync**: Rocicorp Zero
- **Backend**: Rust/Axum server on Railway
- **Database**: PostgreSQL on Railway with logical replication
- **UI Components**: React Aria Components
- **QR Scanning**: react-qr-reader (v3.0.0-beta-1)
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
- **Library**: react-qr-reader v3.0.0-beta-1
- **Component**: `QRScanner` - Fullscreen QR code scanner
- **Features**:
  - Fullscreen camera view with back camera on mobile (`facingMode: 'environment'`)
  - Green corner bracket overlay for targeting guidance
  - Automatic QR code detection (scans 10x per second)
  - Handles both full vine URLs and vine IDs
  - Navigates to `/vineyard/vine/:id` on successful scan
  - Error handling for camera permissions and device issues
  - Close button (✕) to exit scanner
- **Video Settings**: 1280x720 resolution, 100ms scan delay
- **Known Issue**: QR code recognition is slower than native camera apps

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
