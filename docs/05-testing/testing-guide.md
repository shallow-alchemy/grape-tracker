# Testing Guide

## Core Testing Principles Summary

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
11. **Suppress expected console.error** - Mock `console.error` in error handling tests to reduce noise
12. **Use test isolation** - `isolate: true` in rstest.config.ts prevents timeout flakiness

**Quick reference:** See example test files at bottom of this guide for working implementations.

---

## Critical Configuration: Test Isolation

**The rstest config MUST have `isolate: true` to prevent timeout flakiness.**

```typescript
// rstest.config.ts
export default defineConfig({
  plugins: [pluginReact()],
  testEnvironment: 'jsdom',
  setupFiles: ['./rstest.setup.ts'],
  exclude: ['**/node_modules/**', '**/queries-service/**'],
  isolate: true,  // ⚠️ CRITICAL: Prevents test pollution and timeouts
});
```

**Why this matters:**
- Without isolation, tests share the same environment and pollute each other
- This causes random timeout failures (tests pass individually but fail together)
- Tests that take 3-4 seconds individually can timeout at 5+ seconds when run together
- The `isolate: true` setting runs each test file in a fresh environment

**Symptoms of missing isolation:**
- Tests pass when run individually (`yarn test Modal.test.tsx`) but fail in full suite
- Random timeout errors that vary between runs
- Tests that worked before suddenly fail without code changes

---

## Module Mocking Syntax

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

## Mock at the Data Layer, Not the Component Layer

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

## Testing Async Data Loading

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

## Modifying Mock Data in beforeEach

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

## Mock Strategy Decision Tree

1. **Does the component have many child components that also use the same hooks?**
   → Mock the context (ZeroContext), not individual hooks

2. **Is the component simple with direct hook usage?**
   → Mocking hooks directly is fine

3. **Do you need different data states in different test cases?**
   → Use rs.fn() for the data source so you can call `.mockResolvedValue()` in beforeEach

4. **Are child components complex or have their own business logic?**
   → Mock them as simple components that render minimal UI for test verification

## Restoring Mock Data Between Test Suites

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

## Avoiding Text Conflicts in Mocked Components

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

## Testing Components with Initial Data Props

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

## CommonJS vs ES Module Mock Patterns

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

## React Hooks Rules in Component Code

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

## DOM Method Mocking and Restoration

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

## Mocking After Render

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

## Constructor Mocking with Callback Capture

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

## Promise Rejection in Mocks

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

## Suppressing Console Errors in Error Handling Tests

**When testing error handling paths, mock `console.error` to prevent noisy output.**

Components often log errors to the console when things fail. This is correct production behavior, but creates noisy test output. Mock `console.error` in error handling test blocks to keep the output clean.

```typescript
// ❌ BAD: Error logs clutter test output
describe('error handling', () => {
  test('shows error message when deletion fails', async () => {
    mockDelete.mockRejectedValue(new Error('Network error'));
    // Test runs but prints: "Error deleting: Error: Network error" to console
    render(<MyComponent />);
    // ...
  });
});

// ✅ GOOD: Mock console.error to suppress expected errors
describe('error handling', () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = rs.fn();  // Suppress error output
  });

  afterEach(() => {
    console.error = originalConsoleError;  // Restore for other tests
  });

  test('shows error message when deletion fails', async () => {
    mockDelete.mockRejectedValue(new Error('Network error'));
    // No console noise - error is captured by mock
    render(<MyComponent />);
    // ...
  });
});
```

**When to use this pattern:**
- Tests that deliberately trigger errors (`mockRejectedValue`)
- Tests for error UI states (error messages, retry buttons)
- Tests that trigger console.error via component error boundaries
- Tests for sync error detection (like WebSocket failures in SyncStatusIndicator)

**Important:** Always restore `console.error` in `afterEach` to prevent masking real errors in other tests.

## Library API Verification

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

## Example Test Files Following Best Practices

For reference implementations of these testing patterns, see:
- **`src/components/VineyardView.test.tsx`** - Data layer mocking, modal mocking, async data loading
- **`src/components/vineyard-hooks.test.ts`** - Custom hook testing with ZeroContext mocking
- **`src/components/VineDetailsView.test.tsx`** - CommonJS library mocking, DOM method mocking, callback capture
- **`src/components/QRScanner.test.tsx`** - Constructor mocking, callback capture, promise rejection testing
- **`src/components/SyncStatusIndicator.test.tsx`** - Console.error mocking for error state tests
- **`src/components/Weather.test.tsx`** - Console.error suppression for network error tests
- **`src/components/winery/DeleteVintageConfirmModal.test.tsx`** - Error handling with console.error mock
