# Gilbert Documentation

**Navigation hub for all project documentation**

> This is a mobile-first grape tracking app with an 80s hacker terminal theme, built with React + TypeScript + Zero + Clerk.

---

## 🚀 Quick Start

**New to the project?** Start here:
1. 📖 [For AI Agents](./01-onboarding/for-ai-agents.md) - Quick context for Claude & AI assistants
2. 🏗️ [System Architecture](./02-architecture/system-architecture.md) - How everything fits together
3. 💻 [Local Development Setup](./03-setup/local-development.md) - Get up and running

---

## 📚 Documentation by Topic

### 01. Onboarding
**For new developers and AI agents**

- [For AI Agents](./01-onboarding/for-ai-agents.md) - Quick project context, priorities, essential files

### 02. Architecture
**System design, patterns, and technical decisions**

- [System Architecture](./02-architecture/system-architecture.md) - Services, data flow, Zero vs Electric
- [Database Schema](./02-architecture/database-schema.md) - All tables, relationships, migrations
- [Code Standards](./engineering-principles.md) - Fat arrows, named exports, CSS Modules, patterns

### 03. Setup
**Getting the project running locally**

- [Local Development Setup](./03-setup/local-development.md) - PostgreSQL, Zero, Electric, troubleshooting

### 04. Product & Features
**Feature planning, product roadmap, and specifications**

- [Product Planning Overview](./04-product/README.md) - Feature planning process
- [Roadmap](./04-product/roadmap.md) - Product development roadmap and priorities
- [Bug Tracker](./04-product/bug-tracker.md) - Known issues and deployment bugs
- **Detailed Specifications:**
  - [Vintages UI](./04-product/detailed-specs/vintages-ui.md) - Vintage (harvest) management UI
  - [Winery Production](./04-product/detailed-specs/winery-production.md) - Wine production UI components
  - [Terroir Optimizer](./04-product/detailed-specs/terroir-optimizer.md) - Varietal recommendations (planned)

### 05. Testing
**Test strategy, patterns, and coverage**

- [Testing Guide](./05-testing/testing-guide.md) - rstest, mocking, React hooks, best practices
- [Test Coverage Status](./05-testing/test-coverage-status.md) - Current coverage, todo problem, action plan

### 06. Design System
**Visual design, theming, and UI patterns**

- [Theme & Design System](./theme.md) - 80s terminal aesthetic, mobile-first design
- [Theme Tokens](../src/index.css) - CSS custom properties (single source of truth)

### 07. Deployment
**Production deployment guides**

- [Deployment Guide](./deployment.md) - Railway + Netlify deployment

### 08. Zero Sync & Queries
**Zero cache, synced queries, and data isolation**

- [Zero Synced Queries](./zero-synced-queries-knowledge.md) - Query patterns and context handling
- [Zero Provider](../src/contexts/ZeroContext.tsx) - Auth integration with Clerk

---

## 🎯 Find What You Need

### I want to...

**...understand the project quickly**
→ Read [For AI Agents](./01-onboarding/for-ai-agents.md)

**...set up my development environment**
→ Follow [Local Development Setup](./03-setup/local-development.md)

**...understand the architecture**
→ Start with [System Architecture](./02-architecture/system-architecture.md)

**...write tests**
→ Read [Testing Guide](./05-testing/testing-guide.md)

**...understand the database**
→ Check [Database Schema](./02-architecture/database-schema.md)

**...deploy to production**
→ Follow [Deployment Guide](./deployment.md)

**...understand code standards**
→ Read [Code Standards](./engineering-principles.md)

**...fix a Zero provider error**
→ Check [ZeroContext.tsx](../src/contexts/ZeroContext.tsx) - uses Zero's built-in provider with Clerk auth

**...understand test coverage**
→ Check [Test Coverage Status](./05-testing/test-coverage-status.md)

**...implement winery features**
→ Read [Winery Production](./04-product/detailed-specs/winery-production.md) and [Vintages UI](./04-product/detailed-specs/vintages-ui.md)

**...understand the product roadmap**
→ See [Roadmap](./04-product/roadmap.md)

**...plan a new feature**
→ Read [Product Planning Overview](./04-product/README.md)

**...understand the design system**
→ Read [Theme](./theme.md) and [CSS Variables](../src/index.css)

---

## 📖 Documentation Principles

### Organization
- **01-onboarding**: Getting started quickly
- **02-architecture**: System design and patterns
- **03-setup**: Local development
- **04-product**: Feature planning, roadmap, and specifications
- **05-testing**: Testing strategy and coverage
- **06-design**: Theme and UI patterns (files at root for now)
- **07-deployment**: Production deployment (files at root for now)
- **08-zero**: Zero sync, queries, and data isolation
- **archive**: Old documentation versions

### Writing Style
- **Scannable**: Use headings, lists, and tables
- **Actionable**: Provide clear next steps
- **Cross-referenced**: Link related docs
- **Up-to-date**: Update docs with code changes
- **Examples**: Show, don't just tell

### For AI Agents
- Start with [For AI Agents](./01-onboarding/for-ai-agents.md) for context
- Reference [Code Standards](./engineering-principles.md) for style
- Check [Testing Guide](./05-testing/testing-guide.md) before writing tests
- Review [ZeroContext.tsx](../src/contexts/ZeroContext.tsx) for Zero provider patterns

---

## 🔄 Document Lifecycle

### Active Documentation
All docs in numbered folders (01-08) are actively maintained and represent current state.

### Archived Documentation
Old versions moved to `/docs/archive/` for historical reference.

### Updating Docs
When making significant changes:
1. Update the relevant doc(s)
2. Update cross-references if paths change
3. Update this README if new categories added
4. Archive old version if major rewrite

---

## 📊 Documentation Status

| Category | Status | Last Updated |
|----------|--------|--------------|
| Onboarding | ✅ Complete | Nov 2025 |
| Architecture | ✅ Complete | Nov 2025 |
| Setup | ✅ Complete | Nov 2025 |
| Product | ✅ Complete | Nov 2025 |
| Testing | ✅ Complete | Nov 2025 |
| Design System | ✅ Complete | Nov 2025 |
| Deployment | ✅ Complete | Nov 2025 |
| Zero Sync | ✅ Complete | Nov 2025 |

**Legend:**
- ✅ Complete - Comprehensive and up-to-date
- 🟡 Partial - Core content present, could use expansion
- 🔴 Outdated - Needs review and updates

---

## 🆘 Help & Support

### Common Questions

**Q: Which branch should I use?**
A: Use `main` branch (Zero sync). See [For AI Agents](./01-onboarding/for-ai-agents.md#branch-information)

**Q: Why is my Zero provider not working?**
A: Check [ZeroContext.tsx](../src/contexts/ZeroContext.tsx) - it correctly wraps Zero's built-in provider with Clerk auth

**Q: How is test coverage?**
A: Check [Test Coverage Status](./05-testing/test-coverage-status.md) - currently at 91% with 696 passing tests

**Q: What's the package manager?**
A: Use `yarn`, not `npm`. See [For AI Agents](./01-onboarding/for-ai-agents.md#quick-reference)

**Q: Where's the theme info?**
A: [Theme](./theme.md) for philosophy, [CSS Variables](../src/index.css) for exact values

### Still Stuck?

1. Search docs with `grep -r "your search term" docs/`
2. Check [Local Development Setup](./03-setup/local-development.md) common issues section
3. Review recent changes in git history
4. Check GitHub issues (if applicable)

---

**Last Updated**: November 28, 2025
**Maintained By**: Development Team
