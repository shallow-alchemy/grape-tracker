import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type WinesListProps = {
  onWineClick: (wineId: string) => void;
};

export const WinesList = ({ onWineClick }: WinesListProps) => {
  const zero = useZero();
  const [winesData] = useQuery(zero.query.wine);

  const activeWines = winesData.filter(w => w.status === 'active');
  const agingWines = winesData.filter(w => w.status === 'aging');
  const bottledWines = winesData.filter(w => w.status === 'bottled');

  const formatStage = (stage: string): string => {
    return stage
      .split('_')
      .map(word => word.toUpperCase())
      .join(' ');
  };

  const renderWineCard = (wine: typeof winesData[0]) => {
    const isBlend = wine.blend_components && Array.isArray(wine.blend_components) && wine.blend_components.length > 0;

    return (
      <div
        key={wine.id}
        className={styles.vintageCard}
        role="button"
        tabIndex={0}
        onClick={() => onWineClick(wine.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onWineClick(wine.id);
          }
        }}
      >
        <h3 className={styles.vintageHeading}>
          {wine.name}
          <span className={styles.wineTypeBadge}>
            {isBlend ? 'BLEND' : 'VARIETAL'}
          </span>
        </h3>

        <div className={styles.vintageStage}>
          {formatStage(wine.current_stage)}
        </div>

        <div className={styles.harvestMetrics}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>TYPE:</span>
            <span className={styles.metricValue}>{wine.wine_type.toUpperCase()}</span>
          </div>

          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>VOLUME:</span>
            <span className={styles.metricValue}>{wine.current_volume_gallons} GAL</span>
          </div>
        </div>
      </div>
    );
  };

  if (winesData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateMessage}>NO WINES YET</div>
        <div className={styles.emptyStateSubtext}>CREATE YOUR FIRST WINE FROM A VINTAGE</div>
      </div>
    );
  }

  return (
    <div>
      {activeWines.length > 0 && (
        <div className={styles.wineSection}>
          <div className={`${styles.sectionHeader} ${styles.wineSectionHeader}`}>
            ACTIVE WINES
          </div>
          <div className={styles.vintagesContainer}>
            {activeWines.map(renderWineCard)}
          </div>
        </div>
      )}

      {agingWines.length > 0 && (
        <div className={styles.wineSection}>
          <div className={`${styles.sectionHeader} ${styles.wineSectionHeader}`}>
            AGING WINES
          </div>
          <div className={styles.vintagesContainer}>
            {agingWines.map(renderWineCard)}
          </div>
        </div>
      )}

      {bottledWines.length > 0 && (
        <div className={styles.wineSection}>
          <div className={`${styles.sectionHeader} ${styles.wineSectionHeader}`}>
            BOTTLED WINES
          </div>
          <div className={styles.vintagesContainer}>
            {bottledWines.map(renderWineCard)}
          </div>
        </div>
      )}
    </div>
  );
};
