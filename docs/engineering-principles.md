# Engineering Principles for Claude Code

## Core Development Philosophy

### 0. Never Touch Git
- **NEVER run git commands** - all git operations must be performed manually by the user
- **NO git add, git commit, git push, git checkout, git merge, or any other git commands**
- **User maintains full control** over what gets committed and when
- **You can suggest git commands** for the user to run, but never execute them
- **Exception:** Using git commands for read-only inspection (git status, git log, git diff) is acceptable when debugging

**Why:** Git operations are critical to version control. The user needs complete awareness and control over what changes are committed to the repository.

### 0.5. Proper Process Management
- **ALWAYS terminate background processes gracefully** with SIGTERM (kill -15) first
- **NEVER use SIGKILL (kill -9)** unless absolutely necessary as a last resort
- **Track background processes** - if you start a process, ensure it's properly cleaned up
- **Graceful shutdown** - allow processes time to clean up resources before force-killing

**Why:** Graceful termination allows processes to clean up resources properly, close connections, and save state. Force-killing with SIGKILL can leave files locked, sockets open, and corrupted state.

**Example:**
```bash
# Good - graceful termination
lsof -ti:3001,4848 | xargs kill -15
sleep 2  # Allow time for cleanup

# Bad - force kill without trying graceful first
lsof -ti:3001,4848 | xargs kill -9
```

### 0.6. Never Edit Migrations After Creation
- **NEVER edit a migration file after it has been created** - even if it hasn't been run yet
- **NEVER modify the content of an existing migration file** - SQL migration tools track checksums
- **If a migration has an error**, delete it and create a new one with a fresh timestamp/version number
- **Clean up migration records** - if you delete a migration that was already applied, instruct the user to remove it from the migrations tracking table

**Why:** Migration tools like SQLx, Flyway, and others track migrations by version number AND checksum. Editing a migration file changes its checksum but keeps the same version, causing "VersionMismatch" errors. Once a migration is created, it's immutable.

**Example:**
```bash
# Bad - editing existing migration
# Edit: migrations/20251111000002_add_field.sql

# Good - delete and recreate with new version
rm migrations/20251111000002_add_field.sql
# Create: migrations/20251111000003_add_field.sql
# Then instruct user to run:
# DELETE FROM _sqlx_migrations WHERE version = 20251111000002;
```

### 1. Research Before Implementation
- **ALWAYS investigate existing code FIRST** before implementing new features or making changes
- **Read the relevant files thoroughly** - understand what's already implemented and how it works
- **Check for existing solutions** - the codebase may already have working code that solves the problem
- **Research available libraries** - understand what's possible with the tech stack before designing solutions
- **Ask clarifying questions** if unclear about existing implementation or user requirements
- **Document findings** - when you discover existing patterns, note them before proposing changes
- **Avoid rework** - spending 10 minutes researching saves hours of implementing the wrong solution

**Example:** Before implementing STL file generation on the backend, check if the frontend already has working STL generation code. If it does, evaluate whether to keep it, move it, or replicate it - don't build from scratch without knowing what exists.

### 2. Minimal Code Additions
- **Make the smallest possible changes** to accomplish the task
- **Never add comments** - code should be self-explanatory
- **Only modify code directly addressed by the prompt** - leave everything else untouched
- **Avoid refactoring** unless explicitly requested
- **No over-engineering** - solve exactly what's asked, nothing more

### 2. Abstraction-Last Approach
- **Start with large, monolithic files** containing many exports
- **Build functionality in a single file first** before considering separation
- **Split files at 500-600 lines** OR when any of these occur:
  - Visual scan test fails: Can't mentally map the entire file in one scroll-through
  - Duplicate patterns emerge: Finding yourself copy-pasting within the same file
  - Multiple responsibility: File handles more than one primary concern
  - Hard to debug: Stack traces don't clearly identify what part of file has issues
- **Prefer co-location** of related functionality over premature separation

### 3. CSS Architecture
- **Use CSS Modules exclusively** for all styling
- **Follow the theme document** for all design tokens
- **Use CSS variables as tokens** for:
  - Colors: `var(--color-primary)`, `var(--color-secondary)`
  - Typography: `var(--font-heading)`, `var(--font-body)`
  - Spacing: `var(--spacing-xs)`, `var(--spacing-sm)`
  - Breakpoints: `var(--breakpoint-md)`, `var(--breakpoint-lg)`
- **Never hardcode design values** - always reference theme tokens

### 4. DRY Within Monoliths
- **Extract utility functions** when logic duplicates within same file
- **Use helper components** for repeated UI patterns (forms, modals)
- **Centralize state logic** when multiple UI paths affect same state
- **The Duplication Detector**: If you copy-paste more than 10 lines within a single file, immediately extract to a function or component
- **Pattern: Before copy-paste, ask:**
  - Have I implemented this exact logic elsewhere in this file?
  - Should this be extracted to a utility function instead?
  - Is this file becoming too complex to audit?

### 5. Cleanup on Refactor
- **When changing architecture**, audit for orphaned code
- **Remove redundant UI paths** before adding new ones
- **Search for similar patterns** after extracting logic
- **Test all entry points** after consolidation
- **Delete unused state, handlers, and modals** immediately

### 6. Single Responsibility for UI Paths
- **One modal per entity action** (e.g., one "edit block" modal, not two)
- **Multiple entry points OK**, but must render same component
- **State determines content**, not separate modals for same purpose
- **Avoid parallel implementations** of the same user action

## Implementation Guidelines

### Code Structure
```
✅ GOOD: Single file with multiple exports
components/UserDashboard.jsx
├── export const UserProfile = () => { ... }
├── export const UserStats = () => { ... }
├── export const UserActions = () => { ... }
└── export const utilityFunction = () => { ... }

❌ AVOID: Premature abstraction with default exports
components/
├── UserDashboard/
│   ├── UserProfile.jsx (export default UserProfile)
│   ├── UserStats.jsx (export default UserStats)
│   ├── UserActions.jsx (export default UserActions)
│   └── utils.js (function declarations)
```

### CSS Module Pattern
```css
/* components/UserDashboard.module.css */
.container {
  background: var(--color-background);
  font-family: var(--font-body);
  padding: var(--spacing-md);
}

.title {
  color: var(--color-heading);
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-sm);
}
```

### React Component Standards
- **Use const exports** instead of default exports wherever possible
- **Fat arrow ES6 functions** for all function declarations
- **Named exports** for better IDE support and refactoring
- **Early returns over if/else** - reduce nesting by returning early

```jsx
// GOOD: Const export with fat arrow function
export const UserProfile = ({ user }) => {
  const handleClick = () => {
    // Handle click logic
  };

  return <div>{user.name}</div>;
};

// AVOID: Default export with function declaration
function UserProfile({ user }) {
  function handleClick() {
    // Handle click logic
  }

  return <div>{user.name}</div>;
}
export default UserProfile;
```

### Control Flow Patterns
- **Prefer early returns** over if/else to reduce nesting and improve readability
- **Guard clauses at the top** of functions for error conditions
- **Flat code is better than nested code**

```jsx
// BAD: Nested if/else
const navigateToBlock = (blockId) => {
  if (blockId) {
    setLocation(`/vineyard/block/${blockId}`);
  } else {
    setLocation('/vineyard');
  }
};

// GOOD: Early return
const navigateToBlock = (blockId) => {
  if (blockId) return setLocation(`/vineyard/block/${blockId}`);
  setLocation('/vineyard');
};

// BAD: Nested conditions
const processData = (data) => {
  if (data) {
    if (data.isValid) {
      return processValidData(data);
    } else {
      return handleInvalidData(data);
    }
  } else {
    return handleMissingData();
  }
};

// GOOD: Guard clauses with early returns
const processData = (data) => {
  if (!data) return handleMissingData();
  if (!data.isValid) return handleInvalidData(data);
  return processValidData(data);
};
```

### Pure Functions
- **Prefer pure functions** over impure functions whenever possible
- **Pure functions** take inputs and return outputs without side effects
- **Easier to test**, reason about, and refactor
- **Extract logic** from handlers into pure functions for reusability

### Component Data Fetching & Dependency Injection

#### Use Context for Dependency Injection
- **Use React Context to provide dependencies** app-wide (Zero instance, auth, etc.)
- **Eliminates prop drilling** through component trees
- **Components access context directly** via custom hooks

```jsx
// GOOD: Context provider at app root
<ZeroProvider>
  <VineyardView />
</ZeroProvider>

// Any component can access Zero
const zero = useZero();
```

#### Self-Contained Components Pattern
- **Components fetch their own data** using custom hooks instead of relying on prop drilling
- **Parent components handle**: navigation, success messages, which modal is open
- **Child components handle**: data fetching, mutations, form state, validation
- **Aim for 50-70% prop reduction** as a quality metric

```jsx
// BAD: Prop drilling data through multiple levels (10+ props)
<AddVineModal
  blocks={blocks}
  vinesData={vinesData}
  vineyardData={vineyardData}
  formErrors={formErrors}
  isSubmitting={isSubmitting}
  handleAddVine={handleAddVine}
  setFormErrors={setFormErrors}
  setIsSubmitting={setIsSubmitting}
/>

// GOOD: Component fetches its own data and manages its own state (3 props)
<AddVineModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={(message, vineId) => {
    showSuccessMessage(message);
    if (vineId) navigateToVine(vineId);
  }}
/>

// Inside AddVineModal
const AddVineModal = ({ isOpen, onClose, onSuccess }) => {
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch own data using context internally
  const zero = useZero();
  const vinesData = useVines();
  const blocks = useBlocks().map(transformBlockData);
  const vineyardData = useVineyard();

  // Handle own mutations
  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await zero.mutate.vine.insert(formData);
      onSuccess('Vine created');
      onClose();
    } catch (error) {
      setFormErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Modal>...</Modal>;
};
```

**Benefits:**
- Fewer props (3 instead of 10+)
- Each component owns its responsibilities
- Parent doesn't need to know implementation details
- Easier to refactor and test

#### State Ownership Principle
**Rule:** If the parent doesn't read the state or coordinate it with siblings, it belongs in the child.

```jsx
// BAD: Parent managing child-only state
const VineyardView = () => {
  const [showQRModal, setShowQRModal] = useState(false);
  return <VineDetailsView showQRModal={showQRModal} setShowQRModal={setShowQRModal} />;
};

// GOOD: Child owns its UI state
const VineDetailsView = () => {
  const [showQRModal, setShowQRModal] = useState(false);
  // Use modal internally
};

// GOOD: Parent coordinates between multiple children
const VineyardView = () => {
  const handleGearIconClick = () => {
    if (selectedBlock) setShowEditBlockModal(true);
    else setShowVineyardSettingsModal(true);
  };
  // State affects which modal opens, so parent owns it
};
```

#### No Prop/Query Duplication
**Never pass data as a prop that the component also queries for.** Pick one source of truth.

```jsx
// BAD: Component receives blocks AND queries for blocks
const Component = ({ blocks }) => {
  const blocksData = useBlocks();  // DUPLICATION!
  const blocksTransformed = blocksData.map(transform);
};

// GOOD: Component queries once, parent doesn't pass
const Component = () => {
  const blocksData = useBlocks();
  const blocks = blocksData.map(transform);
};
```

#### Computed Props Should Move Inside
If a prop can be computed from data the component already has, compute it internally.

```jsx
// BAD: Parent computes derived value
const vineUrl = `${origin}/vineyard/vine/${vine.id}`;
<VineDetailsView vineUrl={vineUrl} />

// GOOD: Child computes from data it already has
<VineDetailsView vine={vine} />

// Inside VineDetailsView:
const vineUrl = `${origin}/vineyard/vine/${vine.id}`;
```

### React Hooks Rules

#### Hook Call Order
- **All hooks must be called unconditionally** at the top level of the component
- **Never put early returns before hooks** - this violates Rules of Hooks
- **Early returns must come AFTER all hooks** (useState, useEffect, custom hooks, etc.)

```jsx
// BAD: Early return before hooks
const MyComponent = ({ isOpen, data }) => {
  if (!isOpen) return null; // ❌ Early return before hooks

  const [state, setState] = useState(null); // Hook called conditionally
  useEffect(() => { ... }, []); // Hook called conditionally

  return <div>...</div>;
};

// GOOD: All hooks first, then early returns
const MyComponent = ({ isOpen, data }) => {
  const [state, setState] = useState(null); // ✅ Hook always called
  useEffect(() => { ... }, []); // ✅ Hook always called

  if (!isOpen) return null; // ✅ Early return after all hooks

  return <div>...</div>;
};
```

**Why this matters:**
React tracks hooks by call order. If hooks are called conditionally, React's internal hook tracking breaks, causing errors like "Rendered more hooks than during the previous render."

#### Safe useEffect Dependencies
**When you don't know if a library memoizes properties, depend on the stable parent instance, not destructured properties.**

```jsx
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

#### Custom Hooks Should Use Context Internally
**Hooks should consume context internally to simplify their API.**

```jsx
// BAD: Parameter passing through every call site
export const useVines = (z: Zero<Schema>) => {
  useEffect(() => {...}, [z]);
}

// Every call site needs to pass z
const vines = useVines(z);

// GOOD: Context consumed internally
export const useVines = () => {
  const zero = useZero();
  useEffect(() => {...}, [zero]);
}

// Cleaner call sites
const vines = useVines();
```

### Testing with Rstest

#### Core Testing Principles Summary

**The most critical lessons learned from building our test suite:**

1. **Module mocks use plain functions** - `rs.fn()` is for spies/mocks, not module exports
2. **Mock at the data layer** - Mock ZeroContext instead of individual hooks when possible
3. **Wait for async data** - Use `waitFor()` for components with async hooks
4. **Restore DOM methods** - Save and restore `document.createElement`, `appendChild`, etc. in `afterEach`
5. **Mock after render when needed** - DOM mocks that affect `document.body` should be set after `render()`
6. **Verify library APIs** - Check actual imports and exports, don't assume ES modules vs CommonJS
7. **Respect React hooks rules** - All hooks must be called before any early returns
8. **Capture callbacks in constructors** - Use plain functions to capture callbacks passed to class constructors
9. **Clear captured state** - Reset callback captures and mock data in `beforeEach`
10. **Test error paths** - Use `mockRejectedValueOnce` to test promise rejection handling

**Quick reference:** See example test files at bottom of this section for working implementations.

---

#### Module Mocking Syntax
**Critical: rstest requires plain arrow functions for module mocks, NOT rs.fn() wrapped functions.**

```typescript
// ❌ BAD: Using rs.fn() for module exports
rs.mock('./vineyard-hooks', () => ({
  useVines: rs.fn(() => mockVinesData),  // Will fail with "is not a function"
  useBlocks: rs.fn(() => []),
}));

// ✅ GOOD: Plain arrow functions for module exports
rs.mock('./vineyard-hooks', () => ({
  useVines: () => mockVinesData,  // Works correctly
  useBlocks: () => [],
}));

// ✅ GOOD: rs.fn() is fine for component props and callbacks
rs.mock('./AddVineModal', () => ({
  AddVineModal: rs.fn(({ isOpen, onClose }) =>  // This usage is fine
    isOpen ? <div>ADD VINE<button onClick={onClose}>Close</button></div> : null
  ),
}));
```

**Why this matters:** rstest's module mocking expects the factory function to return an object with the module's exports as plain functions. Using `rs.fn()` creates a mock function wrapper that breaks the import mechanism.

#### Mock at the Data Layer, Not the Component Layer
**When testing components that have complex dependency trees, mock the data source (context) instead of individual hooks or child components.**

```typescript
// ❌ BAD: Mocking individual hooks and all child components
rs.mock('./vineyard-hooks', () => ({
  useVines: () => mockVinesData,
  useBlocks: () => [],
  useVineyard: () => null,
}));
rs.mock('./VineyardViewHeader', () => ({ VineyardViewHeader: () => <div>HEADER</div> }));
rs.mock('./VineyardViewVineList', () => ({ VineyardViewVineList: () => <div>LIST</div> }));
rs.mock('./BlockSettingsModal', () => ({ BlockSettingsModal: () => null }));
// ... 10+ more child component mocks

// ✅ GOOD: Mock the data layer and let real components render
const mockZero = {
  query: {
    vine: {
      run: rs.fn().mockResolvedValue(mockVinesData),
    },
    block: {
      run: rs.fn().mockResolvedValue([]),
    },
  },
};

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => mockZero,
}));

// Only mock components that need specific behavior (modals, scanners, etc.)
rs.mock('./AddVineModal', () => ({
  AddVineModal: rs.fn(({ isOpen, onClose }) =>
    isOpen ? <div>ADD VINE<button onClick={onClose}>Close</button></div> : null
  ),
}));
```

**Benefits of mocking at the data layer:**
- Tests verify actual component rendering behavior
- Fewer mocks to maintain (1 context mock vs 10+ component mocks)
- Catches integration issues between components
- Child components can use real hooks without breaking tests
- Easier to modify beforeEach blocks (just update mockZero values)

#### Testing Async Data Loading
**Components that use async data from hooks need waitFor to account for loading time.**

```typescript
// ❌ BAD: Expecting async data immediately
test('displays vines', () => {
  render(<VineyardView />);
  expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument(); // Fails - data not loaded yet
});

// ✅ GOOD: Wait for async data to load
test('displays vines', async () => {
  render(<VineyardView />);
  await waitFor(() => {
    expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
  });
});
```

**Why:** Hooks like `useVines()` call `zero.query.vine.run()` in a useEffect, which returns a Promise. The component starts with empty data and updates when the promise resolves.

#### Modifying Mock Data in beforeEach
**When testing different states (empty list, different filters, etc.), modify the mock's return value, not the hooks.**

```typescript
// ❌ BAD: Trying to mock hooks in beforeEach
describe('when no vines exist', () => {
  beforeEach(() => {
    const { useVines } = require('./vineyard-hooks');
    useVines.mockReturnValue([]);  // Fails - useVines is a plain function, not rs.fn()
  });
});

// ✅ GOOD: Modify the data layer mock
describe('when no vines exist', () => {
  beforeEach(() => {
    mockZero.query.vine.run.mockResolvedValue([]);  // Works - mockZero uses rs.fn()
  });

  test('shows empty state', async () => {
    render(<VineyardView />);
    await waitFor(() => {
      expect(screen.getByText(/no vines/i)).toBeInTheDocument();
    });
  });
});
```

#### Mock Strategy Decision Tree
1. **Does the component have many child components that also use the same hooks?**
   → Mock the context (ZeroContext), not individual hooks

2. **Is the component simple with direct hook usage?**
   → Mocking hooks directly is fine

3. **Do you need different data states in different test cases?**
   → Use rs.fn() for the data source so you can call `.mockResolvedValue()` in beforeEach

4. **Are child components complex or have their own business logic?**
   → Mock them as simple components that render minimal UI for test verification

#### Restoring Mock Data Between Test Suites
**When modifying mock data in beforeEach, restore it in afterEach to prevent test pollution.**

```typescript
describe('when no vines exist', () => {
  beforeEach(() => {
    mockZero.query.vine.run.mockResolvedValue([]);  // Empty state
  });

  afterEach(() => {
    mockZero.query.vine.run.mockResolvedValue(mockVinesData);  // Restore default
  });

  test('shows empty state', async () => {
    render(<VineyardView />);
    await waitFor(() => {
      expect(screen.getByText(/no vines/i)).toBeInTheDocument();
    });
  });
});
```

**Why this matters:** Without restoration, subsequent test suites will use the modified mock data, causing unexpected failures.

#### Avoiding Text Conflicts in Mocked Components
**When mocking modals or dialogs, use distinct text that won't conflict with buttons that trigger them.**

```typescript
// ❌ BAD: Modal text conflicts with button text
rs.mock('./AddVineModal', () => ({
  AddVineModal: rs.fn(({ isOpen, onClose }) =>
    isOpen ? <div>ADD VINE<button onClick={onClose}>Close</button></div> : null
  ),
}));

test('user can open modal', async () => {
  const addButton = screen.getByRole('button', { name: /add vine/i });
  await user.click(addButton);
  expect(screen.getByText('ADD VINE')).toBeInTheDocument();  // ❌ Fails: "Found multiple elements"
});

// ✅ GOOD: Distinct modal text
rs.mock('./AddVineModal', () => ({
  AddVineModal: rs.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div role="dialog">
        <div>Add Vine Modal</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

test('user can open modal', async () => {
  const addButton = screen.getByRole('button', { name: /add vine/i });
  await user.click(addButton);
  expect(screen.getByText('Add Vine Modal')).toBeInTheDocument();  // ✅ Passes
});
```

#### Testing Components with Initial Data Props
**Even when passing initial data props, components that load data asynchronously need waitFor.**

```typescript
// ❌ BAD: Expecting data immediately even with initialVineId
test('displays vine details', () => {
  render(<VineyardView initialVineId="vine-1" />);
  expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();  // Fails - data not loaded
});

// ✅ GOOD: Wait for async data to load
test('displays vine details', async () => {
  render(<VineyardView initialVineId="vine-1" />);
  await waitFor(() => {
    expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
  });
});
```

**Why:** Even with an initialVineId prop, the component still needs to fetch the full vine data from the store asynchronously.

#### CommonJS vs ES Module Mock Patterns
**Different libraries export in different ways. Always check the library's actual export pattern before mocking.**

```typescript
// ❌ BAD: Assuming ES module default export for CommonJS library
rs.mock('qrcode', () => ({
  default: {
    toCanvas: async () => undefined,
    toString: async () => '<svg></svg>',
  },
}));
// Component import: import QRCode from 'qrcode'
// Component usage: QRCode.toCanvas() → FAILS: "toCanvas is not a function"

// ✅ GOOD: Matching CommonJS exports pattern
rs.mock('qrcode', () => ({
  toCanvas: async () => undefined,
  toString: async () => '<svg></svg>',
  toDataURL: async () => 'data:image/png;base64,mock',
}));
// Component import: import QRCode from 'qrcode'
// Component usage: QRCode.toCanvas() → Works!
```

**How to verify:** Check `node_modules/[library]/lib/*.js` for `exports.methodName` (CommonJS) vs `export default` (ES modules).

#### React Hooks Rules in Component Code
**All hooks must be called before any early returns. Moving early returns before hooks violates React's rules of hooks.**

```typescript
// ❌ BAD: Early return before useEffect
export const VineDetailsView = ({ vine }) => {
  const zero = useZero();

  if (!vine) {
    return <div>Not found</div>;  // ❌ Violates hooks rules
  }

  useEffect(() => {  // This hook is conditionally called!
    // ...
  }, []);
};

// ✅ GOOD: All hooks before early return
export const VineDetailsView = ({ vine }) => {
  const zero = useZero();

  useEffect(() => {
    // ...
  }, []);

  if (!vine) {
    return <div>Not found</div>;  // ✅ All hooks called first
  }

  // Main render...
};
```

**Error symptoms:** Tests fail with "Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'" or similar DOM errors.

#### DOM Method Mocking and Restoration
**When mocking DOM methods like createElement or appendChild, always restore them in afterEach to prevent test pollution.**

```typescript
// ✅ GOOD: Save originals at test suite level, restore in afterEach
describe('MyComponent', () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalAppendChild = document.body.appendChild.bind(document.body);
  const originalRemoveChild = document.body.removeChild.bind(document.body);

  afterEach(() => {
    cleanup();
    rs.clearAllMocks();
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  test('downloads file', async () => {
    const mockLink = { click: rs.fn(), href: '', download: '' };
    document.createElement = rs.fn((tag: string) => {
      if (tag === 'a') return mockLink as any;
      return originalCreateElement(tag);  // Preserve other elements
    });

    // Test code...
  });
});
```

**Why this matters:** Without restoration, subsequent tests inherit the mocked methods, breaking React Testing Library's ability to create containers.

#### Mocking After Render
**Some DOM mocks must be set up AFTER render() to avoid breaking React's rendering process.**

```typescript
// ❌ BAD: Mocking appendChild before render
test('downloads file', () => {
  document.body.appendChild = rs.fn(() => mockLink as any);  // Breaks React!
  render(<MyComponent />);  // ERROR: Target container is not a DOM element
});

// ✅ GOOD: Mock after render completes
test('downloads file', () => {
  render(<MyComponent />);  // React creates container successfully

  const mockLink = { click: rs.fn(), href: '', download: '' };
  document.createElement = rs.fn((tag: string) => {
    if (tag === 'a') return mockLink as any;
    return originalCreateElement(tag);
  });
  document.body.appendChild = rs.fn(() => mockLink as any);

  // Now trigger download...
});
```

**Rule of thumb:** If the mock affects document.body or fundamental DOM operations, set it up after render().

#### Constructor Mocking with Callback Capture
**When mocking class constructors that accept callbacks, use a plain function (not arrow function) and capture the callback for test control.**

```typescript
// QrScanner constructor: new QrScanner(videoEl, callback, options)

let scanCallback: any = null;

const mockQrScanner = {
  start: rs.fn().mockResolvedValue(undefined),
  stop: rs.fn(),
  destroy: rs.fn(),
};

// ✅ GOOD: Plain function captures callback
rs.mock('qr-scanner', () => ({
  default: function(_videoEl: any, callback: any, _options: any) {
    scanCallback = callback;  // Capture for later use in tests
    return mockQrScanner;
  },
}));

// In test:
test('navigates when QR scanned', async () => {
  render(<QRScanner onClose={rs.fn()} />);

  scanCallback({ data: 'vine-123' });  // Simulate scan

  await waitFor(() => {
    expect(mockSetLocation).toHaveBeenCalledWith('/vineyard/vine/vine-123');
  });
});

// Reset in beforeEach:
beforeEach(() => {
  rs.clearAllMocks();
  scanCallback = null;  // Clear captured callback
});
```

**Why plain function instead of arrow function:** Class constructors use `this` binding which doesn't work with arrow functions.

#### Promise Rejection in Mocks
**To test error handling, mock methods can reject promises with specific error objects.**

```typescript
const mockQrScanner = {
  start: rs.fn().mockResolvedValue(undefined),  // Default success
  stop: rs.fn(),
  destroy: rs.fn(),
};

test('shows error when camera denied', async () => {
  mockQrScanner.start.mockRejectedValueOnce({
    name: 'NotAllowedError',
    message: 'Permission denied'
  });

  render(<QRScanner onClose={rs.fn()} />);

  await waitFor(() => {
    expect(screen.getByText(/camera permission/i)).toBeInTheDocument();
  });
});
```

**Note:** Use `mockRejectedValueOnce` for single-test overrides, preserving the default resolved value for other tests.

#### Library API Verification
**Before writing tests, verify which library the component actually uses. Mock the correct library with the correct API.**

```typescript
// ❌ BAD: Component uses 'qr-scanner', test mocks 'html5-qrcode'
// Component: import QrScanner from 'qr-scanner'
rs.mock('html5-qrcode', () => ({  // Wrong library!
  Html5QrcodeScanner: rs.fn(() => ({ render: rs.fn() }))
}));

// ✅ GOOD: Mock the actual library being imported
// Component: import QrScanner from 'qr-scanner'
rs.mock('qr-scanner', () => ({
  default: function() { return mockQrScanner; }
}));
```

**How to verify:**
1. Check the component's imports at the top of the file
2. Verify the library's API in node_modules or documentation
3. Match the mock's methods to what the component actually calls

#### Example Test Files Following Best Practices
For reference implementations of these testing patterns, see:
- **`src/components/VineyardView.test.tsx`** - Data layer mocking, modal mocking, async data loading
- **`src/components/vineyard-hooks.test.ts`** - Custom hook testing with ZeroContext mocking
- **`src/components/VineDetailsView.test.tsx`** - CommonJS library mocking, DOM method mocking, callback capture
- **`src/components/QRScanner.test.tsx`** - Constructor mocking, callback capture, promise rejection testing

### Variable Naming
**Descriptive names over terse abbreviations.** Makes code self-documenting.

```jsx
// BAD: Terse abbreviation
const z = useZero();
await z.mutate.vine.insert(...);

// GOOD: Descriptive name
const zero = useZero();
await zero.mutate.vine.insert(...);

// Exception: Loop indices, widely understood abbreviations (i, j, id, etc.)
for (let i = 0; i < items.length; i++) { ... }
```

### File Organization Priorities
1. **Single file with all related code**
2. **Import from theme document for all design tokens**
3. **Export multiple components from same file**
4. **Only separate when file becomes genuinely large**

## What NOT to Do

### ❌ Don't Add Unnecessary Code
- No boilerplate comments
- No "helpful" console.logs
- No defensive programming unless security-critical
- No unused imports or variables

### ❌ Don't Use Legacy Function Patterns
- Don't use `function` declarations - use fat arrow functions
- Don't use default exports when const exports are possible
- Don't mix function styles within the same file

```jsx
/* BAD */
function handleSubmit(data) {
  return processData(data);
}
export default MyComponent;

/* GOOD */
const handleSubmit = (data) => {
  return processData(data);
};
export const MyComponent = () => { ... };
```

### ❌ Don't Prematurely Abstract
- Don't create separate files for small components
- Don't create utility folders until patterns repeat 3+ times
- Don't split files "for organization" - prefer grep-ability

### ❌ Don't Hardcode Design Values
```css
/* BAD */
.button {
  background: #3b82f6;
  padding: 12px 24px;
  font-size: 16px;
}

/* GOOD */
.button {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
}
```

## Decision Framework

### When making code changes, ask:
0. **Am I about to run a git command?** If yes, STOP - suggest it to the user instead
1. **Have I researched existing code first?** If no, read relevant files before implementing
2. **Is this the minimal change needed?** If no, reduce scope
3. **Am I only touching what the prompt addresses?** If no, revert unrelated changes
4. **Can this stay in the existing file?** If yes, don't create new files
5. **Am I using theme tokens?** If no, replace with CSS variables
6. **Are all functions fat arrow style?** If no, convert to const declarations
7. **Am I using const exports instead of default?** If possible, prefer named exports
8. **Can I use an early return instead of if/else?** If yes, prefer early returns for flatter code
9. **Is the component fetching its own data?** If no, consider self-contained pattern
10. **Am I passing data AND querying for it?** If yes, remove duplication
11. **Does parent coordinate this state?** If no, move state to child
12. **Can this value be computed from existing data?** If yes, don't pass as prop
13. **Are variable names descriptive?** If no, use full names over abbreviations

### When considering abstraction:
1. **Is this file over 500-600 lines?** If yes, strongly consider splitting
2. **Are you copy-pasting within the file?** If yes, extract immediately
3. **Is there genuine reuse across different contexts?** If no, don't abstract
4. **Would separation make debugging harder?** If yes, reconsider approach

## Theme Integration

### Always reference the theme document for:
- **Color palette** - primary, secondary, accent, neutral tones
- **Typography scale** - font families, sizes, weights, line heights
- **Spacing system** - consistent spacing units
- **Layout breakpoints** - responsive design points
- **Component tokens** - button styles, form elements, shadows

### CSS Variable Naming Convention
```css
/* Colors */
--color-primary-50 to --color-primary-900
--color-secondary-50 to --color-secondary-900

/* Typography */
--font-heading, --font-body, --font-mono
--font-size-xs to --font-size-3xl

/* Spacing */
--spacing-px, --spacing-xs to --spacing-3xl

/* Breakpoints */
--breakpoint-sm, --breakpoint-md, --breakpoint-lg
```

## Success Criteria

A good Claude Code implementation will:
- ✅ Make only the changes requested in the prompt
- ✅ Contain no comments or extraneous code
- ✅ Keep related functionality co-located in single files
- ✅ Use CSS Modules with theme tokens exclusively
- ✅ Use const exports and fat arrow functions consistently
- ✅ Have self-contained components with minimal props (50-70% reduction)
- ✅ Use context for dependency injection, no prop drilling
- ✅ Have clear state ownership (parent coordinates, child owns)
- ✅ Have no prop/query duplication
- ✅ Use descriptive variable names
- ✅ Be immediately greppable and debuggable
- ✅ Require no cleanup or refactoring

Remember: **Code that works simply and follows these principles is better than clever, abstracted, or over-engineered solutions.**