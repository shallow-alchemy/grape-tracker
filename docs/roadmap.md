# Gilbert - Development Roadmap

## Current Priority: QR Code Scanning

**Status:** 🔄 In Progress (as of Nov 11, 2025)

**Goal:** Implement QR code scanning to allow users to scan vine tags in the field

---

## Phase 1: Core Vine Management

### 1.1 Fix Vine Creation & Syncing
**Status:** ✅ Complete

**Completed Tasks:**
- ✅ Fixed Zero sync issue
- ✅ Vine creation form works end-to-end
- ✅ Vines appear in list immediately after creation
- ✅ Vines persist after page refresh
- ✅ Added loading states during creation
- ✅ Added error handling for failed inserts
- ✅ Refactored VineyardView from 1597 → 252 lines (84% reduction)
- ✅ Implemented self-contained modal pattern
- ✅ Components fetch their own data using hooks

**Success Criteria Met:**
- ✅ User can add a vine via UI
- ✅ Vine appears in vineyard list immediately
- ✅ Data persists in PostgreSQL
- ✅ No console errors

---

### 1.2 Improve Vine Creation Form
**Status:** ✅ Complete

**Completed Improvements:**
- ✅ Form validation (required fields, date validation)
- ✅ Better UX feedback (disable submit during save, show success message)
- ✅ Input sanitization (uppercase variety automatically)
- ✅ Default values (today's date, "GOOD" health)
- ✅ Field help text/placeholders
- ✅ Error messages for validation failures

---

### 1.3 Add Block Management
**Status:** ✅ Complete

**Completed Implementation:**
- ✅ Block creation, editing, and deletion
- ✅ Block filtering in vineyard view
- ✅ Foreign key relationship between vines and blocks
- ✅ Migration handling for block deletion (reassign or cascade)
- ✅ Dynamic block dropdown in vine forms

---

### 1.4 Add Quantity Field (Batch Vine Creation)
**Status:** ✅ Complete

**Completed Implementation:**
- ✅ Batch create up to 100 vines at once
- ✅ Sequential ID generation
- ✅ Success messages with vine count
- ✅ Error handling per vine

---

## Phase 2: QR Code & 3D Printable Tags

### 2.1 QR Code Generation
**Status:** ✅ Complete

**Current Implementation:**
- Frontend generates QR codes from vine URLs
- Library: `qrcode` npm package
- Can download as SVG
- Can download as 3D printable STL using `@jscad/modeling` and `@jscad/stl-serializer`
- Creates 50.8mm x 50.8mm x 2mm stake with raised QR code cubes
- Binary STL format ready for 3D printing

**Code Location:**
- `src/components/vine-stake-3d.ts` - 3D STL generation logic
- `src/components/VineDetailsView.tsx` - UI for generating and downloading tags

---

### 2.2 Backend Setup & Deployment
**Status:** ✅ Complete

**Goal:** Deploy minimal Axum backend to handle database migrations via sqlx

**Why Backend is Needed:**
- Professional migration system (sqlx-cli)
- Foundation for future backend jobs (weather API, analytics, etc.)
- Zero is excellent for sync, but we need a backend for migrations and server-side tasks

**Current Backend State:**
```
✅ Axum server with health endpoint
✅ SQLx database connection pool
✅ Automatic migration runner on startup
✅ CORS configured
✅ Clean, minimal codebase
```

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│ Railway Project                                 │
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
       │           │
   ┌───┴───────────┴────┐
   │   Netlify Frontend │
   │   - Zero sync      │
   │   - STL generation │
   └────────────────────┘
```

**Data Flow:**
- **Domain Data (vines, blocks, vineyards):** Frontend ↔ Zero ↔ PostgreSQL
- **STL Files:** Generated client-side in browser (no backend needed)
- **Future Jobs:** Frontend → Backend API (weather, analytics, etc.)

**Completed Tasks:**

- [x] **Railway Deployment**
  - Add backend service to Railway project
  - Configure environment variables
  - Set build/start commands
  - Test migrations run automatically
  - Verify health endpoint

- [x] **Netlify Frontend Deployment**
  - Connected frontend to Railway backend and zero-cache
  - Configured environment variables
  - Mobile layout optimized for scan button

---

### 2.3 QR Code Scanning
**Status:** ✅ Complete

**Goal:** Scan vine tags in the field to view/edit vine details

**Current Implementation:**
- Library: `qr-scanner` (nimiq) v1.4.2
- Fullscreen scanner with camera view
- Back camera on mobile (`preferredCamera: 'environment'`)
- Built-in scan region highlighting
- Handles both full vine URLs and vine IDs
- Error handling for permissions and device issues
- Mobile-only "SCAN TAG" button in vineyard header

**Code Location:**
- `src/components/QRScanner.tsx` - Scanner component
- `src/components/VineyardViewHeader.tsx` - Mobile scan button
- `src/components/VineyardView.tsx` - Scanner integration

**Completed Tasks:**
- [x] Research and choose QR scanning library
- [x] Install dependency
- [x] Implement camera permission handling
- [x] Create fullscreen scanner view component
- [x] Handle QR code detection and URL extraction
- [x] Navigate to vine details on successful scan
- [x] Add error states and user feedback
- [x] Switch to qr-scanner for better mobile performance
- [x] Fix race condition causing mobile crashes
- [x] Test on mobile devices - working reliably

---

## Phase 3: Additional Features

### 3.1 Weather API Integration
**Status:** ✅ Complete

**Goal:** Replace mock weather data with real API integration

**Current Implementation:**
- Backend: Axum `/weather` endpoint
- Weather API: Open-Meteo (free, no API key required)
- Location API: Nominatim/OpenStreetMap for reverse geocoding
- Frontend: Real-time weather display with user location
- Geolocation: Browser API with fallback to default location
- Data: Current temperature, conditions, 10-day forecast with highs/lows
- Toggle: Switch between high/low temperatures in forecast

**Code Location:**
- `backend/src/main.rs` - Weather endpoint with Open-Meteo & Nominatim integration
- `src/utils/weather.ts` - Weather fetching utility & icon mapping
- `src/App.tsx` - WeatherSection component with real data

**API Details:**
- Open-Meteo: 10,000 requests/day free tier, 16-day forecast
- Nominatim: Reverse geocoding for location names
- Environment variable: `PUBLIC_BACKEND_URL` (Rsbuild uses `PUBLIC_` prefix)

**Completed Tasks:**
- [x] Research weather API options (Open-Meteo vs OpenWeatherMap vs WeatherAPI)
- [x] Add backend weather endpoint with Open-Meteo integration
- [x] Add reverse geocoding with Nominatim for location names
- [x] Convert Celsius to Fahrenheit
- [x] Map WMO weather codes to conditions and icons
- [x] Refactor WeatherSection to use real data
- [x] Add geolocation support with fallback
- [x] Add loading and error states
- [x] Fix Rsbuild environment variable (PUBLIC_ prefix)
- [x] Test on desktop and mobile

---

### 3.2 Weather Alerts System
**Status:** 🔄 In Progress (as of Nov 12, 2025)

**Goal:** Create a dynamic, configurable alerts system starting with weather alerts

**Architecture:**
- Alert settings stored per vineyard in PostgreSQL (`alert_settings` table)
- Settings stored as JSONB for flexibility
- Alerts calculated on-demand when weather data is fetched (no stored weather data)
- Single endpoint returns both weather + calculated alerts

**Database Schema:**
```sql
CREATE TABLE alert_settings (
  vineyard_id TEXT PRIMARY KEY,
  settings JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);
```

**Alert Types (Phase 1 - Weather):**
1. Temperature alerts (high/low thresholds with days out)
2. Frost warnings (temp < 32°F)
3. Snow alerts (weather code 71-86)
4. Rain alerts (weather code 51-67)
5. Thunderstorm alerts (weather code 95-99)
6. Fog alerts (weather code 45-48)

**API Design:**
- `GET /weather?lat=X&lon=Y&vineyard_id=Z` - Returns weather + alerts
- `GET /alert-settings/:vineyard_id` - Fetch settings
- `POST /alert-settings/:vineyard_id` - Update settings

**Frontend Components:**
- Gear icon in weather panel (desktop) to open settings modal
- Alert settings modal with toggles and thresholds
- Dynamic "Alerts" component (replaces static "Weather Warnings")
- Settings persist across all users in vineyard

**Design Principles:**
- Decentralized UX: each feature can define its own alerts
- Settings accessible from relevant context (e.g., weather panel for weather alerts)
- General-purpose alert panel at top of dashboard

**Future Extensions:**
- Task alerts (deadline approaching)
- Vine health alerts (disease detection)
- Harvest alerts (optimal harvest window)

**Tasks:**
- [ ] Create alert_settings database migration
- [ ] Add backend endpoints for alert settings CRUD
- [ ] Implement alert calculation logic in /weather endpoint
- [ ] Update weather response type to include alerts array
- [ ] Reposition weather panel controls (gear icon + temp toggle)
- [ ] Create weather alert settings modal component
- [ ] Implement alert detection logic based on user settings
- [ ] Refactor "Weather Warnings" to dynamic "Alerts" component
- [ ] Test on desktop and mobile

---

### 3.3 Task Management
Real seasonal task tracking based on vineyard operations

### 3.4 Harvest Tracking
Record harvest dates, yields, quality metrics per vine

### 3.4 Photo Uploads
Add photos to vine records (disease tracking, growth progress)

### 3.5 Analytics Dashboard
Visualize vineyard data (health trends, variety distribution, etc.)

---

## Development Guidelines

**For each phase:**
1. Research existing code thoroughly before implementing
2. Create feature branch from main
3. Implement minimal viable version
4. Test thoroughly (manual + user acceptance)
5. Update documentation
6. Merge to main when stable

**Testing checklist for each feature:**
- [ ] Works on mobile (primary platform)
- [ ] Works on desktop
- [ ] Data persists (survives page refresh)
- [ ] Syncs in real-time (if applicable)
- [ ] Error handling works
- [ ] Follows 80s terminal theme
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] No console errors

---

**Last Updated:** Nov 12, 2025
**Current Phase:** Phase 3 (Additional Features)
**Completed:** Phase 1 (Core Vine Management) + Phase 2 (QR Code & 3D Tags) + Phase 3.1 (Weather API)
**Next Up:** Task Management, Harvest Tracking, or Photo Uploads
