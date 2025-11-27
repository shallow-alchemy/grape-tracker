# User Sign-Up/Sign-In Workflow Plan

**Status:** Planned

## Overview

Implement a complete user authentication flow with separate sign-up and sign-in pages, a user table for profile management, and an onboarding modal for new users. Design supports future multi-user vineyard collaboration.

## Problem Being Solved

1. Default vineyard has `user_id = ''` so synced queries can't find it
2. No proper sign-up flow to create user-specific data
3. No user table to track profiles and vineyard membership

## Architecture

### User Flow

```
Landing Page (/)
    ├── SIGN UP → /sign-up
    │       └── Clerk sign-up
    │           └── Onboarding modal (vineyard name/location)
    │               └── Creates: user record + vineyard
    │                   └── Redirect to dashboard
    │
    └── SIGN IN → /sign-in
            └── Clerk sign-in
                └── Query for user record
                    ├── Found → Redirect to dashboard
                    └── Not found → Error + sign out
```

### User Table Schema

```sql
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,                    -- Clerk ID
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  vineyard_id TEXT REFERENCES vineyard(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'owner',     -- 'owner' | 'member' (for future invites)
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

## Implementation Steps

### Phase 1: Database & Schema

1. **Create migration** `backend/migrations/YYYYMMDD000001_create_user_table.sql`
   - User table with Clerk ID as primary key
   - Indexes on email and vineyard_id

2. **Update `schema.ts`**
   - Add `userTable` definition
   - Add to tables array
   - Add ANYONE_CAN permissions

3. **Add query** to `src/shared/queries.ts`
   ```typescript
   export const myUser = syncedQueryWithContext(
     'myUser',
     z.tuple([]),
     (userID: string | undefined) => {
       if (!userID) return builder.user.where('id', '___never_match___');
       return builder.user.where('id', userID);
     }
   );
   ```

### Phase 2: Auth Components

Create `src/components/auth/` directory with:

| File | Purpose |
|------|---------|
| `LandingPage.tsx` | Shows SIGN UP and SIGN IN buttons |
| `SignUpPage.tsx` | Clerk sign-up + triggers onboarding modal |
| `SignInPage.tsx` | Clerk sign-in + verifies user record exists |
| `OnboardingModal.tsx` | Collects vineyard name/location, creates user + vineyard |
| `AuthGuard.tsx` | Wraps app, ensures user has completed onboarding |

### Phase 3: Entry Point Updates

**`src/index.tsx`** - Add routing:
```typescript
<ClerkProvider publishableKey={publishableKey}>
  <Router>
    <SignedIn>
      <App />
    </SignedIn>
    <SignedOut>
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/" component={LandingPage} />
    </SignedOut>
  </Router>
</ClerkProvider>
```

**`src/App.tsx`** - Add AuthGuard:
```typescript
<ZeroProvider>
  <AuthGuard>
    <Router>
      <AppContent />
    </Router>
  </AuthGuard>
</ZeroProvider>
```

### Phase 4: Styling

- Update `src/index.module.css` with landing page button styles
- Create CSS modules for auth components using existing theme tokens

## Key Behaviors

### Sign Up Flow
1. User clicks SIGN UP on landing page
2. Clerk sign-up modal completes
3. App detects no user record in DB
4. Onboarding modal appears (cannot be dismissed)
5. User enters vineyard name + optional location
6. Creates vineyard with `user_id = clerk_id`
7. Creates user record with `vineyard_id` and `onboarding_completed = true`
8. Redirects to dashboard

### Sign In Flow
1. User clicks SIGN IN on landing page
2. Clerk sign-in modal completes
3. App queries for user record by Clerk ID
4. If found: Redirect to dashboard
5. If not found: Show error "No account found. Please sign up first." + sign out

### AuthGuard (Strict Access Control)
- Wraps main app after sign-in
- Queries for user record by Clerk ID
- If no record found: Sign out immediately and redirect to landing page
- If `onboarding_completed = false`: Sign out and redirect to landing page
- Enforces that only users who completed sign-up can access the app
- No lenient fallback - must use sign-up flow explicitly

## Files Summary

### New Files (8)
- `backend/migrations/YYYYMMDD000001_create_user_table.sql`
- `src/components/auth/LandingPage.tsx`
- `src/components/auth/SignUpPage.tsx`
- `src/components/auth/SignInPage.tsx`
- `src/components/auth/OnboardingModal.tsx`
- `src/components/auth/AuthGuard.tsx`
- `src/components/auth/SignUpPage.module.css`
- `src/components/auth/SignInPage.module.css`

### Modified Files (4)
- `schema.ts` - Add userTable definition and permissions
- `src/shared/queries.ts` - Add myUser query
- `src/index.tsx` - Add routing for auth pages
- `src/App.tsx` - Add AuthGuard wrapper

## Critical Files to Reference

- `schema.ts` lines 3-98 - Table definition patterns
- `src/shared/queries.ts` lines 26-32 - Synced query pattern
- `src/components/VineyardSettingsModal.tsx` - Similar form with location picker
- `src/components/Modal.tsx` - Base modal with `closeDisabled` prop
- `src/index.module.css` - Existing sign-in page styles

## Future Considerations

- **Invite System**: User table has `role` column ready for 'owner' | 'member' distinction
- **Multiple Vineyards**: User could have `vineyard_id` array instead of single ID
- **Profile Settings**: User table can store preferences, notification settings, etc.
