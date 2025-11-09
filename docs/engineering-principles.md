# Engineering Principles for Claude Code

## Core Development Philosophy

### 1. Minimal Code Additions
- **Make the smallest possible changes** to accomplish the task
- **Never add comments** - code should be self-explanatory
- **Only modify code directly addressed by the prompt** - leave everything else untouched
- **Avoid refactoring** unless explicitly requested
- **No over-engineering** - solve exactly what's asked, nothing more

### 2. Abstraction-Last Approach
- **Start with large, monolithic files** containing many exports
- **Build functionality in a single file first** before considering separation
- **Split files at 500-600 lines** OR when any of these occur:
  - Visual scan test fails: Can't mentally map the entire file in one scroll-through
  - Duplicate patterns emerge: Finding yourself copy-pasting within the same file
  - Multiple responsibility: File handles more than one primary concern
  - Hard to debug: Stack traces don't clearly identify what part of file has issues
- **Prefer co-location** of related functionality over premature separation

### 3. CSS Architecture
- **Use CSS Modules exclusively** for all styling
- **Follow the theme document** for all design tokens
- **Use CSS variables as tokens** for:
  - Colors: `var(--color-primary)`, `var(--color-secondary)`
  - Typography: `var(--font-heading)`, `var(--font-body)`
  - Spacing: `var(--spacing-xs)`, `var(--spacing-sm)`
  - Breakpoints: `var(--breakpoint-md)`, `var(--breakpoint-lg)`
- **Never hardcode design values** - always reference theme tokens

### 4. DRY Within Monoliths
- **Extract utility functions** when logic duplicates within same file
- **Use helper components** for repeated UI patterns (forms, modals)
- **Centralize state logic** when multiple UI paths affect same state
- **The Duplication Detector**: If you copy-paste more than 10 lines within a single file, immediately extract to a function or component
- **Pattern: Before copy-paste, ask:**
  - Have I implemented this exact logic elsewhere in this file?
  - Should this be extracted to a utility function instead?
  - Is this file becoming too complex to audit?

### 5. Cleanup on Refactor
- **When changing architecture**, audit for orphaned code
- **Remove redundant UI paths** before adding new ones
- **Search for similar patterns** after extracting logic
- **Test all entry points** after consolidation
- **Delete unused state, handlers, and modals** immediately

### 6. Single Responsibility for UI Paths
- **One modal per entity action** (e.g., one "edit block" modal, not two)
- **Multiple entry points OK**, but must render same component
- **State determines content**, not separate modals for same purpose
- **Avoid parallel implementations** of the same user action

## Implementation Guidelines

### Code Structure
```
✅ GOOD: Single file with multiple exports
components/UserDashboard.jsx
├── export const UserProfile = () => { ... }
├── export const UserStats = () => { ... }
├── export const UserActions = () => { ... }
└── export const utilityFunction = () => { ... }

❌ AVOID: Premature abstraction with default exports
components/
├── UserDashboard/
│   ├── UserProfile.jsx (export default UserProfile)
│   ├── UserStats.jsx (export default UserStats)
│   ├── UserActions.jsx (export default UserActions)
│   └── utils.js (function declarations)
```

### CSS Module Pattern
```css
/* components/UserDashboard.module.css */
.container {
  background: var(--color-background);
  font-family: var(--font-body);
  padding: var(--spacing-md);
}

.title {
  color: var(--color-heading);
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-sm);
}
```

### React Component Standards
- **Use const exports** instead of default exports wherever possible
- **Fat arrow ES6 functions** for all function declarations
- **Named exports** for better IDE support and refactoring

```jsx
// GOOD: Const export with fat arrow function
export const UserProfile = ({ user }) => {
  const handleClick = () => {
    // Handle click logic
  };

  return <div>{user.name}</div>;
};

// AVOID: Default export with function declaration
function UserProfile({ user }) {
  function handleClick() {
    // Handle click logic
  }
  
  return <div>{user.name}</div>;
}
export default UserProfile;
```

### File Organization Priorities
1. **Single file with all related code**
2. **Import from theme document for all design tokens**
3. **Export multiple components from same file**
4. **Only separate when file becomes genuinely large**

## What NOT to Do

### ❌ Don't Add Unnecessary Code
- No boilerplate comments
- No "helpful" console.logs
- No defensive programming unless security-critical
- No unused imports or variables

### ❌ Don't Use Legacy Function Patterns
- Don't use `function` declarations - use fat arrow functions
- Don't use default exports when const exports are possible
- Don't mix function styles within the same file

```jsx
/* BAD */
function handleSubmit(data) {
  return processData(data);
}
export default MyComponent;

/* GOOD */
const handleSubmit = (data) => {
  return processData(data);
};
export const MyComponent = () => { ... };
```

### ❌ Don't Prematurely Abstract
- Don't create separate files for small components
- Don't create utility folders until patterns repeat 3+ times
- Don't split files "for organization" - prefer grep-ability

### ❌ Don't Hardcode Design Values
```css
/* BAD */
.button {
  background: #3b82f6;
  padding: 12px 24px;
  font-size: 16px;
}

/* GOOD */
.button {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
}
```

## Decision Framework

### When making code changes, ask:
1. **Is this the minimal change needed?** If no, reduce scope
2. **Am I only touching what the prompt addresses?** If no, revert unrelated changes
3. **Can this stay in the existing file?** If yes, don't create new files
4. **Am I using theme tokens?** If no, replace with CSS variables
5. **Are all functions fat arrow style?** If no, convert to const declarations
6. **Am I using const exports instead of default?** If possible, prefer named exports

### When considering abstraction:
1. **Is this file over 500-600 lines?** If yes, strongly consider splitting
2. **Are you copy-pasting within the file?** If yes, extract immediately
3. **Is there genuine reuse across different contexts?** If no, don't abstract
4. **Would separation make debugging harder?** If yes, reconsider approach

## Theme Integration

### Always reference the theme document for:
- **Color palette** - primary, secondary, accent, neutral tones
- **Typography scale** - font families, sizes, weights, line heights
- **Spacing system** - consistent spacing units
- **Layout breakpoints** - responsive design points
- **Component tokens** - button styles, form elements, shadows

### CSS Variable Naming Convention
```css
/* Colors */
--color-primary-50 to --color-primary-900
--color-secondary-50 to --color-secondary-900

/* Typography */
--font-heading, --font-body, --font-mono
--font-size-xs to --font-size-3xl

/* Spacing */
--spacing-px, --spacing-xs to --spacing-3xl

/* Breakpoints */
--breakpoint-sm, --breakpoint-md, --breakpoint-lg
```

## Success Criteria

A good Claude Code implementation will:
- ✅ Make only the changes requested in the prompt
- ✅ Contain no comments or extraneous code
- ✅ Keep related functionality co-located in single files
- ✅ Use CSS Modules with theme tokens exclusively
- ✅ Use const exports and fat arrow functions consistently
- ✅ Be immediately greppable and debuggable
- ✅ Require no cleanup or refactoring

Remember: **Code that works simply and follows these principles is better than clever, abstracted, or over-engineered solutions.**