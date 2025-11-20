export type EntityType = 'wine' | 'vintage';

export type WineStage =
  | 'crush'
  | 'primary_fermentation'
  | 'secondary_fermentation'
  | 'racking'
  | 'oaking'
  | 'aging'
  | 'bottling';

export type VintageStage =
  | 'harvested'
  | 'allocated';

export type Stage = WineStage | VintageStage;

export type StageMetadata = {
  value: string;
  label: string;
  description: string;
  order: number;
};

export const WINE_STAGES: StageMetadata[] = [
  {
    value: 'crush',
    label: 'Crush',
    description: 'Grapes crushed, juice extracted',
    order: 1,
  },
  {
    value: 'primary_fermentation',
    label: 'Primary Fermentation',
    description: 'Alcoholic fermentation',
    order: 2,
  },
  {
    value: 'secondary_fermentation',
    label: 'Secondary Fermentation',
    description: 'Malolactic fermentation (MLF)',
    order: 3,
  },
  {
    value: 'racking',
    label: 'Racking',
    description: 'Transfer wine off sediment',
    order: 4,
  },
  {
    value: 'oaking',
    label: 'Oaking',
    description: 'Aging in oak barrels',
    order: 5,
  },
  {
    value: 'aging',
    label: 'Aging',
    description: 'Bulk aging',
    order: 6,
  },
  {
    value: 'bottling',
    label: 'Bottling',
    description: 'Wine bottled',
    order: 7,
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

export const getStagesForEntity = (entityType: EntityType): StageMetadata[] => {
  return entityType === 'wine' ? WINE_STAGES : VINTAGE_STAGES;
};

export const getStageMetadata = (stage: string, entityType: EntityType): StageMetadata | undefined => {
  const stages = getStagesForEntity(entityType);
  return stages.find(s => s.value === stage);
};

export const getNextStage = (currentStage: string, entityType: EntityType): StageMetadata | null => {
  const stages = getStagesForEntity(entityType);
  const currentIndex = stages.findIndex(s => s.value === currentStage);

  if (currentIndex === -1 || currentIndex === stages.length - 1) {
    return null;
  }

  return stages[currentIndex + 1];
};

export const getSkippableStages = (currentStage: string, entityType: EntityType): StageMetadata[] => {
  const stages = getStagesForEntity(entityType);
  const currentIndex = stages.findIndex(s => s.value === currentStage);

  if (currentIndex === -1) {
    return [];
  }

  return stages.slice(currentIndex + 2);
};

export const canTransitionTo = (
  fromStage: string,
  toStage: string,
  entityType: EntityType
): boolean => {
  const stages = getStagesForEntity(entityType);
  const fromIndex = stages.findIndex(s => s.value === fromStage);
  const toIndex = stages.findIndex(s => s.value === toStage);

  return fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex;
};

export const formatStage = (stage: string): string => {
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getSkippedStageCount = (
  fromStage: string,
  toStage: string,
  entityType: EntityType
): number => {
  const stages = getStagesForEntity(entityType);
  const fromIndex = stages.findIndex(s => s.value === fromStage);
  const toIndex = stages.findIndex(s => s.value === toStage);

  if (fromIndex === -1 || toIndex === -1) {
    return 0;
  }

  return Math.max(0, toIndex - fromIndex - 1);
};
