# Gilbert - Quick Start for AI Agents

> **Purpose**: This document provides essential context for AI agents working on Gilbert. Read this FIRST before making any changes.

## Project Overview

**Gilbert** is a mobile-first grape tracking application with an 80s hacker terminal aesthetic. It helps vineyard workers and grape growers track their operations, view weather conditions, manage tasks, and scan QR codes for grape tracking.

## Current Priority (as of Nov 28, 2025)

**Completed Features:**
- Core vine and block management with real-time sync
- QR code generation and 3D printable STL stakes
- Winery management (vintages, wines, stages, tasks, measurements)
- Weather dashboard with alerts
- User authentication and data isolation

**Active Development:** See `docs/04-product/roadmap.md` for current priorities (Organization & Multi-Tenancy, Photo Management, Training & Pruning)

## Essential Documentation

Read these files in order:

1. **`docs/engineering-principles.md`** - Code standards (MUST READ before writing code)
2. **`docs/theme.md`** - Design philosophy (80s terminal aesthetic)
3. **`src/index.css`** - CSS variables / theme tokens (reference for all values)
4. **`docs/02-architecture/system-architecture.md`** - How services connect
5. **`docs/02-architecture/database-schema.md`** - Database tables and relationships
6. **`docs/03-setup/local-development.md`** - How to run the app locally
7. **`docs/04-product/roadmap.md`** - Feature priorities and development phases

## Tech Stack Summary

- **Frontend**: React 19 + TypeScript + Rsbuild
- **Testing**: rstest (Rspack-based testing framework)
- **Routing**: Wouter (minimal router, ~1.5kb)
- **Authentication**: Clerk
- **Data Sync**: Rocicorp Zero (main branch) OR ElectricSQL (electricsql branch)
- **Backend**: Rust/Axum server on Railway
- **Database**: PostgreSQL with logical replication
- **UI Components**: React Aria Components
- **QR Scanning**: qr-scanner v1.4.2 (nimiq)
- **Weather API**: Open-Meteo (free, open-source)
- **Location API**: Nominatim/OpenStreetMap
- **Icons**: react-icons (GiGrapes, wi weather icons)
- **Styling**: CSS Modules ONLY with CSS custom properties

## Critical Code Standards

**You MUST follow these rules from `engineering-principles.md`:**

1. **Fat arrow functions**: All functions use `const myFunc = () => {}`
2. **Named exports**: Use `export const` instead of `export default`
3. **Monolithic files**: Keep related components together, only split at 500-600 lines
4. **CSS Modules only**: All styling via CSS Modules with theme tokens from `src/index.css`
5. **No comments**: Code should be self-explanatory
6. **Minimal changes**: Only modify what's explicitly requested
7. **Component data fetching**: Components fetch their own data using hooks (no prop drilling)

## File Structure

```
src/
├── App.tsx              # Main app with dashboard and routing
├── App.module.css       # Component styles
├── index.tsx            # Entry point with auth routing
├── index.css            # Global styles + CSS variables (theme tokens)
├── mutators.ts          # Client-side Zero mutators
├── contexts/
│   └── ZeroContext.tsx  # Zero provider with Clerk auth
├── shared/
│   └── queries.ts       # Synced queries
└── components/
    ├── auth/            # SignInPage, SignUpPage, OnboardingModal, AuthGuard
    ├── winery/          # WineryView, VintageDetailsView, WineDetailsView, etc.
    ├── dashboard/       # DesktopDashboard
    ├── weather/         # Weather, WeatherAlertSettingsModal
    ├── VineyardView.tsx # Vineyard management
    ├── VineDetailsView.tsx # Vine details
    ├── Modal.tsx        # Reusable modal
    ├── InlineEdit.tsx   # Inline editing component
    └── QRScanner.tsx    # QR scanner

docs/
├── 01-onboarding/       # Start here
├── 02-architecture/     # System design, database schema
├── 03-setup/           # Local development
├── 04-product/         # Roadmap, specs, bug tracker
├── 05-testing/         # Testing guide, coverage status
└── archive/            # Historical documents

schema.ts                # Zero schema definition
```

## Theme Quick Reference

**Always use CSS variables from `src/index.css`:**

```css
/* Core colors */
--color-background: #1a1c1a (faded black)
--color-primary-600: #3a7a3a (primary green)
--color-text-accent: #65a165 (bright green)

/* Typography */
--font-body: SF Mono, Monaco, Inconsolata

/* Spacing */
--spacing-xs to --spacing-5xl (consistent scale)
```

**Design principles:**
- 80s hacker terminal aesthetic
- Mobile-first (primary platform)
- Uppercase text with letter spacing
- Subtle glows on interactive elements
- Monospace fonts throughout
- High contrast, large touch targets (44px minimum)

## Current Features

### Sign-In Page (`index.tsx`)
- "GILBERT" title with terminal styling and green glow
- Themed "SIGN IN" button using Clerk modal
- Large purple grape icon below button
- Full 80s terminal aesthetic

### Dashboard (`App.tsx`)
- Weather warnings (conditional, orange accent)
- What's Next (single next task)
- Current weather display
- 10-day forecast grid
- QR scan button (mobile only, bottom 33.33vh)
- Desktop: 2x2 grid with Recent Activity, Vine Status, Supplies Needed, Task Management

### Vineyard Management (`VineyardView.tsx`)
- Block management (create/edit/delete)
- Vine creation with batch support
- Real-time sync with PostgreSQL
- Vine details view with QR code display

## Important Branch Information

**Check current branch before starting work!**

- **main branch**: Uses Rocicorp Zero with local PostgreSQL
- **electricsql branch**: Uses ElectricSQL with Docker PostgreSQL

See `docs/03-setup/local-development.md` for branch-specific setup instructions.

## Common Tasks

### Adding a new component
1. Check if it fits in existing file (App.tsx is ~600 lines)
2. If new file needed, create in `src/components/`
3. Use fat arrow function: `export const MyComponent = () => {}`
4. Create matching CSS Module: `MyComponent.module.css`
5. Import theme tokens: `var(--color-primary-600)`

### Modifying styles
1. Check `docs/theme.json` for design tokens
2. Use CSS variables from `src/index.css`
3. Create/edit CSS Module for component
4. Follow terminal aesthetic (uppercase, letter-spacing, glows)

### Database changes
1. Modify `schema.ts` (Zero schema)
2. Compile to `schema.js`: `npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler`
3. Restart zero-cache server
4. See `docs/02-architecture/database-schema.md` for current schema

## Package Manager

**ALWAYS use `yarn`, never `npm`:**

```bash
yarn install        # Install dependencies
yarn dev           # Start dev server
yarn zero-cache    # Start Zero sync server
yarn test          # Run tests
```

## IMPORTANT: Background Processes

**NEVER leave `yarn dev` or development servers running in background processes.**

- User will start dev servers themselves when needed
- If you start a background process for testing, ALWAYS kill it before completing your task
- Use `lsof -ti:PORT | xargs kill -9` to clean up lingering processes
- Common ports: 3000 (frontend), 3001 (backend), 4848 (zero-cache)

## Quick Sanity Checks

Before submitting changes:

1. **Code style**: All functions use `const x = () => {}` syntax?
2. **Exports**: All exports use `export const` (not default)?
3. **Styling**: All styles use CSS Modules with theme tokens?
4. **Mobile-first**: Does it work on mobile viewport first?
5. **Theme**: Does it match 80s terminal aesthetic?
6. **Minimal changes**: Did you only change what was requested?

## Next Steps

After reading this document:

1. Review `docs/engineering-principles.md` for detailed code standards
2. Check `docs/roadmap.md` for current development priorities
3. Read architecture docs if working on backend/sync features
4. Reference `docs/theme.json` when implementing UI changes
5. Ask user which branch to work on (main vs electricsql)

## Getting Help

- **Engineering questions**: See `docs/engineering-principles.md`
- **Design questions**: See `docs/theme.md` and `docs/theme.json`
- **Setup issues**: See `docs/03-setup/local-development.md`
- **Architecture questions**: See `docs/02-architecture/system-architecture.md`
- **Database schema**: See `docs/02-architecture/database-schema.md`
