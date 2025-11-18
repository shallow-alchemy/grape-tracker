import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { FiSettings } from 'react-icons/fi';
import { useZero } from '../../contexts/ZeroContext';
import { EditVintageModal } from './EditVintageModal';
import { AddWineModal } from './AddWineModal';
import { StageTransitionModal } from './StageTransitionModal';
import { TaskListView } from './TaskListView';
import { formatStage, getStagesForEntity } from './stages';
import styles from '../../App.module.css';

const formatWineStatus = (status: string): string => {
  if (status === 'active') return 'FERMENTING';
  return status.toUpperCase();
};

type VintageDetailsViewProps = {
  vintageId: string;
  onBack: () => void;
  onWineClick: (wineId: string) => void;
};

export const VintageDetailsView = ({ vintageId, onBack, onWineClick }: VintageDetailsViewProps) => {
  const zero = useZero();
  const [vintagesData] = useQuery(zero.query.vintage.where('id', vintageId));
  const vintage = vintagesData[0];

  // Fetch all wines to check both primary vintage and blend components
  const [allWinesData] = useQuery(zero.query.wine);

  // Filter wines that use this vintage (either as primary or in blend)
  const wines = allWinesData.filter(wine => {
    // Check if this is the primary vintage
    if (wine.vintage_id === vintageId) {
      return true;
    }

    // Check if this vintage is in the blend components
    if (wine.blend_components && Array.isArray(wine.blend_components)) {
      return wine.blend_components.some((component: any) => component.vintage_id === vintageId);
    }

    return false;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Fetch harvest measurements
  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'vintage')
      .where('entity_id', vintageId)
      .where('stage', 'harvest')
  );
  const harvestMeasurement = measurementsData[0];

  // Fetch stage history
  const [stageHistoryData] = useQuery(
    zero.query.stage_history
      .where('entity_type', 'vintage')
      .where('entity_id', vintageId)
  );

  // Sort stage history by started_at descending (most recent first)
  const stageHistory = [...stageHistoryData].sort((a, b) => b.started_at - a.started_at);

  // Expand stage history to include skipped stages
  type ExpandedStageHistoryEntry = {
    id: string;
    stage: string;
    started_at: number;
    completed_at: number | null | undefined;
    skipped: boolean;
    notes: string;
    isSkippedPlaceholder: boolean;
  };

  const expandedStageHistory = (() => {
    const expanded: ExpandedStageHistoryEntry[] = [];
    const vintageStages = getStagesForEntity('vintage');

    for (let i = 0; i < stageHistory.length; i++) {
      const current = stageHistory[i];

      // Add the actual stage history entry
      expanded.push({
        id: current.id,
        stage: current.stage,
        started_at: current.started_at,
        completed_at: current.completed_at,
        skipped: !!current.skipped,
        notes: current.notes || '',
        isSkippedPlaceholder: false,
      });

      // Check if there's a next stage and if we skipped any stages in between
      if (i < stageHistory.length - 1) {
        const next = stageHistory[i + 1];
        const currentStageIndex = vintageStages.findIndex(s => s.value === next.stage);
        const nextStageIndex = vintageStages.findIndex(s => s.value === current.stage);

        if (currentStageIndex !== -1 && nextStageIndex !== -1) {
          // Add placeholder entries for skipped stages
          for (let j = currentStageIndex + 1; j < nextStageIndex; j++) {
            expanded.push({
              id: `skipped-${vintageStages[j].value}-${i}`,
              stage: vintageStages[j].value,
              started_at: next.completed_at || next.started_at,
              completed_at: next.completed_at || next.started_at,
              skipped: true,
              notes: '',
              isSkippedPlaceholder: true,
            });
          }
        }
      }
    }

    return expanded;
  })();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (!vintage) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div className={styles.errorMessage}>VINTAGE NOT FOUND</div>
        <button className={styles.actionButton} onClick={onBack}>
          BACK TO LIST
        </button>
      </div>
    );
  }

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Show task list view if requested
  if (showTaskList) {
    return (
      <TaskListView
        entityType="vintage"
        entityId={vintageId}
        entityName={`${vintage.variety}, ${vintage.vintage_year} Vintage${vintage.grape_source === 'purchased' && vintage.supplier_name ? ` from ${vintage.supplier_name}` : ''}`}
        currentStage={vintage.current_stage}
        onBack={() => setShowTaskList(false)}
      />
    );
  }

  return (
    <div className={styles.vineyardContainer}>
      <button className={styles.backButton} onClick={onBack}>
        ← BACK TO VINTAGES
      </button>
      <div className={styles.vineyardHeader}>
        <div className={styles.vineyardTitle}>
          {vintage.variety}, {vintage.vintage_year} Vintage{vintage.grape_source === 'purchased' && vintage.supplier_name ? ` from ${vintage.supplier_name}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <button className={styles.actionButton} onClick={() => setShowTaskList(true)}>
            TASKS
          </button>
          <button className={styles.actionButton} onClick={() => setShowAddWineModal(true)}>
            CREATE WINE
          </button>
          <button className={styles.gearButton} onClick={() => setShowEditModal(true)}>
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      {/* Current Stage */}
      <div className={styles.detailSection}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
          <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>CURRENT STAGE</div>
          <button
            onClick={() => setShowStageModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-interaction-400)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
              padding: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-interaction-300)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-interaction-400)'}
          >
            Mark Complete →
          </button>
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-primary-500)',
          textTransform: 'uppercase'
        }}>
          {formatStage(vintage.current_stage)}
        </div>
      </div>

      {/* Grape Source */}
      {vintage.grape_source === 'purchased' && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>GRAPE SOURCE</div>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>SOURCE</div>
              <div className={styles.detailValue}>PURCHASED</div>
            </div>
            {vintage.supplier_name && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>SUPPLIER</div>
                <div className={styles.detailValue}>{vintage.supplier_name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Harvest Details */}
      {(vintage.harvest_date || vintage.harvest_weight_lbs || vintage.harvest_volume_gallons || harvestMeasurement) && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>HARVEST DETAILS</div>
          <div className={styles.detailGrid}>
            {vintage.harvest_date && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>DATE</div>
                <div className={styles.detailValue}>{formatDate(vintage.harvest_date)}</div>
              </div>
            )}
            {vintage.harvest_weight_lbs !== null && vintage.harvest_weight_lbs !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>WEIGHT</div>
                <div className={styles.detailValue}>{vintage.harvest_weight_lbs} LBS</div>
              </div>
            )}
            {vintage.harvest_volume_gallons !== null && vintage.harvest_volume_gallons !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>VOLUME</div>
                <div className={styles.detailValue}>{vintage.harvest_volume_gallons} GAL</div>
              </div>
            )}
            {harvestMeasurement?.brix !== null && harvestMeasurement?.brix !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>BRIX</div>
                <div className={styles.detailValue}>{harvestMeasurement.brix}°</div>
              </div>
            )}
            {harvestMeasurement?.ph !== null && harvestMeasurement?.ph !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>PH</div>
                <div className={styles.detailValue}>{harvestMeasurement.ph}</div>
              </div>
            )}
            {harvestMeasurement?.ta !== null && harvestMeasurement?.ta !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>TA</div>
                <div className={styles.detailValue}>{harvestMeasurement.ta} G/L</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {vintage.notes && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>NOTES</div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap'
          }}>
            {vintage.notes}
          </div>
        </div>
      )}

      {/* Wines Made From This Vintage */}
      {wines.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            WINES FROM THIS VINTAGE ({wines.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {wines.map((wine) => {
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
                    padding: 'var(--spacing-sm)',
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
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)'
                    }}>
                      {wine.name}
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
                      marginTop: 'var(--spacing-xs)'
                    }}>
                      {wine.wine_type.toUpperCase()} • {wine.current_volume_gallons} GAL • {formatWineStatus(wine.status)}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    →
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage History */}
      {expandedStageHistory.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>STAGE HISTORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {expandedStageHistory.map((stage) => {
              const isCurrentStage = !stage.completed_at;
              return (
                <div
                  key={stage.id}
                  style={{
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isCurrentStage
                      ? 'rgba(58, 122, 58, 0.1)'
                      : 'rgba(138, 150, 138, 0.05)',
                    opacity: stage.isSkippedPlaceholder ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--font-size-sm)',
                      color: isCurrentStage ? 'var(--color-primary-500)' : 'var(--color-text-muted)',
                      textDecoration: stage.isSkippedPlaceholder ? 'line-through' : 'none',
                    }}>
                      {formatStage(stage.stage)}
                    </div>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-body)'
                    }}>
                      {isCurrentStage ? (
                        <div style={{ color: 'var(--color-success)' }}>IN PROGRESS</div>
                      ) : stage.skipped ? (
                        <div style={{ color: 'var(--color-text-muted)' }}>SKIPPED</div>
                      ) : (
                        <div style={{ color: 'var(--color-primary-500)' }}>COMPLETE ✓</div>
                      )}
                    </div>
                  </div>
                  {!stage.isSkippedPlaceholder && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 'var(--spacing-md)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-body)',
                      color: 'var(--color-text-secondary)',
                    }}>
                      <div style={{
                        flex: 1,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {stage.notes || ''}
                      </div>
                      <div style={{
                        minWidth: '120px',
                        textAlign: 'right',
                        flexShrink: 0
                      }}>
                        {isCurrentStage ? (
                          <>{formatDate(stage.started_at)}</>
                        ) : stage.skipped ? (
                          <>{stage.completed_at ? formatDate(stage.completed_at) : 'N/A'}</>
                        ) : (
                          <>{stage.completed_at ? formatDate(stage.completed_at) : 'N/A'}</>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {vintage && (
        <EditVintageModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={showSuccessMessage}
          onDelete={onBack}
          vintage={vintage}
        />
      )}

      <AddWineModal
        isOpen={showAddWineModal}
        onClose={() => setShowAddWineModal(false)}
        onSuccess={showSuccessMessage}
        initialVintageId={vintageId}
      />

      {vintage && (
        <StageTransitionModal
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          onSuccess={showSuccessMessage}
          entityType="vintage"
          entityId={vintageId}
          currentStage={vintage.current_stage}
        />
      )}
    </div>
  );
};
