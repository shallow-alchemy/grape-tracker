# Terroir Optimizer - Product Specification

**Document Type:** Implementation Reference
**Status:** 📋 Planned (not yet implemented)
**Roadmap Priority:** See [../roadmap.md](../roadmap.md) - PLANNING & OPTIMIZATION section
**Last Updated:** Nov 19, 2025

> **Note:** This document provides detailed planning and implementation guidance for the AI terroir optimizer. For "what to build next" decisions, always check [../roadmap.md](../roadmap.md) first.

---

## Feature Overview

The Terroir Optimizer is a context-aware AI planning tool that helps users make informed decisions about grape varietal selection based on their location, existing vineyard, and winemaking goals. It serves new growers, existing growers expanding their vineyards, and winemakers planning vine plantings to achieve specific wine styles.

## Core Value Proposition

**For new growers:** "Find out which grapes will actually make good wine in your climate - before you invest in vines"

**For existing growers:** "Expand strategically with varietals that complement what you already have"

**For winemakers:** "Plant the right grapes to make the wines you want to produce"

## User Contexts & Modes

### Mode 1: New Vineyard Planning (Dashboard Entry)
**User state:** No existing vines, researching possibilities

**Entry point:** Dashboard → "Plan Your Vineyard" primary action

**Inputs:**
- Location (ZIP/city) - REQUIRED
- Optional progressive disclosure:
  - Available space (square footage or number of vines)
  - Site characteristics (slope, sun exposure, frost risk, wind, drainage)
  - Soil test results (pH, type, drainage, nutrients)
  - Intended wine styles or preferences

**Output:**
- 3-5 recommended varietals with climate compatibility reasoning
- Brief explanation of why each works
- Warnings about site limitations (if applicable)
- Next steps cards for progressive refinement
- Option to save as "Vineyard Plan"

### Mode 2: Vineyard Expansion (My Vineyard Entry)
**User state:** Has existing vines, looking to expand

**Entry point:** My Vineyard → "Expand Vineyard" or "Add Compatible Varietals" action

**Pre-populated inputs:**
- Location (from existing vineyard data)
- Existing varietals (from vine records)
- Known site characteristics (from existing notes/observations)

**Additional inputs:**
- New planting area characteristics (if different from existing site)
- Expansion goals:
  - Complement existing varietals for blending
  - Diversify for new wine styles
  - Replace underperforming varieties
  - Experiment with new options

**Output:**
- Recommendations that consider existing vineyard context
- Blending compatibility notes ("Merlot pairs well with your existing Cab Sauv")
- Equipment/workflow compatibility ("Uses same trellis system as your Pinot")
- Harvest timing coordination ("Ripens 2 weeks after your Chardonnay")
- Integration suggestions with existing vineyard layout

### Mode 3: Wine-Style Planning (My Wine Entry)
**User state:** Wants to produce specific wine style, needs to know what to plant

**Entry point:** My Wine → "Plan Vines for Wine Style" action

**Inputs:**
- Desired wine style (Bordeaux blend, Burgundy-style, varietal wines, etc.)
- Location (if not already in system)
- Production scale (gallons per year target)
- Existing vines (if any) that could contribute

**Output:**
- Required varietals for chosen wine style
- Minimum vine counts for target production
- Climate feasibility for that wine style in user's location
- Alternative wine styles if primary choice isn't climatically suitable
- Phased planting plan if full implementation requires multiple years

## Progressive Disclosure Pattern

All modes follow the same interaction pattern:

1. **Immediate Value** - Show useful recommendations based on minimal input
2. **Refinement Prompts** - Present actionable cards/buttons for adding detail
3. **Structured Inputs** - Use forms, toggles, multiple choice (not freeform chat)
4. **Enhanced Recommendations** - AI interprets structured data and updates output
5. **Save & Reference** - User can save plans for future reference

### Refinement Cards (Post-Initial Output)

**📍 Site Details**
- Slope assessment (flat, gentle, steep)
- Sun exposure (full, partial, shade pockets)
- Frost risk (valley floor, slope, hilltop)
- Wind exposure (sheltered, moderate, exposed)
- Water access (none, seasonal, reliable)

**🧪 Soil Information**
- "I have soil test results" → form for pH, type, drainage, nutrients
- "I know my soil type" → simplified selection (clay, loam, sand, rocky)
- "Show me typical soil for my area" → educational content with local data

**🌡️ Microclimate Factors**
- Early/late frost dates if known
- Unusual heat/cold patterns
- Persistent fog or maritime influence
- High altitude considerations

**🍷 Wine Goals**
- Preferred wine styles (red, white, sparkling, dessert)
- Blending vs. varietal focus
- Commercial ambitions vs. personal consumption
- Experimentation vs. proven varieties

**📊 Production Scale**
- Hobby (1-5 gallons/year)
- Enthusiast (5-25 gallons/year)
- Serious (25-100 gallons/year)
- Small commercial (100+ gallons/year)

## AI Knowledge Requirements

To power this feature, the AI needs deep knowledge in:

### Climate & Geography Data
- Growing degree days (GDD) by region
- Frost date patterns
- Regional climate classifications (Mediterranean, maritime, continental, etc.)
- Varietal-specific climate requirements
- Microclimate pattern recognition

### Varietal Characteristics
- Climate suitability ranges (GDD requirements, chill hours, frost tolerance)
- Ripening windows by varietal
- Disease susceptibility by region
- Vigor and management intensity
- Common rootstock pairings
- Blending compatibility
- Wine style associations

### Soil Science
- pH requirements by varietal
- Drainage needs (wet feet tolerance vs. drought preference)
- Nutrient requirements and deficiency symptoms
- Soil amendments for different scenarios
- Regional soil patterns

### Viticulture Practices
- Spacing requirements by varietal
- Trellis system compatibility
- Labor intensity and management needs
- Equipment requirements
- Harvest timing coordination

### Wine Production
- Varietal combinations for classic wine styles
- Minimum production volumes for different wines
- Blending ratios and requirements
- Wine style feasibility by climate

## Saved Plans Structure

When a user saves a plan, it should contain:

**Plan Metadata:**
- Plan name (user-defined or auto-generated: "Spring 2025 Expansion")
- Created date
- Last modified date
- Mode used (new vineyard, expansion, wine-style)

**Plan Content:**
- Location and site characteristics
- Input parameters used
- Recommended varietals with reasoning
- Warnings or concerns flagged
- Next steps checklist
- Notes field for user additions

**Plan Actions:**
- Refine plan (re-enter tool with saved data)
- Compare plans (side-by-side view)
- Create vines from plan (transition to My Vineyard)
- Share plan (export/print)
- Archive/delete plan

## Integration Points

### Dashboard Integration

**Navigation Structure:**

The planning tools are accessed via a hamburger menu (☰) in the top-right navigation, keeping the main interface focused on operational tasks (weather alerts, todos, recent activity, forecast).

```
[☰] Menu:

PLANNING
├─ Plan New Vineyard
├─ Plan Vineyard Expansion (conditional - only if user has vines)
├─ Plan New Wine
├─ My Saved Plans (2) (conditional - only if plans exist, shows count)
├─ ────────────

ACCOUNT
├─ Settings
├─ Weather Preferences
├─ Help & Documentation
└─ Logout
```

**Menu Item Mapping to Modes:**
- "Plan New Vineyard" → Mode 1 (New Vineyard Planning)
- "Plan Vineyard Expansion" → Mode 2 (Vineyard Expansion)
- "Plan New Wine" → Mode 3 (Wine-Style Planning)
- "My Saved Plans" → View/manage all saved plans

**Conditional Rendering:**
- "Plan Vineyard Expansion" only appears if user has created vines in My Vineyard
- "My Saved Plans" only appears if user has at least one saved plan (shows count badge)

**Contextual Entry Points:**

Beyond the hamburger menu, planning tools are surfaced contextually when relevant:

1. **Empty Vineyard State** (My Vineyard section with no vines):
   - Prominent "Plan New Vineyard" call-to-action
   - Brief explanation of what the tool does

2. **Existing Vineyard** (My Vineyard section with active vines):
   - "Plan Vineyard Expansion" button in section header or action menu
   - Launches optimizer with existing vineyard data pre-populated

3. **Empty Winery State** (My Wine section with no wines):
   - "Plan New Wine" call-to-action
   - Explains how planning grapes leads to wine production

4. **Existing Winery** (My Wine section with active wines):
   - "Plan New Wine" option in action menu
   - Could suggest complementary wine styles based on existing production

**Dashboard Content Integration:**
- Weather alerts can reference planned varietals ("Frost risk: protect your planned Pinot Noir site")
- Learning content can be contextualized to saved plans
- "Upcoming supplies needed" can include nursery ordering for planned vines
- Todo list can include plan-related next steps (soil testing, site prep)

### My Vineyard Integration
- "Create vines from plan" pre-populates varietal data
- Site characteristics from plan transfer to vine records
- Expansion recommendations consider existing layout
- Performance tracking can inform future plan iterations

### My Wine Integration
- Wine style goals inform varietal recommendations
- Production targets calculate vine count requirements
- Existing wine batches show what's already possible
- Future wine plans drive expansion decisions

### Commerce Integration (Future)
- Soil test kit recommendations (affiliate)
- Nursery links for recommended varietals
- Equipment suggestions based on varietals selected
- Amendment products for soil optimization

## Success Metrics

**Engagement:**
- % of new users who use the optimizer
- Plans created per user
- Plan refinement iterations
- Time from plan creation to vineyard creation

**Outcome:**
- % of planned vines that get planted
- User satisfaction with recommendations (survey)
- Plans updated based on real-world results
- Returning users for expansion planning

**Educational Value:**
- Learning content accessed from optimizer
- Soil tests purchased after recommendation
- Users who refine plans with additional data
- Community discussions about varietals selected

## Technical Considerations

### AI Implementation
- Context injection: pre-populate with user's existing data
- Structured output: JSON schema for consistent recommendations
- Confidence scoring: flag low-confidence recommendations
- Explanation generation: provide reasoning, not just answers
- Knowledge base: curated viticulture/enology reference data

### Mobile-First UX
- Touch-optimized refinement cards
- Progressive loading for large datasets
- Offline capability for saved plans
- Photo upload for site assessment (future enhancement)
- Simple forms over long text input

### Data Privacy
- Plans stored locally or user account (not public)
- Location data used only for recommendations
- Option to share anonymized plan data for community insights

### Performance
- Fast initial recommendations (<2 seconds)
- Refinement updates near-instant
- Cached climate data by region
- Lazy-load detailed explanations

## Future Enhancements

**Phase 2:**
- Photo-based site assessment (AI analyzes slope, sun, soil from images)
- Calendar integration (planting timeline, maintenance schedules)
- Cost estimation based on vine count and varietals
- Yield predictions by varietal and age

**Phase 3:**
- Community plans (see what others in your region planted)
- Success tracking (actual vs. predicted performance)
- Pest/disease risk by varietal and region
- Regulatory compliance (permits, restrictions by location)

**Phase 4:**
- Multi-year phasing (break large projects into annual plantings)
- ROI calculation for commercial growers
- Climate change projections (future suitability)
- Precision viticulture integration (soil sensors, weather stations)

## Open Questions

1. **Plan versioning:** Should users be able to save multiple iterations of the same plan?
2. **Collaboration:** Do users need to share plans with family/partners for input?
3. **Expert review:** Should there be an option to get human expert validation?
4. **Confidence thresholds:** When should the AI refuse to recommend (e.g., unsuitable climate)?
5. **International support:** Start US-only or include international regions from launch?

## Next Steps for Development

1. Define MVP scope (which modes launch first?)
2. Build knowledge base structure and sourcing plan
3. Design UX flows for each mode
4. Implement AI prompt engineering and testing
5. Create saved plan data schema
6. Design refinement card interactions
7. Build integration points with existing app sections