# AI Integration Roadmap

**Status**: Planning
**Created**: 2024-11-29
**Last Updated**: 2024-11-29

## Vision

Deeply integrated AI guidance throughout Gilbert, grounded in our domain-specific knowledgebase via RAG (Retrieval Augmented Generation). Users get expert-level advice tailored to their specific vineyard, varieties, and conditions.

---

## Phase 1: Foundation & Current State

### Completed
- [x] Training method recommendation endpoint (`/ai/training-recommendation`)
- [x] Haiku model integration (cost-effective)
- [x] Vineyard location passed for climate inference
- [x] Basic prompt with context (varieties, soil, location, vine count)

### Current Limitations
- AI uses general knowledge, not our knowledgebase docs
- No RAG infrastructure
- Limited context about user's operational goals

---

## Phase 2: Data Model Enhancements

Before building more AI features, we need richer data to provide context.

### 2.1 Vineyard/Block Level Fields

| Field | Location | Purpose |
|-------|----------|---------|
| `production_goal` | vineyard or block | "quality_focused", "high_yield", "balanced" |
| `experience_level` | vineyard | "beginner", "intermediate", "experienced" |
| `observed_vigor` | block | "low", "medium", "high", "unknown" |
| `available_labor_hours` | vineyard | Weekly hours available for vineyard work |

### 2.2 Vine Health & Disease Tracking

| Field | Location | Purpose |
|-------|----------|---------|
| `disease_observations` | vine (new table) | Log of observed diseases/disorders |
| `pest_observations` | vine (new table) | Log of pest sightings |
| `photos` | vine/observation | Images for AI analysis and record-keeping |

### 2.3 Photo Infrastructure

Required for disease/pest identification and general record-keeping.

- [ ] Photo upload to cloud storage (S3/Cloudflare R2)
- [ ] Photo association with entities (vine, block, observation)
- [ ] Camera access on mobile (PWA camera API)
- [ ] Photo gallery per vine
- [ ] Thumbnail generation

---

## Phase 3: RAG Infrastructure

### 3.1 pgvector Setup

```sql
-- Enable extension (Railway Postgres supports this)
CREATE EXTENSION vector;

-- Embeddings table
CREATE TABLE doc_embeddings (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,        -- e.g., "knowledgebase/training/vsp.md"
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),           -- OpenAI text-embedding-3-small dimension
  metadata JSONB,                   -- category, tags, etc.
  created_at BIGINT NOT NULL
);

CREATE INDEX ON doc_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### 3.2 Embedding Pipeline

1. **Chunking**: Split markdown docs into ~500 token chunks with overlap
2. **Embedding**: Call OpenAI embedding API for each chunk
3. **Storage**: Insert into `doc_embeddings` table
4. **Refresh**: Re-run when docs change (manual or CI trigger)

### 3.3 Query Flow

```
User Question
     ↓
Embed question → vector
     ↓
pgvector similarity search → top 5 relevant chunks
     ↓
Inject chunks into Claude prompt as context
     ↓
Claude generates grounded response
```

### 3.4 Implementation Tasks

- [x] Create migration for pgvector extension and doc_embeddings table
- [x] Build embedding CLI tool (`yarn embed-docs`)
- [x] Create RAG query helper function in backend
- [x] Wire training advisor to use RAG (graceful fallback if no embeddings)
- [ ] Add pgvector extension to Railway Postgres (run migration)
- [ ] Add OPENAI_API_KEY to Railway environment
- [ ] Run `yarn embed-docs` to populate embeddings

---

## Phase 4: AI Features

### 4.1 Training Method Advisor (Current)

**Status**: Basic implementation complete

**Enhancements needed**:
- [ ] RAG integration for training system docs
- [ ] Consider production goals in recommendations
- [ ] Consider experience level (simpler systems for beginners)

**Knowledgebase docs used**:
- `knowledgebase/training/*.md`
- `knowledgebase/climate/*.md`
- `knowledgebase/varietals/*.md`

---

### 4.2 Seasonal Task Advisor

**Purpose**: "What should I be doing in my vineyard this month?"

**Input context**:
- Current date/season
- Vineyard location (climate zone)
- Varieties grown
- Current growth stage (if tracked)
- Recent weather (from weather API)

**Output**:
- Prioritized task list for the current period
- Timing guidance (e.g., "prune before bud break in 2-3 weeks")
- Weather-aware adjustments

**Knowledgebase docs used**:
- `knowledgebase/seasonal/*.md`
- `knowledgebase/climate/*.md`
- `knowledgebase/training/*.md` (for pruning guidance)

**Dependencies**:
- [ ] Seasonal stage tracking per block/vine
- [ ] Weather API integration (already have for alerts)

---

### 4.3 Disease & Pest Identifier

**Purpose**: "My leaves have yellow spots, what is it?"

**Input options**:
- Photo upload (ideal)
- Text description of symptoms
- Affected plant parts
- Time of year / weather conditions

**Output**:
- Top 3 likely diagnoses with confidence
- Visual confirmation images (from our docs or web)
- Treatment recommendations
- Prevention for future

**Knowledgebase docs needed** (to create):
- `knowledgebase/diseases/*.md`
- `knowledgebase/pests/*.md`
- `knowledgebase/disorders/*.md` (nutrient deficiencies, environmental)

**Dependencies**:
- [ ] Photo upload infrastructure
- [ ] Camera access (PWA)
- [ ] Disease/pest documentation (need to create)
- [ ] Vision model access (Claude vision or GPT-4V)

---

### 4.4 Harvest Timing Helper

**Purpose**: "Based on my readings, when should I harvest?"

**Input context**:
- Recent Brix measurements (we track these)
- Recent pH measurements
- Recent TA measurements
- Variety
- Wine style goal (dry, sweet, sparkling)
- Weather forecast

**Output**:
- Estimated optimal harvest window
- Current ripeness assessment
- Risk factors (rain, heat spike)
- Comparison to ideal ranges for variety/style

**Knowledgebase docs used**:
- `knowledgebase/varietals/*.md` (harvest parameters)
- `knowledgebase/seasonal/harvest.md`
- `knowledgebase/winemaking/process-reference.md`

**Dependencies**:
- [ ] Sufficient measurement history
- [ ] Weather forecast integration (already have)
- [ ] Wine style goal field on vintage

---

### 4.5 Winemaking Guidance

**Purpose**: "My pH is 3.2 after primary, what adjustments?"

**Input context**:
- Current wine stage
- Latest measurements (pH, TA, Brix, temp)
- Wine type (red, white, rosé)
- Target style
- Vintage source (estate vs purchased)

**Output**:
- Assessment of current state
- Recommended adjustments with amounts
- Process guidance for current stage
- Warning signs to watch for

**Knowledgebase docs used**:
- `knowledgebase/winemaking/*.md`
- Measurement ranges (already in DB)

**Dependencies**:
- [ ] Wine style/target fields on wine entity
- [ ] More winemaking docs in knowledgebase

---

## Phase 5: Unified AI Experience

### 5.1 Conversational Interface

After individual features are proven, consider:
- Chat interface for freeform questions
- Context-aware (knows your vineyard, current season, recent activity)
- Can reference and update data ("log that I pruned Block A today")

### 5.2 Proactive Suggestions

- Dashboard cards with timely AI advice
- Push notifications for time-sensitive guidance
- "You haven't measured Brix in 5 days, harvest window may be approaching"

---

## Implementation Order

### Recommended Sequence

1. **Deploy verification** - Ensure current AI feature works in production
2. **Data model additions** - Add production_goal, experience_level, observed_vigor
3. **Photo infrastructure** - S3/R2 + camera access + gallery UI
4. **Disease/pest docs** - Create knowledgebase content
5. **pgvector setup** - Extension + embeddings table
6. **Embedding pipeline** - CLI tool to process docs
7. **RAG query helper** - Backend function for similarity search
8. **Enhance training advisor** - First RAG-powered feature
9. **Seasonal task advisor** - Second feature
10. **Harvest timing helper** - Third feature (uses existing measurements)
11. **Disease identifier** - Fourth feature (needs photos + vision)
12. **Winemaking guidance** - Fifth feature

---

## Environment Variables

```bash
# Already have
ANTHROPIC_API_KEY=       # Claude API for generation

# Need to add
OPENAI_API_KEY=          # For embeddings (text-embedding-3-small)
# OR use Anthropic's embedding when available

# For photo storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

---

## Cost Considerations

| Component | Cost Model | Estimate |
|-----------|------------|----------|
| Claude Haiku | $0.25/1M input, $1.25/1M output | ~$0.01-0.05 per recommendation |
| OpenAI Embeddings | $0.02/1M tokens | One-time ~$0.10 for full knowledgebase |
| pgvector queries | Free (just Postgres) | Included in Railway plan |
| Photo storage | R2: Free up to 10GB | Minimal |

---

## Open Questions

1. **Embedding model**: OpenAI vs wait for Anthropic embeddings vs local model?
2. **Photo storage**: S3 vs Cloudflare R2 vs Railway volume?
3. **Vision model**: Claude vision vs GPT-4V for disease identification?
4. **Offline support**: Cache AI responses for offline vineyard use?

---

## Related Documents

- [AI Knowledge Manifest](../ai-knowledge-manifest.md)
- [Training & Pruning System](./training-pruning-system.md)
- [Database Schema](../../02-architecture/database-schema.md)
