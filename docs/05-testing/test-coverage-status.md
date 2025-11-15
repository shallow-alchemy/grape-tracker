# Test Coverage Status

**Last Updated**: November 15, 2025
**Test Framework**: RSTest + React Testing Library
**Overall Status**: ⚠️ **32% actual coverage** (89 passing, 187 todo)

---

## Executive Summary

### Current State

- **Total Tests**: 276 tests across 13 test files
- **Passing**: 89 tests (32%)
- **Todo (Not Running)**: 187 tests (68%)
- **Failures**: 0 ✅
- **Lines of Test Code**: ~1,700 lines

### Critical Issue: test.todo() Anti-Pattern

We have **187 out of 276 tests** (68%) marked as `test.todo()`, which means they're **not actually running**. This creates a false sense of security - tests appear to pass, but major features can be deleted without triggering failures.

**Real Example**: During refactoring, we accidentally deleted the entire WineryView with ADD VINTAGE button functionality. All tests still passed because the tests were marked as `test.todo()` and never executed.

**Progress**: We've converted 19 tests from todo to passing this session (15 WineryView + 4 VineyardView).

### What This Means

1. ✅ **Good**: 89 core tests protect critical vineyard and winery flows
2. ❌ **Bad**: 187 tests exist but provide zero protection
3. ⚠️ **Risk**: Most winery features still minimally tested
4. 🎯 **Goal**: Convert todos to real tests, reach 80% coverage
5. ✨ **Progress**: +19 tests this session, 7% improvement overall

---

## Test Coverage Breakdown

### By Component

| Component | Total | Passing | Todo | Coverage | Priority |
|-----------|-------|---------|------|----------|----------|
| **WineryView** | 53 | 15 | 38 | 28% | 🟡 Partial |
| **MeasurementModal** | 39 | 0 | 39 | 0% | 🔴 Critical |
| **TaskListView** | 34 | 0 | 34 | 0% | 🔴 Critical |
| **StageTransitionModal** | 31 | 0 | 31 | 0% | 🔴 Critical |
| **AddWineModal** | 27 | 0 | 27 | 0% | 🔴 Critical |
| **AddVintageModal** | 25 | 25 | 0 | 100% | ✅ Complete |
| **VineDetailsView** | 20 | 20 | 0 | 100% | ✅ Complete |
| **VineyardView** | 14 | 14 | 0 | 100% | ✅ Complete |
| **Weather** | 12 | 12 | 0 | 100% | ✅ Complete |
| **QRScanner** | 12 | 12 | 0 | 100% | ✅ Complete |
| **Modal** | 11 | 11 | 0 | 100% | ✅ Complete |
| **vineyard-hooks** | 9 | 9 | 0 | 100% | ✅ Complete |
| **App** | 1 | 1 | 0 | 100% | ✅ Complete |
| **TOTAL** | **276** | **89** | **187** | **32%** | - |

### By Feature Area

| Area | Passing | Todo | Coverage |
|------|---------|------|----------|
| **Vineyard Management** | 66 | 0 | 100% |
| **Winery Management** | 40 | 157 | 20% |
| **Weather Dashboard** | 12 | 0 | 100% |
| **QR Code System** | 12 | 0 | 100% |
| **Shared Components** | 11 | 0 | 100% |
| **Data Layer** | 9 | 0 | 100% |
| **Routing** | 1 | 0 | 100% |

**Key Insight**: 84% of all todos (157/187) are in winery components.

---

## What's Actually Tested

### ✅ Vineyard Features (Well Covered)

#### VineyardView Component (100% coverage) ✅
**User Behaviors Tested:**
- Displays all vines in list
- Shows block names for each vine
- Shows "Add Vine" and "Add Block" buttons
- Shows empty state when no vines
- User can open/close add vine modal
- User can filter by block
- Shows vine details when selected
- Success messages display and auto-dismiss
- User can open QR scanner
- Shows empty state when no vines exist
- Block filter via dropdown menu
- Success messages appear and auto-dismiss after 3 seconds

**Test Count**: 14 passing, 0 todo

#### VineDetailsView Component (100% coverage)
**User Behaviors Tested:**
- Shows all vine information (variety, block, date, age, health, notes)
- User can navigate back to list
- User can edit health status
- User can delete with confirmation
- User can view/download QR code
- User can download 3D printable tag
- Error handling for missing vines

**Test Count**: 20 passing, 0 todo

#### QRScanner Component (100% coverage)
**User Behaviors Tested:**
- Opens scanner interface
- Initializes camera
- User can close scanner
- Navigates to vine on scan (URL or ID)
- Auto-closes after successful scan
- Handles camera permission errors
- Uses back camera on mobile
- Scans at 10 FPS

**Test Count**: 12 passing, 0 todo

#### Vineyard Hooks (100% coverage)
**Behaviors Tested:**
- useVines returns data and handles updates
- useBlocks returns data and handles updates
- useVineyard returns data
- All hooks clean up subscriptions on unmount

**Test Count**: 9 passing, 0 todo

### ✅ Weather Dashboard (100% coverage)

**User Behaviors Tested:**
- Shows loading message while fetching
- Displays current temp, condition, location
- Shows 10-day forecast
- Error handling when fetch fails
- User can toggle high/low temps
- Displays weather alerts
- Uses user's location or falls back to default
- User can open alert settings

**Test Count**: 12 passing, 0 todo

### ✅ Shared Components (100% coverage)

#### Modal Component
**User Behaviors Tested:**
- Shows/hides based on isOpen prop
- User can close by clicking overlay
- User can close by pressing Escape
- Clicking content doesn't close modal
- Cannot close during submission
- Different sizes display correctly

**Test Count**: 11 passing, 0 todo

### ✅ Winery Features - Partial Coverage

#### AddVintageModal (100% coverage)
**User Behaviors Tested:**
- Modal opens/closes correctly
- Displays all form fields
- User can create vintage
- User can edit existing vintage
- Form validation
- Success/error handling
- Associated wines display
- Wine operations (add, view, edit, remove)

**Test Count**: 25 passing, 0 todo

---

## What's Partially Tested

### 🟡 Winery Features - WineryView (28% coverage)

#### WineryView (53 tests: 15 passing, 38 todo)
**What's Now Protected (15 tests):**
- ✅ Displays winery label
- ✅ Displays add vintage button
- ✅ Opens add vintage modal
- ✅ Closes modal
- ✅ Shows success messages
- ✅ Success message timeout behavior
- ✅ Modal can be reopened
- ✅ Multiple success messages
- ✅ Fetches vintages on mount
- ✅ Polls for vintages every 2 seconds
- ✅ Cleans up interval on unmount
- ✅ Initial state validation
- ✅ Success message timing
- ✅ Placeholder text displays
- ✅ Modal state management

**Still TODO (38 tests):**
- Wine sections display
- Wine card rendering
- Vintage detail views
- Stage transitions
- Task management UI
- Empty states
- And 32 more...

**Risk Level**: 🟡 Reduced - Core features now protected, advanced features still untested.

## What's NOT Actually Tested

### ❌ Winery Features (0% coverage)

#### AddWineModal (27 todos, 0 passing)
**Planned but NOT Running:**
- Modal open/close
- Form fields display
- Wine creation
- Form validation
- Success/error messages

#### MeasurementModal (39 todos, 0 passing)
**Planned but NOT Running:**
- Modal open/close
- Measurement type selection
- Form field validation
- Unit conversions
- Historical measurements display

#### StageTransitionModal (31 todos, 0 passing)
**Planned but NOT Running:**
- Stage transition workflow
- Validation rules
- Notes and timestamps
- Success confirmation

#### TaskListView (34 todos, 0 passing)
**Planned but NOT Running:**
- Task display
- Task filtering
- Task completion
- Task creation/editing

---

## The test.todo() Problem

### What test.todo() Does

```typescript
test.todo('displays add vintage button', async () => {
  // This code NEVER runs!
  render(<WineryView />);
  expect(screen.getByText('ADD VINTAGE')).toBeInTheDocument();
});
```

- ✅ Test runner counts it in statistics
- ✅ Build passes
- ❌ Code NEVER executes
- ❌ No actual verification happens
- ❌ Creates false sense of security

### When It's Actually Useful

`test.todo()` is meant for **Test-Driven Development (TDD)**:
1. Write todo tests first (plan what to test)
2. Implement features
3. **Convert todos to real tests as you go**
4. ❌ **NEVER leave them as todos in production**

### Our Problem

We have complete test files full of todos committed to the repository. The test suite reports "70 passing" but we're actually only verifying 25% of planned functionality.

---

## Lessons Learned (Condensed)

*Note: Full testing patterns documented in `docs/05-testing/testing-guide.md`*

### Key Technical Discoveries

1. **Module Mocking**: Use plain functions in mocks, not `rs.fn()`
2. **CommonJS vs ES**: Match actual export structure (qrcode library lesson)
3. **React Hooks Rules**: All hooks before conditional returns
4. **DOM Mocking**: Save originals, restore in afterEach
5. **Mock Timing**: Mock after render for document.body operations
6. **Library APIs**: Always verify actual imports before mocking
7. **Callback Capture**: Capture constructor callbacks for event simulation

### Testing Principles Established

1. Module mocks use plain functions
2. Mock at data layer (context over hooks)
3. Wait for async data with `waitFor()`
4. Restore DOM methods in cleanup
5. Verify library APIs match reality
6. Respect React hooks rules
7. Mock after render when needed
8. Capture callbacks for constructor-based APIs
9. Clear captured state in beforeEach
10. Test error paths with mockRejectedValueOnce

### Debugging Stats

- **Initial**: 27 passing, 56 failing (32% pass rate)
- **Final**: 70 passing, 0 failing (100% pass rate)
- **Time Investment**: ~7 hours (2 writing, 4 debugging, 1 documentation)
- **ROI**: High - established patterns for all future tests

---

## Action Plan to Reduce Todos

### Phase 1: Critical Smoke Tests (This Week)

**Priority**: Implement minimum viable tests for WineryView

```typescript
// Smoke test #1: Feature exists
test('displays add vintage button', async () => {
  render(<WineryView />);
  expect(screen.getByText('ADD VINTAGE')).toBeInTheDocument();
});

// Smoke test #2: Feature works
test('opens add vintage modal when button clicked', async () => {
  const user = userEvent.setup();
  render(<WineryView />);
  await user.click(screen.getByText('ADD VINTAGE'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

**Goal**: Convert 5 critical WineryView todos → 5% coverage minimum

### Phase 2: Component-by-Component (6 Weeks)

| Week | Component | Tests to Convert | Target Coverage |
|------|-----------|------------------|-----------------|
| 1 | WineryView | 10 critical tests | 25% |
| 2 | AddWineModal | 15 core tests | 55% |
| 3 | MeasurementModal | 15 core tests | 40% |
| 4 | StageTransitionModal | 15 core tests | 50% |
| 5 | TaskListView | 15 core tests | 45% |
| 6 | VineyardView | 4 remaining todos | 100% |

**Goal**: Reduce todos from 206 → ~130 (37% reduction)

### Phase 3: Full Coverage (Ongoing)

- **Monthly goal**: +20 tests converted
- **Quarterly goal**: 80% overall coverage
- **End goal**: <10 todos remaining (edge cases only)

### Policy Changes (Immediate)

1. ✅ **No new features without tests**
2. ✅ **No PRs with test.todo() for existing features**
3. ✅ **Minimum 80% coverage for new components**
4. ✅ **Code reviews must check test coverage**

### CI/CD Integration (Next Sprint)

```bash
# Generate coverage report
yarn test --coverage

# Fail if coverage drops
yarn test --coverage --coverageThreshold='{"global":{"statements":80}}'
```

### Pre-commit Hook (Optional)

```bash
#!/bin/bash
TODO_COUNT=$(git diff --cached --name-only | \
  grep ".test.tsx\|.test.ts" | \
  xargs grep -l "test.todo" | wc -l)

if [ $TODO_COUNT -gt 0 ]; then
  echo "⚠️  WARNING: Committing tests with test.todo()"
  echo "   Consider implementing before commit."
fi
```

---

## File Priority List

### 🟢 Recent Progress

1. **`src/components/winery/WineryView.test.tsx`** ✨
   - 15 passing, 38 todos (28% coverage)
   - Main winery interface
   - **Status**: Core features now protected
   - **Next**: Continue converting advanced feature tests

2. **`src/components/VineyardView.test.tsx`** ✅
   - 14 passing, 0 todos (100% coverage)
   - Main vineyard interface
   - **Status**: COMPLETE - Full test coverage achieved!

### 🔴 Critical Priority (0% coverage, high risk)

1. **`src/components/winery/MeasurementModal.test.tsx`**
   - 39 todos
   - Critical winemaking measurements
   - **Action**: Implement form validation tests

3. **`src/components/winery/TaskListView.test.tsx`**
   - 34 todos
   - Task management system
   - **Action**: Implement CRUD operation tests

### 🟡 Medium Priority (0% coverage, medium risk)

4. **`src/components/winery/StageTransitionModal.test.tsx`**
   - 31 todos
   - Winemaking workflow
   - **Action**: Test stage validation logic

5. **`src/components/winery/AddWineModal.test.tsx`**
   - 27 todos
   - Wine creation
   - **Action**: Test form validation

### 🟢 Low Priority (partial coverage, lower risk)

6. **`src/App.test.tsx`**
   - 1 test only
   - **Action**: Add routing tests

### ✅ Complete (maintain, don't regress)

- Modal.test.tsx (11/11)
- Weather.test.tsx (12/12)
- VineDetailsView.test.tsx (20/20)
- VineyardView.test.tsx (14/14) ✨
- QRScanner.test.tsx (12/12)
- vineyard-hooks.test.ts (9/9)
- AddVintageModal.test.tsx (25/25)

---

## Benefits of Full Coverage

1. **Catch regressions**: Deleted features trigger test failures
2. **Refactor with confidence**: Tests verify behavior stays the same
3. **Documentation**: Tests show how components should be used
4. **Faster debugging**: Tests help isolate issues
5. **Better design**: Writing tests forces better component APIs

---

## Testing Philosophy

### BEHAVIOR, NOT IMPLEMENTATION

**Test what users see and experience:**

✅ **GOOD (Behavior Testing):**
```typescript
expect(screen.getByText('LOADING...')).toBeInTheDocument();
expect(screen.getByText('Weather data')).toBeInTheDocument();
await user.click(saveButton);
expect(screen.getByText('Saved successfully')).toBeInTheDocument();
```

❌ **BAD (Implementation Testing):**
```typescript
expect(component.state.isLoading).toBe(true);
expect(mockFetch).toHaveBeenCalledWith(...);
expect(component.props.onUpdate).toBeDefined();
```

### User-Centric Approach

Tests focus on:
- What users **see** (rendered text, buttons, images)
- What users **do** (click, type, navigate)
- What users **experience** (success messages, errors, loading states)

NOT on:
- How components are structured internally
- How state is managed
- How functions are called
- Implementation details

This approach makes tests **resilient to refactoring** while still catching **real bugs**.

---

## Running Tests

```bash
# Run all tests
yarn test

# Watch mode (re-run on changes)
yarn test:watch

# Coverage report
yarn test:coverage

# Run specific test file
yarn test VineyardView.test.tsx
```

---

## Next Steps

### This Week
1. ✅ Document coverage gaps (this file)
2. ✅ Implement 15 critical WineryView tests (exceeded 5 test goal!)
3. ✅ Complete VineyardView to 100% coverage (4 tests converted + 2 rewritten)
4. Set up coverage reporting in CI

### Next Sprint
1. Convert 10-15 AddWineModal todos
2. Convert 10-15 MeasurementModal todos
3. Add pre-commit hook for todo warnings

### Ongoing
- No new features without tests
- Reduce todo count by 10-20 tests per week
- Target: 80% coverage by end of quarter
- Monitor coverage in pull request reviews

---

## Recommendation

**Progress Update**: ✅ Implemented 19 tests this session (+19 passing, -19 todos, +7% overall coverage):
- WineryView: 15 tests (0% → 28% coverage)
- VineyardView: 4 tests (71% → 100% coverage)

**Status**: The critical system flaw has been addressed. Core features are now protected:
- **WineryView** (28% coverage): Header, Add Vintage modal, success messages, data fetching
- **VineyardView** (100% coverage): Full feature coverage achieved! 🎉

**Achievements This Session**:
- Vineyard Management: 100% coverage (66/66 tests passing)
- Overall project: 32% coverage (89/276 tests passing)

**Next Priority**: Continue with MeasurementModal, TaskListView, or StageTransitionModal (all at 0% coverage).

---

## Archive Notes

**This document merges and supersedes:**
- `docs/test-coverage-summary.md` - Moved to archive
- `docs/test-coverage-gaps.md` - Moved to archive

**Recommendation**: Move old files to `docs/archive/` after verifying this document is complete.

For detailed testing patterns and implementation guide, see:
- `docs/05-testing/testing-guide.md` - Complete RSTest patterns and examples
