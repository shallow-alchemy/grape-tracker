import styles from '../App.module.css';
import { ListItem } from './ListItem';
import { useVines, useBlocks } from './vineyard-hooks';
import { transformVineData, transformBlockData, filterVinesByBlock } from './vineyard-utils';

type VineyardViewVineListProps = {
  selectedBlock: string | null;
  navigateToVine: (vineId: string) => void;
  navigateToBlock: (blockId: string) => void;
};

export const VineyardViewVineList = ({ selectedBlock, navigateToVine, navigateToBlock }: VineyardViewVineListProps) => {
  const vinesData = useVines();
  const blocksData = useBlocks();
  const filteredVinesData = filterVinesByBlock(vinesData, selectedBlock);
  const vines = filteredVinesData.map(transformVineData);
  const blocks = blocksData.map(transformBlockData);

  // Get vine count per block
  const getVineCountForBlock = (blockId: string) => {
    return vinesData.filter((v) => v.block === blockId).length;
  };

  // Get unique varieties for a block
  const getVarietiesForBlock = (blockId: string) => {
    const blockVines = vinesData.filter((v) => v.block === blockId);
    const varieties = [...new Set(blockVines.map((v) => v.variety))];
    return varieties.length > 0 ? varieties.join(', ') : 'No vines';
  };

  // Get training method label for a block
  const getTrainingMethodLabel = (block: { trainingMethod: string | null }) => {
    if (!block.trainingMethod) return '';
    const labels: Record<string, string> = {
      HEAD_TRAINING: 'Head',
      BILATERAL_CORDON: 'Cordon',
      VERTICAL_CORDON: 'V-Cordon',
      FOUR_ARM_KNIFFEN: 'Kniffen',
      GENEVA_DOUBLE_CURTAIN: 'GDC',
      UMBRELLA_KNIFFEN: 'Umbrella',
      CANE_PRUNED: 'Guyot',
      VSP: 'VSP',
      SCOTT_HENRY: 'Scott-Henry',
      LYRE: 'Lyre',
      OTHER: 'Custom',
    };
    return labels[block.trainingMethod] || block.trainingMethod;
  };

  return (
    <div className={styles.vineList}>
      {/* Show block cards when no block is selected */}
      {!selectedBlock && blocks.length > 0 && (
        <div className={styles.blocksSection}>
          <div className={styles.sectionLabel}>BLOCKS ({blocks.length})</div>
          <div className={styles.blockCards}>
            {blocks.map((block) => {
              const vineCount = getVineCountForBlock(block.id);
              const varieties = getVarietiesForBlock(block.id);
              const trainingLabel = getTrainingMethodLabel(block);
              return (
                <ListItem
                  key={block.id}
                  id={block.name}
                  primaryInfo={varieties}
                  secondaryInfo={`${vineCount} vine${vineCount !== 1 ? 's' : ''}`}
                  status={trainingLabel}
                  onClick={() => navigateToBlock(block.id)}
                />
              );
            })}
          </div>
        </div>
      )}
      {!selectedBlock && vines.length > 0 && (
        <div className={styles.sectionLabel}>ALL VINES ({vines.length})</div>
      )}
      {vines.map((vine) => (
        <ListItem
          key={vine.id}
          id={`${vine.block}-${vine.sequenceNumber.toString().padStart(3, '0')}`}
          primaryInfo={vine.variety}
          secondaryInfo={`BLOCK ${vine.block} • ${vine.age}`}
          status={vine.health}
          statusWarning={vine.health === 'NEEDS ATTENTION'}
          onClick={() => navigateToVine(vine.id)}
        />
      ))}
    </div>
  );
};
