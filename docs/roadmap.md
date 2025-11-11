# Gilbert - Development Roadmap

## Current Priority: QR Code & 3D Printable Tags

**Status:** 🔄 In Progress (as of Nov 9, 2025)

**Goal:** Get vines to sync from PostgreSQL to the UI so they appear in the vineyard list after creation.

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

**Current State:**
Form exists with basic fields (block dropdown, variety input, planting date, health status, notes).

**Completed Improvements:**
- ✅ Form validation (required fields, date validation)
- ✅ Better UX feedback (disable submit during save, show success message)
- ✅ Input sanitization (uppercase variety automatically)
- ✅ Default values (today's date, "GOOD" health)
- ✅ Field help text/placeholders
- ✅ Error messages for validation failures

**Design Considerations:**
- Keep 80s terminal theme
- Mobile-first (large touch targets)
- Minimal but clear

---

### 1.3 Add Block Management
**Status:** ✅ Complete

**Goal:** Allow users to create and manage vineyard blocks instead of hardcoded dropdown.

**Completed Implementation:**

1. **Database Schema:**
   ```sql
   CREATE TABLE block (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,           -- "BLOCK A", "NORTH FIELD", etc.
     location TEXT,                -- Optional description
     size_acres NUMERIC,           -- Optional
     soil_type TEXT,               -- Optional
     notes TEXT,
     created_at BIGINT NOT NULL,
     updated_at BIGINT NOT NULL
   );

   -- Add foreign key to vine table
   ALTER TABLE vine ADD CONSTRAINT fk_block
     FOREIGN KEY (block) REFERENCES block(id);
   ```

2. **UI Components:**
   - ✅ Block filtering in vineyard view
   - ✅ "Add Block" button in vineyard header
   - ✅ Block creation modal (name, location, optional fields)
   - ✅ Block edit functionality
   - ✅ Block deletion (with migration options if vines exist)
   - ✅ Vine creation form loads blocks dynamically

3. **Zero/Electric Schema:**
   - ✅ Added `block` table to schema.ts
   - ✅ Defined permissions (ANYONE_CAN for now)
   - ✅ Compiled schema.js
   - ✅ Tested sync

**Navigation Flow:**
```
/vineyard
  ├─ Vine list (current)
  ├─ Add Vine button
  └─ Blocks button → /vineyard/blocks
       ├─ Block list
       ├─ Add Block button
       └─ Block details (edit/delete)
```

---

### 1.4 Add Quantity Field (Batch Vine Creation)
**Status:** ✅ Complete

**Goal:** Create multiple identical vines at once instead of one-by-one.

**Use Case:**
User plants 50 Cabernet Sauvignon vines in Block A on the same day. Rather than filling out the form 50 times, they specify quantity=50 and all vines are created with sequential IDs.

**Completed Implementation:**

1. **Form Updated:**
   ```jsx
   <div className={styles.formGroup}>
     <label className={styles.formLabel}>QUANTITY</label>
     <input
       type="number"
       name="quantity"
       className={styles.formInput}
       min="1"
       max="100"
       defaultValue="1"
       required
     />
     <div className={styles.formHint}>
       Number of vines to create (max 100)
     </div>
   </div>
   ```

2. **ID Generation Logic:**
   Current: `generateVineId(block, vines)` → "A-001"

   Updated: Generate sequential IDs:
   ```typescript
   const generateVineIds = (block: string, vines: any[], quantity: number): string[] => {
     const blockVines = vines.filter(v => v.block === block);
     const maxNumber = blockVines.length > 0
       ? Math.max(...blockVines.map(v => parseInt(v.id.split('-')[1])))
       : 0;

     return Array.from({ length: quantity }, (_, i) => {
       const nextNumber = (maxNumber + i + 1).toString().padStart(3, '0');
       return `${block}-${nextNumber}`;
     });
   };
   ```

3. **Batch Insert:**
   ```typescript
   const handleAddVines = async (vineData, quantity) => {
     const ids = generateVineIds(vineData.block, vines, quantity);
     const now = Date.now();

     // Insert all vines
     for (let i = 0; i < ids.length; i++) {
       const sequenceNumber = parseInt(ids[i].split('-')[1]);

       await z.mutate.vine.insert({
         id: ids[i],
         block: vineData.block,
         sequenceNumber,
         variety: vineData.variety.toUpperCase(),
         plantingDate: vineData.plantingDate.getTime(),
         health: vineData.health,
         notes: vineData.notes || '',
         qrGenerated: 0,
         createdAt: now,
         updatedAt: now,
       });
     }

     // Show success message with count
     setSuccessMessage(`Created ${quantity} vine(s) successfully`);
   };
   ```

4. **UX Implemented:**
   - ✅ Form disabled during batch insert
   - ✅ Success message shows count and ID range
   - ✅ Errors handled gracefully
   - ✅ Navigation to created vine (single) or success message (batch)

**Success Criteria Met:**
- ✅ User can create 1-100 vines at once
- ✅ All vines get sequential IDs
- ✅ User sees success confirmation with count

---

## Phase 2: QR Code & 3D Printable Tags

### 2.1 QR Code Generation (Current Implementation)
**Status:** ✅ Partially Complete

**What Works:**
- Generate QR code from vine URL
- Display QR code in modal
- Download as SVG

**Current Code (App.tsx):**
```typescript
const vineUrl = `${window.location.origin}/vineyard/vine/${vine.id}`;

// Generate QR and download SVG
const handleDownloadSVG = async () => {
  const svg = await QRCode.toString(vineUrl, {
    type: 'svg',
    width: 400,
    margin: 2,
  });

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vine-${vine.id}.svg`;
  link.click();
  URL.revokeObjectURL(url);
};
```

**What's Missing:**
- SVG → STL conversion
- 3D printable stake design

---

### 2.2 QR Code to STL Workflow
**Status:** 🔄 In Progress

**Goal:** Build Axum backend for migrations, file operations, and STL generation from QR codes.

**Workflow:**
```
Vine URL → QR Code → SVG → STL → 3D Print
```

**Stake Design Requirements:**

1. **Physical Specifications:**
   - Stake for ground insertion (pointed bottom)
   - Flat top surface with QR code
   - Weatherproof design (drainage, UV resistance)
   - Durable material (PETG or ASA recommended)

2. **Dimensions (suggested):**
   - Height: 6-8 inches (stake portion)
   - Top plate: 3x3 inches (QR code area)
   - Thickness: 3-5mm (sturdy but printable)
   - Point depth: 2 inches (for ground insertion)

3. **Design Elements:**
   ```
   ┌─────────────────┐
   │   QR CODE       │  ← Top plate (flat surface)
   │   (raised)      │
   └─────────────────┘
         │ │           ← Stake shaft
         │ │
         │ │
         └▼            ← Pointed end for ground
   ```

**Implementation Decision: Axum Backend**

We're building an Axum (Rust) backend to handle:
- Database migrations (using sqlx-cli)
- File storage and serving
- STL generation from QR codes
- Future: Complex business logic Zero can't handle

**Why Backend is Necessary:**
- Zero is a sync engine, not a full backend framework
- STL generation requires server-side 3D modeling
- Need proper migration system for schema changes
- File operations better handled server-side

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
   │   - API calls      │
   └────────────────────┘
```

---

#### Step 1: Backend Setup & Migrations

**Tasks:**

- [ ] **1.1 Create Axum Project**
  - Initialize Rust workspace: `backend/` directory
  - Dependencies: `axum`, `tokio`, `sqlx`, `tower`, `tower-http`
  - Basic project structure

- [ ] **1.2 Database Connection**
  - Set up SQLx connection pool
  - Create `GET /health` endpoint
  - Test database connectivity

- [ ] **1.3 Migration System**
  - Install `sqlx-cli`: `cargo install sqlx-cli --features postgres`
  - Create `migrations/` directory
  - Move current schema to migration: `001_initial_schema.sql`
  - Tables: `vineyard`, `block`, `vine`
  - Run migrations on backend startup

- [ ] **1.4 Test Locally**
  - Run backend with local PostgreSQL
  - Verify migrations execute correctly
  - Test idempotency (re-run doesn't break)

**Dependencies:**
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres", "migrate"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["fs", "cors"] }
serde = { version = "1", features = ["derive"] }
```

---

#### Step 2: File Storage Infrastructure

**Tasks:**

- [ ] **2.1 Choose Storage Strategy**
  - Decision needed: Railway volumes vs S3/R2
  - Railway volumes: Simpler, coupled to Railway
  - S3/R2: More flexible, portable

- [ ] **2.2 File Upload Endpoint**
  - Create `POST /api/files/upload`
  - Accept multipart form data
  - Store with unique ID
  - Return file URL/ID

- [ ] **2.3 File Serving Endpoint**
  - Create `GET /api/files/:id`
  - Stream file from storage
  - Set content-type headers
  - Handle 404s

- [ ] **2.4 File Management**
  - Decide on retention policy
  - Optional: Cleanup job for old files

---

#### Step 3: STL Generation

**Current State:** Using command-line tool outside app (manual workflow via imagetostl.com)

**Goal:** Move STL generation to backend job, save files, expose in UI

**Tasks:**

- [ ] **3.1 Research STL Libraries**
  - Options: Rust `truck`, `opencascade-rs`, or shell out to OpenSCAD
  - Evaluate: ease of use, documentation, maintenance
  - Document decision

- [ ] **3.2 QR SVG → STL Conversion**
  - Create Rust module for conversion
  - Input: QR code SVG string + stake dimensions
  - Output: STL file bytes
  - Test with sample QR codes

- [ ] **3.3 STL Generation Endpoint**
  - Create `POST /api/vine/:id/generate-stl`
  - Generate QR code on backend
  - Convert to 3D stake STL
  - Store file in file storage
  - Return file URL

- [ ] **3.4 Background Jobs (Optional)**
  - If generation is slow (>2s), use job queue
  - Options: `tokio::spawn`, dedicated queue
  - Status endpoint: `GET /api/vine/:id/stl-status`

**Endpoint Design:**
```rust
// POST /api/vine/:id/generate-stl
async fn generate_stl(
    Path(vine_id): Path<String>,
) -> Result<Json<GenerateStlResponse>, StatusCode> {
    // 1. Generate QR code for vine URL
    // 2. Convert to 3D stake STL
    // 3. Save file to storage
    // 4. Return file URL
}
```

---

#### Step 4: Frontend Integration

**Tasks:**

- [ ] **4.1 Update QR Modal**
  - Add "GENERATE 3D STAKE" button
  - Call `POST /api/vine/:id/generate-stl`
  - Show loading state
  - Download STL when ready

- [ ] **4.2 Batch Generation**
  - "BATCH GENERATE STAKES" button
  - Endpoint: `POST /api/block/:id/generate-stls`
  - Generate STLs for all vines in block
  - Return ZIP or array of URLs

- [ ] **4.3 Display Generated Files**
  - List previously generated STL files per vine
  - "Re-download" button
  - Timestamp of generation

**Frontend Code:**
```typescript
const handleGenerateStake = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_URL}/api/vine/${vine.id}/generate-stl`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await getToken()}` },
    });

    const { fileUrl } = await response.json();

    // Download STL file
    window.open(fileUrl, '_blank');
  } catch (error) {
    console.error('Error generating STL:', error);
  } finally {
    setLoading(false);
  }
}
```

---

#### Step 5: Railway Deployment

**Tasks:**

- [ ] **5.1 Add Axum Service to Railway**
  - Create new service from GitHub repo
  - Set build command: `cargo build --release --bin backend`
  - Set start command: `./target/release/backend`
  - Link to PostgreSQL service

- [ ] **5.2 Environment Variables**
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
  - `PORT=3001`
  - `FILE_STORAGE_PATH=/app/storage` (or S3 credentials)
  - `RUST_LOG=info`

- [ ] **5.3 Update Frontend Environment**
  - Netlify: Add `PUBLIC_API_URL=https://backend.railway.app`
  - Update API calls to use `PUBLIC_API_URL`

- [ ] **5.4 Test Full Stack**
  - Create vine on production
  - Generate STL via backend
  - Download and verify STL file
  - Test batch generation

**Success Criteria:**
- ✅ Migrations run automatically on Railway deploy
- ✅ Backend serves health check
- ✅ Can generate STL from vine QR code
- ✅ Frontend displays generated STL files
- ✅ Batch generation works for entire block
- ✅ No manual SQL commands needed

---

#### Technical Decisions Needed

1. **File Storage**: Railway volumes vs S3/R2?
2. **STL Library**: Which Rust library for 3D modeling?
3. **Job Queue**: Synchronous generation vs background jobs?
4. **File Retention**: Keep files forever or expire after X days?
5. **Authentication**: How does backend verify Clerk JWT tokens?

---

#### Timeline Estimate

- **Step 1 (Backend + Migrations):** 4-6 hours
- **Step 2 (File Storage):** 3-4 hours
- **Step 3 (STL Generation):** 6-10 hours (depends on library complexity)
- **Step 4 (Frontend Integration):** 3-4 hours
- **Step 5 (Deployment):** 2-3 hours

**Total:** ~18-27 hours of focused work

---

### 2.3 QR Code Scanning
**Status:** ⏳ Planned (after tags are working)

**Goal:** Scan vine tags in the field to view/edit vine details.

**Implementation:**
- Use device camera
- Library: `html5-qrcode` or `react-qr-reader`
- Scan → decode URL → navigate to vine details
- Mobile-optimized (large scan button, fullscreen camera)

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
1. Create feature branch from main (or electricsql if using that)
2. Implement minimal viable version
3. Test thoroughly (manual + user acceptance)
4. Update documentation
5. Merge to main when stable

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

**Last Updated:** Nov 10, 2025
**Current Phase:** Phase 2.2 (Axum Backend + STL Generation)
**Completed:** Phase 1 (Core Vine Management) - All features complete
**Next Up:** Backend setup → File storage → STL generation → Deployment
