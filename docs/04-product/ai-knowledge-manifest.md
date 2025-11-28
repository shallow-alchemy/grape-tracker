# AI Knowledge Manifest

This document is the **single source of truth for AI knowledge documents** — what exists, what's planned, and how documents should be structured.

For feature priorities and which features consume which knowledge, see the [Development Roadmap](./roadmap.md).

---

## Quick Reference

| Domain | Status | Count |
|--------|--------|-------|
| Climate & Regions | ✅ Complete | 5/5 |
| Training Systems | ✅ Complete (core) | 8 complete, 4 planned |
| Soil Science | ⏳ Not Started | 0/3 |
| Varietals | ⏳ Not Started | 0/40+ |
| Seasonal Management | ⏳ Not Started | 0/6 |
| Pest & Disease | ⏳ Not Started | 0/8 |
| Wine Production | ⏳ Not Started | 0/7 |
| Planning & Calculations | ⏳ Not Started | 0/5 |

---

## Document Inventory

### Climate & Regions ✅ COMPLETE

Regional reference data for varietal selection and site assessment. All major US wine-growing climate zones represented.

| Logical Name | Status | Actual Filename |
|--------------|--------|-----------------|
| `climate/mediterranean` | ✅ Complete | `Mediterranean_Climate_Viticulture_Reference_Data__Varietal_Recommendations_and_Site_Assessment_for_California__Southern_Oregon__and_Washington.md` |
| `climate/continental` | ✅ Complete | `Continental_Climate_Viticulture_Reference_Data__Eastern_United_States_Vineyard_Planning_Guide.md` |
| `climate/maritime` | ✅ Complete | `Maritime_Climate_Viticulture_Reference_Data__Pacific_Northwest_Wine_Region_Analysis.md` |
| `climate/high-desert` | ✅ Complete | `High-Desert_Climate_Viticulture_Reference_Data__Intermountain_West_United_States.md` |
| `climate/humid-subtropical` | ✅ Complete | `Humid-Subtropical_Climate_Viticulture_Reference__Pierce_s_Disease__Variety_Selection__and_Regional_Growing_Conditions_for_the_Southeastern_United_States.md` |

**Coverage by region:**
- Mediterranean: CA, Southern OR, parts of WA
- Continental: Midwest, Northeast, high elevation
- Maritime: Coastal CA, Pacific Northwest
- High-Desert: UT, CO, NM, AZ, NV
- Humid-Subtropical: Southeast, TX

---

### Training Systems ✅ COMPLETE (Core Set)

Establishment and management guides for vine training methods.

| Logical Name | Status | Actual Filename |
|--------------|--------|-----------------|
| `training/head-training` | ✅ Complete | `Head_Training_Wine_Grapes__A_Complete_Guide_for_Dry-Climate_Growers.md` |
| `training/vertical-cordon` | ✅ Complete | `Vertical_Cordon_Vine_Training__A_Practical_Guide_for_Small-Scale_Growers.md` |
| `training/bilateral-cordon` | ✅ Complete | `Bilateral_Cordon_Training__The_Practical_Guide_for_Small-Scale_Grape_Growers.md` |
| `training/four-arm-kniffen` | ✅ Complete | `Four-Arm_Kniffen__The_Eastern_Vineyard_Workhorse.md` |
| `training/geneva-double-curtain` | ✅ Complete | `The_Geneva_Double_Curtain__Mastering_Divided_Canopy_Training_for_High-Vigor_Vineyards.md` |
| `training/umbrella` | ✅ Complete | `The_Complete_Guide_to_Umbrella_Grape_Training_Systems_for_Eastern_US_Growers.md` |
| `training/cane-pruning` | ✅ Complete | `Cane_Pruning_for_High_Head_Wine_Grapes__A_California_Grower_s_Guide.md` |
| `training/california-divided-canopy` | ✅ Complete | `California_Divided_Canopy_Systems_for_Wine_Grapes__A_Practical_Guide.md` |

**Planned (not yet documented):**

| Logical Name | Status | Purpose |
|--------------|--------|---------|
| `training/vsp` | ⏳ Planned | Vertical Shoot Positioning — common for premium wine grapes |
| `training/scott-henry` | ⏳ Planned | Divided canopy alternative to GDC |
| `training/lyre` | ⏳ Planned | European divided canopy (U-System) |
| `training/selection-guide` | ⏳ Planned | Decision framework for choosing training system |

---

### Soil Science ⏳ NOT STARTED

| Logical Name | Status | Purpose |
|--------------|--------|---------|
| `soil/fundamentals` | ⏳ Planned | pH, drainage, texture, organic matter basics |
| `soil/amendments` | ⏳ Planned | How to adjust pH, improve drainage, add nutrients |
| `soil/problem-soils` | ⏳ Planned | High pH, salinity, compaction, shallow depth, hardpan |

---

### Varietals ⏳ NOT STARTED

Individual grape variety profiles. This will be an extensive library built over time.

**Each varietal doc should contain:**
- Climate requirements (GDD, frost tolerance, heat needs)
- Vigor characteristics
- Disease susceptibility
- Ripening timing and indicators
- Expected flavor profile by climate type
- Blending compatibility
- Common rootstock pairings
- Winemaking considerations
- Small-scale growing notes

**Priority varietals (suggested first batch):**

| Category | Varietals |
|----------|-----------|
| Bordeaux Reds | Cabernet Sauvignon, Cabernet Franc, Merlot, Petit Verdot, Malbec |
| Burgundy | Pinot Noir, Chardonnay |
| Rhône | Syrah/Shiraz, Grenache, Mourvèdre, Viognier, Roussanne, Marsanne |
| California Classics | Zinfandel, Petite Sirah |
| Mediterranean | Tempranillo, Sangiovese, Nebbiolo, Barbera |
| Aromatic Whites | Riesling, Gewürztraminer, Sauvignon Blanc, Pinot Gris/Grigio |
| Other Whites | Sémillon, Albariño, Verdejo, Vermentino |

**Cold-hardy hybrids (for continental/cold climates):**
- Marquette, Frontenac, La Crescent, Brianna, St. Croix
- Itasca, Petite Pearl, Crimson Pearl

**Disease-resistant hybrids (for humid climates):**
- Chambourcin, Vidal Blanc, Seyval Blanc, Traminette
- Chardonel, Cayuga White, Norton/Cynthiana

**American/Muscadine:**
- Concord, Niagara, Catawba
- Carlos, Noble, Scuppernong

---

### Seasonal Management ⏳ NOT STARTED

Time-specific guidance for vineyard tasks throughout the growing cycle.

| Logical Name | Status | Timing | Key Topics |
|--------------|--------|--------|------------|
| `seasonal/dormant-season` | ⏳ Planned | Nov–Feb | Pruning timing, winter protection, planning |
| `seasonal/bud-break` | ⏳ Planned | Mar–Apr | Frost protection, shoot thinning, early spray |
| `seasonal/bloom-fruit-set` | ⏳ Planned | May–Jun | Canopy management, disease prevention, crop thinning |
| `seasonal/veraison-ripening` | ⏳ Planned | Jul–Aug | Bird protection, irrigation decisions, monitoring |
| `seasonal/harvest` | ⏳ Planned | Aug–Oct | Timing decisions, indicators, logistics |
| `seasonal/post-harvest` | ⏳ Planned | Oct–Nov | Vine nutrition, preparing for dormancy |

**Note:** Timing varies significantly by region. Each doc should include regional adjustments.

---

### Pest & Disease ⏳ NOT STARTED

Identification, prevention, and treatment guides.

| Logical Name | Status | Relevance |
|--------------|--------|-----------|
| `pests/powdery-mildew` | ⏳ Planned | Universal — all regions |
| `pests/downy-mildew` | ⏳ Planned | Humid climates |
| `pests/botrytis` | ⏳ Planned | Humid climates, tight-clustered varietals |
| `pests/phylloxera` | ⏳ Planned | Rootstock selection context |
| `pests/pierces-disease` | ⏳ Planned | Southern US, California |
| `pests/japanese-beetle` | ⏳ Planned | Eastern US |
| `pests/bird-management` | ⏳ Planned | Universal at harvest |
| `pests/deer-management` | ⏳ Planned | As needed |

**Each pest/disease doc should contain:**
- Visual identification (symptoms, progression)
- Conditions that favor the problem
- Prevention strategies
- Treatment options (organic and conventional)
- Regional considerations
- Varietal susceptibility notes

---

### Wine Production ⏳ NOT STARTED

Guides for winemaking from crush to bottle.

| Logical Name | Status | Purpose |
|--------------|--------|---------|
| `winemaking/red-basics` | ⏳ Planned | Crush → fermentation → pressing → MLF → aging |
| `winemaking/white-basics` | ⏳ Planned | Pressing → cold settling → fermentation → aging |
| `winemaking/rose-methods` | ⏳ Planned | Saignée, direct press, blending approaches |
| `winemaking/fermentation-troubleshooting` | ⏳ Planned | Stuck fermentation, off odors, temperature issues |
| `winemaking/sulfite-management` | ⏳ Planned | When to add, how much, testing methods |
| `winemaking/blending-principles` | ⏳ Planned | Trial methodology, classic combinations |
| `winemaking/small-scale-equipment` | ⏳ Planned | What you need at 5–50 gallon scale |

**Note:** Grape chemistry (Brix, pH, TA) drives winemaking decisions, not whether grapes are grown or sourced.

---

### Planning & Calculations ⏳ NOT STARTED

Reference data for vineyard planning features.

| Logical Name | Status | Purpose |
|--------------|--------|---------|
| `planning/yield-calculations` | ⏳ Planned | Vines → pounds → gallons math by varietal |
| `planning/spacing-guidelines` | ⏳ Planned | Row and vine spacing by vigor, system, equipment |
| `planning/site-assessment` | ⏳ Planned | Pre-planting evaluation checklist |
| `planning/nursery-ordering` | ⏳ Planned | Lead times, what to specify, quality indicators |
| `planning/first-three-years` | ⏳ Planned | Realistic timeline, when to expect first crop |

---

## Document Standards

All knowledge documents should follow these standards for consistent AI consumption.

### Header Metadata

Every document should begin with:

```markdown
# Document Title

**Domain:** [climate | soil | varietal | training | seasonal | pest | winemaking | planning]
**Keywords:** [comma-separated searchable terms]
**Last updated:** [YYYY-MM-DD]
```

### Content Guidelines

- **Factual and actionable** — Concrete guidance, not vague suggestions
- **Small-scale focus** — Home and small commercial growers are the primary audience
- **Specific numbers** — Include thresholds, ranges, and measurements where applicable
- **Regional variations** — Note explicitly when guidance differs by region
- **Practical over theoretical** — What to do, not just why it matters
- **No hedging** — Instead of "it depends," give concrete guidance with conditions stated

### Length Targets

| Domain | Target Length | Notes |
|--------|---------------|-------|
| Climate docs | 3,000–6,000 words | Detailed regional reference data |
| Training docs | 3,000–6,000 words | Step-by-step establishment and management |
| Varietal docs | 2,000–4,000 words | Complete variety profile |
| Planning docs | 1,000–2,000 words | Focused reference/calculations |
| Pest docs | 1,000–2,000 words | ID, prevention, treatment |
| Winemaking docs | 2,000–4,000 words | Process guidance |
| Seasonal docs | 2,000–3,000 words | Time-specific task guidance |

### Example Document Structure

```markdown
# Powdery Mildew

**Domain:** pest
**Keywords:** powdery mildew, Erysiphe necator, fungal disease, sulfur, prevention
**Last updated:** 2025-01-15

## Overview
[Brief description of the problem]

## Identification
[Visual symptoms, what to look for]

## Conditions That Favor Development
[Temperature, humidity, timing]

## Prevention
[Cultural practices, spray timing]

## Treatment
### Organic Options
[Sulfur, etc.]

### Conventional Options
[Fungicides, etc.]

## Regional Considerations
[How this varies by climate zone]

## Varietal Susceptibility
[Which varieties are more/less susceptible]
```

---

## Using This Manifest

### For Development
When building an AI-powered feature, check this manifest to:
1. Identify which knowledge docs the feature needs
2. Verify their completion status
3. Plan knowledge doc creation if gaps exist

### For Knowledge Creation
When writing new docs:
1. Follow the document standards above
2. Use the logical naming convention (`domain/topic`)
3. Update this manifest when complete
4. Add the actual filename to the inventory table

### Logical Names vs Actual Files
The roadmap and code should reference **logical names** (e.g., `training/bilateral-cordon`). This manifest maps logical names to **actual filenames**. This decouples code from file naming conventions.
