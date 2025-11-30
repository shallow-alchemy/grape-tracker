# Bug Tracker

## Known Issues

### Netlify Deploys on Backend-Only Changes

**Date Reported:** Nov 11, 2025

**Issue:** When pushing changes that only affect backend files (e.g., new migration file in `backend/migrations/`), Netlify triggers a deployment even though the frontend code hasn't changed.

**Expected Behavior:** Netlify should skip deployment when only backend files change, based on the ignore pattern in `netlify.toml`:
```toml
ignore = "git diff --quiet HEAD^ HEAD -- . ':!backend' ':!migrations' ':!docs'"
```

**Actual Behavior:** Netlify deploys even when changes are only in:
- `backend/migrations/` directory
- Possibly other backend-only paths

**Impact:**
- Unnecessary frontend rebuilds
- Wastes build minutes
- Slower deployment pipeline

**Workaround:** None currently - just accept the unnecessary frontend deployment.

**Possible Causes:**
1. The ignore pattern in `netlify.toml` may not be correctly formatted
2. The git diff command might not be working as expected in Netlify's build environment
3. Netlify might evaluate the ignore command differently than expected

**Next Steps:**
- [ ] Test if the ignore pattern works correctly
- [ ] Consider using Netlify's built-in ignore patterns instead of git diff
- [ ] Research Netlify documentation for proper ignore syntax

---

### Flash on Page Load (Zero Sync Loading State)

**Date Reported:** Nov 30, 2025

**Issue:** Pages flash/flicker on initial load because components render with empty data before Zero has synced.

**Symptoms:**
- Brief flash of empty content when navigating to pages
- Zero logs show WebSocket closing/reopening and "hydrating N queries"
- Particularly noticeable on Settings > Stages & Tasks

**Root Cause:** Components don't distinguish between "data not yet loaded" (`undefined`) and "data loaded but empty" (`[]`). The pattern `(data || [])` treats both as empty array.

**Fix Pattern:**
```typescript
const [data] = useQuery(someQuery(user?.id));

// Check if still loading
const isLoading = data === undefined;

if (isLoading) {
  return <LoadingState />;
}

// Now safe to render - data is loaded (may be empty array)
return <ActualContent data={data} />;
```

**Applied Fixes:**
- `StagesTasksSection.tsx` - Added loading check (2024-11-30)

**Files to Audit:**
```bash
grep -r "useQuery" src/components --include="*.tsx" | grep -v ".test."
```

Components likely affected:
- `VineyardView.tsx`
- `WineryView.tsx`
- `DashboardView.tsx`
- `WineDetailsView.tsx`
- `VintageDetailsView.tsx`
- Any component using Zero queries

**Next Steps:**
- [ ] Audit all `useQuery` usages app-wide
- [ ] Add loading state pattern consistently
- [ ] Consider creating a `useQueryWithLoading` hook wrapper

---

## Resolved Issues

_(None yet)_
