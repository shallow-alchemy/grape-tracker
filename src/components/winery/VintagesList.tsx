import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import { CreateTaskModal } from './CreateTaskModal';
import { WarningBadge } from '../WarningBadge';
import styles from '../../App.module.css';

const formatWineStatus = (status: string): string => {
  if (status === 'active') return 'FERMENTING';
  return status.toUpperCase();
};

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

  // Fetch all tasks
  const [tasksData] = useQuery(zero.query.task);

  // Modal state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskModalVintageId, setTaskModalVintageId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
                <WarningBadge text="SOURCED" style={{ marginLeft: 'var(--spacing-sm)', verticalAlign: 'middle' }} />
              )}
            </h3>
            <div className={styles.featuredVintageStage}>
              {formatStage(featuredVintage.current_stage)}
            </div>
          </div>

          <div className={styles.featuredVintageContent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
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
                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
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
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
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
                    color: 'var(--color-interaction-400)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    transition: 'color var(--transition-fast)',
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-interaction-300)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-interaction-400)'}
                >
                  Create new →
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onWineClick(wine.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
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
                                color: 'var(--color-text-muted)',
                                marginLeft: 'var(--spacing-xs)'
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
                              {wine.wine_type.toUpperCase()} • {wine.current_volume_gallons} GAL • {formatWineStatus(wine.status)}
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

            {/* Tasks Section */}
            {(() => {
              const vintageTasks = tasksData
                .filter(task => task.entity_type === 'vintage' && task.entity_id === featuredVintage.id)
                .sort((a, b) => {
                  const aCompleted = a.completed_at !== null && a.completed_at !== undefined;
                  const bCompleted = b.completed_at !== null && b.completed_at !== undefined;
                  if (aCompleted && !bCompleted) return 1;
                  if (!aCompleted && bCompleted) return -1;
                  return (a.due_date || 0) - (b.due_date || 0);
                });

              return vintageTasks.length > 0 ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)',
                    minWidth: '250px',
                    maxWidth: '300px',
                    width: '100%',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                      <div className={styles.featuredMetricLabel}>
                        TASKS ({vintageTasks.filter(t => !t.completed_at).length})
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskModalVintageId(featuredVintage.id);
                          setShowCreateTaskModal(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-interaction-400)',
                          fontFamily: 'var(--font-heading)',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          transition: 'color var(--transition-fast)',
                          padding: 0,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-interaction-300)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-interaction-400)'}
                      >
                        Add task →
                      </button>
                    </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-xs)',
                    maxHeight: '250px',
                    overflowY: 'auto',
                  }}>
                    {vintageTasks.map(task => {
                      const isCompleted = task.completed_at !== null && task.completed_at !== undefined;
                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--spacing-xs)',
                            padding: 'var(--spacing-xs)',
                            background: isCompleted ? 'var(--color-background)' : 'var(--color-surface-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            opacity: isCompleted ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => {
                              zero.mutate.task.update({
                                id: task.id,
                                completed_at: isCompleted ? undefined : Date.now()
                              });
                            }}
                            style={{
                              marginTop: '2px',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                            <div style={{
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              marginBottom: (task.due_date && task.due_date > 946684800000) ? '2px' : 0,
                            }}>
                              {task.name || task.description}
                            </div>
                            {task.due_date && task.due_date > 946684800000 && (
                              <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-muted)',
                                fontFamily: 'var(--font-mono)',
                              }}>
                                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </div>
              ) : null;
            })()}
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
                    <WarningBadge text="SOURCED" style={{ marginLeft: 'var(--spacing-sm)', verticalAlign: 'middle' }} />
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

      {/* Success Message */}
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {/* Create Task Modal */}
      {taskModalVintageId && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false);
            setTaskModalVintageId('');
          }}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
          entityType="vintage"
          entityId={taskModalVintageId}
          currentStage={vintages.find(v => v.id === taskModalVintageId)?.current_stage || ''}
        />
      )}
    </div>
  );
};
