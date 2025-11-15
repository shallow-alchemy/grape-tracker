# Vintages UI Planning

**Status:** Planning Phase (Nov 14, 2025)
**Backend:** ✅ Complete (migrations, schema, seed data)
**Related Docs:**
- [Winery Frontend Plan](./winery-frontend-plan.md) - Wine production workflow (separate from vintages)
- [Roadmap](./roadmap.md) - Overall project roadmap

---

## Overview

The vintages view tracks grape harvests from the growing season through harvest. Vintages represent **source material** (grapes) that will later be used to create wines. This is a separate concern from wine production, which is covered in the winery frontend plan.

**Key Concept:**
- **Vintage** = Harvest record (e.g., "2024 Cabernet Sauvignon harvest")
- **Wine** = Product made from vintage (e.g., "Lodi Red" made from 2024 Cab Franc)
- Multiple wines can be created from a single vintage (red, rosé, etc.)

---

## Data Model

### Vintage Table Schema
```typescript
{
  id: string,                      // e.g., "2024-cabernet-sauvignon"
  vineyard_id: string,             // FK to vineyard
  vintage_year: number,            // 2024
  variety: string,                 // "Cabernet Sauvignon"
  block_ids: json,                 // Array of block IDs harvested
  current_stage: string,           // bud_break → harvest (growing stages)
  harvest_date: number,            // Timestamp
  harvest_weight_lbs: number?,     // Optional
  harvest_volume_gallons: number?, // Optional
  brix_at_harvest: number?,        // Optional (0-40 range)
  notes: string,                   // General notes
  created_at: number,
  updated_at: number,
}
```

### Vintage Stages (Growing Season)
1. **bud_break** - Spring bud emergence
2. **flowering** - Vine flowering
3. **fruiting** - Fruit set
4. **veraison** - Grapes begin ripening
5. **pre_harvest** - Final ripening before harvest
6. **harvest** - Grapes picked

*Note: Wine production stages (crush, fermentation, etc.) belong to the wine entity, not vintage.*

---

## Component Architecture

```
WineryView (container)
├── WineryViewHeader (navigation + actions)
├── VintagesList (list view)
├── VintageDetailsView (detail view)
├── AddVintageModal (✅ already exists)
├── EditVintageModal (to create)
├── DeleteVintageConfirmModal (to create)
└── StageTransitionModal (future - for stage progression)
```

---

## Visual Design

Following Gilbert's 80s terminal aesthetic:

### Colors
- **Background**: `#1a1c1a` (faded black)
- **Surface**: `#212421` (elevated surface)
- **Border**: `#3a3f3a` (subtle border)
- **Text Primary**: `#d8e2d8` (light green-gray)
- **Text Accent**: `#65a165` (muted green)
- **Text Muted**: `#627062` (very muted)
- **Success**: `#4a8d4a` (for completed stages)

### Typography
- **Headings**: Monaco, Menlo, Ubuntu Mono (monospace)
- **Vintage title**: `var(--font-size-xl)` (1.25rem)
- **Section headers**: `var(--font-size-base)` (1rem)
- **Body text**: `var(--font-size-sm)` (0.875rem)

### Effects
- **Card shadow**: `var(--shadow-glow)` - subtle green glow
- **Border radius**: `var(--radius-md)` (0.375rem)
- **Transitions**: `var(--transition-normal)` (250ms)

---

## Component Specifications

### 1. WineryView (Main Container)

**Responsibilities:**
- Route handling (list vs detail view)
- State management for modals
- Success message display
- Data fetching via Zero hooks

**State:**
```typescript
const [selectedVintage, setSelectedVintage] = useState<string | null>(null);
const [showAddModal, setShowAddModal] = useState(false);
const [showEditModal, setShowEditModal] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
```

**Data Hooks:**
```typescript
const vintages = useVintages(); // Query all vintages
const vineyard = useVineyard(); // Get vineyard context
const blocks = useBlocks(); // For block display
```

**URL Structure:**
- `/winery` - List view (default)
- `/winery/vintage/:id` - Detail view

---

### 2. WineryViewHeader

**Desktop Layout:**
```
┌──────────────────────────────────────────────────┐
│ [< BACK]  WINERY               [+ ADD VINTAGE] │
└──────────────────────────────────────────────────┘
```

**Mobile Layout:**
```
┌──────────────────────────────────────────────────┐
│              [< BACK]  WINERY                    │
└──────────────────────────────────────────────────┘

                    (Floating FAB at bottom)
                   [+ ADD VINTAGE]
```

**Props:**
```typescript
type WineryViewHeaderProps = {
  onAddVintage: () => void;
  onBack?: () => void; // Only shown in detail view
};
```

---

### 3. VintagesList

**Card Layout:**
```
┌─────────────────────────────────────────┐
│ 2024 CABERNET SAUVIGNON            [>] │
│ ─────────────────────────────────────── │
│ STAGE: Harvest                          │
│ HARVEST: Oct 15, 2024                   │
│ WEIGHT: 450 lbs  |  BRIX: 24.5°         │
└─────────────────────────────────────────┘
```

**Features:**
- Sort by year (newest first by default)
- Filter by variety (optional)
- Empty state when no vintages
- Loading state during data fetch
- Click to navigate to detail view
- Grid layout on desktop (2 columns), stacked on mobile

**Styling:**
```css
.vintagesList {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
}

@media (min-width: 768px) {
  .vintagesList {
    grid-template-columns: repeat(2, 1fr);
  }
}

.vintageCard {
  background: var(--color-surface);
  border: var(--spacing-px) solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.vintageCard:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-glow);
}
```

**Empty State:**
```
┌─────────────────────────────────────────┐
│                                         │
│         NO VINTAGES YET                 │
│                                         │
│    Click "ADD VINTAGE" to track        │
│      your first harvest season         │
│                                         │
└─────────────────────────────────────────┘
```

---

### 4. VintageDetailsView

**Layout:**
```
┌─────────────────────────────────────────┐
│ [<] 2024 CABERNET SAUVIGNON        [⚙] │
├─────────────────────────────────────────┤
│                                         │
│ GROWING SEASON                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ BUD BREAK → FLOWERING → FRUITING →     │
│ VERAISON → PRE-HARVEST → [HARVEST] ✓   │
│                                         │
│ HARVEST DETAILS                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ DATE: October 15, 2024                  │
│ WEIGHT: 450 lbs                         │
│ VOLUME: 35 gallons                      │
│ BRIX: 24.5°                             │
│                                         │
│ BLOCKS HARVESTED                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [North Block] [South Block]             │
│                                         │
│ NOTES                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Perfect weather during veraison...      │
│                                         │
│ ACTIONS                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [CREATE WINE]  [EDIT]  [DELETE]        │
└─────────────────────────────────────────┘
```

**Sections:**

1. **Header**
   - Back button (left)
   - Vintage title: `{year} {variety}` (center/left)
   - Settings gear (right)

2. **Stage Progress Bar**
   - Visual timeline of vintage stages
   - Completed stages: green checkmark (✓)
   - Current stage: pulsing green dot (●)
   - Future stages: muted gray (—)
   - Click to advance stage (future feature)

3. **Harvest Details**
   - Date (formatted: "October 15, 2024")
   - Weight (lbs) - show "—" if null
   - Volume (gallons) - show "—" if null
   - Brix (degrees) - show "—" if null

4. **Blocks Harvested**
   - Pills/chips showing block names
   - Click to navigate to block view (optional)
   - Empty state: "No blocks assigned"

5. **Notes Section**
   - Multi-line text display
   - Empty state: "No notes"

6. **Actions**
   - "CREATE WINE" button (primary) - creates wine from this vintage
   - "EDIT" button (secondary) - opens EditVintageModal
   - "DELETE" button (danger, bottom) - opens DeleteVintageConfirmModal

**Stage Visual Design:**
```
BUD BREAK → FLOWERING → FRUITING → VERAISON → PRE-HARVEST → HARVEST
    ✓           ✓           ✓          ●            —            —

Legend:
✓ = Completed (green, var(--color-success))
● = Current (pulsing green dot, var(--color-text-accent))
— = Not started (muted gray, var(--color-text-muted))
```

**Props:**
```typescript
type VintageDetailsViewProps = {
  vintage: Vintage;
  onUpdateSuccess: (message: string) => void;
  onDeleteSuccess: (message: string) => void;
  navigateBack: () => void;
};
```

---

### 5. EditVintageModal

**Purpose:** Update vintage harvest information

**Fields:**
- Vintage Year (disabled - cannot change)
- Variety (disabled - cannot change)
- Harvest Date (date picker)
- Harvest Weight (number input, optional, min: 0)
- Harvest Volume (number input, optional, min: 0)
- Brix at Harvest (number input, optional, 0-40 range)
- Notes (textarea)

**Validation:**
- Brix must be 0-40 if provided
- Harvest date cannot be in future
- Weight/volume must be positive if provided

**Form Actions:**
- "CANCEL" (secondary)
- "SAVE CHANGES" (primary)

**Pattern:**
- Same as AddVintageModal but pre-populated
- Uses `zero.mutate.vintage.update()`
- Closes on success, shows error inline on failure
- Updates `updated_at` timestamp

---

### 6. DeleteVintageConfirmModal

**Warning Message:**
```
┌─────────────────────────────────────────┐
│ DELETE VINTAGE?                         │
├─────────────────────────────────────────┤
│                                         │
│ Are you sure you want to delete the     │
│ 2024 Cabernet Sauvignon vintage?        │
│                                         │
│ This will also delete:                  │
│ • All associated wine records           │
│ • Stage history                         │
│ • Task history                          │
│ • Measurements                          │
│                                         │
│ This action cannot be undone.           │
│                                         │
│ [CANCEL]            [DELETE VINTAGE]   │
└─────────────────────────────────────────┘
```

**Behavior:**
- Delete button uses danger color (`#cc3838`)
- Cascade delete related records (wines, stage_history, tasks, measurements)
- Show success message after deletion
- Navigate back to list view

**Cascade Delete Logic:**
```typescript
// 1. Delete all wines made from this vintage
const wines = await zero.query.wine
  .where('vintage_id', vintageId)
  .run();

for (const wine of wines) {
  // Delete wine's tasks, measurements, stage_history
  await zero.mutate.task.delete({ where: { entity_id: wine.id } });
  await zero.mutate.measurement.delete({ where: { entity_id: wine.id } });
  await zero.mutate.stage_history.delete({ where: { entity_id: wine.id } });
  await zero.mutate.wine.delete({ id: wine.id });
}

// 2. Delete vintage's stage_history
await zero.mutate.stage_history.delete({
  where: { entity_id: vintageId }
});

// 3. Delete vintage
await zero.mutate.vintage.delete({ id: vintageId });
```

---

## Responsive Design

### Mobile (<768px)
- Single column layout
- Floating action button (FAB) for "Add Vintage"
- Full-width cards
- Stage progress: horizontal scroll if needed
- Actions stacked vertically
- Bottom padding for FAB clearance (33.33vh)

### Desktop (≥768px)
- Two-column grid for vintage list
- Side-by-side action buttons
- Inline "Add Vintage" button in header
- Larger typography and spacing
- Hover states for interactivity

---

## Interactions & States

### Loading States
```typescript
{isLoading && (
  <div className={styles.loading}>
    LOADING VINTAGES...
  </div>
)}
```

### Error States
```typescript
{error && (
  <div className={styles.error}>
    ERROR: {error.message}
  </div>
)}
```

### Success Messages
- Auto-dismiss after 3 seconds
- Green accent color
- Fixed position at top of view
- Slide-in animation

**Example:**
```
┌─────────────────────────────────────────┐
│ ✓ Vintage updated successfully          │
└─────────────────────────────────────────┘
```

---

## Data Hooks Pattern

Following the established vineyard pattern in `vineyard-hooks.ts`:

**Add to `src/components/vineyard-hooks.ts`:**

```typescript
export const useVintages = (): Vintage[] => {
  const zero = useZero();
  const [vintages, setVintages] = useState<Vintage[]>([]);

  useEffect(() => {
    const query = zero.query.vintage
      .orderBy('vintage_year', 'desc')
      .orderBy('variety', 'asc');

    const unsubscribe = query.subscribe((results) => {
      setVintages(results);
    });

    return unsubscribe;
  }, [zero]);

  return vintages;
};

export const useVintage = (id: string): Vintage | null => {
  const zero = useZero();
  const [vintage, setVintage] = useState<Vintage | null>(null);

  useEffect(() => {
    const query = zero.query.vintage.where('id', id);

    const unsubscribe = query.subscribe((results) => {
      setVintage(results[0] || null);
    });

    return unsubscribe;
  }, [zero, id]);

  return vintage;
};
```

---

## File Structure

**New Files:**
```
src/components/winery/
├── WineryView.tsx (update existing stub)
├── WineryViewHeader.tsx
├── VintagesList.tsx
├── VintageDetailsView.tsx
├── EditVintageModal.tsx
├── DeleteVintageConfirmModal.tsx
├── winery-types.ts (type definitions)
└── winery-utils.ts (data transformations)
```

**Shared Files:**
```
src/components/
├── vineyard-hooks.ts (add vintage hooks)
└── Modal.tsx (reuse existing)

src/
└── App.module.css (add winery styles)
```

---

## CSS Module Classes

**Add to `App.module.css`:**

```css
/* Winery Container */
.wineryContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Vintage List */
.vintagesList {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

@media (min-width: 768px) {
  .vintagesList {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Vintage Card */
.vintageCard {
  background: var(--color-surface);
  border: var(--spacing-px) solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.vintageCard:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-glow);
}

/* Stage Progress */
.stageProgress {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  overflow-x: auto;
  padding: var(--spacing-md) 0;
}

.stage {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

.stageCompleted {
  color: var(--color-success);
}

.stageCurrent {
  color: var(--color-text-accent);
  animation: pulse 2s infinite;
}

.stagePending {
  color: var(--color-text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Empty State */
.emptyState {
  text-align: center;
  padding: var(--spacing-5xl);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

/* Section Headers */
.sectionHeader {
  font-family: var(--font-heading);
  font-size: var(--font-size-base);
  color: var(--color-text-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--spacing-md);
  border-bottom: var(--spacing-px) solid var(--color-border);
  padding-bottom: var(--spacing-sm);
}

/* Block Chips */
.blockChips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.blockChip {
  background: var(--color-surface-elevated);
  border: var(--spacing-px) solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.blockChip:hover {
  border-color: var(--color-border-accent);
  color: var(--color-text-accent);
}
```

---

## Accessibility

- **Keyboard Navigation**: Tab through all interactive elements
- **ARIA Labels**:
  - `aria-label="Add vintage"` on FAB
  - `aria-label="Edit vintage"` on gear icon
  - `aria-label="Delete vintage"` on delete button
  - `aria-label="Back to vintage list"` on back button
- **Focus States**: Visible outline on all focusable elements using `:focus-visible`
- **Screen Reader**: Announce success/error messages via `role="status"` or `role="alert"`
- **Semantic HTML**: Use `<nav>`, `<article>`, `<section>`, `<button>`, `<h1>`-`<h6>`
- **Color Contrast**: All text meets WCAG AA standards (4.5:1 minimum)

---

## Implementation Order

### Priority 1 (MVP - Current Sprint)
1. ✅ AddVintageModal (already complete)
2. Update `WineryView.tsx` with routing logic
3. Create `WineryViewHeader.tsx`
4. Create `VintagesList.tsx` with basic card layout
5. Create `VintageDetailsView.tsx` with read-only display
6. Add vintage hooks to `vineyard-hooks.ts`
7. Test end-to-end flow (create → view → navigate)

### Priority 2 (Next Sprint)
8. Create `EditVintageModal.tsx`
9. Create `DeleteVintageConfirmModal.tsx`
10. Add settings gear to detail view header
11. Implement delete cascade logic
12. Add filtering/sorting to list view
13. Test edit and delete flows

### Priority 3 (Future)
14. Stage progression UI with stage_history tracking
15. "Create Wine" button integration (links to wine creation workflow)
16. Block assignment chips with navigation
17. Vintage comparison view (side-by-side)
18. Export vintage data (CSV/PDF)

---

## Integration with Wine Workflow

The vintage view is the **starting point** for wine production:

1. **User creates vintage** (harvest record) via AddVintageModal
2. **User views vintage** in VintagesList or VintageDetailsView
3. **User clicks "CREATE WINE"** button in VintageDetailsView
4. **Triggers AddWineModal** (from winery-frontend-plan.md) with vintage_id pre-filled
5. **Wine production begins** with separate wine entity and workflow

**Key Design Decision:**
- Vintages and wines are **separate but linked** entities
- Vintages track growing season (source material)
- Wines track production (product lifecycle)
- This plan focuses ONLY on vintage management
- Wine production is covered in [winery-frontend-plan.md](./winery-frontend-plan.md)

---

## Success Criteria

✅ **Functional:**
- User can view all vintages in a list
- User can view vintage details
- User can edit vintage information
- User can delete vintage with confirmation
- Data syncs in real-time via Zero
- No console errors

✅ **Visual:**
- Follows 80s terminal theme
- Mobile-first responsive layout
- Smooth transitions and animations
- Loading/error states visible
- Consistent with vineyard management UI patterns

✅ **Performance:**
- List renders in <100ms for 50 vintages
- Detail view loads instantly
- No unnecessary re-renders
- Efficient Zero subscriptions (unsubscribe on unmount)

---

## Future Enhancements

**Phase 2:**
- Stage transition modal with stage_history tracking
- Vintage cloning (duplicate from previous year)
- Batch edit multiple vintages
- Photo uploads per vintage

**Phase 3:**
- Weather data correlation (link to weather API)
- Vintage comparison view (compare years side-by-side)
- Export vintage report (PDF with full harvest details)
- Analytics: yield per block, brix trends over years

---

**Last Updated:** Nov 14, 2025
**Status:** Planning Complete - Ready for Implementation
**Next Step:** Begin Priority 1 implementation
