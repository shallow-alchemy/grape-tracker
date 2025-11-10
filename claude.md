# Claude Code Quick Start

## Project Context

This is **Gilbert**, a mobile-first grape tracking app with an 80s hacker terminal theme.

**📖 Start here**: Read `docs/context.md` for complete project context, architecture, and current state.

## Essential Documentation

1. **`docs/context.md`** - Complete project overview, tech stack, current features, database setup
2. **`docs/roadmap.md`** - Development roadmap and feature priorities
3. **`docs/next-steps-zero-sync.md`** - Current debugging focus for vine sync issue
4. **`docs/troubleshooting.md`** - Common issues and solutions for Zero and ElectricSQL setups
5. **`docs/engineering-principles.md`** - Code standards (fat arrow functions, named exports, CSS Modules, minimal changes)
6. **`docs/theme.md`** - Design philosophy (80s terminal aesthetic, mobile-first, accessibility)
7. **`docs/theme.json`** - All design tokens (colors, typography, spacing, effects)

## Quick Reference

- **App Name**: Gilbert
- **Stack**: React + TypeScript + Clerk + Zero + Rsbuild
- **Package Manager**: Yarn (use `yarn` not `npm`)
- **Styling**: CSS Modules only, all values from CSS variables in `src/index.css`
- **Code Style**: Fat arrow functions, named exports, monolithic files
- **Theme**: Faded black (#1a1c1a) + muted greens (#3a7a3a, #65a165), monospace fonts

## Current State

### Main Branch (Zero Sync)
- ✅ Sign-in page with themed button
- ✅ Dashboard with weather section (mock data)
- ✅ QR scan button (UI only, no functionality yet)
- ✅ Mobile-first layout with fixed bottom button
- ✅ PostgreSQL with wal_level=logical configured
- ✅ Gilbert database with vine table
- ✅ zero-cache server starting successfully
- ⚠️ **ISSUE**: Vines not syncing to UI (permissions deployment)

### ElectricSQL Branch
- ✅ Full sync functionality working
- ✅ Docker PostgreSQL + Electric + Backend API
- ✅ Real-time updates functional
- ✅ Ready for testing

### Roadmap (see `docs/roadmap.md` for details)

**Phase 1: Core Vine Management**
1. ⚠️ Fix vine sync issue (current blocker)
2. Improve vine creation form
3. Add block management system
4. Add quantity field (batch create vines)

**Phase 2: QR Code & 3D Printable Tags**
1. SVG QR codes (partially done)
2. SVG → STL conversion
3. 3D printable vine stake design
4. QR scanning functionality

**Phase 3: Additional Features**
- Weather API integration
- Task management
- Harvest tracking
- Photo uploads
- Analytics dashboard

**Important**: Check current git branch before starting work. See `docs/context.md` database setup section for branch-specific instructions.
