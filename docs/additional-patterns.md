# Additional Patterns Under Consideration

These patterns emerged from recent refactoring work and are being evaluated for full adoption into the engineering principles.

## 1. Self-Contained Component Pattern

**Before:**
```typescript
<AddVineModal
  blocks={blocks}
  vinesData={vinesData}
  vineyardData={vineyardData}
  formErrors={formErrors}
  // ... 10+ props
/>
```

**After:**
```typescript
<AddVineModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={(message, vineId) => {...}}
/>
// Component fetches its own data using hooks
```

**Pattern:** Components should fetch their own data and manage their own state. Parent only handles coordination (navigation, success messages, which modal is open).

## 2. Zero Context Provider (Dependency Injection)

**Before:**
```typescript
// App.tsx
const zero = new Zero(...);
<VineyardView z={zero} />

// Every child needs z prop
<AddVineModal z={z} />
<BlockModal z={z} />
```

**After:**
```typescript
// App.tsx
<ZeroProvider>
  <VineyardView />
</ZeroProvider>

// Any component can access
const zero = useZero();
```

**Pattern:** Use React Context to inject dependencies app-wide, eliminating prop drilling.

## 3. Safe useEffect Dependencies

**Critical Learning:**
```typescript
// ❌ UNSAFE - destructured property may cause re-renders
const { query } = useZero();
useEffect(() => {
  query.vine.run();
}, [query]); // query reference might change every render!

// ✅ SAFE - depend on stable instance
const zero = useZero();
useEffect(() => {
  zero.query.vine.run();
}, [zero]); // zero is stable from context
```

**Pattern:** When you don't know if a library memoizes properties, depend on the stable parent instance, not destructured properties.

## 4. State Ownership Principle

**Rule:** If the parent doesn't read the state or coordinate it with siblings, it belongs in the child.

**Before:**
```typescript
// VineyardView.tsx
const [showQRModal, setShowQRModal] = useState(false);
<VineDetailsView
  showQRModal={showQRModal}
  setShowQRModal={setShowQRModal}
/>
```

**After:**
```typescript
// VineDetailsView.tsx - owns its UI state
const [showQRModal, setShowQRModal] = useState(false);
```

**Stays in Parent (correct):**
```typescript
// Parent coordinates between multiple children
const handleGearIconClick = () => {
  if (selectedBlock) setShowEditBlockModal(true);
  else setShowVineyardSettingsModal(true);
};
```

## 5. No Prop/Query Duplication

**Anti-pattern detected:**
```typescript
// ❌ Component receives blocks AND queries for blocks
const Component = ({ blocks }) => {
  const blocksData = useBlocks();  // DUPLICATION!
  const blocksTransformed = blocksData.map(transform);
}
```

**Fixed:**
```typescript
// ✅ Component queries once, parent doesn't pass
const Component = () => {
  const blocksData = useBlocks();
  const blocks = blocksData.map(transform);
}
```

**Pattern:** Never pass data as a prop that the component also queries for. Pick one source of truth.

## 6. Computed Props Should Be Moved Inside

**Before:**
```typescript
// Parent computes derived value
const vineUrl = `${origin}/vineyard/vine/${vine.id}`;
<VineDetailsView vineUrl={vineUrl} />
```

**After:**
```typescript
// Child computes from data it already has
<VineDetailsView vine={vine} />

// Inside VineDetailsView:
const vineUrl = `${origin}/vineyard/vine/${vine.id}`;
```

**Pattern:** If a prop can be computed from data the component already has, compute it internally instead of receiving it.

## 7. Variable Naming Matters

**Before:**
```typescript
const z = useZero();
await z.mutate.vine.insert(...);
```

**After:**
```typescript
const zero = useZero();
await zero.mutate.vine.insert(...);
```

**Pattern:** Descriptive names over terse abbreviations. Makes code self-documenting.

## 8. Hooks Should Use Context Internally

**Before (parameter passing):**
```typescript
export const useVines = (z: Zero<Schema>) => {
  useEffect(() => {...}, [z]);
}

// Every call site
const vines = useVines(z);
```

**After (context internally):**
```typescript
export const useVines = () => {
  const zero = useZero();
  useEffect(() => {...}, [zero]);
}

// Every call site - cleaner!
const vines = useVines();
```

**Pattern:** Custom hooks can consume context internally, simplifying their API.

## 9. Parent Responsibilities vs Child Responsibilities

**Parent owns:**
- Navigation between views
- Success/error message display
- Which modal is currently open (coordination)
- State that affects multiple children

**Child owns:**
- Its own data fetching
- Its own UI state (modals used only by that child)
- Form validation and submission logic
- Computed values from its own data

## 10. Props Reduction as Quality Metric

**Before refactor:**
- VineyardViewHeader: 12 props
- VineDetailsView: 11 props
- AddVineModal: 10+ props

**After refactor:**
- VineyardViewHeader: 6 props (50% reduction)
- VineDetailsView: 4 props (64% reduction)
- AddVineModal: 3 props (70% reduction)

**Pattern:** Fewer props = better separation of concerns. If you're passing 10+ props, consider self-contained pattern.

## The Meta-Pattern: Progressive Enhancement of Separation

The entire refactoring followed this flow:
1. ✅ Identify duplication (blocks prop + blocks query)
2. ✅ Remove duplication (use context, eliminate redundant prop)
3. ✅ Identify unnecessary coupling (parent managing child-only state)
4. ✅ Move state closer to usage (showQRModal → VineDetailsView)
5. ✅ Repeat until components are maximally self-contained

**Result:** Each component is now a "black box" with a minimal, clear interface.
