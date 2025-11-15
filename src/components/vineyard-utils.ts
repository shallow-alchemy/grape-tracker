import { type VineData, type VineDataRaw, type BlockData, type BlockDataRaw, type VineFormData } from './vineyard-types';

export const validateVineForm = (vineData: Pick<VineFormData, 'block' | 'variety' | 'plantingDate' | 'health'>): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!vineData.block) {
    errors.block = 'Block is required';
  }

  if (!vineData.variety || vineData.variety.trim().length === 0) {
    errors.variety = 'Variety is required';
  } else if (vineData.variety.trim().length < 2) {
    errors.variety = 'Variety must be at least 2 characters';
  }

  if (!vineData.plantingDate) {
    errors.plantingDate = 'Planting date is required';
  } else if (vineData.plantingDate > new Date()) {
    errors.plantingDate = 'Planting date cannot be in the future';
  }

  if (!vineData.health) {
    errors.health = 'Health status is required';
  }

  return errors;
};

export const calculateAge = (plantingDate: Date): string => {
  const years = new Date().getFullYear() - plantingDate.getFullYear();
  return `${years} YRS`;
};

export const generateVineId = (_block: string, vinesData: VineDataRaw[]): { id: string; sequenceNumber: number } => {
  const maxNumber = vinesData.length > 0
    ? Math.max(...vinesData.map(v => v.sequence_number))
    : 0;
  const nextNumber = maxNumber + 1;
  const vineId = nextNumber.toString().padStart(3, '0');
  return { id: vineId, sequenceNumber: nextNumber };
};

export const generateBatchVineIds = (_block: string, vinesData: VineDataRaw[], quantity: number): Array<{ id: string; sequenceNumber: number }> => {
  const maxNumber = vinesData.length > 0
    ? Math.max(...vinesData.map(v => v.sequence_number))
    : 0;

  return Array.from({ length: quantity }, (_, i) => {
    const sequenceNumber = maxNumber + i + 1;
    const id = sequenceNumber.toString().padStart(3, '0');
    return { id, sequenceNumber };
  });
};

export const prepareBlockDeletionState = (blockId: string, allBlocks: BlockData[]) => {
  const availableBlocks = allBlocks.filter(b => b.id !== blockId);
  return {
    deleteBlockId: blockId,
    deleteMigrateToBlock: availableBlocks.length > 0 ? availableBlocks[0].id : null,
    deleteVines: availableBlocks.length === 0,
  };
};

export const transformVineData = (vine: VineDataRaw): VineData => ({
  id: vine.id,
  block: vine.block,
  variety: vine.variety,
  plantingDate: new Date(vine.planting_date),
  age: calculateAge(new Date(vine.planting_date)),
  health: vine.health,
  notes: vine.notes || '',
  qrGenerated: vine.qr_generated > 0,
});

export const transformBlockData = (block: BlockDataRaw): BlockData => ({
  id: block.id,
  name: block.name,
  location: block.location,
  sizeAcres: block.size_acres,
  soilType: block.soil_type,
  notes: block.notes,
});

export const filterVinesByBlock = (vines: VineDataRaw[], blockId: string | null): VineDataRaw[] => {
  if (!blockId) return vines;
  return vines.filter((vine) => vine.block === blockId);
};
