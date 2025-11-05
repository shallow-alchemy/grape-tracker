# Gilbert - Project Context

## Project Overview

**Gilbert** is a mobile-first grape tracking application with an 80s hacker terminal aesthetic. It helps vineyard workers and grape growers track their operations, view weather conditions, and scan QR codes for grape tracking.

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Rsbuild
- **Authentication**: Clerk
- **Data Sync**: Rocicorp Zero
- **UI Components**: React Aria Components
- **Icons**: react-icons (GiGrapes)
- **Styling**: CSS Modules with CSS custom properties

## Theme System

### Design Philosophy
- **80s Hacker Terminal**: Faded black backgrounds, muted greens, monospace fonts
- **Mobile-First**: Primary platform is mobile, desktop is secondary
- **Subtle Effects**: Glows, shadows, and terminal aesthetics without overwhelming
- **Accessibility**: High contrast, large touch targets (44px minimum)

### Theme Implementation
- **Source**: `docs/theme.json` contains all design tokens
- **Variables**: Hardcoded in `src/index.css` as CSS custom properties
- **Colors**: Faded black (#1a1c1a), muted greens (#3a7a3a, #65a165)
- **Typography**: Monospace exclusively (Monaco, SF Mono, Menlo)
- **Spacing**: Consistent scale from xs to 5xl

### Key Theme Tokens
- `--color-background`: #1a1c1a (faded black)
- `--color-primary-600`: #3a7a3a (primary green)
- `--color-text-accent`: #65a165 (bright green)
- `--font-body`: SF Mono, Monaco, Inconsolata
- `--spacing-*`: Consistent spacing scale

## Architecture & Engineering Standards

### Code Style (from engineering-principles.md)
1. **Fat arrow functions**: All functions use `const myFunc = () => {}`
2. **Named exports**: Use `export const` instead of `export default`
3. **Monolithic files**: Keep related components in single file, only split at 1000+ lines
4. **CSS Modules only**: All styling via CSS Modules with theme tokens
5. **No comments**: Code should be self-explanatory
6. **Minimal changes**: Only modify what's explicitly requested

### File Structure
```
src/
├── App.tsx              # Main app with WeatherSection, QRScanButton, App components
├── App.module.css       # Dashboard styles
├── index.tsx            # Entry point with auth routing
├── index.module.css     # Sign-in page styles
├── index.css            # Global styles + CSS variables
└── global.d.ts          # Type definitions

docs/
├── engineering-principles.md  # Code standards
├── theme.md                   # Theme design philosophy
├── theme.json                 # Design tokens
└── context.md                 # This file
```

## Current Features

### Sign-In Page (`index.tsx`)
- "GILBERT" title with terminal styling
- Themed "SIGN IN" button using Clerk
- Purple grape icon (GiGrapes) below button
- Full 80s terminal aesthetic

### Dashboard (`App.tsx`)
- **Header**: "GILBERT" title + UserButton
- **Weather Section** (scrollable top portion):
  - Weather warnings (frost, harvest windows) - shown at top
  - Current weather display (72°F, condition, location)
  - 10-day forecast grid
  - "What's Next" section with terminal-style `>` prompts
- **QR Scan Button** (bottom 33vh, always visible):
  - Large green button optimized for thumb reach
  - Placeholder for future QR scanning functionality

### Layout Behavior
- Full viewport height (100vh) with no page scroll
- Weather section scrolls independently
- QR button stays fixed at bottom (flex-shrink: 0)
- Mobile-optimized with large touch targets

## Key Components

### `App.tsx` Exports
- `WeatherSection`: Weather data display (mock data currently)
- `QRScanButton`: Large bottom button for QR scanning
- `App`: Main dashboard component

All use fat arrow syntax and named exports per engineering standards.

## Authentication Flow

1. Unauthenticated: Show sign-in page with themed button
2. Authenticated: Show dashboard with weather + QR button
3. Clerk handles all auth logic via modal

## Data Layer

- **Zero instance**: Created in App component but not yet utilized
- **Schema**: Defined in `schema.ts` at root
- Future: Will sync grape tracking data

## Styling Patterns

### CSS Module Usage
```css
/* Always use theme tokens */
.element {
  background: var(--color-surface);
  color: var(--color-text-primary);
  padding: var(--spacing-lg);
  font-family: var(--font-body);
}
```

### Terminal Aesthetic
- Uppercase text with letter spacing
- Subtle glows on interactive elements
- Monospace fonts throughout
- Muted green accents
- Faded borders and backgrounds

## Next Steps (Not Yet Implemented)

1. QR code scanning functionality
2. Weather API integration
3. Conditional rendering of weather warnings
4. Actual grape tracking features
5. Zero sync implementation
6. Real seasonal task logic

## Important Notes

- **Theme is hardcoded**: CSS variables manually defined in index.css
- **Mock data**: All weather/task data is placeholder
- **Mobile-first**: Design optimized for smartphone use
- **Single file components**: Related components kept together per engineering principles
- **No over-engineering**: Minimal implementation, features added only when needed

## Getting Started for New Claude Instances

1. Read `docs/engineering-principles.md` - understand code standards
2. Read `docs/theme.md` - understand design philosophy
3. Review `docs/theme.json` - reference for all design tokens
4. Check `src/App.tsx` - see current component structure
5. Run `npm run dev` - start development server
6. All styling must use CSS variables from index.css
7. Follow fat arrow + named export patterns
8. Keep components in single files until they exceed 1000 lines
