# AI Usage Tracking

This document tracks all AI API calls in the application for cost monitoring and future paywall implementation.

## API Dashboards

### Anthropic (Claude)
- **Dashboard**: https://console.anthropic.com/
- **Usage**: https://console.anthropic.com/settings/usage
- **Billing**: https://console.anthropic.com/settings/billing
- **API Keys**: https://console.anthropic.com/settings/keys

### OpenAI
- **Dashboard**: https://platform.openai.com/
- **Usage**: https://platform.openai.com/usage
- **Billing**: https://platform.openai.com/settings/organization/billing/overview
- **API Keys**: https://platform.openai.com/api-keys

---

## AI Endpoints

### 1. `/ai/training-recommendation` (POST)

**Purpose**: Recommends vine training systems based on vineyard conditions.

**Frontend**: `src/components/AITrainingHelper.tsx`

**API Calls**:
| Provider | Model | Purpose |
|----------|-------|---------|
| OpenAI | text-embedding-3-small | RAG query embeddings |
| Anthropic | claude-sonnet-4-20250514 | Generate recommendation |

**Request Payload**:
```json
{
  "climate": "Mediterranean",
  "soil_type": "Clay loam",
  "varieties": ["Cabernet Sauvignon", "Merlot"],
  "goals": "Quality focus, disease resistance"
}
```

**Caching**: None currently. Each request triggers new API calls.

**Paywall Priority**: Medium - used occasionally during vineyard setup.

---

### 2. `/ai/seasonal-tasks` (POST)

**Purpose**: Generates weekly seasonal vineyard tasks based on location and varieties.

**Frontend**: `src/components/dashboard/SeasonalTaskCard.tsx`

**API Calls**:
| Provider | Model | Purpose |
|----------|-------|---------|
| OpenAI | text-embedding-3-small | RAG query embeddings |
| Anthropic | claude-sonnet-4-20250514 | Generate seasonal tasks |

**Request Payload**:
```json
{
  "user_id": "user_xxx",
  "week_start": 1732492800000,
  "vineyard_location": "Napa Valley, CA",
  "varieties": ["Cabernet Franc"]
}
```

**Caching**: Weekly - tasks stored in `seasonal_task` table with `week_start` timestamp. Only calls AI if no tasks exist for the current week.

**Paywall Priority**: High - called weekly per user.

---

### 3. `/ai/geocode-test` (GET) - Dev Only

**Purpose**: Testing endpoint for reverse geocoding coordinates to location names.

**API Calls**: None (uses Open-Meteo geocoding API - free)

**Paywall Priority**: None - dev/testing only.

---

## Cost Optimization Strategies

### Implemented
- **Weekly caching for seasonal tasks**: Tasks stored in DB, only regenerated weekly

### Planned
- [ ] Add user-level rate limiting
- [ ] Implement paywall for AI features
- [ ] Cache training recommendations per vineyard config
- [ ] Consider smaller/cheaper models for simpler tasks

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Required for AI features
OPENAI_API_KEY=sk-...          # Required for RAG embeddings
```

---

## Future AI Features (Not Yet Implemented)

See `docs/04-product/detailed-specs/ai-integration-roadmap.md` for planned features:
- Harvest timing predictions
- Disease risk alerts
- Wine blend recommendations
- Fermentation monitoring
