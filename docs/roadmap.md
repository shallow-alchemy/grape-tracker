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
**Status:** 🔄 In Progress

**Goal:** Scan vine tags in the field to view/edit vine details

**Current Implementation:**
- Library: `react-qr-reader` v3.0.0-beta-1
- Fullscreen scanner with camera view
- Back camera on mobile (`facingMode: 'environment'`)
- Green corner bracket overlay for targeting
- 10 scans per second (scanDelay: 100ms)
- 1280x720 video resolution
- Handles both full vine URLs and vine IDs
- Error handling for permissions and device issues

**Code Location:**
- `src/components/QRScanner.tsx` - Scanner component
- `src/App.tsx` - Integration with dashboard QR button

**Completed Tasks:**
- [x] Research and choose QR scanning library
- [x] Install dependency
- [x] Implement camera permission handling
- [x] Create fullscreen scanner view component
- [x] Handle QR code detection and URL extraction
- [x] Navigate to vine details on successful scan
- [x] Add error states and user feedback

**In Progress:**
- [ ] Fix QR recognition performance (scanner shows camera but detection is slower than native camera app)
- [ ] Test on mobile devices (ongoing)

---

## Phase 3: Additional Features (Future)

### 3.1 Weather API Integration
Replace mock weather data with real API (OpenWeatherMap, etc.)

### 3.2 Task Management
Real seasonal task tracking based on vineyard operations

### 3.3 Harvest Tracking
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

**Last Updated:** Nov 11, 2025
**Current Phase:** Phase 2.3 (QR Code Scanning)
**Completed:** Phase 1 (Core Vine Management) + Phase 2.1 (QR/STL Generation) + Phase 2.2 (Backend Deployment)
**Next Up:** QR code scanning implementation
