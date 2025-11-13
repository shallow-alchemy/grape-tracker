import styles from '../App.module.css';
import { ListItem } from './ListItem';
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
        <ListItem
          key={vine.id}
          id={`${vine.block}-${vine.id}`}
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
