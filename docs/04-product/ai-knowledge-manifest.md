# AI Knowledge Manifest

This document serves two purposes:
1. **Knowledge inventory** — Tracks what reference documents exist and their completion status
2. **Feature mapping** — Connects knowledge domains to specific product features that consume them

---

## Document Completion Status

### Climate & Regions ✅ COMPLETE

Regional reference data for varietal selection and site assessment.

| Document | Status | File |
|----------|--------|------|
| Mediterranean | ✅ Complete | `Mediterranean_Climate_Viticulture_Reference_Data...md` |
| Continental | ✅ Complete | `Continental_Climate_Viticulture_Reference_Data...md` |
| Maritime | ✅ Complete | `Maritime_Climate_Viticulture_Reference_Data...md` |
| High-Desert | ✅ Complete | `High-Desert_Climate_Viticulture_Reference_Data...md` |
| Humid-Subtropical | ✅ Complete | `Humid-Subtropical_Climate_Viticulture_Reference...md` |

**Coverage:** All major US wine-growing climate zones represented.

---

### Training Systems ✅ COMPLETE (Core Set)

Establishment and management guides for vine training methods.

| Document | Status | File |
|----------|--------|------|
| Head Training | ✅ Complete | `Head_Training_Wine_Grapes...md` |
| Vertical Cordon | ✅ Complete | `Vertical_Cordon_Vine_Training...md` |
| Four-Arm Kniffen | ✅ Complete | `Four-Arm_Kniffen...md` |
| Bilateral Cordon | ✅ Complete | `Bilateral_Cordon_Training...md` |
| Geneva Double Curtain | ✅ Complete | `The_Geneva_Double_Curtain...md` |
| Umbrella System | ✅ Complete | `The_Complete_Guide_to_Umbrella_Grape_Training...md` |
| Cane Pruning (High Head) | ✅ Complete | `Cane_Pruning_for_High_Head_Wine_Grapes...md` |
| California Divided Canopy | ✅ Complete | `California_Divided_Canopy_Systems...md` |

**Not yet documented:**
- VSP (Vertical Shoot Positioning) — common for premium wine grapes
- Scott Henry — divided canopy alternative to GDC
- Lyre / U-System — European divided canopy
- Training System Selection Guide — decision framework

---

### Soil Science ⏳ NOT STARTED

| Document | Status | Purpose |
|----------|--------|---------|
| Soil Fundamentals | ⏳ Planned | pH, drainage, texture, organic matter basics |
| Soil Amendments | ⏳ Planned | How to adjust pH, improve drainage, add nutrients |
| Problem Soils | ⏳ Planned | High pH, salinity, compaction, shallow depth |

---

### Varietals ⏳ NOT STARTED

Individual grape variety profiles. **Note:** This will be an extensive library. Initial list below is a starting point, not comprehensive.

**Red Vinifera (Priority):**
- Cabernet Sauvignon, Cabernet Franc, Merlot, Petit Verdot, Malbec (Bordeaux varieties)
- Pinot Noir
- Syrah/Shiraz, Grenache, Mourvèdre (Rhône varieties)
- Zinfandel, Petite Sirah
- Tempranillo, Sangiovese, Nebbiolo, Barbera (Mediterranean varieties)

**White Vinifera (Priority):**
- Chardonnay, Sauvignon Blanc, Sémillon
- Riesling, Gewürztraminer, Pinot Gris/Grigio
- Viognier, Roussanne, Marsanne
- Albariño, Verdejo, Vermentino

**Cold-Hardy Hybrids:**
- Marquette, Frontenac, La Crescent, Brianna, St. Croix
- Itasca, Petite Pearl, Crimson Pearl

**Disease-Resistant Hybrids:**
- Chambourcin, Vidal Blanc, Seyval Blanc, Traminette
- Chardonel, Cayuga White, Norton/Cynthiana

**American/Muscadine:**
- Concord, Niagara, Catawba
- Carlos, Noble, Scuppernong

---

### Seasonal Management ⏳ NOT STARTED

| Document | Status | Timing |
|----------|--------|--------|
| Dormant Season | ⏳ Planned | Nov–Feb |
| Bud Break | ⏳ Planned | Mar–Apr |
| Bloom & Fruit Set | ⏳ Planned | May–Jun |
| Veraison & Ripening | ⏳ Planned | Jul–Aug |
| Harvest | ⏳ Planned | Aug–Oct |
| Post-Harvest | ⏳ Planned | Oct–Nov |

---

### Pest & Disease ⏳ NOT STARTED

| Document | Status | Region/Condition |
|----------|--------|------------------|
| Powdery Mildew | ⏳ Planned | Universal |
| Downy Mildew | ⏳ Planned | Humid climates |
| Botrytis | ⏳ Planned | Humid, tight clusters |
| Phylloxera | ⏳ Planned | Rootstock decisions |
| Pierce's Disease | ⏳ Planned | Southern US, CA |
| Japanese Beetle | ⏳ Planned | Eastern US |
| Bird Management | ⏳ Planned | Universal at harvest |
| Deer Management | ⏳ Planned | As needed |

---

### Wine Production ⏳ NOT STARTED

| Document | Status | Purpose |
|----------|--------|---------|
| Red Wine Basics | ⏳ Planned | Crush → fermentation → pressing → aging |
| White Wine Basics | ⏳ Planned | Pressing → cold settle → fermentation |
| Rosé Methods | ⏳ Planned | Saignée, direct press, blending |
| Fermentation Troubleshooting | ⏳ Planned | Stuck ferment, off odors, temp issues |
| Sulfite Management | ⏳ Planned | Timing, dosing, testing |
| Blending Principles | ⏳ Planned | Trials, classic combinations |
| Small-Scale Equipment | ⏳ Planned | 5–50 gallon scale essentials |

**Note:** Grape chemistry (Brix, pH, TA) matters for winemaking decisions, not whether grapes are grown or sourced.

---

### Planning & Calculations ⏳ NOT STARTED

| Document | Status | Purpose |
|----------|--------|---------|
| Yield Calculations | ⏳ Planned | Vines → pounds → gallons math |
| Spacing Guidelines | ⏳ Planned | Row/vine spacing by system and vigor |
| Site Assessment | ⏳ Planned | Pre-planting evaluation checklist |
| Nursery Ordering | ⏳ Planned | Lead times, specs, quality indicators |
| First Three Years | ⏳ Planned | Timeline, expectations, milestones |

---

## Feature → Knowledge Mapping

This section defines which knowledge documents support which product features. This is the bridge between content and code.

### Approach

Rather than generic "Load When" triggers, each feature explicitly declares its knowledge dependencies. This enables:
- Clear scope for feature development
- Knowledge gap identification before building features
- Potential for machine-readable configuration

---

### Feature: Terroir Optimizer

**Spec:** `terroir-optimizer-spec.md`

**Modes:**
1. New Vineyard Planning (clean slate)
2. Vineyard Expansion (add to existing)
3. Wine Style Planning (work backward from wine goals)

#### Mode 1: New Vineyard Planning

**User provides:** Location (ZIP or coordinates), available space, experience level

**Knowledge required:**
| Document | Purpose | Status |
|----------|---------|--------|
| Climate doc for user's region | Varietal shortlist, climate challenges | ✅ Ready |
| Site Assessment | Evaluation checklist | ⏳ Blocks feature |
| Training System Selection Guide | Recommend system for conditions | ⏳ Blocks feature |
| Spacing Guidelines | Calculate capacity | ⏳ Blocks feature |
| Yield Calculations | Set production expectations | ⏳ Blocks feature |
| First Three Years | Timeline expectations | ⏳ Blocks feature |

**Varietal docs:** Loaded dynamically based on recommendations generated from climate doc.

#### Mode 2: Vineyard Expansion

**User provides:** Location, existing varietals, existing training system, expansion goals

**Knowledge required:**
| Document | Purpose | Status |
|----------|---------|--------|
| Climate doc for user's region | Compatible varietals | ✅ Ready |
| Varietal docs for existing plantings | Understand current situation | ⏳ Needed |
| Training doc for existing system | Maintain consistency | ✅ Likely ready |
| Blending Principles | Complementary varietal selection | ⏳ Needed |
| Yield Calculations | Expansion math | ⏳ Needed |

#### Mode 3: Wine Style Planning

**User provides:** Target wine style (e.g., "Bordeaux-style red," "crisp white"), location

**Knowledge required:**
| Document | Purpose | Status |
|----------|---------|--------|
| Climate doc for user's region | What's possible here | ✅ Ready |
| Blending Principles | Classic combinations for style | ⏳ Blocks feature |
| Varietal docs for style | Which grapes make this wine | ⏳ Needed |
| Yield Calculations | How much to plant | ⏳ Needed |

---

### Feature: Seasonal Task Dashboard

**Purpose:** Surface relevant tasks based on current date and user's vineyard

**User context:** Location, varietals planted, training system, current date

**Knowledge required:**
| Document | Purpose | Status |
|----------|---------|--------|
| Seasonal doc for current phase | What to do now | ⏳ Blocks feature |
| Training doc for user's system | System-specific tasks | ✅ Ready |
| Pest docs for region + season | What to watch for | ⏳ Blocks feature |
| Varietal docs for user's plantings | Variety-specific timing | ⏳ Needed |

---

### Feature: Problem Diagnosis

**Purpose:** Help identify and address vineyard/wine issues

**User provides:** Symptoms (text description, optionally photos)

**Knowledge required:**
| Document | Purpose | Status |
|----------|---------|--------|
| All pest/disease docs | Symptom matching | ⏳ Blocks feature |
| Varietal docs | Susceptibility context | ⏳ Needed |
| Fermentation Troubleshooting | Wine issues | ⏳ Needed for winery side |

---

### Feature: Harvest Timing Assistant

**Purpose:** Help determine optimal harvest window

**User provides:** Varietals, location, Brix/pH/TA readings (if available)

**Knowledge required:**
| Document | Purpose | Status |
|----------|---------|--------|
| Harvest (seasonal doc) | General harvest guidance | ⏳ Blocks feature |
| Climate doc for region | Regional harvest norms | ✅ Ready |
| Varietal docs | Variety-specific indicators | ⏳ Needed |

---

### Feature: Wine Production Guidance

**Purpose:** Guide winemaking from crush to bottle

**User provides:** Grape type, quantity, target wine style, current step

**Knowledge required:**
| Document | Purpose | Status |
|----------|---------|--------|
| Red/White/Rosé basics | Process guidance | ⏳ Blocks feature |
| Sulfite Management | SO2 decisions | ⏳ Needed |
| Blending Principles | If multiple varietals | ⏳ Needed |
| Fermentation Troubleshooting | Problem solving | ⏳ Needed |
| Small-Scale Equipment | What you need | ⏳ Nice to have |

---

## Priority Roadmap

Based on feature dependencies, here's the suggested order for knowledge development:

### Phase 1: Terroir Optimizer MVP (Mode 1 Focus)
**Goal:** Enable new vineyard planning

1. `planning/site-assessment.md`
2. `planning/yield-calculations.md`
3. `planning/spacing-guidelines.md`
4. `training/selection-guide.md`
5. `planning/first-three-years.md`
6. Top 10 varietal docs (most requested for small-scale US growers)

**Unlocks:** Terroir Optimizer Mode 1

### Phase 2: Seasonal Guidance
**Goal:** Enable task dashboard and harvest assistant

1. All 6 seasonal docs
2. Core pest docs: Powdery Mildew, Bird Management
3. Additional varietal docs (expand to 20+)

**Unlocks:** Seasonal Task Dashboard, Harvest Timing Assistant (basic)

### Phase 3: Winemaking Support
**Goal:** Enable wine production guidance

1. Red Wine Basics
2. White Wine Basics
3. Sulfite Management
4. Fermentation Troubleshooting
5. Blending Principles

**Unlocks:** Wine Production Guidance, Terroir Optimizer Mode 3

### Phase 4: Problem Diagnosis
**Goal:** Enable issue identification

1. Full pest/disease library
2. Problem Soils doc (for vineyard issues)

**Unlocks:** Problem Diagnosis feature

### Phase 5: Expansion & Polish
**Goal:** Complete coverage

1. Remaining varietal docs (comprehensive library)
2. Soil Science docs
3. Small-Scale Equipment guide
4. Additional training systems (VSP, Scott Henry, etc.)

**Unlocks:** Terroir Optimizer Mode 2 (full), general completeness

---

## Document Standards

Each document should follow consistent structure:

**Header metadata:**
```markdown
# Document Title

**Domain:** [climate|soil|varietal|training|seasonal|pest|winemaking|planning]
**Keywords:** [searchable terms]
**Last updated:** [date]
```

**Content guidelines:**
- Factual, actionable information
- Small-scale/home grower focus when relevant
- Specific numbers and thresholds (not vague hedging)
- Regional variations noted explicitly
- Practical over theoretical

**Length targets:**
- Climate docs: 3,000–6,000 words (detailed reference data)
- Training docs: 3,000–6,000 words
- Varietal docs: 2,000–4,000 words
- Planning docs: 1,000–2,000 words
- Pest docs: 1,000–2,000 words
- Winemaking docs: 2,000–4,000 words
- Seasonal docs: 2,000–3,000 words
