# Gilbert - Comprehensive Code Cleanup Plan

**Review Date**: Nov 14, 2025
**Scope**: Complete React/TypeScript application
**Total Files**: 27 TypeScript/React files (~3,700 lines)
**Reviewer**: Claude Code

---

## Executive Summary

**Overall Grade: 5.5/10**

The codebase follows many engineering principles correctly (fat arrow functions, named exports, CSS Modules), but has **critical architectural issues** that will prevent scaling:

1. **App.tsx is bloated** (692 lines with 432-line embedded modal)
2. **Polling anti-pattern** instead of Zero subscriptions
3. **Duplicate WineryView files** (root level + winery folder)
4. **Backend URL hardcoded** in 3+ places
5. **Type safety issues** (`any` types, unsafe `as` casting)
6. **Console.log/error violations** throughout
7. **Circular dependency risk** (Weather → App.tsx import)

**Good News**: Most individual components are well-structured. This is primarily an **organization and architecture problem**, not a code quality problem.

---

## Architectural Analysis

### Current Structure

```
src/
├── App.tsx (692 lines) ⚠️ TOO LARGE
│   ├── WeatherAlertSettingsModal (432 lines) ❌ EXTRACT
│   ├── QRScanButton
│   ├── RecentActivity
│   ├── CurrentVintage
│   ├── SuppliesNeeded
│   ├── TaskManagement
│   ├── DesktopDashboard
│   ├── DashboardView
│   └── AppContent + routing
│
├── components/
│   ├── Vineyard (9 files, ~1,400 lines) ✅ Well organized
│   ├── Weather (3 files, ~270 lines) ⚠️ Imports from App.tsx
│   ├── Winery (2 dirs, duplicates) ❌ Needs consolidation
│   ├── Shared (Modal, ListItem, QRScanner) ✅ Good
│   └── Utils (vineyard-*, weather) ✅ Good separation
│
├── contexts/
│   └── ZeroContext.tsx ✅ Clean
│
└── utils/
    └── weather.ts ✅ Good separation
```

### Major Anti-Patterns Found

#### 1. Polling Instead of Subscriptions (CRITICAL)

**File**: `src/components/vineyard-hooks.ts`
**Lines**: 16, 34, 54

```typescript
// ❌ WRONG - Polling every second
useEffect(() => {
  const loadVines = async () => {
    const result = await zero.query.vine.run();
    setVinesData(result as VineDataRaw[]);
  };
  loadVines();

  const interval = setInterval(loadVines, 1000); // ❌ POLLING!
  return () => clearInterval(interval);
}, [zero]);
```

**Why This Is Critical**:
- Zero has built-in subscriptions for real-time updates
- Polling wastes CPU/network, misses instant updates
- Can cause race conditions with rapid state changes

**Fix** (applies to `useVines`, `useBlocks`, `useVineyard`):
```typescript
// ✅ CORRECT - Zero subscription
useEffect(() => {
  const query = zero.query.vine;
  const unsubscribe = query.subscribe((results) => {
    setVinesData(results as VineDataRaw[]);
  });

  return unsubscribe; // Zero handles cleanup
}, [zero]);
```

#### 2. Backend URL Duplication

**Locations**:
- `App.tsx:90, 122`
- `utils/weather.ts:36`
- Likely more in upcoming winery code

**Fix**: Create `src/config.ts`:
```typescript
export const getBackendUrl = () =>
  import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
```

#### 3. Duplicate WineryView Files

**Files**:
- `/src/components/WineryView.tsx` (64 lines, old, inline styles)
- `/src/components/winery/WineryView.tsx` (29 lines, stub for tests)

**Analysis**: Root-level file is functional but uses inline styles. Winery folder file is a test stub.

**Fix**: Delete root-level file, implement proper WineryView in winery folder per vintages_ui_planning.md

---

## File-by-File Cleanup Plan

### CRITICAL PRIORITY

#### 1. `src/App.tsx` (692 lines → target: <100 lines)

**Issues**:
- 432-line WeatherAlertSettingsModal embedded
- 130 lines of desktop dashboard components
- Backend URL duplicated (lines 90, 122)
- Routing mixed with component definitions
- Inconsistent Route patterns

**Changes Required**:

**STEP 1**: Extract WeatherAlertSettingsModal
- Create `src/components/weather/WeatherAlertSettingsModal.tsx`
- Move AlertSettings type to `src/components/weather/types.ts`
- Move defaultAlertSettings constant with modal
- Update Weather.tsx import from `../App` to `./weather/WeatherAlertSettingsModal`

**STEP 2**: Extract desktop dashboard
- Create `src/components/dashboard/DesktopDashboard.tsx`
- Move all 5 components: RecentActivity, CurrentVintage, SuppliesNeeded, TaskManagement, DesktopDashboard
- Export all from single file

**STEP 3**: Extract DashboardView
- Create `src/components/dashboard/DashboardView.tsx`
- Move DashboardView + QRScanButton

**STEP 4**: Clean up App.tsx
- Should only contain: AppContent (routing) + App (provider wrapper)
- Standardize all Route definitions to use render props
- Remove backend URL duplication

**Final Structure**:
```typescript
// App.tsx after cleanup (~60 lines)
export const AppContent = () => (
  <div className={styles.app}>
    <header>...</header>
    <Route path="/">{() => <DashboardView />}</Route>
    <Route path="/vineyard/vine/:id">
      {(params) => <VineyardView initialVineId={params.id} />}
    </Route>
    <Route path="/vineyard/block/:id">
      {(params) => <VineyardView initialBlockId={params.id} />}
    </Route>
    <Route path="/vineyard">{() => <VineyardView />}</Route>
    <Route path="/winery">{() => <WineryView />}</Route>
  </div>
);

export const App = () => (
  <ZeroProvider>
    <Router>
      <AppContent />
    </Router>
  </ZeroProvider>
);
```

---

#### 2. `src/components/vineyard-hooks.ts` (59 lines)

**Issues**:
- ❌ CRITICAL: Polling with setInterval instead of Zero subscriptions (lines 16, 34, 54)
- Unsafe `as` casting without validation (lines 12, 30, 49)
- Depends on `zero` but should depend on stable instance

**Changes Required**:

```typescript
// Before (WRONG):
const interval = setInterval(loadVines, 1000);
return () => clearInterval(interval);

// After (CORRECT):
const query = zero.query.vine;
const unsubscribe = query.subscribe((results) => {
  setVinesData(results as VineDataRaw[]);
});
return unsubscribe;
```

**Apply to all three hooks**: `useVines`, `useBlocks`, `useVineyard`

**Additional fixes**:
- Remove `async/await` (not needed with subscriptions)
- Consider adding type guards instead of `as` casting
- Add error handling for subscription failures

---

#### 3. `src/components/WineryView.tsx` (DELETE THIS FILE)

**Issue**: Duplicate file at root level. The real implementation should be in `/winery/` folder.

**Actions**:
1. ❌ Delete `/src/components/WineryView.tsx` (root level)
2. ✅ Keep `/src/components/winery/WineryView.tsx`
3. Update App.tsx import to: `import { WineryView } from './components/winery/WineryView';`
4. Implement proper WineryView per vintages_ui_planning.md

---

#### 4. `src/components/Weather.tsx` (156 lines)

**Issues**:
- Line 4: Imports WeatherAlertSettingsModal from App.tsx (circular dependency risk)
- Lines 35, 47, 60, 66: console.error violations (should show in UI)
- Backend URL duplication (via weather.ts)
- Error swallowed without user feedback

**Changes Required**:

**STEP 1**: Update import after modal extraction
```typescript
// Before:
import { WeatherAlertSettingsModal } from '../App';

// After:
import { WeatherAlertSettingsModal } from './weather/WeatherAlertSettingsModal';
```

**STEP 2**: Show errors in UI instead of console
```typescript
// Add error state display:
{error && (
  <div className={styles.weatherError}>
    ⚠ {error}
  </div>
)}
```

**STEP 3**: Remove all console.error calls (lines 35, 47, 60, 66)

---

#### 5. `src/utils/weather.ts` (45 lines)

**Issues**:
- Line 36: Backend URL hardcoded (duplication)

**Changes Required**:
```typescript
// Before:
const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';

// After:
import { getBackendUrl } from '../config';
const backendUrl = getBackendUrl();
```

---

### HIGH PRIORITY

#### 6. `src/components/VineDetailsView.tsx` (392 lines)

**Issues**:
- Line 11: `vine: any` - no type safety
- Should have explicit VineDetailsData type

**Changes Required**:

Create proper type in `vineyard-types.ts`:
```typescript
export type VineDetailsData = {
  id: string;
  block: string;
  variety: string;
  plantingDate: Date;
  age: string;
  health: string;
  notes: string;
  qrGenerated: boolean;
};
```

Update prop type:
```typescript
// Before:
vine: any;

// After:
vine: VineDetailsData | null;
```

---

#### 7. `src/contexts/ZeroContext.tsx` (42 lines)

**Issues**:
- Line 35: Depends on `user?.id` - should just depend on `user`
- Loading div is not themed

**Changes Required**:

```typescript
// Before:
}, [user?.id]);

// After:
}, [user]);
```

Update loading state:
```typescript
// Before:
return <div>Loading...</div>;

// After:
return <div className={styles.loading}>LOADING...</div>;
```

---

#### 8. `src/components/winery/` folder

**Current State**:
- AddVintageModal.tsx (245 lines) ✅ Well-structured
- WineryView.tsx (29 lines) - stub for tests
- Multiple test files

**Issues**:
- WineryView needs full implementation per vintages_ui_planning.md
- Missing hooks file for winery (will need `useVintages`, `useVintage`)

**Changes Required**:

**STEP 1**: Create `winery-hooks.ts`:
```typescript
export const useVintages = () => {
  const zero = useZero();
  const [vintages, setVintages] = useState<Vintage[]>([]);

  useEffect(() => {
    const query = zero.query.vintage.orderBy('vintage_year', 'desc');
    const unsubscribe = query.subscribe((results) => {
      setVintages(results as Vintage[]);
    });
    return unsubscribe;
  }, [zero]);

  return vintages;
};
```

**STEP 2**: Implement WineryView.tsx per vintages_ui_planning.md

**STEP 3**: Add winery types to separate file

---

### MEDIUM PRIORITY

#### 9. `src/index.tsx` (32 lines)

**Issues**:
- Line 9: Uses `process.env` instead of `import.meta.env` (inconsistent)

**Changes Required**:
```typescript
// Before:
const publishableKey = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY!;

// After:
const publishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY!;
```

---

#### 10. Remaining Vineyard Components

**Files to Review**:
- AddVineModal.tsx (202 lines) - Check for self-contained pattern
- AddBlockModal.tsx (144 lines) - Check for self-contained pattern
- BlockSettingsModal.tsx (158 lines)
- DeleteBlockConfirmModal.tsx (186 lines)
- VineyardSettingsModal.tsx (160 lines)
- VineyardViewHeader.tsx (159 lines)

**Common patterns to enforce**:
1. Self-contained: Components fetch own data via hooks
2. Minimal props: Parent only passes callbacks + isOpen/onClose
3. No prop/query duplication
4. Proper error handling (UI, not console)

---

## New Files to Create

### REQUIRED (Critical Path)

1. **`src/config.ts`**
```typescript
export const getBackendUrl = () =>
  import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const getZeroServerUrl = () =>
  import.meta.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848';
```

2. **`src/components/weather/WeatherAlertSettingsModal.tsx`**
- Extract 432-line modal from App.tsx
- Move AlertSettings type
- Move defaultAlertSettings constant

3. **`src/components/weather/types.ts`**
```typescript
export type AlertSettings = {
  temperature: {
    enabled: boolean;
    highThreshold: number;
    lowThreshold: number;
    daysOut: number;
  };
  // ... rest of alert types
};
```

4. **`src/components/dashboard/DesktopDashboard.tsx`**
- Extract 5 desktop components from App.tsx

5. **`src/components/dashboard/DashboardView.tsx`**
- Extract DashboardView + QRScanButton from App.tsx

6. **`src/components/winery/winery-hooks.ts`**
- Create useVintages, useVintage hooks
- Use Zero subscriptions (NOT polling)

7. **`src/components/winery/winery-types.ts`**
- Vintage types
- Wine types (for future)

---

## Implementation Order

### Phase 1: Critical Fixes (DO FIRST)

**Priority**: Prevents technical debt from compounding

1. ✅ Create `src/config.ts` with backend URL helper
2. ✅ Fix polling in `vineyard-hooks.ts` → use Zero subscriptions
3. ✅ Delete duplicate `src/components/WineryView.tsx`
4. ✅ Extract WeatherAlertSettingsModal from App.tsx
5. ✅ Update Weather.tsx import
6. ✅ Remove all console.log/console.error calls

**Estimated Impact**:
- App.tsx: 692 → 260 lines
- vineyard-hooks.ts: Real-time sync working correctly
- No more circular dependency risk

---

### Phase 2: Architectural Cleanup (DO SECOND)

**Priority**: Improves maintainability, enables scaling

7. ✅ Extract DesktopDashboard components from App.tsx
8. ✅ Extract DashboardView from App.tsx
9. ✅ Standardize routing patterns in App.tsx
10. ✅ Fix type safety issues (VineDetailsView, etc.)
11. ✅ Update ZeroContext dependency array

**Estimated Impact**:
- App.tsx: 260 → <100 lines
- Better separation of concerns
- Type safety improved

---

### Phase 3: Winery Implementation (DO THIRD)

**Priority**: New feature development on clean foundation

12. ✅ Create winery-hooks.ts with subscriptions
13. ✅ Create winery-types.ts
14. ✅ Implement WineryView per vintages_ui_planning.md
15. ✅ Create remaining winery components per winery-frontend-plan.md

---

### Phase 4: Polish & Optimization (OPTIONAL)

**Priority**: Nice-to-haves, can defer

16. Add type guards instead of `as` casting
17. Review all modals for self-contained pattern
18. Add error boundaries for crash recovery
19. Performance audit with React DevTools
20. Bundle size analysis

---

## Anti-Pattern Cheat Sheet

### ❌ DON'T DO THIS

```typescript
// 1. Polling instead of subscriptions
const interval = setInterval(loadData, 1000);

// 2. Console for user-facing errors
console.error('Failed to load weather');

// 3. Inline styles (use CSS Modules)
<div style={{ padding: '16px' }}>

// 4. Type casting without validation
const data = response.data as MyType;

// 5. Hardcoded URLs
const url = 'http://localhost:3001';

// 6. process.env (use import.meta.env)
const key = process.env.PUBLIC_KEY;

// 7. Prop drilling when component can fetch
<Modal data={data} setData={setData} />
```

### ✅ DO THIS INSTEAD

```typescript
// 1. Zero subscriptions
const unsubscribe = zero.query.vine.subscribe(setVines);

// 2. UI error states
{error && <div className={styles.error}>{error}</div>}

// 3. CSS Modules with theme tokens
<div className={styles.container}>

// 4. Type guards or runtime validation
if (!isValidType(data)) throw new Error();

// 5. Centralized config
import { getBackendUrl } from '../config';

// 6. import.meta.env
const key = import.meta.env.PUBLIC_KEY;

// 7. Self-contained components
<Modal onSuccess={handleSuccess} />
```

---

## Success Metrics

### Before Cleanup:
- App.tsx: 692 lines
- Polling: 3 hooks using setInterval
- Backend URL: Hardcoded in 3+ places
- Type safety: Multiple `any` types
- Console output: 8+ console.error calls
- Circular dependency risk: 1 (Weather → App)
- Duplicate files: 2 WineryView files

### After Cleanup:
- App.tsx: <100 lines ✅
- Polling: 0 (all using subscriptions) ✅
- Backend URL: Centralized in config.ts ✅
- Type safety: Explicit types everywhere ✅
- Console output: 0 user-facing errors ✅
- Circular dependency risk: 0 ✅
- Duplicate files: 0 ✅

### Quality Score Target:
- Current: **5.5/10**
- Target: **8.5/10**

---

## Summary

This cleanup is **essential before adding winery features**. The current architecture has:
- 432-line modal blocking App.tsx from being maintainable
- Polling anti-pattern preventing real-time sync from working correctly
- Duplicate files creating confusion
- Hardcoded config preventing environment flexibility

**Good news**: Individual components are well-written. This is 90% reorganization, 10% fixing anti-patterns.

**Timeline Estimate**:
- Phase 1 (Critical): 2-3 hours
- Phase 2 (Architectural): 2-3 hours
- Phase 3 (Winery): Separate project (per planning docs)
- Phase 4 (Polish): As needed

**Recommendation**: Complete Phases 1-2 before implementing vintages UI. Clean foundation = faster feature development.
