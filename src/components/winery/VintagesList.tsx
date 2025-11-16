import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type VintagesListProps = {
  onVintageClick: (vintageId: string) => void;
  onWineClick: (wineId: string) => void;
  onCreateWine: (vintageId: string) => void;
};

export const VintagesList = ({ onVintageClick, onWineClick, onCreateWine }: VintagesListProps) => {
  const zero = useZero();
  const [vintagesData] = useQuery(zero.query.vintage);
  const vintages = [...vintagesData].sort((a, b) => b.vintage_year - a.vintage_year);

  // Fetch all wines
  const [winesData] = useQuery(zero.query.wine);

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

  // Count wines per vintage (including blends that use this vintage)
  const getWineCount = (vintageId: string): number => {
    return winesData.filter(wine => {
      // Check if this is the primary vintage
      if (wine.vintage_id === vintageId) {
        return true;
      }

      // Check if this vintage is in the blend components
      if (wine.blend_components && Array.isArray(wine.blend_components)) {
        return wine.blend_components.some((component: any) => component.vintage_id === vintageId);
      }

      return false;
    }).length;
  };

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
            </div>

            {(harvestMeasurements.get(featuredVintage.id)?.brix !== null && harvestMeasurements.get(featuredVintage.id)?.brix !== undefined ||
              harvestMeasurements.get(featuredVintage.id)?.ph !== null && harvestMeasurements.get(featuredVintage.id)?.ph !== undefined ||
              harvestMeasurements.get(featuredVintage.id)?.ta !== null && harvestMeasurements.get(featuredVintage.id)?.ta !== undefined) && (
              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                <div className={styles.featuredMetricLabel} style={{ marginBottom: 'var(--spacing-xs)' }}>MEASUREMENTS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
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
              </div>
            )}

            {featuredVintage.block_ids && Array.isArray(featuredVintage.block_ids) && featuredVintage.block_ids.length > 0 && (
              <div className={styles.featuredVintageBlocks}>
                <span className={styles.featuredBlockLabel}>BLOCKS:</span>
                <span className={styles.featuredBlockCount}>{getBlockCount(featuredVintage.block_ids as string[])}</span>
              </div>
            )}

            <div style={{ marginTop: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                <div className={styles.featuredBlockLabel}>
                  WINES ({(() => {
                    const count = winesData.filter(wine => {
                      if (wine.vintage_id === featuredVintage.id) return true;
                      if (wine.blend_components && Array.isArray(wine.blend_components)) {
                        return wine.blend_components.some((component: any) => component.vintage_id === featuredVintage.id);
                      }
                      return false;
                    }).length;
                    return count;
                  })()})
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateWine(featuredVintage.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary-500)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--font-size-xs)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Create new
                </button>
              </div>

              {(() => {
                const vintageWines = winesData.filter(wine => {
                  if (wine.vintage_id === featuredVintage.id) {
                    return true;
                  }
                  if (wine.blend_components && Array.isArray(wine.blend_components)) {
                    return wine.blend_components.some((component: any) => component.vintage_id === featuredVintage.id);
                  }
                  return false;
                }).sort((a, b) => a.name.localeCompare(b.name));

                return vintageWines.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-xs)',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {vintageWines.map((wine) => {
                      const isBlend = wine.blend_components && Array.isArray(wine.blend_components) && wine.blend_components.length > 0;
                      return (
                        <div
                          key={wine.id}
                          onClick={() => onWineClick(wine.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onWineClick(wine.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 'var(--spacing-xs)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                            e.currentTarget.style.backgroundColor = 'rgba(58, 122, 58, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--spacing-xs)',
                              flexWrap: 'wrap'
                            }}>
                              <span>{wine.name}</span>
                              <span style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-accent)',
                                border: '1px solid var(--color-primary-500)',
                                padding: '1px var(--spacing-xs)',
                                borderRadius: 'var(--radius-sm)',
                              }}>
                                {isBlend ? 'BLEND' : 'VARIETAL'}
                              </span>
                            </div>
                            <div style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-text-secondary)',
                              fontFamily: 'var(--font-body)',
                              marginTop: '2px'
                            }}>
                              {wine.wine_type.toUpperCase()} • {wine.current_volume_gallons} GAL • {wine.status.toUpperCase()}
                            </div>
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            marginLeft: 'var(--spacing-xs)'
                          }}>
                            →
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </div>

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
              {/* Header with title and stage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                <h3 className={styles.vintageHeading} style={{ margin: 0 }}>
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
                <div className={styles.vintageStage} style={{ marginTop: 0 }}>
                  {formatStage(vintage.current_stage)}
                </div>
              </div>

              {/* Blocks and Wines count */}
              {(vintage.block_ids && Array.isArray(vintage.block_ids) && vintage.block_ids.length > 0 || getWineCount(vintage.id) > 0) && (
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  {vintage.block_ids && Array.isArray(vintage.block_ids) && vintage.block_ids.length > 0 && (
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-body)'
                    }}>
                      {getBlockCount(vintage.block_ids as string[])}
                    </div>
                  )}

                  {getWineCount(vintage.id) > 0 && (
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-body)'
                    }}>
                      {getWineCount(vintage.id) === 1 ? '1 WINE' : `${getWineCount(vintage.id)} WINES`}
                    </div>
                  )}
                </div>
              )}

              {/* Metrics in 2-column grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs) var(--spacing-md)' }}>
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
