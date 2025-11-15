# Zero Provider Fix - Critical Architecture Issue

**Date**: November 15, 2025
**Issue**: `useZero must be used within a ZeroProvider` error
**Status**: ✅ RESOLVED

---

## Problem

After refactoring App.tsx from 692 lines to extract components, the application broke with this error:

```
Uncaught Error: useZero must be used within a ZeroProvider
    at useZero (react.js:115:1)
    at useQuery (react.js:156:1)
    at useVines (vineyard-hooks.ts:9:1)
```

### Symptoms

- UI briefly showed "Loading..."
- Then immediately crashed with the error
- VineyardView component couldn't access Zero instance
- Error occurred inside `@rocicorp/zero/react`'s `useQuery` hook

### Root Cause

We created a **custom ZeroProvider** and **custom useZero hook** in `src/contexts/ZeroContext.tsx`:

```typescript
// ❌ INCORRECT - Custom provider
const ZeroContext = createContext<ZeroContextValue>(null);

export const useZero = (): Zero<Schema> => {
  const context = useContext(ZeroContext);
  if (!context) {
    throw new Error('useZero must be used within ZeroProvider');
  }
  return context;
};

export const ZeroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [zero, setZero] = useState<Zero<Schema> | null>(null);

  useEffect(() => {
    if (user) {
      const instance = new Zero<Schema>({
        userID: user.id,
        server: process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848',
        schema,
      });
      setZero(instance);
      return () => instance.close();
    }
  }, [user?.id]);

  if (!user || !zero) {
    return <div>Loading...</div>;
  }

  return <ZeroContext.Provider value={zero}>{children}</ZeroContext.Provider>;
};
```

**The problem**: `useQuery` from `@rocicorp/zero/react` has its own **internal `useZero` hook** that looks for **Zero's built-in provider context**, not our custom context!

When components called:
1. `useVines()` → calls our `useZero()` ✅ (worked)
2. Our `useZero()` → returns Zero instance ✅ (worked)
3. `useQuery(zero.query.vine)` → internally calls **Zero's `useZero()`** ❌ (failed!)
4. Zero's `useZero()` → can't find Zero's provider context → throws error

---

## Solution

**Use Zero's built-in `ZeroProvider` and `useZero` from `@rocicorp/zero/react`:**

```typescript
// ✅ CORRECT - Use Zero's built-in provider
import { type ReactNode } from 'react';
import { ZeroProvider as ZeroProviderInternal, useZero as useZeroInternal } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { schema, type Schema } from '../../schema';
import type { Zero } from '@rocicorp/zero';

export const useZero = (): Zero<Schema> => {
  return useZeroInternal<Schema>();
};

export const ZeroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ZeroProviderInternal
      userID={user.id}
      server={process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848'}
      schema={schema}
    >
      {children}
    </ZeroProviderInternal>
  );
};
```

### Key Changes

1. **Import Zero's provider**: `import { ZeroProvider, useZero } from '@rocicorp/zero/react'`
2. **Re-export their hooks**: Our `useZero` now calls `useZeroInternal` from Zero
3. **Wrap their provider**: Our `ZeroProvider` is now a thin wrapper that:
   - Checks for Clerk user authentication
   - Passes props directly to Zero's `ZeroProvider`
   - No manual state management or useEffect needed!

---

## Why This Matters

### Zero's Architecture

`@rocicorp/zero/react` provides:
- `ZeroProvider` - Context provider that manages Zero instance
- `useZero()` - Hook to access Zero instance from context
- `useQuery()` - Hook to subscribe to queries (internally calls `useZero()`)

**Critical**: `useQuery` **must** be used with Zero's built-in provider. You cannot create a custom provider and expect `useQuery` to work.

### What Zero's Provider Does

Looking at Zero's TypeScript definitions:

```typescript
export type ZeroProviderProps<S extends Schema> = (ZeroOptions<S> | {
    zero: Zero<S>;
}) & {
    init?: (zero: Zero<S>) => void;
    children: ReactNode;
};
```

Zero's provider accepts either:
1. **ZeroOptions** (userID, server, schema) - provider creates instance
2. **Existing Zero instance** - provider uses existing instance

Both approaches set up the correct internal context that `useQuery` expects.

---

## Lessons Learned

### ❌ Don't Do This

- Don't create custom React context for third-party library instances
- Don't assume you can replace a library's provider with your own
- Don't manually manage state that a library already manages

### ✅ Do This Instead

- Use the library's built-in provider
- Create thin wrapper components for authentication/configuration
- Let the library manage its own state and lifecycle
- Read the library's exports (`@rocicorp/zero/react` exports `ZeroProvider`)

---

## Debug Tips

If you encounter `useZero must be used within a ZeroProvider` in the future:

1. **Check the stack trace**: Is the error coming from inside `useQuery` or another Zero hook?
2. **Check your imports**: Are you importing from `@rocicorp/zero/react`?
3. **Check your provider**: Are you using Zero's `ZeroProvider` or a custom one?
4. **Add console logs**: Log the context value to see if it's Zero's context or your own

Example debugging:
```typescript
export const useZero = (): Zero<Schema> => {
  const context = useContext(ZeroContext);
  console.log('useZero context:', context); // Check what context you're reading
  return context;
};
```

---

## Related Files

- `src/contexts/ZeroContext.tsx` - Zero provider wrapper (fixed)
- `src/components/vineyard-hooks.ts` - Uses `useQuery` and `useZero`
- `src/App.tsx` - Renders `<ZeroProvider>`
- `src/index.tsx` - Renders `<App>` inside `<ClerkProvider>`

## Provider Hierarchy

```
<React.StrictMode>
  <ClerkProvider>
    <SignedIn>
      <App>
        <ZeroProvider>  ← Uses Zero's built-in provider
          <Router>
            <AppContent>
              <Route>
                <VineyardView>
                  {useVines()} ← Calls useQuery → Zero's useZero ✅
```

---

## Testing

After the fix:
- ✅ All 70 tests passing
- ✅ App loads without errors
- ✅ VineyardView can access Zero instance
- ✅ `useQuery` subscriptions work correctly
- ✅ No "Loading..." flash followed by error
