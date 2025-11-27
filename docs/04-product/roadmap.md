# Gilbert - Development Roadmap

**Last Updated:** Jan 19, 2025
**Priorities Established:** Jan 19, 2025

This roadmap organizes features by topic area rather than timeline. Within each category, features are listed in priority order (Priority 1 = next to implement). Features are marked as ✅ Complete, 🔄 In Progress, or 🔲 Not Started.

---

## INFRASTRUCTURE & TOOLING (BLOCKING)

### Priority 0: zero-query Rust Crate
**Status:** 🔄 In Progress (Planning Phase)
**Timeline:** 2-3 weeks
**Blocks:** User-specific data isolation for all features

**Detailed Plan:** See [`docs/zero-query-crate-plan.md`](../zero-query-crate-plan.md)

A Rust query builder for Zero synced queries, enabling user-specific data without Node.js microservice.

**Phases:**
1. ✅ Planning & architecture documented
2. 🔲 TypeScript reference implementation (validation baseline)
3. 🔲 Rust crate development (AST types → query builder → expressions)
4. 🔲 Cross-validation (Rust output matches TypeScript byte-for-byte)
5. 🔲 Publish to crates.io as `zero-query`
6. 🔲 Integrate with Gilbert backend

**Why This Matters:**
- Currently: ANYONE_CAN permissions (no user isolation!)
- After: Proper multi-user data isolation with synced queries
- Bonus: Community contribution to Rust/Zero ecosystem

**Validation Strategy:**
- Build TypeScript Node.js service first (official Zero SDK)
- Deploy to Gilbert, verify user isolation works
- Build Rust crate to match TypeScript behavior exactly
- Compare AST JSON outputs (must be byte-identical)
- Only publish/use Rust version after validation passes

---

## HIGH PRIORITY BUG FIXES

### Priority 0: Variety Removal Guardrails
**Status:** 🔲 Not Started
**Severity:** High - causes page errors for affected vines

**Issue:**
When a grape variety is removed from vineyard settings, vines that have that variety assigned error out when viewing their individual vine page. The block list view works, but clicking on a single vine with a removed variety fails.

**Solution:**
Similar to block deletion, add guardrails when removing varieties:
- Detect which vines use varieties being removed
- Offer options: migrate affected vines to another variety OR delete affected vines
- Prevent accidental data orphaning

**Pattern to follow:**
- See `DeleteBlockConfirmModal.tsx` for the migrate/delete pattern
- Apply same UX pattern in `VineyardSettingsModal.tsx` for variety changes

---

## COMPLETED FEATURES

### Core Vine Management
- ✅ Vine creation & syncing with Zero
- ✅ Form validation and UX improvements
- ✅ Block management (create, edit, delete, filter)
- ✅ Batch vine creation (up to 100 vines at once)

### QR Code & Field Operations
- ✅ QR code generation (SVG format)
- ✅ 3D printable STL vine stakes with raised QR codes
- ✅ QR code scanning (mobile camera integration)
- ✅ Navigate to vine details via scan

### Backend & Deployment
- ✅ Axum backend with SQLx migrations
- ✅ Railway deployment (PostgreSQL + zero-cache + backend)
- ✅ Netlify frontend deployment
- ✅ Health endpoints and CORS configuration

### Weather & Alerts
- ✅ Weather API integration (Open-Meteo)
- ✅ Real-time weather display with geolocation
- ✅ 10-day forecast with temperature toggle
- ✅ Configurable weather alerts system
- ✅ Dynamic alerts panel on dashboard

### Winery - Vintage Management
- ✅ Add vintage modal (harvest weight, volume, brix)
- ✅ Vintages list with featured card layout
- ✅ Vintage details view
- ✅ Edit vintage modal
- ✅ Delete vintage confirmation with cascade warnings

### Winery - Wine Production (Mostly Complete)
- ✅ Add wine modal (create from vintage)
- ✅ Wines list organized by status (active/aging/bottled)
- ✅ Wine details view with blend support
- ✅ Edit wine modal
- ✅ Delete wine confirmation
- ✅ Stage transition modal with task selection
- ✅ Task list view (complete/skip tasks)
- ✅ Task completion modal with notes
- ✅ Create custom task modal
- ✅ Add measurement modal (pH/TA/Brix with validation)
- ✅ All tasks view (cross-entity task management)

---

## VINEYARD OPERATIONS

Features listed in priority order:

### Priority 1: Photo Management
**Status:** 🔲 Not Started

- [ ] Mobile camera capture with permission handling
- [ ] Photo library picker
- [ ] Desktop drag-and-drop upload
- [ ] Thumbnail grid view (3-4 per row on mobile)
- [ ] Fullscreen viewer with swipe navigation
- [ ] Photo metadata display (date, size)
- [ ] Delete photos with confirmation
- [ ] Image compression before upload
- [ ] Storage solution integration (S3/Cloudinary)
- [ ] Database schema: `vine_photos` table

**Dependencies:**
- Photo storage infrastructure (S3 or equivalent)
- Image processing library (compression, thumbnails)
- Mobile camera permissions handling

---

### Priority 2: Direct Editing
**Status:** 🔲 Not Started

- [ ] Click-to-edit health status (GOOD → FAIR → POOR → DEAD)
- [ ] Click-to-edit variety, planting date, and notes
- [ ] Real-time save indicators
- [ ] Inline validation for edits

---

### Priority 3: Training & Pruning System
**Status:** 🔲 Not Started

- [ ] Set training method per vine (VSP, GDC, Cordon, etc.)
- [ ] Track pruning dates and cane/spur counts
- [ ] Visual diagrams/reference for training systems
- [ ] Future: AI pruning recommendations
- [ ] Future: Photo-based growth tracking
- [ ] Future: Seasonal pruning checklists
- [ ] Research: Training methods and terminology
- [ ] Database schema: Training configurations

---

### Priority 4: Vineyard Task Management
**Status:** 🔲 Not Started

- [ ] General vineyard operations to-do system
- [ ] Seasonal task tracking (pruning, spraying, canopy management)
- [ ] Task scheduling and reminders
- [ ] Task completion tracking
- [ ] Separate from winery task templates

---

### Priority 5: Disease & Disorder Management (Basic)
**Status:** 🔲 Not Started

- [ ] Basic: Editable disease notes text area
- [ ] Track disease status (active, monitoring, resolved)
- [ ] Date tracking for onset and resolution
- [ ] Database schema: `disease_log` table (basic version)
- [ ] Future: AI photo analysis for disease identification
- [ ] Future: Treatment recommendations
- [ ] Future: Disease spread tracking across vineyard
- [ ] Future: Historical disease patterns for prevention

**Dependencies:**
- Potential AI integration (disease ID) for advanced features

---

### Priority 6: Per-Vine Harvest Tracking
**Status:** 🔲 Not Started

- [ ] Record harvest date per vine
- [ ] Track yield/weight per vine
- [ ] Quality metrics per vine
- [ ] Historical harvest comparison
- [ ] Different from vintage-level harvest tracking

---

### Priority 7: Spur Planning
**Status:** 🔲 Not Started

- [ ] Visual spur layout planning
- [ ] Integration with training method
- [ ] Track spur productivity year-over-year
- [ ] Plan future spur positions
- [ ] Research: Viticulture best practices
- [ ] UI: Spur visualization design

---

### Priority 8: Watering Tracking
**Status:** 🔲 Not Started

- [ ] "Water Now" quick button (timestamp recording)
- [ ] Manual entry for past watering (date + amount)
- [ ] Watering history chronological list
- [ ] Days-since-watered visual indicator
- [ ] Optional weather integration (rainfall tracking)
- [ ] Database schema: `watering_log` table

---

## WINERY PRODUCTION

**Detailed Specifications:**
- [Vintages UI Spec](./detailed-specs/vintages-ui.md) - Reference for completed vintage management features
- [Winery Production Spec](./detailed-specs/winery-production.md) - Reference for completed wine production features

Features listed in priority order:

### Priority 1: Photo Uploads per Vintage
**Status:** 🔲 Not Started

- [ ] Document harvest visually
- [ ] Camera capture for harvest photos
- [ ] Photo gallery on vintage detail view
- [ ] Shares infrastructure with vine photo management

**Dependencies:**
- Photo management system (shared with Vineyard Operations Priority 1)

---

### Priority 2: Task Template Configuration UI
**Status:** 🔲 Not Started

- [ ] Settings gear in winery view
- [ ] Enable/disable default task templates
- [ ] Customize task descriptions
- [ ] Adjust task frequencies
- [ ] Wine-type specific template sets
- [ ] Reset to defaults option

---

### Priority 3: Inventory Management Modal
**Status:** 🔲 Not Started

- [ ] Track bottle counts for bottled wines
- [ ] Record bottling date and batch size
- [ ] Consumption/sales tracking
- [ ] Remaining inventory display
- [ ] Low stock alerts

---

### Priority 4: Measurement History Graphs
**Status:** 🔲 Not Started

- [ ] Visualize pH trends over time
- [ ] Visualize TA trends over time
- [ ] Visualize Brix trends over time
- [ ] Temperature tracking visualization
- [ ] Stage-by-stage comparison
- [ ] Export measurement data

---

### Priority 5: Weather Data Correlation
**Status:** 🔲 Not Started

- [ ] Link weather patterns to vintage performance
- [ ] Display weather during growing season
- [ ] Correlate GDD with vintage quality
- [ ] Historical weather impact analysis

**Dependencies:**
- Existing weather API integration (already complete)

---

## PLANNING & OPTIMIZATION

**Detailed Specification:** [Terroir Optimizer Spec](./detailed-specs/terroir-optimizer.md) - Complete product specification with UI flows, progressive disclosure patterns, AI knowledge requirements, and integration points.

**Core Value Propositions:**
- New growers: Find suitable grapes for your climate before investing
- Existing growers: Expand strategically with compatible varietals
- Winemakers: Plant the right grapes for desired wine styles

Features listed in priority order:

### Priority 1: Planning Infrastructure
**Status:** 🔲 Not Started

- [ ] Hamburger menu (☰) with Planning section
- [ ] "Plan New Vineyard" menu item
- [ ] "Plan Vineyard Expansion" (conditional on existing vines)
- [ ] "Plan New Wine" menu item
- [ ] "My Saved Plans" with count badge
- [ ] Contextual CTAs in empty states (My Vineyard, My Wine)
- [ ] Save/compare/refine plans workflow

**Dependencies:**
- User authentication and data persistence (for saved plans)

---

### Priority 2: Mode 1 - New Vineyard Planning (MVP)
**Status:** 🔲 Not Started

- [ ] Dashboard entry point for users with no vines
- [ ] Location-based varietal recommendations (ZIP/city input)
- [ ] Progressive disclosure: site characteristics, soil data, microclimate
- [ ] Climate compatibility reasoning (GDD, frost dates, regional patterns)
- [ ] 3-5 recommended varietals with explanations
- [ ] Warnings about site limitations
- [ ] Save as "Vineyard Plan"

**Dependencies:**
- AI/LLM integration for recommendation engine
- Climate and varietal knowledge database

---

### Priority 3: Refinement Cards (Basic)
**Status:** 🔲 Not Started

- [ ] Site Details: slope, sun exposure, frost risk, wind, drainage
- [ ] Soil Information: pH, type, drainage, nutrients
- [ ] Microclimate Factors: frost dates, heat/cold patterns, fog, altitude
- [ ] Wine Goals: styles, blending vs varietal, commercial vs personal
- [ ] Production Scale: hobby, enthusiast, serious, commercial

---

### Priority 4: Mode 3 - Wine-Style Planning
**Status:** 🔲 Not Started

- [ ] Entry from My Wine to plant for specific wine goals
- [ ] Desired wine style input (Bordeaux blend, Burgundy, etc.)
- [ ] Required varietals for chosen style
- [ ] Minimum vine counts for target production
- [ ] Climate feasibility for wine style in user's location
- [ ] Alternative wine styles if primary isn't suitable
- [ ] Phased planting plan for multi-year implementation

**Dependencies:**
- Winery management features complete (wine production context)

---

### Priority 5: Mode 2 - Vineyard Expansion
**Status:** 🔲 Not Started

- [ ] Entry from My Vineyard for existing growers
- [ ] Pre-populated location and existing varietals
- [ ] Recommendations considering existing vines
- [ ] Blending compatibility notes
- [ ] Equipment/workflow compatibility analysis
- [ ] Harvest timing coordination
- [ ] Integration suggestions with existing layout

---

### Priority 6: "Create Vines from Plan" Workflow
**Status:** 🔲 Not Started

- [ ] Pre-populate vine creation from saved plans
- [ ] Batch create vines from recommendations
- [ ] Link created vines to originating plan

---

### Priority 7: AI Knowledge Base Expansion
**Status:** 🔲 Not Started

- [ ] Climate & geography data (GDD by region, frost patterns)
- [ ] Varietal characteristics (climate ranges, ripening windows, disease susceptibility)
- [ ] Soil science (pH requirements, drainage needs, amendments)
- [ ] Viticulture practices (spacing, trellis systems, labor intensity)
- [ ] Wine production (blending ratios, production volumes, style feasibility)

---

### Priority 8: Future Enhancements
**Status:** 🔲 Not Started

- [ ] Photo-based site assessment (AI analyzes slope, sun, soil from images)
- [ ] Calendar integration (planting timelines, maintenance schedules)
- [ ] Cost estimation based on vine count and varietals
- [ ] Yield predictions by varietal and age
- [ ] Community plans (see what others in your region planted)
- [ ] Success tracking (actual vs predicted performance)
- [ ] Pest/disease risk by varietal and region
- [ ] Regulatory compliance helpers (permits, restrictions)
- [ ] Multi-year phasing for large projects
- [ ] ROI calculation for commercial growers
- [ ] Climate change projections (future suitability)
- [ ] Precision viticulture integration (soil sensors, weather stations)

---

## ANALYTICS & INSIGHTS

Features listed in priority order:

### Priority 1: Winery Analytics
**Status:** 🔲 Not Started

- [ ] Measurement trends (pH/TA/Brix) visualization
- [ ] Wine production timeline visualization
- [ ] Stage duration analysis
- [ ] Task completion rates
- [ ] Vintage comparison metrics
- [ ] Yield analysis by variety

**Dependencies:**
- Existing winery data (measurements, wines, vintages already tracked)
- Chart library selection (Recharts, Chart.js, etc.)

---

### Priority 2: Vineyard Analytics
**Status:** 🔲 Not Started

- [ ] Vine health trends over time
- [ ] Variety distribution visualization
- [ ] Block-level performance comparison
- [ ] Disease occurrence patterns (depends on Disease Management feature)
- [ ] Watering frequency analysis (depends on Watering Tracking feature)
- [ ] Training method adoption stats (depends on Training & Pruning feature)

**Dependencies:**
- Vineyard Operations features (disease tracking, watering, training/pruning)

---

### Priority 3: Harvest Metrics
**Status:** 🔲 Not Started

- [ ] Per-vine yield tracking
- [ ] Block-level harvest performance
- [ ] Year-over-year vintage comparison
- [ ] Harvest timing analysis
- [ ] Quality metric trends

**Dependencies:**
- Per-Vine Harvest Tracking (Vineyard Operations Priority 6)

---

### Technical Considerations (All Priorities)
- [ ] Chart library selection (Recharts, Chart.js, etc.)
- [ ] Data aggregation queries
- [ ] Performance optimization for large datasets
- [ ] Export analytics as PDF/CSV
- [ ] Mobile-optimized chart rendering

---

## CROSS-CUTTING CONCERNS

### Shared Infrastructure

**Photo Management System**
- Shared by: Vines, Vintages, Disease tracking
- [ ] S3 or Cloudinary integration
- [ ] Image compression pipeline
- [ ] Thumbnail generation
- [ ] CDN for fast delivery
- [ ] Database schema: Generic `photos` table with entity references

**Weather Integration**
- Shared by: Dashboard alerts, Vintage correlation, Terroir optimizer
- [ ] Existing Open-Meteo API (already integrated)
- [ ] Historical weather data queries
- [ ] Weather pattern analysis
- [ ] Integration with watering tracking (rainfall)

---

## TECHNICAL DEBT & DEPRECATIONS

### Wine Status Field - Planned Deprecation
**Status:** 📋 Documented - Not Yet Implemented

**Issue:**
The `wine.status` field (values: `active`, `aging`, `bottled`) is redundant with the more granular `wine.current_stage` field (values: `crush`, `primary_fermentation`, `secondary_fermentation`, `racking`, `oaking`, `aging`, `bottling`).

**Problems:**
- Overlapping terminology: "aging" exists as both a stage and a status
- Unclear boundaries: when does "active" become "aging"?
- Data redundancy: status is derivable from stage
- Maintenance burden: two fields to keep in sync

**Proposed Solution:**
- **Deprecate** the `wine.status` database field
- **Derive** display status from `current_stage` in frontend code
- Example logic:
  - Stages `crush` through `racking` → Display as "FERMENTING"
  - Stages `oaking` and `aging` → Display as "AGING"
  - Stage `bottling` → Display as "BOTTLED"

**Rationale:**
Status is a display concern, not a data concern. The `current_stage` field is the source of truth for where wine is in production. Any high-level summary status should be computed at display time, not stored redundantly.

**Migration Path:**
1. ✅ Add `formatWineStatus()` helper in frontend (already implemented as interim solution)
2. [ ] Update all UI to use stage-derived status
3. [ ] Add migration to remove `status` column from schema
4. [ ] Update API to ignore/remove status field
5. [ ] Remove status field from TypeScript types

**Timeline:** TBD - Low priority, no user-facing impact

---

## DEVELOPMENT GUIDELINES

**For each feature:**
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

## PRIORITIZATION FRAMEWORK

**Status:** ✅ Priorities Established (Nov 19, 2025)

Features are organized by topic area with clear priority numbers within each category. This allows for focused development within specific domains.

**Criteria used for prioritization:**
1. **User Impact** - How much does this improve the core user experience?
2. **Mobile Criticality** - Is this essential for field work?
3. **Dependencies** - What else needs to be built first?
4. **Technical Complexity** - How long will this take to implement?
5. **AI Requirements** - Does this need AI integration?

**How to use this roadmap:**
- Ask "What's next in VINEYARD OPERATIONS?" → Answer: Priority 1 (Photo Management)
- Ask "What's next in WINERY PRODUCTION?" → Answer: Priority 1 (Photo Uploads per Vintage)
- Ask "What's next in PLANNING & OPTIMIZATION?" → Answer: Priority 1 (Planning Infrastructure)
- Ask "What's next in ANALYTICS & INSIGHTS?" → Answer: Priority 1 (Winery Analytics)

**Cross-category dependencies:**
- Photo Management (Vineyard Ops #1) enables Photo Uploads per Vintage (Winery #1)
- Per-Vine Harvest Tracking (Vineyard Ops #6) enables Harvest Metrics (Analytics #3)
- Winery features must be complete before Wine-Style Planning (Planning & Optimization #4)
