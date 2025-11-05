# Gilbert - Project Context

## Project Overview

**Gilbert** is a mobile-first grape tracking application with an 80s hacker terminal aesthetic. It helps vineyard workers and grape growers track their operations, view weather conditions, manage tasks, and scan QR codes for grape tracking.

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Rsbuild
- **Routing**: Wouter (minimal router, ~1.5kb)
- **Authentication**: Clerk
- **Data Sync**: Rocicorp Zero
- **UI Components**: React Aria Components
- **Icons**: react-icons (GiGrapes for sign-in, wi for weather icons)
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

## Routing Structure

- `/` - Dashboard/Home (weather + task overview)
- `/vineyard` - Vineyard management page (placeholder)
- `/winery` - Winery management page (placeholder)
- Navigation via wouter `<Link>` components
- "GILBERT" title in header links back to home

## Current Features

### Sign-In Page (`index.tsx`)
- "GILBERT" title with terminal styling and green glow
- Themed "SIGN IN" button using Clerk modal
- Large purple grape icon (GiGrapes, 4rem) below button
- Full 80s terminal aesthetic with faded black background

### Mobile Layout (`App.tsx`)

**Header (all routes):**
- "GILBERT" title (clickable, returns to home)
- Navigation: "VINEYARD" | "WINERY" links
- UserButton (Clerk)

**Dashboard View (/):**

1. **Weather Warnings** (single item, conditional with `.hidden` class):
   - Enhanced visual: 2px orange border, elevated background, orange glow shadow
   - Shows ONLY the next critical warning
   - Example: "FROST WARNING: NOV 15-17"

2. **What's Next** (single item):
   - Standard styling with green border
   - Shows ONLY the next task
   - Terminal-style `>` prompt
   - Text truncates with ellipsis if too long
   - Example: "> HARVEST GRAPES BEFORE NOV 20"

3. **Current Weather**:
   - Large temperature display (72°F)
   - Condition and location
   - Green accent colors

4. **10-Day Forecast**:
   - 5x2 grid of daily forecasts
   - Day label + temperature
   - Compact design

5. **QR Scan Button** (bottom 25vh):
   - Large green button optimized for thumb reach
   - Fixed at bottom, always visible
   - No QR functionality yet (placeholder)

**Mobile Layout Behavior:**
- Full viewport height with no page scrolling
- Weather section scrolls independently
- QR button fixed at bottom (flex-shrink: 0)
- Consistent 32px spacing from nav to first box (warnings or what's next)

### Desktop Layout (768px+)

Desktop uses a priority-first vertical scrolling layout with 1400px max-width app canvas.

**Weather Section (top, no flex):**
1. **Weather Warnings** - Full width banner (auto height, conditionally hidden)
2. **What's Next** - Full width banner (auto height, single item)
3. **Forecast + Today's Weather** - Full width, larger section:
   - Left: Today's weather card (200px, green accent border, elevated)
   - Right: 10-day forecast in horizontal row (10 columns)

**Desktop Dashboard (bottom, 2x2 grid, 400px min-height):**

**Row 1:**
- **Recent Activity** - Timestamped scan/update feed
- **Vine Status** - 3-column grid stats (Active/Harvested/Pending)

**Row 2:**
- **Supplies Needed** - Task-driven supply list with "VIEW INVENTORY" link
  - Supply name + reason (linked to upcoming tasks)
  - Example: "YEAST (RED STAR)" for "HARVEST - NOV 20"
- **Task Management** - Expanded todo list with checkboxes and dates

**Desktop-Specific Behaviors:**
- Current Weather hidden (shown in forecast section as "Today")
- QR Scan button hidden
- Page scrolls vertically (not constrained to viewport)
- Generous spacing: 32px gaps, 40px padding
- All panels have overflow-y: auto for long content

**Desktop Spacing:**
- Section gaps: `var(--spacing-3xl)` (32px)
- Outer padding: `var(--spacing-4xl)` (40px)
- First visible box always 32px from nav (using `:first-child` margin-top)

## Key Components

### `App.tsx` Exports (all use fat arrow + named exports)
- `WeatherSection`: Main weather display with warnings, what's next, current, forecast
- `QRScanButton`: Large bottom button for QR scanning (mobile only)
- `RecentActivity`: Desktop panel - activity feed
- `VineStatus`: Desktop panel - vine statistics grid
- `SuppliesNeeded`: Desktop panel - task-driven supply checklist
- `TaskManagement`: Desktop panel - detailed todo list with checkboxes
- `DesktopDashboard`: Container for 2x2 desktop panel grid
- `DashboardView`: Main dashboard view combining weather + desktop panels
- `VineyardView`: Placeholder for vineyard page
- `WineryView`: Placeholder for winery page
- `App`: Root app component with routing and auth

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
