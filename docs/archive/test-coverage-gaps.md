# Test Coverage Gaps - Critical Issue

**Date**: November 15, 2025
**Status**: ⚠️ CRITICAL - Only 25% of tests are actually running

---

## The Problem

We have **206 out of 276 tests** (75%) marked as `test.todo()`, which means they're **not actually running**.

### What This Means

1. **False sense of security**: "70 tests passing" sounds good, but we're missing 75% of coverage
2. **Silent failures**: Major features can be deleted without test failures
3. **Regression risk**: Changes can break features we think are tested

### Real Example

During refactoring, we accidentally deleted the entire WineryView with ADD VINTAGE button functionality and replaced it with a "coming soon" placeholder. **All tests still passed** because:

```typescript
// src/components/winery/WineryView.test.tsx
describe('WineryView', () => {
  describe('header', () => {
    test.todo('displays winery label');
    test.todo('displays add vintage button');  // ← Not actually tested!
    // ... 39 more todo tests
  });
});
```

---

## Test Coverage Breakdown

| Component | Total Tests | Passing | Todo | Coverage |
|-----------|-------------|---------|------|----------|
| **WineryView** | 41 | 0 | 41 | 0% |
| **VineyardView** | 14 | 10 | 4 | 71% |
| **Weather** | 12 | 12 | 0 | 100% |
| **Modal** | 11 | 11 | 0 | 100% |
| **VineDetailsView** | 20 | 20 | 0 | 100% |
| **QRScanner** | 12 | 12 | 0 | 100% |
| **AddVintageModal** | 25 | 25 | 0 | 100% |
| **AddWineModal** | 27 | 0 | 27 | 0% |
| **MeasurementModal** | 39 | 0 | 39 | 0% |
| **StageTransitionModal** | 31 | 0 | 31 | 0% |
| **TaskListView** | 34 | 0 | 34 | 0% |
| **App** | 1 | 1 | 0 | 100% |
| **vineyard-hooks** | 9 | 9 | 0 | 100% |
| **TOTAL** | **276** | **70** | **206** | **25%** |

---

## Why `test.todo()` Is Dangerous

### What `test.todo()` Does

In rstest (our test framework), `test.todo()` marks tests as "planned but not implemented":

```typescript
test.todo('displays add vintage button', async () => {
  // This code NEVER runs!
  render(<WineryView />);
  expect(screen.getByText('ADD VINTAGE')).toBeInTheDocument();
});
```

- ✅ Test runner counts it
- ✅ Build passes
- ❌ Code NEVER executes
- ❌ No actual verification happens

### When It's Useful

`test.todo()` is meant for **TDD (Test-Driven Development)**:
1. Write todo tests first (plan what to test)
2. Implement features
3. **Convert todos to real tests as you go**
4. ❌ **NEVER leave them as todos in production**

### The Problem

We have complete test files full of todos that have been committed to the repository. This creates a **false sense of security** - we think features are tested when they're not.

---

## Immediate Action Items

### Priority 1: Smoke Tests for Critical Features

At minimum, implement these smoke tests (convert from `test.todo` to actual tests):

**WineryView** (currently 0% coverage):
```typescript
test('displays add vintage button', async () => {
  render(<WineryView />);
  expect(screen.getByText('ADD VINTAGE')).toBeInTheDocument();
});

test('opens add vintage modal when button clicked', async () => {
  const user = userEvent.setup();
  render(<WineryView />);

  await user.click(screen.getByText('ADD VINTAGE'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

**AddWineModal** (currently 0% coverage):
```typescript
test('opens modal when isOpen is true', () => {
  render(<AddWineModal isOpen={true} onClose={mockFn} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

**MeasurementModal** (currently 0% coverage):
```typescript
test('displays measurement form fields', () => {
  render(<MeasurementModal isOpen={true} onClose={mockFn} />);
  expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument();
});
```

### Priority 2: Establish Test Coverage Policy

1. **No new features without tests**
2. **No PRs with `test.todo()` for existing features**
3. **Minimum 80% coverage for new components**
4. **CI fails if critical components have <50% coverage**

### Priority 3: Gradual Todo Reduction

Create a plan to convert existing todos:
- Week 1: WineryView critical paths (5 tests)
- Week 2: AddWineModal (10 tests)
- Week 3: MeasurementModal (10 tests)
- Week 4: StageTransitionModal (10 tests)
- Week 5: TaskListView (10 tests)

**Goal**: Reduce todos from 206 → 0 over 5-6 weeks

---

## Prevention: Pre-commit Hooks

Consider adding a pre-commit hook that warns about todos:

```bash
#!/bin/bash
# .git/hooks/pre-commit

TODO_COUNT=$(git diff --cached --name-only | grep ".test.tsx\|.test.ts" | xargs grep -l "test.todo" | wc -l)

if [ $TODO_COUNT -gt 0 ]; then
  echo "⚠️  WARNING: You are committing test files with test.todo()"
  echo "   Consider implementing these tests before committing."
  # Don't block, just warn
fi
```

Or make it blocking:

```bash
if [ $TODO_COUNT -gt 0 ]; then
  echo "❌ BLOCKED: Cannot commit test files with test.todo()"
  echo "   Implement or remove todo tests before committing."
  exit 1
fi
```

---

## Long-term Solution: Test Coverage Reports

Add test coverage reporting to CI:

```bash
# Generate coverage report
yarn test --coverage

# Fail if coverage drops below threshold
yarn test --coverage --coverageThreshold='{"global":{"statements":80,"branches":80,"functions":80,"lines":80}}'
```

Configure in `package.json`:
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "statements": 80,
        "branches": 80,
        "functions": 80,
        "lines": 80
      },
      "./src/components/winery/": {
        "statements": 90,
        "branches": 90,
        "functions": 90,
        "lines": 90
      }
    }
  }
}
```

---

## Benefits of Proper Test Coverage

1. **Catch regressions**: Deleted features trigger test failures
2. **Refactor with confidence**: Tests verify behavior stays the same
3. **Documentation**: Tests show how components should be used
4. **Faster debugging**: Tests help isolate issues
5. **Better design**: Writing tests forces better component APIs

---

## Lessons Learned

### ❌ Don't Do This

- Don't commit `test.todo()` for existing features
- Don't trust "X tests passing" without checking todo count
- Don't assume green builds mean everything works

### ✅ Do This Instead

- Write tests as you build features (TDD)
- Convert todos to real tests before merging
- Track both passing AND todo test counts
- Require code reviews to check test coverage
- Use coverage reports in CI

---

## Action Plan

**This Week:**
1. ✅ Document the issue (this file)
2. Implement 5 critical WineryView smoke tests
3. Set up coverage reporting in CI

**Next Sprint:**
1. Implement AddWineModal tests (27 tests)
2. Implement MeasurementModal tests (39 tests)
3. Add pre-commit hook for todo warnings

**Ongoing:**
- No new features without tests
- Reduce todo count by 10-20 tests per week
- Target: 80% coverage by end of quarter

---

## Files with High Todo Counts

Priority order for implementation:

1. `src/components/winery/WineryView.test.tsx` - **41 todos** (0% coverage)
2. `src/components/winery/MeasurementModal.test.tsx` - **39 todos** (0% coverage)
3. `src/components/winery/TaskListView.test.tsx` - **34 todos** (0% coverage)
4. `src/components/winery/StageTransitionModal.test.tsx` - **31 todos** (0% coverage)
5. `src/components/winery/AddWineModal.test.tsx` - **27 todos** (0% coverage)

**Total winery todos**: 172 out of 206 (83% of all todos are in winery components!)

---

## Recommendation

**Immediate action**: Before continuing with refactoring or new features, implement at minimum the 5 critical smoke tests for WineryView to prevent this from happening again.

The fact that we could delete an entire feature (ADD VINTAGE button) and have all tests pass is a **critical system flaw** that needs to be addressed.
