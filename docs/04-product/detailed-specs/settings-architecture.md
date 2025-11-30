# Settings Architecture

**Status:** Planning
**Priority:** High (moved up from Winery Priority 3)
**Last Updated:** Nov 30, 2025

---

## Overview

Replace Clerk's out-of-the-box UserButton with a custom user menu, and create a comprehensive Settings page with modular, portable settings sections.

---

## User Menu

### Location
Top-right of header, replacing `<UserButton />` from Clerk.

### Component
```
src/components/UserMenu.tsx
```

### Behavior
- Click to open dropdown menu
- Options:
  - **Settings** → Navigate to `/settings`
  - **Logout** → Call Clerk's `signOut()`, redirect to login

### Design
- Simple icon or avatar (user initials if no photo)
- Dropdown follows 80s terminal theme
- Keyboard accessible (Escape to close, arrow keys to navigate)

---

## Settings Page

### Route
```
/settings
/settings/:section  (deep link to specific section)
```

### Layout
- Left sidebar with section navigation
- Main content area with selected section
- Mobile: Section selector dropdown, then content

### Component Structure
```
src/components/settings/
├── SettingsPage.tsx           # Main page with routing/layout
├── SettingsSection.tsx        # Reusable section container
├── SettingItem.tsx            # Individual setting row component
├── settingsRegistry.ts        # Section registration + ordering
└── sections/
    ├── OrganizationSection.tsx
    ├── NotificationsSection.tsx
    ├── StagesTasksSection.tsx
    ├── ThemeSection.tsx
    ├── StorefrontSection.tsx
    └── BillingSection.tsx
```

---

## Portable Settings Pattern

### Why Portable?
Settings will evolve. We need to:
- Move settings between sections without code surgery
- Add new sections easily
- Disable sections without breaking the app
- A/B test section ordering

### Section Interface
Each section exports a configuration object:

```typescript
// sections/StagesTasksSection.tsx
import { FiList } from 'react-icons/fi';

export const StagesTasksSection: SettingsSection = {
  id: 'stages-tasks',
  title: 'Stages & Tasks',
  icon: FiList,
  description: 'Customize winemaking stages and associated tasks',
  status: 'active',  // 'active' | 'coming-soon' | 'beta'
  component: StagesTasksSettings,
  order: 30,  // for sorting
};
```

### Registry
```typescript
// settingsRegistry.ts
import { OrganizationSection } from './sections/OrganizationSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { StagesTasksSection } from './sections/StagesTasksSection';
import { ThemeSection } from './sections/ThemeSection';
import { StorefrontSection } from './sections/StorefrontSection';
import { BillingSection } from './sections/BillingSection';

export const settingsSections: SettingsSection[] = [
  OrganizationSection,
  NotificationsSection,
  StagesTasksSection,
  ThemeSection,
  StorefrontSection,
  BillingSection,
].sort((a, b) => a.order - b.order);

// Get active sections only
export const getActiveSections = () =>
  settingsSections.filter(s => s.status !== 'hidden');
```

### Moving Settings
To move a setting from one section to another:
1. Move the component/code to the new section file
2. No changes to SettingsPage or registry needed

To reorder sections:
1. Change the `order` property
2. Or reorder the array in registry

---

## Settings Sections

### 1. Organization
**Status:** Phase 1 - Basic, Phase 2 - Multi-tenancy

**Phase 1 (Now):**
- Vineyard name
- Vineyard location (coordinates, region)
- Default units (gallons/liters, °F/°C)

**Phase 2 (Multi-tenancy):**
- Organization name
- Multiple vineyards list
- Team members (invite, remove)
- Roles & permissions (Owner, Manager, Member, Field Worker)

**Database:**
- Uses existing `vineyard` table
- Future: `organization`, `organization_membership` tables

---

### 2. Notifications
**Status:** Coming Soon

**Future Features:**
- Push notification preferences
- Email notification preferences
- Alert thresholds (weather, tasks)
- Quiet hours
- Per-notification-type toggles

**Dependencies:**
- Push notification infrastructure
- Email service integration

---

### 3. Stages & Tasks ← PRIORITY
**Status:** Active Development

**Stage Customization:**
- View all 11 wine stages
- See which stages apply to which wine types
- Toggle optional stages on/off per wine type
- (Future) Custom stage ordering
- (Future) Custom stages

**Task Template Management:**
- View task templates grouped by stage
- Enable/disable default templates
- Edit template details (name, description, frequency)
- Create custom task templates
- Delete custom templates (not defaults)
- Copy-on-write: User edits create overrides, defaults preserved
- "Reset to defaults" per template or per stage

**UI Design:**
- Accordion or tabs by stage
- Task list within each stage
- Toggle switches for enable/disable
- Edit button opens modal
- "Add Task" button per stage

**Database:**
- `task_template` table (existing)
- `user_task_template_override` table (new) - stores user customizations
- Or: `is_default` + `parent_template_id` pattern

---

### 4. Theme
**Status:** Coming Soon (Phase 1), Future (Full)

**Phase 1 - Simple:**
- Dark/Light mode toggle (currently dark only)
- Accent color picker (currently green)

**Phase 2 - Comprehensive:**
- Multiple preset themes (Terminal Green, Amber CRT, Blue Steel, etc.)
- Custom color pickers for all theme tokens
- Font selection (within monospace family)
- Animation preferences (reduce motion)
- Preview before applying
- Save custom themes
- Share themes (export/import)

**Implementation:**
- CSS custom properties already in `src/index.css`
- Theme settings stored in `user_preferences` table
- Apply via class on `<html>` or inline style variables

---

### 5. Storefront
**Status:** Future Concept

**Vision:**
Vineyards can expose a public-facing page showcasing their wines, vintages, and story - auto-generated from their production data in the app.

**Features:**
- Enable/disable public storefront
- Custom subdomain or slug (`gilbert.app/v/your-vineyard`)
- Select which wines/vintages to feature
- Add vineyard story/about section
- Contact information
- Photo gallery (requires Photo Management)
- Optional: Link to external shop/ordering

**Dependencies:**
- Photo Management infrastructure
- Public API endpoints
- SEO considerations

---

### 6. Billing & Payments
**Status:** Future

**Features:**
- Current plan display
- Usage metrics
- Upgrade/downgrade plan
- Payment method management
- Billing history
- Invoices

**Dependencies:**
- Stripe integration
- Subscription model defined
- Pricing tiers established

---

## Implementation Phases

### Phase 1: Foundation (Current Priority)
- [ ] Create UserMenu component (replace Clerk UserButton)
- [ ] Create SettingsPage shell with section navigation
- [ ] Implement portable section pattern
- [ ] Create placeholder sections (coming soon states)
- [ ] **Implement Stages & Tasks section** (functional)

### Phase 2: Organization Basics
- [ ] Vineyard name/location editing
- [ ] Default units preferences

### Phase 3: Theme Basics
- [ ] Dark/light mode toggle
- [ ] Accent color selection

### Phase 4: Multi-tenancy
- [ ] Organization model
- [ ] Team management
- [ ] Roles & permissions

### Phase 5: Advanced
- [ ] Notifications infrastructure
- [ ] Storefront MVP
- [ ] Billing integration

---

## Technical Considerations

### State Management
- Settings stored in database (synced via Zero)
- Local state for unsaved changes
- Optimistic updates with rollback on error

### Mobile Experience
- Full-screen section view on mobile
- Bottom sheet for section selection
- Touch-friendly toggles and inputs

### Performance
- Lazy load section components
- Only fetch data for visible section
- Debounce saves for text inputs

---

## Related Documents
- [Task System Architecture](./task-system-architecture.md) - Task template details
- [Roadmap](../roadmap.md) - Overall priorities
