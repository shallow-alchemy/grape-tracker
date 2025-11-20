# Claude Code Quick Start

## Project Context

This is **Gilbert**, a mobile-first grape tracking app with an 80s hacker terminal theme.

**📖 Start here**: Read **[`docs/README.md`](docs/README.md)** for complete documentation navigation.

## Finding "What's Next"

**Always check [`docs/04-product/roadmap.md`](docs/04-product/roadmap.md) first** for current priorities.

Documents in `docs/04-product/detailed-specs/` are **implementation references**, not todo lists:
- Use them AFTER a feature is prioritized in the roadmap
- They provide detailed implementation guidance
- Status headers indicate if features are complete/in-progress/planned
- See [`docs/04-product/detailed-specs/README.md`](docs/04-product/detailed-specs/README.md) for more info

## Essential Documentation

### Quick Start (Read These First)
1. **[For AI Agents](docs/01-onboarding/for-ai-agents.md)** - Quick project context, priorities, essential files
2. **[System Architecture](docs/02-architecture/system-architecture.md)** - How everything fits together
3. **[Local Development Setup](docs/03-setup/local-development.md)** - Get up and running

### Critical Technical Knowledge
4. **[Zero Provider Fix](docs/zero-provider-fix.md)** - ⚠️ CRITICAL: Must use Zero's built-in provider
5. **[Test Coverage Status](docs/05-testing/test-coverage-status.md)** - ⚠️ CRITICAL: 75% of tests are `todo`!
6. **[Code Standards](docs/engineering-principles.md)** - Fat arrows, named exports, CSS Modules
7. **[Testing Guide](docs/05-testing/testing-guide.md)** - rstest, mocking, React hooks, best practices

### Reference Documentation
8. **[Database Schema](docs/02-architecture/database-schema.md)** - All tables and relationships
9. **[Deployment Guide](docs/deployment.md)** - Railway + Netlify production deployment
10. **[Roadmap](docs/04-product/roadmap.md)** - Product development priorities
11. **[Theme](docs/theme.md)** - 80s terminal aesthetic, mobile-first design
12. **[Theme Tokens](src/index.css)** - CSS custom properties (single source of truth)

**See [`docs/README.md`](docs/README.md) for complete documentation index**

## Quick Reference

- **App Name**: Gilbert
- **Stack**: React + TypeScript + Clerk + Zero + Rsbuild
- **Package Manager**: Yarn (use `yarn` not `npm`)
- **Styling**: CSS Modules only, all values from CSS variables in `src/index.css`
- **Code Style**: Fat arrow functions, named exports, monolithic files
- **Theme**: Faded black (#1a1c1a) + muted greens (#3a7a3a, #65a165), monospace fonts

## IMPORTANT: Background Process Policy

**NEVER leave `yarn dev` or any development servers running in background processes.**

- The user will start the dev servers themselves when needed
- If you need to check server output temporarily, run it in foreground with timeout
- If you start a background process for testing, ALWAYS kill it before completing your task
- Use `lsof -ti:PORT | xargs kill -9` to clean up any lingering processes
- Common ports: 3000 (frontend), 3001 (backend), 4848 (zero-cache), 4849 (zero change-streamer)

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
