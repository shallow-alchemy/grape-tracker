import { type VineData } from './vineyard-types';
import styles from '../App.module.css';

type VineyardViewVineListProps = {
  vines: VineData[];
  navigateToVine: (vineId: string) => void;
};

export const VineyardViewVineList = ({ vines, navigateToVine }: VineyardViewVineListProps) => {
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
