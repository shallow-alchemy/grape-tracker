import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type VintagesListProps = {
  onVintageClick: (vintageId: string) => void;
};

export const VintagesList = ({ onVintageClick }: VintagesListProps) => {
  const zero = useZero();
  const [vintagesData] = useQuery(zero.query.vintage);
  const vintages = [...vintagesData].sort((a, b) => b.vintage_year - a.vintage_year);

  // Fetch all harvest measurements for vintages
  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'vintage')
      .where('stage', 'harvest')
  );

  // Create a map of vintage ID to harvest measurements
  const harvestMeasurements = new Map(
    measurementsData.map(m => [m.entity_id, m])
  );

  const formatStage = (stage: string): string => {
    return stage
      .split('_')
      .map(word => word.toUpperCase())
      .join('-');
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getBlockCount = (blockIds: string[]): string => {
    const count = blockIds.length;
    return count === 1 ? '1 BLOCK' : `${count} BLOCKS`;
  };

  const handleClick = (vintageId: string) => {
    onVintageClick(vintageId);
  };

  const handleKeyDown = (event: React.KeyboardEvent, vintageId: string) => {
    if (event.key === 'Enter') {
      onVintageClick(vintageId);
    }
  };

  if (vintages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateMessage}>NO VINTAGES YET</div>
        <div className={styles.emptyStateSubtext}>ADD YOUR FIRST HARVEST TO GET STARTED</div>
      </div>
    );
  }

  const [featuredVintage, ...olderVintages] = vintages;

  return (
    <div className={styles.vintagesContainer}>
      {featuredVintage && (
        <div
          className={styles.featuredVintageCard}
          role="button"
          tabIndex={0}
          onClick={() => handleClick(featuredVintage.id)}
          onKeyDown={(e) => handleKeyDown(e, featuredVintage.id)}
        >
          <div className={styles.featuredVintageHeader}>
            <h3 className={styles.featuredVintageHeading}>
              {featuredVintage.vintage_year} {featuredVintage.variety}
              {featuredVintage.grape_source === 'purchased' && (
                <span style={{
                  marginLeft: 'var(--spacing-sm)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-accent)',
                  border: '1px solid var(--color-primary-500)',
                  padding: '2px var(--spacing-xs)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  PURCHASED
                </span>
              )}
            </h3>
            <div className={styles.featuredVintageStage}>
              {formatStage(featuredVintage.current_stage)}
            </div>
          </div>

          <div className={styles.featuredVintageContent}>
            <div className={styles.featuredMetricsGrid}>
              {featuredVintage.harvest_date && (
                <div className={styles.featuredMetricItem}>
                  <div className={styles.featuredMetricLabel}>HARVEST DATE</div>
                  <div className={styles.featuredMetricValue}>{formatDate(featuredVintage.harvest_date)}</div>
                </div>
              )}

              {featuredVintage.harvest_weight_lbs !== null && featuredVintage.harvest_weight_lbs !== undefined && (
                <div className={styles.featuredMetricItem}>
                  <div className={styles.featuredMetricLabel}>WEIGHT</div>
                  <div className={styles.featuredMetricValue}>{featuredVintage.harvest_weight_lbs} LBS</div>
                </div>
              )}

              {featuredVintage.harvest_volume_gallons !== null && featuredVintage.harvest_volume_gallons !== undefined && (
                <div className={styles.featuredMetricItem}>
                  <div className={styles.featuredMetricLabel}>VOLUME</div>
                  <div className={styles.featuredMetricValue}>{featuredVintage.harvest_volume_gallons} GAL</div>
                </div>
              )}

              {harvestMeasurements.get(featuredVintage.id)?.brix !== null && harvestMeasurements.get(featuredVintage.id)?.brix !== undefined && (
                <div className={styles.featuredMetricItem}>
                  <div className={styles.featuredMetricLabel}>BRIX</div>
                  <div className={styles.featuredMetricValue}>{harvestMeasurements.get(featuredVintage.id)?.brix}°</div>
                </div>
              )}

              {harvestMeasurements.get(featuredVintage.id)?.ph !== null && harvestMeasurements.get(featuredVintage.id)?.ph !== undefined && (
                <div className={styles.featuredMetricItem}>
                  <div className={styles.featuredMetricLabel}>PH</div>
                  <div className={styles.featuredMetricValue}>{harvestMeasurements.get(featuredVintage.id)?.ph}</div>
                </div>
              )}

              {harvestMeasurements.get(featuredVintage.id)?.ta !== null && harvestMeasurements.get(featuredVintage.id)?.ta !== undefined && (
                <div className={styles.featuredMetricItem}>
                  <div className={styles.featuredMetricLabel}>TA</div>
                  <div className={styles.featuredMetricValue}>{harvestMeasurements.get(featuredVintage.id)?.ta} G/L</div>
                </div>
              )}
            </div>

            {featuredVintage.block_ids && Array.isArray(featuredVintage.block_ids) && featuredVintage.block_ids.length > 0 && (
              <div className={styles.featuredVintageBlocks}>
                <span className={styles.featuredBlockLabel}>BLOCKS:</span>
                <span className={styles.featuredBlockCount}>{getBlockCount(featuredVintage.block_ids as string[])}</span>
              </div>
            )}

            {featuredVintage.notes && (
              <div className={styles.featuredVintageNotes}>
                <div className={styles.featuredNotesLabel}>NOTES</div>
                <div className={styles.featuredNotesText}>{featuredVintage.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {olderVintages.length > 0 && (
        <>
          {olderVintages.map((vintage) => (
            <div
              key={vintage.id}
              className={styles.vintageCard}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(vintage.id)}
              onKeyDown={(e) => handleKeyDown(e, vintage.id)}
            >
              <h3 className={styles.vintageHeading}>
                {vintage.vintage_year} {vintage.variety}
                {vintage.grape_source === 'purchased' && (
                  <span style={{
                    marginLeft: 'var(--spacing-sm)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-accent)',
                    border: '1px solid var(--color-primary-500)',
                    padding: '2px var(--spacing-xs)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    PURCHASED
                  </span>
                )}
              </h3>

              <div className={styles.vintageStage}>
                {formatStage(vintage.current_stage)}
              </div>

              {vintage.block_ids && Array.isArray(vintage.block_ids) && vintage.block_ids.length > 0 && (
                <div className={styles.vintageBlocks}>
                  {getBlockCount(vintage.block_ids as string[])}
                </div>
              )}

              <div className={styles.harvestMetrics}>
                {vintage.harvest_date && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>HARVEST DATE:</span>
                    <span className={styles.metricValue}>{formatDate(vintage.harvest_date)}</span>
                  </div>
                )}

                {vintage.harvest_weight_lbs !== null && vintage.harvest_weight_lbs !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>WEIGHT:</span>
                    <span className={styles.metricValue}>{vintage.harvest_weight_lbs} LBS</span>
                  </div>
                )}

                {vintage.harvest_volume_gallons !== null && vintage.harvest_volume_gallons !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>VOLUME:</span>
                    <span className={styles.metricValue}>{vintage.harvest_volume_gallons} GAL</span>
                  </div>
                )}

                {harvestMeasurements.get(vintage.id)?.brix !== null && harvestMeasurements.get(vintage.id)?.brix !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>BRIX:</span>
                    <span className={styles.metricValue}>{harvestMeasurements.get(vintage.id)?.brix}°</span>
                  </div>
                )}

                {harvestMeasurements.get(vintage.id)?.ph !== null && harvestMeasurements.get(vintage.id)?.ph !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>PH:</span>
                    <span className={styles.metricValue}>{harvestMeasurements.get(vintage.id)?.ph}</span>
                  </div>
                )}

                {harvestMeasurements.get(vintage.id)?.ta !== null && harvestMeasurements.get(vintage.id)?.ta !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>TA:</span>
                    <span className={styles.metricValue}>{harvestMeasurements.get(vintage.id)?.ta} G/L</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
