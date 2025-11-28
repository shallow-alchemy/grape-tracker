# Documentation Archive

This directory contains superseded documentation that has been merged into newer, more comprehensive documents.

## Archived Files

### Planning Documents (November 28, 2025)

These planning documents describe approaches that were superseded by simpler solutions:

- `auth_plan.md` - Synced queries migration plan (superseded by custom mutators approach)
- `zero-query-crate-plan.md` - Rust crate plan for Zero query building (never implemented, TypeScript approach used instead)

**Why archived:** The roadmap explains: "The original plan was to build a Rust `zero-query` crate to match Zero's query AST format. This was deprioritized in favor of the simpler custom mutators approach using the official Zero SDK."

### Test Coverage Documentation (November 15, 2025)

These files have been merged into `docs/05-testing/test-coverage-status.md`:

- `test-coverage-summary.md` - Original test coverage summary
- `test-coverage-gaps.md` - Test todo analysis

**New Comprehensive Document:**
- `docs/05-testing/test-coverage-status.md` - Current coverage status (91% as of Nov 2025)

---

## Archive Policy

Documents are archived when:
1. They've been superseded by newer documentation
2. Information has been merged into comprehensive guides
3. They're no longer actively referenced in CLAUDE.md or other primary docs

Archived documents are kept for:
- Historical reference
- Audit trail
- Recovery if information was lost in merge

Documents may be deleted after 6 months in archive if no longer needed.
