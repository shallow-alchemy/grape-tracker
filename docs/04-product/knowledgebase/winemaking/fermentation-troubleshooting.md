# Wine fermentation troubleshooting: Complete diagnostic and remediation guide

**This reference document provides diagnostic criteria, cause identification, and step-by-step remediation protocols for common fermentation problems in small-scale winemaking (5-100 gallon batches).** The guide covers stuck fermentations, off-aromas, temperature and nutrient issues, and cap management problems with specific thresholds, product recommendations, and decision logic suitable for systematic troubleshooting. Key findings indicate that most fermentation failures stem from three root causes: temperature extremes, nitrogen deficiency, and yeast stress—problems that are largely preventable with proper monitoring and timely intervention.

---

## 1. Stuck and sluggish fermentation

### Diagnostic criteria and definitions

A **stuck fermentation** shows no Brix/SG change for more than 48 hours while sugar remains. A **sluggish fermentation** drops less than **0.25°Brix per day** during active fermentation or less than **1°Brix per day** above SG 1.005. Normal fermentation completes in 7-14 days, with whites dropping 1-3°Brix daily and reds 2-4°Brix daily.

| Parameter | Normal | Warning | Problem |
|-----------|--------|---------|---------|
| Brix drop (reds) | 2-4°/day | <1°/day | <0.25°/day |
| Brix drop (whites) | 1-3°/day | <0.5°/day | <0.25°/day |
| Lag phase duration | 24-48 hours | >72 hours | >96 hours |
| Total fermentation | 7-14 days | 14-21 days | >21 days |
| Completion target | SG <0.995 | — | — |

Four distinct problem patterns exist: sluggish initiation that normalizes (often self-resolving), normal start becoming sluggish (most common—usually nutrient or ethanol-related), sluggish throughout (fundamental biomass attainment failure), and abrupt stop (traumatic shock from temperature, SO₂ error, or contamination).

### Root causes with specific thresholds

**Temperature extremes** cause the majority of stuck fermentations. Yeast stress begins at **91°F (33°C)**, significant cell death occurs above **104°F (40°C)**, and **99% of cells die within 5 minutes at 122°F (50°C)**. Critical caveat: as alcohol rises, thermal tolerance decreases—at ~10% ABV, yeast death can occur as low as **90°F (32°C)**. Cold temperatures below **50°F (10°C)** cause yeast dormancy, and below **55°F (13°C)** risks sluggish fermentation for most strains.

**Nitrogen deficiency** triggers stuck ferments when YAN falls below **150 mg/L**. Target YAN levels scale with starting Brix: 150-180 mg/L for 21°Brix must, 200-250 mg/L for 23°Brix, and 300-350 mg/L for 27°Brix. The critical timing rule: yeast cannot utilize nitrogen after **50% sugar depletion** due to alcohol accumulation—late DAP additions are wasted and feed spoilage organisms.

**Alcohol toxicity** becomes limiting when potential alcohol exceeds yeast strain tolerance. Starting Brix of 24° produces approximately 14.4-15.6% alcohol, requiring yeasts rated for 16%+. Temperature shock reduces tolerance by 1-3%, and nutrient limitation reduces it by another 1-2%—compounding effects make high-Brix ferments particularly vulnerable.

**Osmotic stress** from high sugar creates cell shrinkage. Above **26°Brix**, consider dilution with acidified water to 25°Brix. Increase inoculation rate to **30-36 g/hL** for musts above 24°Brix.

**Pesticide residues** create invisible barriers. Folpet inhibits yeast at just **0.1 ppm**, chlorothalonil causes severe inhibition above **30 mg/L**, and late sulfur sprays (within 56 days of harvest) produce H₂S. Safe compounds include strobilurins (Sovran, Abound), sterol inhibitors (Elite, Rally), and biological controls (Serenade).

### Restart protocols

**Pre-restart assessment checklist:**
1. Confirm stuck (no SG change for 48+ hours)
2. Measure current Brix and estimate alcohol level
3. Verify temperature is 68-77°F (20-25°C)
4. Check for off-odors (VA, H₂S)
5. If yeast viability is <60%, the environment is toxic

**Quick fix attempts before full restart:** Stir to resuspend yeast, adjust temperature to 20-25°C (68-77°F), add yeast hulls at 0.1-0.25 g/L, and wait 24 hours.

**UVAFERM 43 RESTART protocol (preferred for any stuck ferment):**

**Step 1 - Prepare stuck wine:**
- Add RESKUE at 40 g/hL in 10× its weight warm water (86-98°F)
- Mix thoroughly, settle 48 hours, rack off sediment
- Adjust temperature to 68-77°F

**Step 2 - Prepare starter mixture:**
- Combine 5% stuck wine volume + 4% water volume in new vessel
- Add FERMAID O at 8 g/hL based on Step 2 volume
- Adjust to 5% sugar (50 g/L) with cane sugar or grape concentrate
- Warm to 77-86°F (25-30°C)

**Step 3 - Prepare yeast:**
- GO-FERM PROTECT EVOLUTION at 53 g/hL in 20× its weight 110°F water
- Cool to 104°F, add UVAFERM 43 RESTART at 40 g/hL
- Stir gently, stand 20 minutes

**Step 4 - Acclimation (critical):**
- Ensure <18°F temperature difference between yeast and starter
- Add yeast to starter, maintain 68-77°F
- When sugar drops by half, slowly double volume with stuck wine
- Repeat doubling when 50% fermented
- **Never let any stage go completely dry**
- Add remaining stuck wine to final active stage

| Rescue Yeast | Alcohol Tolerance | Best Use |
|--------------|-------------------|----------|
| UVAFERM 43 RESTART | 17% | Any restart; pre-acclimated |
| EC-1118/Premier Cuvée | 18% | High alcohol; difficult conditions |
| K1/V1116 | 18% | Cold/difficult environments |
| FERMIVIN CHAMPION | 17% | >3°Brix, <11.5% alcohol |

### When to give up

Restart likelihood decreases significantly when: residual sugar is minimal (SG ~1.000-1.002), multiple restart attempts have failed, VA exceeds **1.2 g/L**, strong off-odors persist, or alcohol already exceeds yeast tolerance. Alternative outcomes include stabilizing as semi-sweet wine (add 50 ppm SO₂ + 200 ppm potassium sorbate + sterile filter), fortifying to port-style (add grape spirits to 18-20%), or blending with dry wine.

---

## 2. Hydrogen sulfide and sulfur compounds

### H₂S diagnosis and thresholds

Hydrogen sulfide detection threshold is remarkably low at **1.1-1.6 µg/L (ppb)**—human noses detect it before most instruments. The classic "rotten egg" smell during fermentation signals nitrogen deficiency in approximately 80% of cases. Sub-threshold H₂S may contribute positively to wine complexity; it becomes problematic only when clearly perceptible.

**Primary causes ranked by frequency:**
1. **YAN below 150 mg/L** (most common)—yeast cannot incorporate sulfide into amino acid synthesis
2. **Elemental sulfur residues** from vineyard sprays within 56 days of harvest
3. **Yeast strain genetics**—Montrachet (UCD 522) is a high producer; select strains labeled "low H₂S"
4. **Temperature stress** at extremes
5. **SO₂ addition within 10-15 days post-fermentation** activates sulfite reductase

### Treatment protocols for sulfur compounds

**Splash racking (during/immediately post-fermentation):**
H₂S is highly volatile—vigorous racking with significant splashing "blows off" the compound. Most effective during first 2/3 of fermentation. If smell persists after 2-3 splash rackings, proceed to copper treatment.

**Copper sulfate treatment protocol:**

| Jurisdiction | Max Addition | Max Residual |
|--------------|--------------|--------------|
| TTB (USA) | 6.0 mg/L Cu | 0.5 mg/L Cu |
| Export/AWRI | — | 0.5 mg/L Cu |

**Dosing calculations:** CuSO₄·5H₂O is 25.47% copper by weight. For 1% solution: 1g CuSO₄·5H₂O in 100 mL water. **1 mL of 1% solution per 5 gallons = 0.1 ppm copper addition.**

| Batch Size | 0.1 ppm Cu | 0.25 ppm Cu | 0.5 ppm Cu |
|------------|------------|-------------|------------|
| 5 gallons | 1 mL | 2.5 mL | 5 mL |
| 30 gallons | 6 mL | 15 mL | 30 mL |
| 100 gallons | 20 mL | 50 mL | 100 mL |

**Step-by-step:**
1. Measure current copper level before treatment
2. Conduct bench trial: 50 mL samples with incremental copper additions
3. Wait 5 minutes, evaluate aroma (DO NOT TASTE—high copper)
4. Scale up using minimum effective dose
5. Allow 1+ week for copper-sulfide precipitation
6. Rack or filter to remove precipitate

**Critical warnings:** Do NOT add copper during active fermentation—yeast absorb it. Late additions (day of bottling) can cause copper haze. Copper removes varietal thiols (problematic for Sauvignon Blanc).

### Mercaptans and disulfides require different treatment

When H₂S goes untreated, it reacts with wine components to form **mercaptans** (thiols) with garlic, onion, rubber aromas at thresholds of **0.02-2.0 µg/L**. Copper is only ~50% effective against mercaptans.

If mercaptans oxidize, they form **disulfides** (cooked cabbage, burnt rubber at 4-29 µg/L threshold). **Copper does NOT react with disulfides**—the -SH functional group is absent.

**Diagnostic test protocol:**
- Glass 1: Control
- Glass 2: Add 1 mL 1% CuSO₄ → wait 15 min → smell
- Glass 3: Add 0.5 mL 10% ascorbic acid, wait 2 min, add 1 mL CuSO₄ → smell

| Control | Copper Only | Ascorbic+Copper | Diagnosis |
|---------|-------------|-----------------|-----------|
| Stinky | Fixed | — | H₂S or mercaptans |
| Stinky | Still stinky | Fixed | Disulfides present |

**Disulfide treatment:** Add **50 mg/L ascorbic acid** to reduce disulfides back to mercaptans (reaction may take 2-3 weeks), then immediately follow with copper treatment. Allow 1+ month for full reaction.

---

## 3. Volatile acidity and microbial spoilage

### VA thresholds and salvageability

| VA Level | Status | Action |
|----------|--------|--------|
| <0.6 g/L | Normal | Monitor only |
| 0.6-0.7 g/L | At threshold | Sterile filter + blend |
| 0.7-1.0 g/L | Salvageable | Reverse osmosis + blending required |
| >1.0 g/L | At risk | Extensive treatment needed |
| >1.4 g/L | Potentially ruined | Exceeds legal limits for table wine |
| >2.0 g/L | Ruined | Vinegar character dominant |

**Legal limits (TTB):** Red table wine 1.4 g/L, white table wine 1.2 g/L, late harvest (≥28 Brix) 1.5-1.7 g/L.

**Primary organisms:** Acetobacter (requires oxygen—converts ethanol to acetic acid), Gluconobacter (pre-fermentation on damaged fruit), wild yeasts (Kloeckera, Hansenula), and heterofermentative LAB.

**Prevention protocol:**
- Molecular SO₂ at **0.8 mg/L** inhibits bacteria
- Pre-fermentation: 50 ppm SO₂ shock dose
- Keep vessels completely topped; use inert gas blanket
- Store at 50-56°F (10-13°C)
- Control fruit flies (primary Acetobacter vector)

### Brettanomyces identification and management

| Compound | Detection Threshold | Spoilage Level |
|----------|---------------------|----------------|
| 4-Ethylphenol (4-EP) | 230-425 µg/L | >600 µg/L |
| 4-Ethylguaiacol (4-EG) | 33-135 µg/L | >300 µg/L |

Sensory descriptors: 4-EP produces Band-Aid, antiseptic, horse stable; 4-EG produces smoky, spicy, cloves. Consumer acceptance significantly affected at **4-EP 600 µg/L + 4-EG 200 µg/L**.

**The "Brett Zone"** is the critical period between end of primary/secondary fermentation until SO₂ is added. Brett needs only **0.3 g/L residual sugar** to produce 1000 µg/L 4-EP.

**Prevention protocol:**
- Maintain **0.6 mg/L molecular SO₂** minimum
- Post-MLF: Add ~80 mg/L SO₂ in ONE large addition
- Keep pH below 3.6 if possible
- Store below 59°F (15°C)
- Complete fermentations to dryness
- Clean barrels with hot water (85°C for 15 minutes)

**Treatment options:** Sterile filtration (0.45 µm absolute), DMDC/Velcorin (100-200 ppm, requires <500 cells/mL), chitosan (No Brett Inside at 4-8 g/hL).

### Ethyl acetate and LAB problems

**Ethyl acetate thresholds:** 12-14 mg/L aroma threshold, 30-60 mg/L positive fruity contribution, **>90 mg/L defective**, >150-200 mg/L severe fault with nail polish remover character.

Primary cause: wild yeasts (Kloeckera, Pichia, Candida) produce far more ethyl acetate than Saccharomyces. Prevention: inoculate with selected yeast at 25 g/hL, use 50 ppm SO₂ at crush.

**LAB problems during fermentation** include unwanted MLF competing with yeast, excessive VA from glucose metabolism, mousy taint, and biogenic amines. **Lysozyme** (250-500 mg/L) specifically targets gram-positive bacteria without affecting yeast—more effective than SO₂ in high pH environments.

---

## 4. Temperature management

### Critical temperature thresholds

| Condition | Temperature | Effect |
|-----------|-------------|--------|
| Optimal whites | 55-65°F (13-18°C) | Best aroma retention |
| Optimal reds | 75-85°F (24-30°C) | Best extraction |
| Yeast stress begins | 91°F (33°C) | Membrane damage starts |
| Significant cell death | 104°F (40°C) | Activity stops; yeast dying |
| 99% cell death | 122°F (50°C) for 5 min | Fatal |
| Cold dormancy | <50°F (10°C) | Fermentation stops |
| Sluggish risk | <55°F (13°C) | Yeast flocculates out |

**Temperature spike warning:** Complete fermentation of 22°Brix juice releases enough heat to raise temperature by **40°F (25°C)** if not dissipated. Monitor twice daily during peak fermentation (days 2-5).

### Cooling methods for small scale

**Ice bath technique:** Place fermenter in basin with water, add frozen bottles. Effective for cold soak at 40-50°F and white wine fermentation. Caution: don't shock yeast with excessive cold.

**Wet t-shirt/towel evaporative cooling:** Achieves **5-10°F (3-5°C) below ambient**. Place carboy in shallow basin with 5-6 inches water, wrap cotton towel (bottom must touch water to wick), point fan at carboy. Can achieve 9°F differential with fan. Change towel every 2-3 days; add sanitizer to water reservoir.

**Fermentation chamber:** Modified refrigerator/freezer with temperature controller (Johnson, Inkbird, Ranco—$60-100). Ideal for white wines and subsequent cold stabilization.

### Heating methods for small scale

**FermWrap™ (40 watts):** Flexible heater raises temp 5-20°F depending on insulation. **30-watt wraps** are safe for PET/plastic. **Safety rules:** Never insulate both sides of heating wrap, do not place fermenter directly on heater, use with temperature controller.

---

## 5. Nutrient management

### YAN targets by starting Brix

| Starting Brix | Low N Yeast | Medium N Yeast | High N Yeast |
|---------------|-------------|----------------|--------------|
| 21°Brix | 150-180 ppm | 200-220 ppm | 250+ ppm |
| 23°Brix | 200-250 ppm | 250-270 ppm | 290+ ppm |
| 25°Brix | 260-300 ppm | 300-325 ppm | 350+ ppm |
| 27°Brix | 300-350 ppm | 350 ppm | 400+ ppm |

**Minimum working threshold:** 150-200 ppm to avoid stuck fermentation. **Maximum:** 350-400 mg/L—excess feeds spoilage organisms.

### Staged nutrient protocol

| Stage | Timing | Addition |
|-------|--------|----------|
| Rehydration | During yeast prep | Go-Ferm (30 g/hL) |
| Stage 1 | 24-48 hrs post-inoculation (2-3 Brix drop) | Fermaid O or K (½ dose) |
| Stage 2 | 1/3 sugar depletion | Remaining nutrient |
| NO additions | After 1/2 sugar depletion | Too late—alcohol blocks uptake |

**Critical timing rule:** DAP added after half-way point is largely wasted and leaves residual nitrogen for Brett.

### Mid-ferment emergency diagnosis

If sluggish with H₂S and before 1/3 sugar depletion: add Fermaid K at 1 g/gallon + DAP 0.5-1 g/gallon, aerate to expel H₂S. Between 1/3 and 1/2 depletion: organic nitrogen only (Fermaid O). Past 1/2 depletion: nutrients will NOT help—add yeast hulls (0.5-1.0 g/L) for detoxification only.

---

## 6. Foam and cap management

### Excessive foaming

**Causes:** High-protein grapes/fruits, vigorous yeast strains (Premier Classique), warm temperatures, high initial Brix.

**Prevention:** Container 75% full maximum (25% headspace), use low-foaming yeasts (EC-1118, Côte des Blancs).

**FermCap-S dosing:** 2 drops per gallon at start of fermentation, or ¼ to ½ teaspoon per 5-gallon batch. Food-grade silicone emulsion settles with yeast sediment.

### Cap management schedule

| Phase | Punch-down Frequency |
|-------|---------------------|
| Days 1-3 (early/vigorous) | 2-3 times daily |
| Days 4-7 (mid-fermentation) | 2 times daily |
| Post-peak (slowing) | 1-2 times daily |

**Cap drying risks:** Acetification from Acetobacter, mold growth, extraction loss, heat buildup. UC Davis research found up to **12°C temperature difference** between cap and liquid.

### Fruit fly contamination

Fruit flies carry Acetobacter on feet and in gut—one fly can introduce enough bacteria to spoil a batch. **Prevention:** Always use covered fermentations with tight lids, airlocks with sanitizer (not alcohol—attracts more flies), cheesecloth over open fermenters. If exposed: immediately add 30-50 ppm SO₂, eliminate oxygen, rack away from surface contamination.

### Mold on cap

**Salvageable:** Small white surface film, no penetration, wine smells clean, early stage. **Discard:** Green/black fuzzy mold, extended presence, off-flavors detected, mycotoxin concern.

**Removal (if minor):** Carefully skim visible mold, rack to clean container, add 1 Campden tablet per gallon, minimize oxygen, continue under airlock.

---

## 7. Monitoring and diagnostics

### Daily monitoring protocol

**Hydrometer usage:** Temperature-correct readings (add 0.001 SG per 5°F above 60°F). Sample frequency: once daily during lag phase, twice daily during active fermentation, three times daily approaching dryness.

**Completion thresholds:** SG ≤0.995 or Brix ≤-1.0 indicates dry wine. Confirm with enzymatic glucose/fructose test if residual sugar concern exists.

### Warning signs requiring action

| Warning Sign | Threshold | Likely Cause |
|--------------|-----------|--------------|
| No activity by 48 hours | Zero Brix change | Poor rehydration, low temp, high SO₂ |
| Temperature spike | >95°F | Insufficient cooling |
| Brix drop >4°/day | Too rapid | Fermentation too hot |
| Brix plateau >24 hrs | No change during active phase | Nutrient deficiency, temperature |
| H₂S odor | Detectable | Nitrogen deficiency |

### Decision tree: Fermentation slowing unexpectedly

**Check temperature first** (most time-sensitive): Too cold (<55°F whites, <65°F reds)? Warm to optimal range, stir to resuspend. Too hot (>90°F)? Cool immediately, assess viability.

**Check current Brix:** SG <0.998 with no sweetness? Complete—no action. SG >0.998 with sweetness? Continue troubleshooting.

**Check fermentation stage:** Early (>15 Brix remaining) suggests temperature, nutrient, or inoculation problem. Mid-fermentation (5-15 Brix) suggests nutrient deficiency or temperature stress. Late (<5 Brix) suggests ethanol intolerance or fatty acid deficiency.

**Nutrient intervention window:** Before 1/3 sugar depletion—add complex nutrient. Between 1/3 and 1/2—organic nitrogen only. After 1/2—nutrients won't help; use yeast hulls, consider restart.

### When to send samples to a lab

- Initial juice analysis (YAN, pH, TA) for high-value grapes
- Stuck fermentation that won't restart
- Suspected microbial spoilage (Brett, VA, LAB)
- MLF completion verification (malic acid <0.05-0.1 g/L)
- Pre-bottling stability panel
- Unusual off-odors not responding to standard treatment

---

## 8. Specific remediation protocols summary

### Copper sulfate treatment (H₂S/mercaptans)
- **Dose:** 0.1-0.5 mg/L Cu (start low)
- **Maximum:** 6 mg/L addition, 0.5 mg/L residual
- **Timing:** Post-fermentation only; wait 1+ week before bottling
- **Ineffective for:** Disulfides (require ascorbic acid pretreatment)

### Ascorbic acid treatment (disulfides)
- **Dose:** 50-66 mg/L (0.25 g/gallon)
- **Timing:** Add first, wait 2 minutes to 3 weeks, then add copper
- **Requirement:** Adequate SO₂ before adding ascorbic acid

### Yeast hulls for detoxification
- **Prevention dose:** 0.2-0.3 g/L at inoculation
- **Stuck ferment prep:** 0.5-1.0 g/L, 24-48 hours before restart
- **Mechanism:** Adsorb toxic fatty acids, provide sterols

### Restart yeast selection
- **UVAFERM 43 RESTART:** 17% tolerance, pre-acclimated, fructophilic—best for any restart
- **EC-1118:** 18% tolerance, very robust—best for high alcohol/difficult conditions
- **K1/V1116:** 18% tolerance—best for cold environments

### Lysozyme (bacterial control)
- **Dose:** 250-500 mg/L
- **Target:** Gram-positive bacteria (LAB)
- **Advantage:** Does not affect yeast; effective in high pH wines
- **Note:** Derived from egg whites (allergen labeling required)

---

## Quick reference: Critical thresholds

| Parameter | Normal | Concern | Critical |
|-----------|--------|---------|----------|
| **Temp (whites)** | 55-65°F | 50-55°F or 65-70°F | <50°F or >75°F |
| **Temp (reds)** | 75-85°F | 65-75°F or 85-90°F | <60°F or >95°F |
| **Brix drop rate** | 1-3°/day | <1° or >4°/day | 0°/day or >5°/day |
| **YAN (whites)** | 200-350 mg/L | 150-200 or >400 | <150 |
| **H₂S threshold** | — | 1-2 µg/L | Clearly perceptible |
| **VA (acetic acid)** | <0.6 g/L | 0.6-0.9 g/L | >1.0 g/L |
| **4-EP (Brett)** | <300 µg/L | 300-600 µg/L | >600 µg/L |
| **Ethyl acetate** | <90 mg/L | 90-150 mg/L | >150 mg/L |
| **pH** | 3.2-3.6 | 3.0-3.2 or 3.6-3.8 | <3.0 or >3.8 |

This guide synthesizes technical information from UC Davis Viticulture & Enology, Scott Labs Fermentation Handbook, AWRI Technical Resources, Lallemand/Enartis technical guides, WineMaker Magazine, Penn State Extension, and Oregon State Extension programs.