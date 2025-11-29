# Gilbert - Development Roadmap

**Last Updated:** Nov 29, 2025
**Version:** 2.0 - Restructured

This roadmap prioritizes **vineyard and winery features first**, then operational enhancements. AI-powered features reference the [AI Knowledge Manifest](./ai-knowledge-manifest.md) for knowledge dependencies.

---

## How This Roadmap Works

**Section Order = Priority Order:**
1. VINEYARD MANAGEMENT — Core vine tracking and field operations
2. WINERY PRODUCTION — Wine production workflows
3. AI-POWERED FEATURES — Seasonal guidance, disease management, harvest timing
4. DATA & ANALYTICS — Infrastructure for insights (user-facing + internal)
5. OPERATIONAL ENHANCEMENTS — Multi-tenancy, planning tools

**Within each section:** Priority 1 = next to implement

**AI Features:** Features marked with 🤖 require AI knowledge docs. See manifest for status.

---

## COMPLETED FEATURES

All previously completed features remain unchanged. See [Completed Features Archive](#completed-features-archive) at end of document.

**Summary of what's built:**
- ✅ Core vine management (create, edit, batch create, blocks)
- ✅ QR codes (generate, scan, 3D printable stakes)
- ✅ Weather integration (Open-Meteo, alerts, 10-day forecast)
- ✅ Vintage management (full CRUD, cascade delete)
- ✅ Wine production (stages, tasks, measurements, blends)
- ✅ User data isolation (JWT auth, custom mutators)
- ✅ 746 frontend tests, 12 backend tests

---

## VINEYARD MANAGEMENT

Core features for tracking and managing vines in the field.

### Priority 1: Training & Pruning System 🤖
**Status:** 🟡 Core Complete, AI Features Pending
**AI Knowledge:** ✅ Ready (8 training system docs complete)

Track how each vine is trained and pruned. AI provides guidance based on training method.

**Core Features:**
- [x] Training method field per vine (dropdown with 11 methods + custom)
- [x] Available methods: Head Training, Vertical Cordon, Bilateral Cordon, Four-Arm Kniffen, GDC, Umbrella, Cane Pruned, VSP, Scott-Henry, Lyre, Other
- [x] Track pruning dates per vine (pruning log with edit/delete)
- [x] Cane/spur count tracking (before/after canes, spurs left)
- [x] Database schema: `training_method` on vine table, `pruning_log` table
- [x] Inline editing for training method on vine details
- [x] Training method selection on vine creation
- [x] Scrollable pruning log list with max height

**AI-Powered Features:**
- [ ] Training method selection helper (recommends based on variety, climate, vigor)
- [ ] Pruning guidance by method (what to do, when, how much)
- [ ] Visual reference diagrams for each training system

**AI Knowledge Required:**
| Document | Status |
|----------|--------|
| `training/head-training.md` | ✅ Complete |
| `training/vertical-cordon.md` | ✅ Complete |
| `training/bilateral-cordon-training.md` | ✅ Complete |
| `training/four-arm-kniffen.md` | ✅ Complete |
| `training/geneva-double-curtain.md` | ✅ Complete |
| `training/umbrella-system.md` | ✅ Complete |
| `training/cane-pruning.md` | ✅ Complete |
| `training/divided-canopy-system.md` | ✅ Complete |
| `training/selection-guide.md` | ⏳ Needed for AI recommendations |

---

### Priority 2: Photo Management
**Status:** 🔲 Not Started

Visual documentation for vines. Shared infrastructure with winery photos.

- [ ] Mobile camera capture with permission handling
- [ ] Photo library picker
- [ ] Desktop drag-and-drop upload
- [ ] Thumbnail grid view (3-4 per row on mobile)
- [ ] Fullscreen viewer with swipe navigation
- [ ] Photo metadata display (date, size)
- [ ] Delete photos with confirmation
- [ ] Image compression before upload
- [ ] Storage solution integration (S3/Cloudinary)
- [ ] Database schema: `photos` table (polymorphic: vine_id, vintage_id, etc.)

**Dependencies:**
- Photo storage infrastructure (S3 or equivalent)
- Image processing library (compression, thumbnails)

---

### Priority 3: Direct Editing Completion
**Status:** ✅ Complete

- [x] Click-to-edit health status
- [x] Click-to-edit variety and notes
- [x] Click-to-edit planting date
- [x] Real-time save indicators
- [x] Inline validation
- [x] Click-to-edit training method

---

### Priority 4: Per-Vine Harvest Tracking
**Status:** 🔲 Not Started

Track harvest data at the vine level (separate from vintage-level tracking).

- [ ] Record harvest date per vine
- [ ] Track yield/weight per vine
- [ ] Quality metrics per vine (Brix at harvest)
- [ ] Historical harvest comparison
- [ ] Aggregate to block-level summaries
- [ ] Database schema: `vine_harvest` table

**Data Value:** Enables per-vine yield analytics and identifies high/low performers.

---

### Priority 5: Irrigation Scheduling System
**Status:** 🔲 Not Started

Vineyard-level irrigation scheduling with block assignment and automatic logging.

**Vineyard Settings:**
- [ ] Define named watering schedules (e.g., "Schedule A", "Schedule B")
- [ ] Schedule configuration: frequency, duration, irrigation type (drip, sprinkler, flood)
- [ ] Support multiple schedules per vineyard (different zones)

**Block Assignment:**
- [ ] Add schedule selector to Add/Edit Block modal
- [ ] Options: Schedule A, B, C... or "None/Manual"
- [ ] Changing schedule only affects future events (non-retroactive)

**Automatic Logging:**
- [ ] System generates watering log entries based on schedule
- [ ] Database schema: `irrigation_schedule` table, `watering_log` table

**Vine Details (Read-Only):**
- [ ] Display watering history inherited from block's schedule
- [ ] No manual input at vine level

**Future Enhancements:**
- [ ] Mark actual vs scheduled (handle pump failures, skipped days)
- [ ] Weather integration: show rainfall, auto-skip if rain detected
- [ ] Days-since-watered indicator at block level

---

### Priority 6: Spur Planning
**Status:** 🔲 Not Started

Visual planning for spur positions on trained vines.

- [ ] Visual spur layout planning
- [ ] Integration with training method
- [ ] Track spur productivity year-over-year
- [ ] Plan future spur positions

**Dependencies:**
- Training & Pruning System (Priority 1)

---

### Priority 7: Vineyard Seasonal Stage Tracking
**Status:** 🔲 Not Started

Track which seasonal stage each block is in. Foundation for vineyard seasonal tasks.

**Seasonal Stages:**
Dormant → Bud Break → Flowering → Fruit Set → Veraison → Ripening → Harvest → Post-Harvest

**Core Features:**
- [ ] Add `current_stage` and `stage_entered_at` to block table
- [ ] Create `block_stage_history` table for history tracking
- [ ] UI to view/change block stage (manual transitions)
- [ ] Stage indicator on block cards in vineyard view
- [ ] Vineyard-level stage summary (aggregate of blocks)
- [ ] Blocks can be in different stages simultaneously

**Future Enhancements:**
- [ ] Automatic stage suggestions based on date/GDD
- [ ] Weather integration for frost warnings during bud break

**Detailed Spec:** [task-system-architecture.md](./detailed-specs/task-system-architecture.md)

**Note:** This is the prerequisite for vineyard seasonal tasks. See Unified Task System (Winery Priority 3) for full task customization.

---

### Priority 8: Disease Tracking (Basic)
**Status:** 🔲 Not Started

Simple disease logging per vine. Foundation for AI-powered disease management.

- [ ] Disease log per vine (date, type, severity, notes)
- [ ] Status tracking: active → monitoring → resolved
- [ ] Disease history timeline view
- [ ] Common disease dropdown (powdery mildew, downy mildew, botrytis, etc.)
- [ ] Treatment notes field
- [ ] Database schema: `disease_log` table

**Note:** This is the manual foundation. AI-powered disease identification and treatment recommendations (see AI-POWERED FEATURES) build on top of this.

---

## WINERY PRODUCTION

Enhancements to the existing wine production workflow.

### Priority 1: Photo Uploads per Vintage
**Status:** 🔲 Not Started

- [ ] Document harvest visually
- [ ] Camera capture for harvest photos
- [ ] Photo gallery on vintage detail view

**Dependencies:**
- Photo Management (Vineyard Priority 2)

---

### Priority 2: Measurement History Graphs
**Status:** 🔲 Not Started

Visualize wine chemistry over time.

- [ ] pH trends over time (line chart)
- [ ] TA trends over time
- [ ] Brix/SG trends through fermentation
- [ ] Temperature tracking visualization
- [ ] Stage markers on timeline
- [ ] Export measurement data (CSV)

**Technical:**
- [ ] Chart library selection (Recharts recommended for React)

---

### Priority 3: Unified Task Customization System
**Status:** 🔲 Not Started

Comprehensive task management across winery, vineyard, and general operations.

**Entry Point:**
- [ ] "Customize Task Settings" button in All Tasks view
- [ ] Task Settings page with tabbed interface

**Phase 1: Winery Task Customization**
- [ ] Display templates grouped by stage (crush, primary fermentation, etc.)
- [ ] Enable/disable toggle per template
- [ ] Edit task (name, description, frequency, wine type)
- [ ] Delete task (user override, doesn't affect defaults)
- [ ] Add new task to any stage
- [ ] Copy-on-write architecture (user edits don't modify defaults)
- [ ] "Reset to defaults" functionality

**Phase 2: General Tasks**
- [ ] Tasks not tied to any stage
- [ ] One-time or recurring (daily, weekly, bi-weekly, monthly)
- [ ] Examples: "Check water tubing" every 2 weeks
- [ ] Background job for recurring task generation

**Phase 3: Vineyard Seasonal Tasks**
- [ ] Requires: Vineyard Seasonal Stage Tracking (Vineyard Priority 7)
- [ ] Task templates per seasonal stage
- [ ] Auto-create tasks when block enters stage

**Phase 4: Inventory Integration**
- [ ] Link tasks to inventory items
- [ ] Deplete inventory on task completion
- [ ] Low stock warnings

**Detailed Spec:** [task-system-architecture.md](./detailed-specs/task-system-architecture.md)

---

### Priority 4: Inventory Management
**Status:** 🔲 Not Started

Track bottled wine inventory.

- [ ] Track bottle counts for bottled wines
- [ ] Record bottling date and batch size
- [ ] Consumption/sales tracking
- [ ] Remaining inventory display
- [ ] Low stock alerts

---

### Priority 5: Weather/Vintage Correlation
**Status:** 🔲 Not Started

Connect weather patterns to vintage outcomes.

- [ ] Display weather during growing season on vintage detail
- [ ] GDD accumulation for vintage
- [ ] Historical weather data lookup (Open-Meteo historical API)
- [ ] Correlate weather patterns with wine quality notes

**Dependencies:**
- Historical weather API integration

---

## AI-POWERED FEATURES 🤖

Features that require AI knowledge documents and real-time data integration.

### Priority 1: AI Seasonal Guidance
**Status:** 🔲 Not Started
**AI Knowledge:** ⏳ Seasonal docs needed

AI-generated task recommendations based on season, region, and vineyard state.

**Prerequisites:**
- Vineyard Task Management (Vineyard Priority 7) — provides manual task infrastructure

**Features:**
- [ ] AI-generated seasonal task suggestions
- [ ] Tasks generated from: season + region + user's varietals + training systems
- [ ] One-click add AI suggestions to task list
- [ ] "What should I be doing now?" assistant

**AI Integration:**
- [ ] Real-time weather lookup for task timing (frost warnings → protection tasks)
- [ ] Historical weather analysis (unusual patterns → adjusted recommendations)
- [ ] Regional knowledge: "In [user's region], [month] typically means [tasks]"
- [ ] Varietal-specific tasks: "Pinot Noir in your climate needs [specific care] now"

**AI Knowledge Required:**
| Document | Status | Purpose |
|----------|--------|---------|
| `seasonal/dormant-season.md` | ⏳ Needed | Nov–Feb tasks |
| `seasonal/bud-break.md` | ⏳ Needed | Mar–Apr tasks |
| `seasonal/bloom-fruit-set.md` | ⏳ Needed | May–Jun tasks |
| `seasonal/veraison-ripening.md` | ⏳ Needed | Jul–Aug tasks |
| `seasonal/harvest.md` | ⏳ Needed | Aug–Oct tasks |
| `seasonal/post-harvest.md` | ⏳ Needed | Oct–Nov tasks |
| Climate doc for user's region | ✅ Ready | Regional timing adjustments |
| Training doc for user's system | ✅ Ready | System-specific tasks |

**Weather Integration:**
- Open-Meteo API (already integrated) for current conditions
- Open-Meteo Historical API for pattern analysis
- GDD calculation from accumulated temperature data

---

### Priority 2: AI Disease Management
**Status:** 🔲 Not Started
**AI Knowledge:** ⏳ Pest/disease docs needed

AI-assisted disease identification and treatment recommendations.

**Prerequisites:**
- Disease Tracking Basic (Vineyard Priority 8) — provides manual disease logging

**AI-Powered Features:**
- [ ] Photo-based disease identification (upload photo → AI suggests diagnosis)
- [ ] Treatment recommendations by disease + organic/conventional preference
- [ ] Spread risk alerts (disease on one vine → warn about neighbors)
- [ ] Preventive recommendations based on conditions (humidity + temp → mildew risk)

**AI Knowledge Required:**
| Document | Status | Purpose |
|----------|--------|---------|
| `pests/powdery-mildew.md` | ⏳ Needed | Universal threat |
| `pests/downy-mildew.md` | ⏳ Needed | Humid climates |
| `pests/botrytis.md` | ⏳ Needed | Humid + tight clusters |
| `pests/phylloxera.md` | ⏳ Needed | Rootstock context |
| `pests/pierces-disease.md` | ⏳ Needed | Southern US, CA |
| Climate doc for user's region | ✅ Ready | Disease pressure context |
| Varietal docs | ⏳ Needed | Susceptibility info |

---

### Priority 3: Harvest Timing Assistant
**Status:** 🔲 Not Started
**AI Knowledge:** ⏳ Partial (climate docs ready, varietal docs needed)

AI recommendations for optimal harvest window.

**Features:**
- [ ] Input: variety, region, recent Brix/pH/TA readings
- [ ] Output: harvest window recommendation with reasoning
- [ ] Factors: varietal ripening profile, regional norms, current readings, weather forecast
- [ ] Alerts: "Based on forecast, consider harvesting before [date] rain event"

**AI Knowledge Required:**
| Document | Status |
|----------|--------|
| `seasonal/harvest.md` | ⏳ Needed |
| Climate doc for region | ✅ Ready |
| Varietal docs | ⏳ Needed |

---

## DATA & ANALYTICS

Infrastructure for insights — both user-facing and internal (cross-vineyard learning).

### Data Infrastructure Principles

**Capture now, analyze later:**
Every feature should store granular data that enables future analytics, even if we don't surface those analytics immediately.

**Key data points to capture:**
- Location (coordinates, not just ZIP) for every vineyard
- Timestamps on everything (created, updated, completed)
- Weather snapshots at key events (harvest date → weather that day)
- All user inputs, even abandoned (started a plan but didn't save)

**Future value:**
When 100+ vineyards use the app, we can:
- Identify regional patterns (what's working in [region])
- Improve AI recommendations with real outcomes
- Benchmark users against anonymized peers

---

### Priority 1: Winery Analytics (User-Facing)
**Status:** 🔲 Not Started

- [ ] Measurement trends (pH/TA/Brix charts)
- [ ] Wine production timeline visualization
- [ ] Stage duration analysis (how long in each stage)
- [ ] Vintage comparison (side-by-side metrics)

**Dependencies:**
- Chart library (Recharts)
- Existing winery data

---

### Priority 2: Vineyard Analytics (User-Facing)
**Status:** 🔲 Not Started

- [ ] Vine health distribution (pie/bar chart)
- [ ] Variety distribution
- [ ] Block-level comparisons
- [ ] Training method adoption

**Dependencies:**
- Training & Pruning System (Vineyard Priority 1)

---

### Priority 3: Data Export & API
**Status:** 🔲 Not Started

Enable users to export their data; prepare for internal analytics.

- [ ] Export vineyard data (CSV/JSON)
- [ ] Export winery data (CSV/JSON)
- [ ] Export measurement history
- [ ] API endpoints for bulk data access (internal use)

---

## OPERATIONAL ENHANCEMENTS

Multi-tenancy and planning features. Lower priority than core vineyard/winery.

### Priority 1: Organization & Multi-Tenancy
**Status:** 🔲 Not Started

Support teams and multiple vineyards per account.

**Phase 1: Data Model**
- [ ] `organization` table (id, name, slug, settings)
- [ ] `organization_membership` table (user_id, org_id, role)
- [ ] Add `organization_id` to `vineyard` table
- [ ] Migration: auto-create personal org for existing users

**Phase 2: UI**
- [ ] Org switcher in navigation
- [ ] Multi-vineyard list within org
- [ ] Vineyard selector

**Phase 3: Permissions**
- [ ] Roles: Owner, Manager, Member, Field Worker
- [ ] Role-based UI visibility
- [ ] Mutator-level permission enforcement

**Phase 4: Invitations**
- [ ] Invite by email
- [ ] Shareable invite links
- [ ] Accept/decline flow

---

### Priority 2: Onboarding & Demographics
**Status:** 🔲 Not Started

Collect user context for better AI recommendations and internal analytics.

- [ ] Onboarding wizard (skippable)
- [ ] Vineyard size, operation type, experience level
- [ ] Climate zone selection
- [ ] Goals (personal, commercial, education)
- [ ] Store in organization profile

**Value:** Tailors AI recommendations; provides internal market insights.

---

### Priority 3: Planning Tools (Terroir Optimizer) 🤖
**Status:** 🔲 Not Started
**AI Knowledge:** ⏳ Partial (climate docs ready, planning docs needed)

Help users plan new vineyards or expansions.

**Detailed Spec:** [terroir-optimizer-spec.md](./detailed-specs/terroir-optimizer.md)

**Mode 1: New Vineyard Planning**
- [ ] Location input → varietal recommendations
- [ ] Progressive disclosure (site details, soil, microclimate)
- [ ] Save as plan

**Mode 2: Vineyard Expansion**
- [ ] Recommendations based on existing varietals
- [ ] Blending compatibility

**Mode 3: Wine-Style Planning**
- [ ] Target wine style → required varietals
- [ ] Climate feasibility check

**AI Knowledge Required:**
| Document | Status |
|----------|--------|
| Climate docs (all regions) | ✅ Ready |
| `planning/site-assessment.md` | ⏳ Needed |
| `planning/yield-calculations.md` | ⏳ Needed |
| `planning/spacing-guidelines.md` | ⏳ Needed |
| `training/selection-guide.md` | ⏳ Needed |
| Varietal docs | ⏳ Needed |
| `winemaking/blending.md` | ⏳ Needed |

---

## UX POLISH

Lower priority improvements.

### Priority 1: Navigation Context
- [ ] Breadcrumb navigation
- [ ] Current section indicator
- [ ] "Back to..." with destination names

### Priority 2: Layout Stability
- [ ] Skeleton loaders
- [ ] Reserved heights for dynamic content
- [ ] Font loading optimization

### Priority 3: Empty States
- [ ] Friendly empty states with CTAs
- [ ] First-time user guidance

---

## CROSS-CUTTING CONCERNS

### Photo Storage Infrastructure
**Shared by:** Vine photos, Vintage photos, Disease photos
- [ ] S3 or Cloudinary integration
- [ ] Image compression pipeline
- [ ] Thumbnail generation
- [ ] CDN delivery

### Push Notifications
**Shared by:** Weather alerts, Task reminders, Winery deadlines
- [ ] Service Worker for PWA
- [ ] Push permission flow
- [ ] Notification preferences UI

### Historical Weather API
**Shared by:** Seasonal tasks, Vintage correlation, Harvest timing
- [ ] Open-Meteo Historical API integration
- [ ] GDD calculation service
- [ ] Weather snapshot storage (capture weather at key events)

### CI/CD Pipeline
**Status:** 🔲 Not Started
- [ ] GitHub Actions workflow for PR checks
- [ ] Run tests on every PR
- [ ] Docker Compose for isolated test environments
- [ ] Automated E2E tests (depends on Playwright setup)
- [ ] Fail PR if tests fail or coverage drops
- [ ] Deploy previews for PRs (Netlify)

---

## TECHNICAL DEBT

### Wine Status Field Deprecation
**Status:** 📋 Documented

The `wine.status` field is redundant with `wine.current_stage`. Derive status from stage at display time.

**Migration:**
1. ✅ `formatWineStatus()` helper exists
2. [ ] Update all UI to use derived status
3. [ ] Remove `status` column from schema

---

## COMPLETED FEATURES ARCHIVE

<details>
<summary>Click to expand completed features</summary>

### Core Vine Management
- ✅ Vine creation & syncing with Zero
- ✅ Form validation and UX improvements
- ✅ Block management (create, edit, delete, filter)
- ✅ Batch vine creation (up to 100 vines at once)
- ✅ UUID-based vine IDs with human-readable sequence numbers

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
- ✅ Custom mutators for user data isolation
- ✅ JWT-based auth enforcement

### Testing Infrastructure
- ✅ RSTest + React Testing Library setup
- ✅ Test isolation for reliable runs
- ✅ 746 passing tests (frontend) + 12 passing tests (backend)
- 🔄 E2E testing with Playwright (in progress)

### Weather & Alerts
- ✅ Weather API integration (Open-Meteo)
- ✅ Real-time weather display with geolocation
- ✅ 10-day forecast
- ✅ Configurable weather alerts
- ✅ Dynamic alerts panel

### Winery - Vintage Management
- ✅ Add/edit/delete vintage
- ✅ Vintages list with featured card
- ✅ Cascade delete warnings

### Winery - Wine Production
- ✅ Add/edit/delete wine
- ✅ Wines list by status
- ✅ Stage transitions with task selection
- ✅ Task completion with notes
- ✅ Custom tasks
- ✅ Measurements (pH/TA/Brix)
- ✅ All tasks view

### Infrastructure
- ✅ User data isolation via custom mutators
- ✅ Variety removal guardrails

</details>

---

## DEVELOPMENT GUIDELINES

**For each feature:**
1. Check AI Knowledge Manifest for required docs
2. If docs missing, either write them first or build non-AI version
3. Create feature branch
4. Implement minimal viable version
5. Test on mobile first
6. Update roadmap status

**Testing checklist:**
- [ ] Works on mobile (primary)
- [ ] Works on desktop
- [ ] Data persists
- [ ] Syncs in real-time
- [ ] Follows 80s terminal theme
- [ ] No console errors
