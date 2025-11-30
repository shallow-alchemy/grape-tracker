export type EntityType = 'wine' | 'vintage';

// Wine types supported by the system
export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified';

// Complete 11-stage winemaking process
// Future: Add sparkling-specific stages (riddling, disgorgement, dosage)
export type WineStage =
  | 'crush'
  | 'pre_fermentation'
  | 'primary_fermentation'
  | 'press'
  | 'malolactic_fermentation'
  | 'aging'
  | 'racking'
  | 'fining_filtering'
  | 'blending'
  | 'bottling'
  | 'bottle_aging';

export type VintageStage =
  | 'harvested'
  | 'allocated';

export type Stage = WineStage | VintageStage;

// Stage applicability for a given wine type
export type StageApplicability = 'required' | 'optional' | 'hidden';

export type StageMetadata = {
  value: string;
  label: string;
  description: string;
  order: number;
};

export type StageWithApplicability = StageMetadata & {
  applicability: Record<WineType, StageApplicability>;
};

// Complete stage definitions with wine-type-specific applicability
// Based on docs/04-product/knowledgebase/winemaking/process-reference.md
export const WINE_STAGES: StageWithApplicability[] = [
  {
    value: 'crush',
    label: 'Crush',
    description: 'Grapes crushed, juice extracted',
    order: 1,
    applicability: {
      red: 'required',
      white: 'required',
      rose: 'required',
      sparkling: 'required',
      dessert: 'required',
      fortified: 'required',
    },
  },
  {
    value: 'pre_fermentation',
    label: 'Pre-Fermentation',
    description: 'Cold soak (reds), cold settle (whites), pressing (whites)',
    order: 2,
    applicability: {
      red: 'optional',      // Cold soak is optional for reds
      white: 'required',    // Cold settle + press before ferment
      rose: 'required',     // Short skin contact + press
      sparkling: 'required',
      dessert: 'optional',
      fortified: 'optional',
    },
  },
  {
    value: 'primary_fermentation',
    label: 'Primary Fermentation',
    description: 'Alcoholic fermentation (sugar to alcohol)',
    order: 3,
    applicability: {
      red: 'required',
      white: 'required',
      rose: 'required',
      sparkling: 'required',
      dessert: 'required',
      fortified: 'required',
    },
  },
  {
    value: 'press',
    label: 'Press',
    description: 'Separate wine from skins/seeds (post-ferment for reds)',
    order: 4,
    applicability: {
      red: 'required',      // Post-fermentation pressing
      white: 'hidden',      // Already pressed in pre-fermentation
      rose: 'hidden',       // Already pressed in pre-fermentation
      sparkling: 'hidden',
      dessert: 'optional',
      fortified: 'optional',
    },
  },
  {
    value: 'malolactic_fermentation',
    label: 'Malolactic Fermentation',
    description: 'Convert malic to lactic acid (softens wine)',
    order: 5,
    applicability: {
      red: 'required',      // Standard for all reds
      white: 'optional',    // Optional (buttery Chardonnay yes, crisp whites no)
      rose: 'optional',
      sparkling: 'optional',
      dessert: 'optional',
      fortified: 'hidden',  // Usually skipped for fortified
    },
  },
  {
    value: 'aging',
    label: 'Aging',
    description: 'Bulk aging in barrel, tank, or carboy',
    order: 6,
    applicability: {
      red: 'required',
      white: 'required',
      rose: 'optional',     // Often minimal aging for rosé
      sparkling: 'required',
      dessert: 'required',
      fortified: 'required',
    },
  },
  {
    value: 'racking',
    label: 'Racking',
    description: 'Transfer wine off sediment (lees)',
    order: 7,
    applicability: {
      red: 'required',
      white: 'required',
      rose: 'required',
      sparkling: 'required',
      dessert: 'required',
      fortified: 'required',
    },
  },
  {
    value: 'fining_filtering',
    label: 'Fining & Filtering',
    description: 'Clarification and stabilization',
    order: 8,
    applicability: {
      red: 'optional',      // Many reds skip this
      white: 'required',    // Standard for clarity
      rose: 'required',
      sparkling: 'required',
      dessert: 'optional',
      fortified: 'optional',
    },
  },
  {
    value: 'blending',
    label: 'Blending',
    description: 'Combine lots for balance and complexity',
    order: 9,
    applicability: {
      red: 'optional',
      white: 'optional',
      rose: 'optional',
      sparkling: 'optional',
      dessert: 'optional',
      fortified: 'optional',
    },
  },
  {
    value: 'bottling',
    label: 'Bottling',
    description: 'Wine packaged in bottles',
    order: 10,
    applicability: {
      red: 'required',
      white: 'required',
      rose: 'required',
      sparkling: 'required',
      dessert: 'required',
      fortified: 'required',
    },
  },
  {
    value: 'bottle_aging',
    label: 'Bottle Aging',
    description: 'Post-bottling maturation',
    order: 11,
    applicability: {
      red: 'required',
      white: 'optional',
      rose: 'hidden',       // Rosé is typically consumed young
      sparkling: 'optional',
      dessert: 'optional',
      fortified: 'optional',
    },
  },
];

export const VINTAGE_STAGES: StageMetadata[] = [
  {
    value: 'harvested',
    label: 'Harvested',
    description: 'Grapes harvested and available',
    order: 1,
  },
  {
    value: 'allocated',
    label: 'Allocated',
    description: 'All grapes allocated to wines',
    order: 2,
  },
];

// Get all stages for an entity type
export const getStagesForEntity = (entityType: EntityType): StageMetadata[] => {
  return entityType === 'wine' ? WINE_STAGES : VINTAGE_STAGES;
};

// Get stages filtered by wine type (excludes hidden stages)
export const getStagesForWineType = (wineType: WineType): StageWithApplicability[] => {
  return WINE_STAGES.filter(stage => stage.applicability[wineType] !== 'hidden');
};

// Get only required stages for a wine type
export const getRequiredStages = (wineType: WineType): StageWithApplicability[] => {
  return WINE_STAGES.filter(stage => stage.applicability[wineType] === 'required');
};

// Check if a stage is applicable (not hidden) for a wine type
export const isStageApplicable = (stage: string, wineType: WineType): boolean => {
  const stageConfig = WINE_STAGES.find(s => s.value === stage);
  if (!stageConfig) return false;
  return stageConfig.applicability[wineType] !== 'hidden';
};

// Get stage applicability for a specific wine type
export const getStageApplicability = (stage: string, wineType: WineType): StageApplicability | undefined => {
  const stageConfig = WINE_STAGES.find(s => s.value === stage);
  if (!stageConfig) return undefined;
  return stageConfig.applicability[wineType];
};

export const getStageMetadata = (stage: string, entityType: EntityType): StageMetadata | undefined => {
  const stages = getStagesForEntity(entityType);
  return stages.find(s => s.value === stage);
};

// Get next stage considering wine type (skips hidden stages)
export const getNextStage = (
  currentStage: string,
  entityType: EntityType,
  wineType?: WineType
): StageMetadata | null => {
  if (entityType === 'vintage') {
    const stages = VINTAGE_STAGES;
    const currentIndex = stages.findIndex(s => s.value === currentStage);
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      return null;
    }
    return stages[currentIndex + 1];
  }

  // For wines, filter by wine type
  const applicableStages = wineType
    ? getStagesForWineType(wineType)
    : WINE_STAGES;

  const currentIndex = applicableStages.findIndex(s => s.value === currentStage);

  if (currentIndex === -1 || currentIndex === applicableStages.length - 1) {
    return null;
  }

  return applicableStages[currentIndex + 1];
};

// Get stages that can be skipped to from current stage (for wine type)
export const getSkippableStages = (
  currentStage: string,
  entityType: EntityType,
  wineType?: WineType
): StageMetadata[] => {
  if (entityType === 'vintage') {
    const stages = VINTAGE_STAGES;
    const currentIndex = stages.findIndex(s => s.value === currentStage);
    if (currentIndex === -1) {
      return [];
    }
    return stages.slice(currentIndex + 2);
  }

  const applicableStages = wineType
    ? getStagesForWineType(wineType)
    : WINE_STAGES;

  const currentIndex = applicableStages.findIndex(s => s.value === currentStage);

  if (currentIndex === -1) {
    return [];
  }

  // Skip at least one stage ahead
  return applicableStages.slice(currentIndex + 2);
};

export const canTransitionTo = (
  fromStage: string,
  toStage: string,
  entityType: EntityType,
  wineType?: WineType
): boolean => {
  if (entityType === 'vintage') {
    const stages = VINTAGE_STAGES;
    const fromIndex = stages.findIndex(s => s.value === fromStage);
    const toIndex = stages.findIndex(s => s.value === toStage);
    return fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex;
  }

  const applicableStages = wineType
    ? getStagesForWineType(wineType)
    : WINE_STAGES;

  const fromIndex = applicableStages.findIndex(s => s.value === fromStage);
  const toIndex = applicableStages.findIndex(s => s.value === toStage);

  return fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex;
};

export const formatStage = (stage: string): string => {
  // Handle special case for MLF
  if (stage === 'malolactic_fermentation') {
    return 'Malolactic Fermentation';
  }
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getSkippedStageCount = (
  fromStage: string,
  toStage: string,
  entityType: EntityType,
  wineType?: WineType
): number => {
  if (entityType === 'vintage') {
    const stages = VINTAGE_STAGES;
    const fromIndex = stages.findIndex(s => s.value === fromStage);
    const toIndex = stages.findIndex(s => s.value === toStage);
    if (fromIndex === -1 || toIndex === -1) {
      return 0;
    }
    return Math.max(0, toIndex - fromIndex - 1);
  }

  const applicableStages = wineType
    ? getStagesForWineType(wineType)
    : WINE_STAGES;

  const fromIndex = applicableStages.findIndex(s => s.value === fromStage);
  const toIndex = applicableStages.findIndex(s => s.value === toStage);

  if (fromIndex === -1 || toIndex === -1) {
    return 0;
  }

  return Math.max(0, toIndex - fromIndex - 1);
};

// Migration helper: Map old stage names to new ones
export const migrateOldStage = (oldStage: string): WineStage => {
  const stageMap: Record<string, WineStage> = {
    'crush': 'crush',
    'primary_fermentation': 'primary_fermentation',
    'secondary_fermentation': 'malolactic_fermentation', // Renamed
    'racking': 'racking',
    'oaking': 'aging', // Merged into aging
    'aging': 'aging',
    'bottling': 'bottling',
  };
  return stageMap[oldStage] || (oldStage as WineStage);
};

// Get default starting stage for a wine type
export const getDefaultStartingStage = (_wineType: WineType): WineStage => {
  return 'crush'; // All wines start at crush
};
