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

### 1.5 Vine Details - In-line Editing & Rich Media
**Status:** 🔲 Not Started

**Goal:** Make vine details page fully functional for field work with direct editing, photo management, and comprehensive tracking.

**Core Requirements:**

**A. Direct Editing (High Priority)**
- [ ] **Editable Health Dropdown** - Click health status to change (GOOD → FAIR → POOR → DEAD) without opening settings modal
- [ ] **Editable Notes Field** - Click to edit variety, planting date, and general notes directly on details page
- [ ] **Save indicators** - Visual feedback when fields are being updated
- [ ] **Validation** - Prevent invalid data entry with inline error messages

**B. Photo Management (High Priority - Mobile Critical)**
- [ ] **Photo Upload Interface**
  - [ ] Mobile: Camera capture button (direct camera access)
  - [ ] Mobile: Photo library picker
  - [ ] Desktop: File upload with drag-and-drop
  - [ ] Progress indicators for uploads
- [ ] **Photo Storage & Display**
  - [ ] Thumbnail grid view (3-4 photos per row on mobile)
  - [ ] Tap thumbnail to enlarge (fullscreen modal)
  - [ ] Swipe/arrows to navigate between photos in fullscreen
  - [ ] Photo metadata (date taken, file size)
  - [ ] Delete photos (with confirmation)
- [ ] **Technical Considerations**
  - [ ] Image compression before upload (mobile bandwidth)
  - [ ] Storage solution (S3, Cloudinary, or similar)
  - [ ] Database schema for photo references
  - [ ] Loading states and error handling

**C. Watering Tracking (Medium Priority)**
- [ ] **Watering Log**
  - [ ] Quick "Water Now" button (records timestamp)
  - [ ] Manual entry for past watering (date + amount)
  - [ ] View watering history (chronological list)
  - [ ] Visual indicator of days since last watered
  - [ ] Optional: Integration with weather (rainfall tracking)
- [ ] **Schema**
  - [ ] Create `watering_log` table (vine_id, date, amount_gallons, method, notes)

**D. Disease & Disorder Management (Needs Planning)**
- [ ] **Basic Implementation**
  - [ ] Editable "Disease Notes" text area on details page
  - [ ] Track disease status (active, monitoring, resolved)
  - [ ] Date tracking for disease onset and resolution
- [ ] **Advanced Features (Future - AI Integration)**
  - [ ] Structured disease reporting (symptoms, affected areas, severity)
  - [ ] Disease identification assistance (AI photo analysis)
  - [ ] Treatment recommendations
  - [ ] Disease spread tracking across vineyard
  - [ ] Historical disease patterns for prevention
- [ ] **Schema Needs**
  - [ ] `disease_log` table design (TBD based on complexity decision)

**E. Training & Pruning System (Large Feature - Needs Planning)**
- [ ] **Basic Requirements**
  - [ ] User sets preferred training method per vine (VSP, GDC, Cordon, etc.)
  - [ ] Track pruning dates and cane/spur counts
  - [ ] Visual diagrams/reference for training systems
- [ ] **Advanced Features (Future - AI Integration)**
  - [ ] AI-guided pruning recommendations based on training method
  - [ ] Photo-based growth tracking and pruning point suggestions
  - [ ] Integration with spur planning
  - [ ] Seasonal pruning checklists
- [ ] **Planning Required**
  - [ ] Research common training methods and terminology
  - [ ] Design data model for training configurations
  - [ ] Determine AI capabilities (image recognition for canes/spurs)

**F. Spur Planning (Needs Planning)**
- [ ] **Requirements (TBD)**
  - [ ] Visual spur layout planning
  - [ ] Integration with training method
  - [ ] Track spur productivity year-over-year
  - [ ] Plan future spur positions
- [ ] **Planning Required**
  - [ ] Research viticulture best practices for spur planning
  - [ ] Design UI for spur visualization
  - [ ] Determine data model

**Dependencies:**
- Photo storage infrastructure (S3 or equivalent)
- Image processing library (compression, thumbnails)
- Mobile camera permissions handling
- Potential AI integration planning (disease ID, pruning assistance)

**Next Actions:**
1. Plan photo storage architecture
2. Design disease tracking data model (simple vs. complex)
3. Research training systems and pruning terminology
4. Create detailed specs for spur planning feature
5. Prototype in-line editing UX (health dropdown, notes fields)

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
**Status:** ✅ Complete

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

**Completed Tasks:**
- [x] Create alert_settings database migration
- [x] Add backend endpoints for alert settings CRUD
- [x] Implement alert calculation logic in /weather endpoint
- [x] Update weather response type to include alerts array
- [x] Reposition weather panel controls (gear icon + temp toggle)
- [x] Create weather alert settings modal component
- [x] Implement alert detection logic based on user settings
- [x] Refactor "Weather Warnings" to dynamic "Alerts" component
- [x] Extract Alerts and Weather into separate components
- [x] Mobile layout optimization for weather display
- [x] Add localStorage for user's high/low temp toggle preference
- [x] Update toggle UI to show current state ("HIGHS ↑" / "LOWS ↓")
- [x] Test on desktop and mobile

---

### 3.3 Winery Management
**Status:** 🔄 In Progress (as of Nov 15, 2025)

**Goal:** Track wine production from growing season through bottling with measurements, stage tracking, task management, and tasting notes.

**Planning Documents:**
- `/docs/04-product/winery-backend-plan.md` - Backend implementation and data flow
- `/docs/04-product/winery-frontend-plan.md` - **Frontend component architecture and implementation plan**
- `/docs/04-product/vintages_ui_planning.md` - Vintage management UI (list, detail, edit, delete)

**Revised Data Model:**
- **Vintage** = Harvest from a variety in a year (source grapes)
  - Stages: bud_break → flowering → fruiting → veraison → pre_harvest → harvest
  - Includes harvest_weight_lbs and harvest_volume_gallons
  - One vintage per variety per year
- **Wine** = Finished product made from a vintage
  - Required name field (e.g., "Lodi", "Azure")
  - Stages: crush → primary_fermentation → secondary_fermentation → racking → oaking → aging → bottling
  - Multiple wines can be created from one vintage (red, rosé, etc.)
- **Tasks** = Configurable checklist items per stage and wine type
  - Task templates define default tasks for each stage
  - User confirms which tasks to create when transitioning stages
  - Supports ad-hoc tasks

**Backend Implementation (COMPLETE ✅):**
- ✅ Database migrations created (7 tables: vintage, wine, stage_history, task_template, task, measurement, measurement_range)
- ✅ Measurement ranges seeded for all wine types (red, white, rosé, dessert, sparkling)
- ✅ Default task templates seeded for all stages (vintage stages + wine stages)
- ✅ Zero schema updated with all winery tables and permissions
- ✅ Backend analysis complete: **No API endpoints needed** - Zero handles all operations

**Key Backend Decisions:**
1. **Vintage Stages**: Tracks growing season (bud_break through harvest)
2. **Wine Stages**: Tracks winemaking process (crush through bottling)
3. **Task Templates**: Wine-type specific (red ≠ white ≠ rosé)
4. **User-Confirmed Tasks**: UI prompts user to select which tasks to create when stage transitions
5. **Measurement Validation**: Frontend queries measurement_range table for real-time warnings
6. **Zero-Only**: All CRUD operations through Zero sync, no backend API needed

**Frontend Components Progress:**

**Phase 1 - Foundation (Vintage Management):**
1. ✅ **AddVintageModal** - Add harvest with weight, volume, brix
2. ✅ **VintagesList** - Display vintages with featured card layout
3. ✅ **VintageDetailsView** - View vintage information
4. ✅ **EditVintageModal** - Edit harvest details
5. ✅ **DeleteVintageConfirmModal** - Delete vintages with warnings

**Phase 1 - Foundation (Wine Production - NEXT):**
See `/docs/04-product/winery-frontend-plan.md` for detailed component specs.

6. 🔲 **AddWineModal (Component #1)** - Create wine from vintage with required name
7. 🔲 **WineProductionView (Component #5)** - Main interface for managing wines (Active/Aging/Bottled sections)

**Phase 2 - Stage & Task Management:**
8. 🔲 **StageTransitionModal (Component #2)** - Modal to select tasks when changing stages
9. 🔲 **TaskListView (Component #3)** - Show/complete/skip tasks

**Phase 3 - Measurements:**
10. 🔲 **MeasurementModal (Component #4)** - Enter pH/TA/Brix with real-time validation

**Phase 4 - Polish:**
11. 🔲 Inventory management, graphs, settings UI

**Next Steps:**
- [ ] Build AddWineModal (Component #1) - Create wines from vintages
- [ ] Build WineProductionView skeleton (Component #5) - Display wine lists by status
- [ ] Test creating vintages → creating wines end-to-end
- [ ] Implement StageTransitionModal with task selection
- [ ] Build TaskListView component
- [ ] Create MeasurementModal with validation

---

### 3.4 Task Management
Real seasonal task tracking based on vineyard operations

### 3.5 Harvest Tracking
Record harvest dates, yields, quality metrics per vine

### 3.6 Photo Uploads
Add photos to vine records (disease tracking, growth progress)

### 3.7 Analytics Dashboard
Visualize vineyard data (health trends, variety distribution, etc.)

---

## Phase 4: AI-Powered Planning & Optimization

### 4.1 Terroir Optimizer
**Status:** 📋 Planned

**Goal:** AI-powered context-aware planning tool to help users make informed decisions about grape varietal selection based on location, existing vineyard, and winemaking goals.

**Planning Document:**
- `/docs/04-product/terroir-optimization.md` - Complete product specification

**Core Value:**
- **New growers:** Find suitable grapes for your climate before investing
- **Existing growers:** Expand strategically with compatible varietals
- **Winemakers:** Plant the right grapes for desired wine styles

**Three Planning Modes:**
1. **Mode 1: New Vineyard Planning** - Entry from dashboard for users with no vines
2. **Mode 2: Vineyard Expansion** - Entry from My Vineyard for existing growers
3. **Mode 3: Wine-Style Planning** - Entry from My Wine to plant for specific wine goals

**Key Features:**
- Progressive disclosure pattern (immediate value → refinement prompts → enhanced recommendations)
- Structured inputs (forms/toggles, not freeform chat)
- Saved plans with versioning
- Context-aware recommendations using existing vineyard/wine data
- Integration with dashboard, vineyard, and winery sections

**AI Knowledge Requirements:**
- Climate & geography data (GDD, frost dates, regional patterns)
- Varietal characteristics (climate ranges, ripening, disease susceptibility)
- Soil science (pH, drainage, amendments)
- Viticulture practices (spacing, trellis systems, labor needs)
- Wine production (blending ratios, production volumes, style feasibility)

**Integration Points:**
- Hamburger menu (☰) with Planning section
- Contextual CTAs in empty states (My Vineyard, My Wine)
- Dashboard alerts reference planned varietals
- "Create vines from plan" pre-populates data

**Implementation Phases:**
- **MVP:** Mode 1 (New Vineyard Planning) with basic recommendations
- **Phase 2:** Modes 2 & 3, saved plans, refinement cards
- **Phase 3:** Photo-based site assessment, calendar integration, cost estimation
- **Phase 4:** Community plans, success tracking, climate change projections

**Dependencies:**
- Complete winery management features (provides wine production context)
- User authentication and data persistence (for saved plans)
- AI/LLM integration for recommendation engine

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

**Last Updated:** Nov 15, 2025
**Current Phase:** Phase 3 (Additional Features)
**Completed:** Phase 1 (Core Vine Management) + Phase 2 (QR Code & 3D Tags) + Phase 3.1 (Weather API) + Phase 3.2 (Weather Alerts) + Phase 3.3 Vintage Management (5 components)
**In Progress:** Phase 3.3 (Winery Management - Wine Production UI)
**Next Up:** Complete wine production features (AddWineModal, WineProductionView, StageTransitionModal, TaskListView, MeasurementModal)
**Future:** Phase 4 - AI-Powered Terroir Optimizer
