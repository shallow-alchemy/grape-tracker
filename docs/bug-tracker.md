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

## Resolved Issues

_(None yet)_
