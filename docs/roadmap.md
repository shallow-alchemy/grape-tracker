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
**Status:** ⏳ Planned

**Goal:** Convert QR code SVG into a 3D printable vine tag/stake.

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

**Implementation Options:**

**Option A: Client-Side (Browser)**
- Use library like `svg-to-3d` or `svg-mesh-3d`
- Generate STL in browser
- Download directly

Pros:
- No server needed
- Instant generation
- Works offline

Cons:
- Limited 3D modeling capabilities
- Browser performance for complex models

**Option B: Server-Side (Backend API)**
- Use OpenSCAD, CADQuery, or similar
- More control over stake design
- Better for complex geometries

Pros:
- Professional 3D modeling tools
- Precise control over dimensions
- Can optimize for 3D printing

Cons:
- Requires backend service
- Additional infrastructure

**Option C: Hybrid Approach (Recommended)**
- Generate QR SVG in browser (current)
- Send SVG to backend API
- Backend creates STL with stake design
- Return STL for download

**Recommended Libraries:**

1. **Python + OpenSCAD** (server-side):
   ```python
   from solid import *
   from solid.utils import *

   def create_vine_stake(qr_svg_path):
       # Create stake base
       stake = cylinder(h=150, r=5)
       stake = translate([0, 0, -150])(stake)

       # Create top plate
       plate = cube([75, 75, 3])
       plate = translate([-37.5, -37.5, 0])(plate)

       # Extrude QR code from SVG
       qr_code = linear_extrude(height=2)(
           import_svg(qr_svg_path)
       )
       qr_code = translate([-37.5, -37.5, 3])(qr_code)

       # Combine
       stake_assembly = stake + plate + qr_code

       # Add point
       point = cylinder(h=50, r1=5, r2=0)
       point = translate([0, 0, -200])(point)

       return stake_assembly + point
   ```

2. **Node.js + jscad** (server-side):
   ```javascript
   const { cylinder, cube, union, translate } = require('@jscad/modeling').primitives;
   const { extrudeLinear } = require('@jscad/modeling').extrusions;

   function createVineStake(qrSvg) {
     // Convert SVG path to 2D geometry
     const qrGeometry = svgToGeometry(qrSvg);

     // Extrude to 3D
     const qrCode = extrudeLinear({ height: 2 }, qrGeometry);

     // Create stake components
     const stake = cylinder({ height: 150, radius: 5 });
     const plate = cube({ size: [75, 75, 3] });
     const point = cylinder({ height: 50, radius1: 5, radius2: 0 });

     // Assemble
     return union(
       translate([0, 0, -150], stake),
       translate([-37.5, -37.5, 0], plate),
       translate([-37.5, -37.5, 3], qrCode),
       translate([0, 0, -200], point)
     );
   }
   ```

**Implementation Tasks:**

- [ ] Research and choose 3D library (OpenSCAD vs jscad vs other)
- [ ] Design stake geometry (dimensions, point, drainage)
- [ ] Implement SVG → STL conversion
- [ ] Add backend API endpoint: POST /api/vine/:id/generate-stl
- [ ] Update UI to download STL instead of/in addition to SVG
- [ ] Test print on 3D printer
- [ ] Iterate on design (size, durability, readability)
- [ ] Document printing settings (material, infill, supports)

**Backend API Endpoint:**
```typescript
// server.js or new stl-generator.js
app.post('/api/vine/:id/generate-stl', async (req, res) => {
  const { id } = req.params;
  const { qrSvg } = req.body; // SVG string from frontend

  try {
    // Generate 3D model with QR code
    const stl = await generateVineStakeSTL(qrSvg, {
      stakeHeight: 150,      // mm
      plateSize: 75,         // mm
      qrRaiseHeight: 2,      // mm
      pointLength: 50,       // mm
    });

    // Return STL file
    res.setHeader('Content-Type', 'application/sla');
    res.setHeader('Content-Disposition', `attachment; filename="vine-${id}.stl"`);
    res.send(stl);
  } catch (error) {
    console.error('Error generating STL:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Frontend Update:**
```typescript
const handleGenerateStake = async () => {
  // 1. Generate QR SVG
  const svg = await QRCode.toString(vineUrl, {
    type: 'svg',
    width: 400,
    margin: 2,
  });

  // 2. Send to backend
  const response = await fetch(`${API_URL}/api/vine/${vine.id}/generate-stl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrSvg: svg }),
  });

  // 3. Download STL
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vine-stake-${vine.id}.stl`;
  link.click();
  URL.revokeObjectURL(url);

  // 4. Mark QR as generated
  // ... existing code
};
```

**UI Updates:**
```jsx
// Add to vine details modal
<div className={styles.qrActions}>
  <button className={styles.formButton} onClick={handleDownloadSVG}>
    DOWNLOAD SVG
  </button>
  <button className={styles.formButton} onClick={handleGenerateStake}>
    GENERATE 3D STAKE
  </button>
</div>
```

**3D Printing Documentation Needed:**
- Recommended materials (PETG, ASA for outdoor use)
- Print settings (layer height, infill, supports)
- Post-processing (cleanup, UV coating)
- Installation instructions
- Expected lifespan in vineyard conditions

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

**Last Updated:** Nov 9, 2025
**Current Phase:** Phase 2.2 (QR Code to STL Workflow)
**Completed:** Phase 1 (Core Vine Management) - All features complete
**Next Up:** Phase 2.2 → 2.3 → Phase 3
