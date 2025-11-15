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

### 04. Deployment
**Production deployment guides**

- [Deployment Guide](./deployment.md) - Railway + Netlify deployment
- [Bug Tracker](./bug-tracker.md) - Known deployment issues

### 05. Testing
**Test strategy, patterns, and coverage**

- [Testing Guide](./05-testing/testing-guide.md) - rstest, mocking, React hooks, best practices
- [Test Coverage Status](./05-testing/test-coverage-status.md) - Current coverage, todo problem, action plan

### 06. Features
**Feature specifications and implementation guides**

- [Roadmap](./roadmap.md) - Product development roadmap and priorities
- [Theme & Design System](./theme.md) - 80s terminal aesthetic, mobile-first design
- [Theme Tokens](./theme.json) - Colors, typography, spacing, effects
- **Winery Features:**
  - [Winery Backend Plan](./winery-backend-plan.md) - Zero mutations, schema
  - [Winery Frontend Plan](./winery-frontend-plan.md) - Wine production UI components
  - [Vintages UI Planning](./vintages_ui_planning.md) - Vintage (harvest) management UI

### 07. Refactoring
**Code cleanup and technical debt**

- [Code Cleanup Plan](./code-cleanup.md) - Refactoring priorities, anti-patterns to fix

### 08. Critical Issues & Fixes
**Important post-mortems and solutions**

- [Zero Provider Fix](./zero-provider-fix.md) - ⚠️ CRITICAL: How to properly use Zero's built-in provider
- [Test Coverage Gaps](./05-testing/test-coverage-status.md#the-testtodo-problem) - ⚠️ 75% of tests are todo!

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
→ See [Zero Provider Fix](./zero-provider-fix.md)

**...understand test coverage**
→ Check [Test Coverage Status](./05-testing/test-coverage-status.md)

**...implement winery features**
→ Read [Winery Frontend Plan](./winery-frontend-plan.md) and [Vintages UI Planning](./vintages_ui_planning.md)

**...understand the product roadmap**
→ See [Roadmap](./roadmap.md)

**...understand the design system**
→ Read [Theme](./theme.md) and [Theme Tokens](./theme.json)

---

## 📖 Documentation Principles

### Organization
- **01-onboarding**: Getting started quickly
- **02-architecture**: System design and patterns
- **03-setup**: Local development
- **04-deployment**: Production deployment (files at root for now)
- **05-testing**: Testing strategy and coverage
- **06-features**: Feature specs (files at root for now)
- **07-refactoring**: Cleanup plans (files at root for now)
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
- Read [Zero Provider Fix](./zero-provider-fix.md) to avoid common pitfalls

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
| Testing | ✅ Complete | Nov 2025 |
| Deployment | ✅ Complete | Nov 2025 |
| Features | 🟡 Partial | Nov 2025 |
| Refactoring | 🟡 In Progress | Nov 2025 |

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
A: Read [Zero Provider Fix](./zero-provider-fix.md) - you must use Zero's built-in provider

**Q: Why are my tests passing but features broken?**
A: Check [Test Coverage Status](./05-testing/test-coverage-status.md#the-testtodo-problem) - 75% of tests are `test.todo()`!

**Q: What's the package manager?**
A: Use `yarn`, not `npm`. See [For AI Agents](./01-onboarding/for-ai-agents.md#quick-reference)

**Q: Where's the theme info?**
A: [Theme](./theme.md) for philosophy, [Theme Tokens](./theme.json) for exact values

### Still Stuck?

1. Search docs with `grep -r "your search term" docs/`
2. Check [Local Development Setup](./03-setup/local-development.md) common issues section
3. Review recent changes in git history
4. Check GitHub issues (if applicable)

---

**Last Updated**: November 15, 2025
**Maintained By**: Development Team
