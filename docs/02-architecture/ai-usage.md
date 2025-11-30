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

### Open-Meteo (Free)
- **Documentation**: https://open-meteo.com/
- **Historical Weather API**: https://open-meteo.com/en/docs/historical-weather-api
- **Forecast API**: https://open-meteo.com/en/docs
- **Cost**: Free for non-commercial use (no API key required)

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

**Purpose**: Generates weekly seasonal vineyard tasks based on location, varieties, and historical weather data.

**Frontend**: `src/components/dashboard/SeasonalTaskCard.tsx`

**API Calls**:
| Provider | Model/Endpoint | Purpose |
|----------|----------------|---------|
| Open-Meteo | Historical Weather API | Fetch season-to-date weather (snowfall, temps, GDD) |
| OpenAI | text-embedding-3-small | RAG query embeddings |
| Anthropic | claude-3-5-haiku-20241022 | Generate seasonal tasks |

**Weather Metrics Calculated**:
- **Fall/Winter**: Snowfall totals, first snow date, coldest temp, last freeze date
- **Spring/Summer**: Last freeze date, Growing Degree Days (base 50F)

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

### 3. `/ai/measurement-guidance` (POST)

**Purpose**: Analyzes wine measurements (pH, TA, Brix) and provides guidance on whether values are in range, how they'll affect the final wine, and corrective measures if needed.

**Frontend**: `src/components/winery/WineDetailsView.tsx` (AI Analysis button in measurements section)

**API Calls**:
| Provider | Model | Purpose |
|----------|-------|---------|
| OpenAI | text-embedding-3-small | RAG query embeddings (winemaking docs) |
| Anthropic | claude-3-5-haiku-20241022 | Generate measurement analysis |

**Request Payload**:
```json
{
  "user_id": "user_xxx",
  "measurement_id": "measurement_xxx",
  "wine_name": "2024 Cabernet Sauvignon",
  "variety": "Cabernet Sauvignon",
  "blend_components": null,
  "current_stage": "primary_fermentation",
  "latest_measurement": {
    "ph": 3.4,
    "ta": 6.5,
    "brix": 12.0,
    "temperature": 72,
    "date": 1701234567890
  },
  "previous_measurements": [...]
}
```

**Response**: Summary, per-metric status (good/warning/concern), projections, and actionable recommendations. Includes `from_cache: true/false`.

**Caching**: Per-measurement - analysis stored in `measurement_analysis` table. Only calls AI if no cached analysis exists for the measurement. Frontend loads cached analysis via Zero sync.

**Paywall Priority**: High - called on-demand but likely frequent during active fermentation.

---

### 4. `/ai/geocode-test` (GET) - Dev Only

**Purpose**: Testing endpoint for reverse geocoding coordinates to location names.

**API Calls**: None (uses Open-Meteo geocoding API - free)

**Paywall Priority**: None - dev/testing only.

---

## Cost Optimization Strategies

### Implemented
- **Weekly caching for seasonal tasks**: Tasks stored in DB, only regenerated weekly
- **Per-measurement caching for measurement guidance**: Analysis stored in `measurement_analysis` table, never regenerated for same measurement
- **Free weather API**: Open-Meteo Historical Weather API is free for non-commercial use
- **Efficient model selection**: Using claude-3-5-haiku for seasonal tasks and measurement guidance (cheaper than Sonnet)

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
