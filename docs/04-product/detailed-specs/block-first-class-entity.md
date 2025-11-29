# Block as First-Class Entity

**Status:** In Progress
**Last Updated:** Nov 29, 2025
**Priority:** High - Foundation for AI features and seasonal tracking

## Overview

Promote blocks from simple vine groupings to first-class entities with their own detail pages, settings, and inherited properties. This change enables:
- Training method set at block level (inherited by vines)
- AI-powered training method recommendations
- Future: Seasonal stage tracking per block
- Future: Irrigation scheduling per block

---

## Current Architecture

```
Vineyard View
  └── Block dropdown/tabs (filter only)
        └── Vine list (filtered by block)
              └── Vine Details Page
                    └── training_method (per vine)
```

**Problems:**
- Blocks have no dedicated view
- Training method set per-vine (should be per-block)
- No natural place for block-level settings or AI helpers
- BlockSettingsModal is cramped for complex features

---

## New Architecture

```
Vineyard View
  └── Block Cards (clickable)
        └── Block Details Page (/vineyard/block/:blockId)
              ├── Block settings (training method, stage, irrigation)
              ├── AI helper (inline expandable)
              └── Vine list (clickable → Vine Details)
                    └── Vine Details Page
                          └── training_method (read-only, from block)
```

---

## Database Schema Changes

### Add training_method to block table

```sql
ALTER TABLE block ADD COLUMN training_method TEXT;
ALTER TABLE block ADD COLUMN training_method_other TEXT;
```

### Migration Strategy for Existing Data

Since training_method currently exists on vines, we need to migrate:

```sql
-- For each block, set training_method to the most common value among its vines
-- Or leave NULL and let user set it

-- Option A: Leave NULL, user sets manually
-- (Recommended - cleaner, no assumptions)

-- Option B: Infer from vines
UPDATE block b
SET training_method = (
  SELECT training_method
  FROM vine v
  WHERE v.block = b.id
  GROUP BY training_method
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM vine v
  WHERE v.block = b.id
  AND v.training_method IS NOT NULL
);
```

### Vine training_method Handling

**Option A: Keep on vine as read-only cache**
- `vine.training_method` stays but is set from block on save
- Allows historical tracking if block changes
- More storage, potential sync issues

**Option B: Remove from vine, always lookup from block** (Recommended)
- Remove `vine.training_method` column
- UI always fetches from block
- Cleaner, single source of truth
- Migration: Drop column after confirming block values

**Recommendation:** Option B - Remove from vine. Training method is inherently a block-level decision.

### Schema Changes Summary

```typescript
// schema.ts changes

// Block table - add columns
const blockTable = table('block')
  .columns({
    id: string(),
    user_id: string(),
    name: string(),
    training_method: string(),        // NEW
    training_method_other: string(),  // NEW
    // future: current_stage, stage_entered_at, irrigation_schedule_id
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

// Vine table - remove training_method columns (Phase 2)
// For now, keep them but make UI read-only
```

---

## UI Components

### 1. Block Cards in Vineyard View

Replace current block filter with clickable cards:

```
┌─────────────────────────────────────────────────────────┐
│ ← VINEYARD                              [+] [scan] [⚙]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ BLOCKS                                                  │
│                                                         │
│ ┌─────────────────┐  ┌─────────────────┐               │
│ │ NORTH BLOCK     │  │ SOUTH BLOCK     │               │
│ │ 24 vines        │  │ 18 vines        │               │
│ │ Bilateral Cordon│  │ Not Set         │               │
│ │ [→]             │  │ [→]             │               │
│ └─────────────────┘  └─────────────────┘               │
│                                                         │
│ ┌─────────────────┐                                    │
│ │ + ADD BLOCK     │                                    │
│ └─────────────────┘                                    │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ ALL VINES (42)                          [Filter ▼]     │
│ ┌─────────────────────────────────────────────────┐    │
│ │ N-001  CABERNET SAUVIGNON  Block North • 3 yrs │    │
│ │ N-002  CABERNET SAUVIGNON  Block North • 3 yrs │    │
│ │ S-001  CHARDONNAY          Block South • 2 yrs │    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 2. Block Details Page

New page at `/vineyard/block/:blockId`:

```
┌─────────────────────────────────────────────────────────┐
│ ← VINEYARD                                         [⚙]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ NORTH BLOCK                                             │
│ 24 vines • Cabernet Sauvignon, Merlot                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ TRAINING & PRUNING                                      │
│                                                         │
│ TRAINING METHOD                                         │
│ [Bilateral Cordon            ▼]  [Edit]                │
│                                                         │
│ [▶ Help me choose a training method]                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ SEASONAL STAGE (Coming Soon)                           │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ VINES IN THIS BLOCK                        [+ Add Vine] │
│                                                         │
│ ┌─────────────────────────────────────────────────┐    │
│ │ N-001  CABERNET SAUVIGNON            GOOD  [→] │    │
│ │ N-002  CABERNET SAUVIGNON            GOOD  [→] │    │
│ │ N-003  MERLOT                   EXCELLENT  [→] │    │
│ │ N-004  MERLOT                        FAIR  [→] │    │
│ │ ... 20 more                                    │    │
│ └─────────────────────────────────────────────────┘    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [DELETE BLOCK]                                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. AI Training Helper (Inline Expandable)

When user clicks "Help me choose":

```
┌─────────────────────────────────────────────────────────┐
│ [▼ Help me choose a training method]                   │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │ WHAT VARIETIES ARE IN THIS BLOCK?                  │ │
│ │ Detected: Cabernet Sauvignon, Merlot               │ │
│ │                                                     │ │
│ │ YOUR CLIMATE ZONE                                   │ │
│ │ [Mediterranean (hot, dry summers)    ▼]            │ │
│ │                                                     │ │
│ │ VINE VIGOR                                          │ │
│ │ [Medium ▼]                                         │ │
│ │                                                     │ │
│ │ MAINTENANCE PREFERENCE                              │ │
│ │ [Low - minimal pruning complexity ▼]               │ │
│ │                                                     │ │
│ │ MECHANIZATION                                       │ │
│ │ [Manual harvest and pruning ▼]                     │ │
│ │                                                     │ │
│ │              [GET RECOMMENDATION]                   │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✓ RECOMMENDED: BILATERAL CORDON                    │ │
│ │                                                     │ │
│ │ "Bilateral cordon is ideal for your Cabernet       │ │
│ │ Sauvignon in a Mediterranean climate. It provides  │ │
│ │ excellent sun exposure for ripening, is relatively │ │
│ │ simple to maintain once established, and works     │ │
│ │ well with manual harvesting."                      │ │
│ │                                                     │ │
│ │ Also consider:                                      │ │
│ │ • VSP - More labor but better canopy control       │ │
│ │ • Head Training - Traditional, very low maintenance│ │
│ │                                                     │ │
│ │        [USE BILATERAL CORDON]                       │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4. Vine Details View Changes

Training method becomes read-only, shows inherited value:

```
┌─────────────────────────────────────────────────────────┐
│ TRAINING & PRUNING                                      │
│                                                         │
│ TRAINING METHOD                                         │
│ Bilateral Cordon (from block)           [View Block →] │
│                                                         │
│ ... pruning logs ...                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Backend: AI Training Recommendation Endpoint

### Endpoint

```
POST /api/ai/training-recommendation
```

### Request

```json
{
  "varieties": ["Cabernet Sauvignon", "Merlot"],
  "climate_zone": "mediterranean",
  "vigor": "medium",
  "maintenance_preference": "low",
  "mechanization": "manual"
}
```

### Response

```json
{
  "recommended": {
    "method": "BILATERAL_CORDON",
    "name": "Bilateral Cordon",
    "reasoning": "Bilateral cordon is ideal for your Cabernet Sauvignon..."
  },
  "alternatives": [
    {
      "method": "VSP",
      "name": "Vertical Shoot Positioning",
      "reasoning": "More labor but better canopy control"
    },
    {
      "method": "HEAD_TRAINING",
      "name": "Head Training (Goblet)",
      "reasoning": "Traditional, very low maintenance"
    }
  ]
}
```

### Implementation

```rust
// backend/src/routes/ai.rs

use anthropic::client::Client;

pub async fn training_recommendation(
    State(state): State<AppState>,
    Json(request): Json<TrainingRecommendationRequest>,
) -> Result<Json<TrainingRecommendationResponse>, AppError> {
    let client = Client::new(&state.anthropic_api_key);

    // Load training selection guide
    let guide = include_str!("../../docs/ai-knowledge/training/selection-guide.md");

    let prompt = format!(r#"
You are a viticulture expert helping a vineyard owner choose a training method.

KNOWLEDGE BASE:
{guide}

USER'S SITUATION:
- Varieties: {varieties}
- Climate: {climate}
- Vine vigor: {vigor}
- Maintenance preference: {maintenance}
- Mechanization: {mechanization}

Based on this information, recommend the best training method.
Respond in JSON format:
{{
  "recommended": {{
    "method": "METHOD_CODE",
    "name": "Human Readable Name",
    "reasoning": "2-3 sentences explaining why"
  }},
  "alternatives": [
    {{ "method": "...", "name": "...", "reasoning": "..." }}
  ]
}}
"#,
        guide = guide,
        varieties = request.varieties.join(", "),
        climate = request.climate_zone,
        vigor = request.vigor,
        maintenance = request.maintenance_preference,
        mechanization = request.mechanization,
    );

    let response = client
        .messages()
        .create(MessagesRequest {
            model: "claude-3-5-haiku-latest".to_string(),
            max_tokens: 1024,
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt,
            }],
            ..Default::default()
        })
        .await?;

    // Parse JSON response
    let recommendation: TrainingRecommendationResponse =
        serde_json::from_str(&response.content)?;

    Ok(Json(recommendation))
}
```

---

## Routing Changes

### Current Routes
```
/vineyard                    → VineyardView (vine list)
/vineyard/vine/:vineId       → VineDetailsView
/vineyard/block/:blockId     → VineyardView with block filter (not a page)
```

### New Routes
```
/vineyard                    → VineyardView (block cards + vine list)
/vineyard/block/:blockId     → BlockDetailsView (NEW - full page)
/vineyard/vine/:vineId       → VineDetailsView (unchanged)
```

---

## Implementation Phases

### Phase 1: Schema & Backend (Day 1)
- [ ] Add `training_method` and `training_method_other` to block table
- [ ] Create migration SQL
- [ ] Update Zero schema
- [ ] Sync schema to queries-service
- [ ] Add block mutators for training method update

### Phase 2: BlockDetailsView (Day 1-2)
- [ ] Create `BlockDetailsView.tsx` component
- [ ] Add routing for `/vineyard/block/:blockId`
- [ ] Display block info (name, vine count, varieties)
- [ ] Display training method with inline edit
- [ ] Display vine list (reuse VineyardViewVineList with filter)
- [ ] Add navigation back to vineyard

### Phase 3: Vineyard View Block Cards (Day 2)
- [ ] Create `BlockCard.tsx` component
- [ ] Update `VineyardView.tsx` to show block cards
- [ ] Block card shows: name, vine count, training method
- [ ] Click navigates to BlockDetailsView
- [ ] Keep "All Vines" list below cards

### Phase 4: AI Training Helper (Day 2-3)
- [ ] Create backend endpoint `/api/ai/training-recommendation`
- [ ] Add Anthropic API client to backend
- [ ] Create `TrainingMethodHelper.tsx` component
- [ ] Inline expandable UI in BlockDetailsView
- [ ] Form for inputs (climate, vigor, maintenance, mechanization)
- [ ] Display recommendation with "Use This" button

### Phase 5: Vine Details Update (Day 3)
- [ ] Make training method read-only in VineDetailsView
- [ ] Show "from block" indicator
- [ ] Add link to block details
- [ ] Update tests

### Phase 6: Cleanup (Day 3)
- [ ] Remove BlockSettingsModal (replaced by BlockDetailsView)
- [ ] Update all tests
- [ ] Update documentation

---

## Data Capture for Future Learning

Log all AI recommendations for future preference tracking:

```sql
CREATE TABLE ai_recommendation_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,  -- 'training_method'
  inputs JSONB NOT NULL,              -- user's inputs
  recommendation JSONB NOT NULL,      -- AI's response
  user_choice TEXT,                   -- what user actually picked
  accepted BOOLEAN,                   -- did they use the recommendation?
  created_at BIGINT NOT NULL
);
```

---

## Testing Checklist

- [ ] Block cards display correctly in vineyard view
- [ ] Click block card navigates to block details
- [ ] Block details shows correct vine count and varieties
- [ ] Training method can be edited inline
- [ ] AI helper expands/collapses
- [ ] AI helper returns recommendations
- [ ] "Use This" sets training method
- [ ] Vine details shows read-only training method
- [ ] Back navigation works correctly
- [ ] Mobile responsive layout

---

## Files to Create/Modify

### New Files
- `src/components/BlockDetailsView.tsx`
- `src/components/BlockCard.tsx`
- `src/components/TrainingMethodHelper.tsx`
- `backend/src/routes/ai.rs`

### Modified Files
- `schema.ts` - add training_method to block
- `backend/migrations/` - new migration
- `src/components/VineyardView.tsx` - add block cards
- `src/components/VineDetailsView.tsx` - make training read-only
- `backend/src/main.rs` - add AI routes
- `backend/Cargo.toml` - add anthropic crate

### Deleted Files
- `src/components/BlockSettingsModal.tsx` - replaced by BlockDetailsView

---

## Related Documents

- [Task System Architecture](./task-system-architecture.md) - seasonal stages will use same block structure
- [Training Selection Guide](../../ai-knowledge/training/selection-guide.md) - AI knowledge for recommendations
- [Roadmap](../roadmap.md)
