# Training & Pruning System

**Status:** In Progress
**Priority:** Vineyard Management Priority 1
**Last Updated:** November 28, 2025

---

## Overview

Track how each vine is trained and pruned. This system has two phases:

1. **Phase 1 (Manual):** Capture training methods and pruning history
2. **Phase 2 (AI):** Provide intelligent guidance including photo-based pruning assistance

The manual phase is designed to capture rich data that enables powerful AI features later.

---

## User Stories

### Field Worker (Mobile)
- I scan a vine tag in the field and want to quickly log that I just pruned it
- I want to see what training system this vine uses before I start pruning
- I want to take a photo and ask "where should I prune?"

### Vineyard Manager (Desktop)
- I want to see pruning history across all my vines
- I want to set training methods for multiple vines at once
- I want to analyze pruning patterns and timing

---

## Phase 1: Manual Implementation

### Data Model

#### Vine Table Additions

```typescript
// Add to existing vine table
{
  training_method: 'HEAD_TRAINING' | 'BILATERAL_CORDON' | 'VERTICAL_CORDON' |
                   'FOUR_ARM_KNIFFEN' | 'GENEVA_DOUBLE_CURTAIN' | 'UMBRELLA_KNIFFEN' |
                   'CANE_PRUNED' | 'VSP' | 'OTHER' | null,
  training_method_other: string | null,  // Description when method = 'OTHER'
}
```

#### Training Method Enum

| Value | Display Name | Knowledge Doc |
|-------|--------------|---------------|
| `HEAD_TRAINING` | Head Training (Goblet) | `training/head-training.md` |
| `BILATERAL_CORDON` | Bilateral Cordon | `training/bilateral-cordon-training.md` |
| `VERTICAL_CORDON` | Vertical Cordon | `training/vertical-cordon.md` |
| `FOUR_ARM_KNIFFEN` | Four-Arm Kniffen | `training/four-arm-kniffen.md` |
| `GENEVA_DOUBLE_CURTAIN` | Geneva Double Curtain (GDC) | `training/geneva-double-curtain.md` |
| `UMBRELLA_KNIFFEN` | Umbrella Kniffen | `training/umbrella-system.md` |
| `CANE_PRUNED` | Cane Pruned (Guyot) | `training/cane-pruning.md` |
| `VSP` | Vertical Shoot Positioning | (common, well-known) |
| `OTHER` | Other (Custom) | User-provided description |

#### Pruning Log Table (New)

```typescript
{
  id: string,                    // UUID
  user_id: string,               // For data isolation
  vine_id: string,               // FK to vine
  date: number,                  // Unix timestamp
  pruning_type: 'dormant' | 'summer' | 'corrective' | 'training',
  spurs_left: number | null,     // Number of spurs after pruning
  canes_before: number | null,   // Cane count before
  canes_after: number | null,    // Cane count after
  notes: string,
  photo_id: string | null,       // Future: link to photo
  created_at: number,
  updated_at: number,
}
```

#### Pruning Type Definitions

| Type | When Used | Typical Season |
|------|-----------|----------------|
| `dormant` | Main annual pruning when vine is dormant | Winter (Dec-Feb) |
| `summer` | Canopy management, hedging, shoot thinning | Summer (Jun-Aug) |
| `corrective` | Removing dead/diseased wood, fixing problems | Any time |
| `training` | Establishing vine structure in young vines | Year 1-3 |

---

### UI Design

#### Mobile Experience (Primary for Field Use)

The mobile experience is optimized for quick logging while in the field.

```
┌─────────────────────────────────────┐
│ < BACK          VINE AB-010    ⚙️   │
├─────────────────────────────────────┤
│                                     │
│  BILATERAL CORDON      [Edit]       │
│  Planted: Jun 2022 (3 years)        │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │    [  📷 LOG PRUNING  ]        ││
│  │                                 ││
│  │    [  🤖 PRUNING HELP  ]       ││  ← Phase 2
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  RECENT                             │
│  ├─ Jan 15 · Dormant · 8 spurs     │
│  └─ Jul 3 · Summer hedge            │
│                                     │
│  [View full history]                │
│                                     │
└─────────────────────────────────────┘
```

**Mobile Design Principles:**
- Big touch targets (44px minimum)
- One-tap to start logging
- Minimal typing (dropdowns, quick options)
- Date defaults to today
- Voice notes option for notes field
- Offline-capable (queue entries, sync when connected)
- One-handed operation

#### Desktop Experience

Desktop provides full management and analysis capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│  TRAINING & PRUNING                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Training Method                    Pruning Statistics           │
│  ┌─────────────────────────┐       ┌──────────────────────────┐ │
│  │ BILATERAL CORDON    ▼   │       │ Avg spurs/year: 8        │ │
│  │ [🤖 Help me choose]     │       │ Last pruned: 45 days ago │ │
│  └─────────────────────────┘       │ Pruning frequency: 2x/yr │ │
│                                    └──────────────────────────┘ │
│                                                                  │
│  Pruning History                                    [+ Add Entry]│
│  ┌────────┬──────────┬───────┬────────┬─────────────────────────┤
│  │ Date   │ Type     │ Spurs │ Canes  │ Notes                   │
│  ├────────┼──────────┼───────┼────────┼─────────────────────────┤
│  │ Jan 15 │ Dormant  │ 8     │ 12→8   │ Removed weak interior   │
│  │ Jul 3  │ Summer   │ -     │ -      │ Hedged to 18 inches     │
│  │ Jan 20 │ Dormant  │ 6     │ 10→6   │ First full pruning      │
│  └────────┴──────────┴───────┴────────┴─────────────────────────┘
│                                                                  │
│  Knowledge Base                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 📖 Bilateral Cordon Training Guide                           ││
│  │ Dormant pruning: Select 2-3 spurs per arm, 2 buds each...   ││
│  │ [Read full guide]                                            ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### Add Pruning Modal

Shared modal optimized for each platform:

```
┌─────────────────────────────────────┐
│  LOG PRUNING                    ✕   │
├─────────────────────────────────────┤
│                                     │
│  Date                               │
│  [Nov 28, 2025            📅]       │
│                                     │
│  Type                               │
│  ( ) Dormant   ( ) Summer           │
│  ( ) Corrective ( ) Training        │
│                                     │
│  Spurs Left (optional)              │
│  [    8    ]                        │
│                                     │
│  Canes Before → After (optional)    │
│  [   12   ] → [    8    ]           │
│                                     │
│  Notes                              │
│  ┌─────────────────────────────────┐│
│  │ Removed weak interior canes,   ││
│  │ left 2 buds per spur           ││
│  └─────────────────────────────────┘│
│  [🎤 Voice note]                    │
│                                     │
│  [📷 Add Photo]                     │
│                                     │
│        [CANCEL]    [SAVE]           │
└─────────────────────────────────────┘
```

#### OTHER Training Method Flow

When user selects OTHER:

```
┌─────────────────────────────────────┐
│  Training Method                    │
│  [OTHER                         ▼]  │
│                                     │
│  Describe your training system:     │
│  ┌─────────────────────────────────┐│
│  │ Modified Scott Henry with 4    ││
│  │ cordons, shoot positioned up   ││
│  └─────────────────────────────────┘│
│                                     │
│  💡 This helps us learn about      │
│  training systems we may not know  │
└─────────────────────────────────────┘
```

---

## Phase 2: AI Integration

### AI Feature: Photo-Based Pruning Guidance

Users upload a photo and ask "where should I prune?"

```
┌─────────────────────────────────────────────────────────────┐
│                    AI PRUNING ASSISTANT                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │         [Photo of vine]                   │               │
│  │                                           │               │
│  │    🔴 Cut here                            │               │
│  │         ↘                                 │               │
│  │           ════╗                           │               │
│  │    🟢 Keep    ║                           │               │
│  │      ↘       ║                           │               │
│  │       ═══════╝                            │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
│  "This vine is trained as BILATERAL CORDON. I see 3         │
│  canes on the left arm. For balanced production, keep       │
│  the 2 strongest canes (marked green) and remove the        │
│  weak interior cane (marked red). Leave 2 buds per spur."   │
│                                                              │
│  [Ask follow-up question...]                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**How This Works:**

1. User takes photo of vine section
2. App sends to multimodal LLM (Claude/GPT-4V) with context:
   - Training method and knowledge doc
   - Vine age and variety
   - Current season
   - Recent pruning history
3. AI analyzes image and provides:
   - Visual annotations (where to cut)
   - Explanation based on training system principles
   - Confidence level
4. User can ask follow-up questions

**Requirements for AI Integration:**

| Requirement | Purpose | Status |
|-------------|---------|--------|
| Photo infrastructure | Capture and store vine photos | Roadmap Priority 2 |
| Training method data | Context for AI | Phase 1 |
| Pruning history | Pattern context | Phase 1 |
| Knowledge docs | AI reference material | ✅ 8 docs complete |
| LLM API integration | Vision analysis | Future |
| Prompt engineering | Structured responses | Future |

### AI Feature: Training Method Recommendation

Help users choose the right training system.

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 TRAINING METHOD RECOMMENDATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Based on your vineyard:                                     │
│  • Variety: Pinot Noir                                       │
│  • Climate: Maritime (windy)                                 │
│  • Soil: Well-drained                                        │
│  • Goals: Quality over quantity                              │
│                                                              │
│  I recommend: HEAD TRAINING (Goblet)                         │
│                                                              │
│  Why:                                                        │
│  • Low profile protects against wind damage                  │
│  • No trellis infrastructure needed                          │
│  • Natural vigor control for quality focus                   │
│  • Traditional match for Pinot in coastal regions            │
│                                                              │
│  Considerations:                                             │
│  • Requires hand harvesting                                  │
│  • 4-5 years to establish                                    │
│  • Higher per-vine labor                                     │
│                                                              │
│  [Use this method]  [See alternatives]  [Learn more]         │
└─────────────────────────────────────────────────────────────┘
```

### AI Feature: Seasonal Pruning Reminders

Proactive guidance based on season and training system.

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 PRUNING GUIDANCE                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  It's late January. For your BILATERAL CORDON vines:         │
│                                                              │
│  ✅ Now is the time for dormant pruning                      │
│                                                              │
│  Recommended actions:                                        │
│  • Select 2-3 healthy spurs per arm                          │
│  • Leave 2 buds per spur (16-24 buds total)                  │
│  • Remove all other canes at the base                        │
│  • Cut cleanly, 1/4" above the bud                           │
│                                                              │
│  Based on your history:                                      │
│  • Last year you left 8 spurs average                        │
│  • Consider increasing to 10 if vines showed low vigor       │
│                                                              │
│  [Show me how] → Opens photo guidance                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Manual (Current Priority)

1. **Schema Changes**
   - Add `training_method` and `training_method_other` to vine table
   - Create `pruning_log` table
   - Update Zero schema and compile

2. **Training Method UI**
   - InlineEdit dropdown in VineDetailsView
   - OTHER handling with custom description field

3. **Mobile Pruning Section**
   - Replace placeholder with quick-log UI
   - "Log Pruning" prominent button
   - Recent entries list

4. **Desktop Pruning Section**
   - Full history table
   - Statistics display
   - Knowledge base link

5. **Add Pruning Modal**
   - Form for logging pruning events
   - Mobile-optimized layout
   - Optional fields for cane/spur counts

6. **Tests**
   - Schema tests
   - Component tests
   - Integration tests

### Phase 2: AI (Future)

**Prerequisites:**
- Phase 1 complete (training method and pruning data)
- Photo infrastructure (Vineyard Priority 2)
- LLM API setup

**Implementation:**
1. Prompt engineering with knowledge docs
2. "Help me choose" for training method
3. Seasonal guidance notifications
4. Photo-based pruning assistant

---

## Data for AI Context

When Phase 2 AI features are implemented, they will use:

| Data Point | Source | AI Usage |
|------------|--------|----------|
| Training method | Phase 1 | Core context for all guidance |
| Pruning history | Phase 1 | Pattern recognition, timing suggestions |
| Vine age | Existing | Establishment vs mature vine advice |
| Variety | Existing | Varietal-specific recommendations |
| Climate zone | User profile (future) | Regional timing, system suitability |
| Season | System date | Seasonal task recommendations |
| Photos | Photo infrastructure | Visual pruning guidance |
| Knowledge docs | Knowledgebase | Training system reference |

---

## Learning from Users

### OTHER Training Method Analysis

When users select OTHER and provide descriptions:
1. Store descriptions for analysis
2. Identify patterns (common custom systems)
3. Add popular systems to the enum
4. Update knowledge base with new training docs

### Pruning Pattern Insights

Aggregate (anonymized) pruning data can reveal:
- Regional timing patterns
- Popular training systems by climate
- Typical spur/cane counts by training method
- Common pruning mistakes

---

## Files to Create/Modify

### New Files
- `backend/migrations/XXXXXX_add_training_pruning.sql`
- `src/components/AddPruningModal.tsx`
- `src/components/AddPruningModal.module.css`
- `src/components/AddPruningModal.test.tsx`

### Modified Files
- `schema.ts` - Add pruning_log table, update vine
- `src/mutators.ts` - Add pruning_log mutators
- `queries-service/src/mutators.ts` - Server-side mutators
- `src/shared/queries.ts` - Add pruning queries
- `src/components/VineDetailsView.tsx` - Training & Pruning section
- `src/components/VineDetailsView.test.tsx` - Updated tests

---

## Open Questions

1. **Block-level defaults** - Should blocks have a default training method that new vines inherit?
2. **Bulk operations** - How to set training method for 50 vines at once?
3. **Offline sync** - Priority for offline pruning log entry?
4. **Photo storage** - S3 vs Cloudinary vs other?

---

## Related Documents

- [Roadmap](../roadmap.md) - Vineyard Priority 1
- [Training Knowledge Base](../knowledgebase/training/) - 8 training system docs
- [Photo Management Spec](./photo-management.md) - Dependency for AI features
