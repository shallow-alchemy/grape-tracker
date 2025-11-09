import styles from '../App.module.css';
import { useVines } from './vineyard-hooks';
import { transformVineData, filterVinesByBlock } from './vineyard-utils';

type VineyardViewVineListProps = {
  selectedBlock: string | null;
  navigateToVine: (vineId: string) => void;
};

export const VineyardViewVineList = ({ selectedBlock, navigateToVine }: VineyardViewVineListProps) => {
  const vinesData = useVines();
  const filteredVinesData = filterVinesByBlock(vinesData, selectedBlock);
  const vines = filteredVinesData.map(transformVineData);

  return (
    <div className={styles.vineList}>
      {vines.map((vine) => (
        <div
          key={vine.id}
          className={styles.vineItem}
          onClick={() => navigateToVine(vine.id)}
        >
          <div className={styles.vineId}>{vine.block}-{vine.id}</div>
          <div className={styles.vineInfo}>
            <div className={styles.vineVariety}>{vine.variety}</div>
            <div className={styles.vineBlock}>BLOCK {vine.block} • {vine.age}</div>
          </div>
          <div className={`${styles.vineHealth} ${vine.health === 'NEEDS ATTENTION' ? styles.vineHealthWarning : ''}`}>
            {vine.health}
          </div>
        </div>
      ))}
    </div>
  );
};
