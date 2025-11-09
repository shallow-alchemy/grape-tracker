export const calculateAge = (plantingDate: Date): string => {
  const years = new Date().getFullYear() - plantingDate.getFullYear();
  return `${years} YRS`;
};

export const generateVineId = (_block: string, vinesData: any[]): { id: string; sequenceNumber: number } => {
  const maxNumber = vinesData.length > 0
    ? Math.max(...vinesData.map(v => v.sequenceNumber))
    : 0;
  const nextNumber = maxNumber + 1;
  const vineId = nextNumber.toString().padStart(3, '0');
  return { id: vineId, sequenceNumber: nextNumber };
};

export const prepareBlockDeletionState = (blockId: string, allBlocks: any[]) => {
  const availableBlocks = allBlocks.filter(b => b.id !== blockId);
  return {
    deleteBlockId: blockId,
    deleteMigrateToBlock: availableBlocks.length > 0 ? availableBlocks[0].id : null,
    deleteVines: availableBlocks.length === 0,
  };
};
