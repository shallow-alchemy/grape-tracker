import { useState } from 'react';
import { useZero } from '../../contexts/ZeroContext';
import { useVintages, useWines, useMeasurements, useTasks } from '../vineyard-hooks';
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
  const vintagesData = useVintages();
  const vintages = [...vintagesData].sort((a: any, b: any) => b.vintage_year - a.vintage_year);

  const winesData = useWines();

  const allMeasurementsData = useMeasurements();
  const measurementsData = allMeasurementsData.filter((m: any) => m.entity_type === 'vintage' && m.stage === 'harvest');

  const tasksData = useTasks();

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskModalVintageId, setTaskModalVintageId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const harvestMeasurements: any = new Map(
    measurementsData.map((m: any) => [m.entity_id, m])
  );

  const getWineCount = (vintageId: string): number => {
    return winesData.filter((wine: any) => {
      if (wine.vintage_id === vintageId) {
        return true;
      }

      if (wine.blend_components && Array.isArray(wine.blend_components)) {
        return wine.blend_components.some((component: any) => component.vintage_id === vintageId);
      }

      return false;
    }).length;
  };

  const formatStage = (stage: string | null | undefined): string => {
    if (!stage) return 'UNKNOWN';
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
                <WarningBadge text="SOURCED" spaced />
              )}
            </h3>
            <div className={styles.featuredVintageStage}>
              {formatStage(featuredVintage.current_stage)}
            </div>
          </div>

          <div className={styles.featuredVintageContent}>
            <div className={styles.flexColumnGap}>
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
              <div className={styles.measurementsSection}>
                <div className={`${styles.featuredMetricLabel} ${styles.taskCardText}`}>MEASUREMENTS</div>
                <div className={styles.measurementsFlex}>
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

            <div className={styles.winesContainerSection}>
              <div className={styles.winesSectionHeader}>
                <div className={styles.featuredBlockLabel}>
                  WINES ({(() => {
                    const count = winesData.filter((wine: any) => {
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
                  className={styles.createNewButton}
                >
                  Create new →
                </button>
              </div>

              {(() => {
                const vintageWines = winesData.filter((wine: any) => {
                  if (wine.vintage_id === featuredVintage.id) {
                    return true;
                  }
                  if (wine.blend_components && Array.isArray(wine.blend_components)) {
                    return wine.blend_components.some((component: any) => component.vintage_id === featuredVintage.id);
                  }
                  return false;
                }).sort((a: any, b: any) => a.name.localeCompare(b.name));

                return vintageWines.length > 0 ? (
                  <div className={styles.winesContainer}>
                    {vintageWines.map((wine: any) => {
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
                          className={styles.wineCardSmall}
                        >
                          <div className={styles.wineCardSmallContent}>
                            <div className={styles.wineCardSmallTitle}>
                              <span>{wine.name}</span>
                              <span className={styles.wineCardSmallBadge}>
                                {isBlend ? 'BLEND' : 'VARIETAL'}
                              </span>
                            </div>
                            <div className={styles.wineCardSmallSubtext}>
                              {wine.wine_type.toUpperCase()} • {wine.current_volume_gallons} GAL • {formatWineStatus(wine.status)}
                            </div>
                          </div>
                          <div className={styles.wineCardSmallArrow}>
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

            {(() => {
              const vintageTasks = tasksData
                .filter((task: any) => task.entity_type === 'vintage' && task.entity_id === featuredVintage.id)
                .sort((a: any, b: any) => {
                  const aCompleted = a.completed_at !== null && a.completed_at !== undefined;
                  const bCompleted = b.completed_at !== null && b.completed_at !== undefined;
                  if (aCompleted && !bCompleted) return 1;
                  if (!aCompleted && bCompleted) return -1;
                  return (a.due_date || 0) - (b.due_date || 0);
                });

              return vintageTasks.length > 0 ? (
                <div className={styles.tasksContainerOuter}>
                  <div className={styles.tasksContainerInner}>
                    <div className={styles.winesSectionHeader}>
                      <div className={styles.featuredMetricLabel}>
                        TASKS ({vintageTasks.filter((t: any) => !t.completed_at).length})
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskModalVintageId(featuredVintage.id);
                          setShowCreateTaskModal(true);
                        }}
                        className={styles.createNewButton}
                      >
                        Add task →
                      </button>
                    </div>
                  <div className={styles.tasksList}>
                    {vintageTasks.map((task: any) => {
                      const isCompleted = task.completed_at !== null && task.completed_at !== undefined;
                      const hasDueDate = task.due_date && task.due_date > 946684800000;
                      return (
                        <div
                          key={task.id}
                          className={`${styles.taskCard} ${isCompleted ? styles.taskCardCompleted : styles.taskCardActive}`}
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
                            className={styles.taskCheckbox}
                          />
                          <div className={styles.taskCardContent}>
                            <div className={`${hasDueDate ? styles.taskCardText : ''} ${isCompleted ? styles.taskCardTextCompleted : ''}`}>
                              {task.name || task.description}
                            </div>
                            {hasDueDate && (
                              <div className={styles.taskCardDate}>
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
              <div className={styles.vintageCardHeader}>
                <h3 className={`${styles.vintageHeading} ${styles.vintageCardHeaderTitle}`}>
                  {vintage.vintage_year} {vintage.variety}
                  {vintage.grape_source === 'purchased' && (
                    <WarningBadge text="SOURCED" spaced />
                  )}
                </h3>
                <div className={`${styles.vintageStage} ${styles.vintageCardHeaderStage}`}>
                  {formatStage(vintage.current_stage)}
                </div>
              </div>

              {(vintage.block_ids && Array.isArray(vintage.block_ids) && vintage.block_ids.length > 0 || getWineCount(vintage.id) > 0) && (
                <div className={styles.vintageCardInfo}>
                  {vintage.block_ids && Array.isArray(vintage.block_ids) && vintage.block_ids.length > 0 && (
                    <div className={styles.vintageCardInfoText}>
                      {getBlockCount(vintage.block_ids as string[])}
                    </div>
                  )}

                  {getWineCount(vintage.id) > 0 && (
                    <div className={styles.vintageCardInfoText}>
                      {getWineCount(vintage.id) === 1 ? '1 WINE' : `${getWineCount(vintage.id)} WINES`}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.metricsGrid2Col}>
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

      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

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
