import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { FiSettings } from 'react-icons/fi';
import { useZero } from '../../contexts/ZeroContext';
import { EditWineModal } from './EditWineModal';
import { StageTransitionModal } from './StageTransitionModal';
import { AddMeasurementModal } from './AddMeasurementModal';
import { TaskListView } from './TaskListView';
import styles from '../../App.module.css';

type WineDetailsViewProps = {
  wineId: string;
  onBack: () => void;
};

export const WineDetailsView = ({ wineId, onBack }: WineDetailsViewProps) => {
  const zero = useZero();
  const [winesData] = useQuery(zero.query.wine.where('id', wineId));
  const wine = winesData[0];

  // Fetch vintage data (primary vintage)
  const [vintagesData] = useQuery(
    wine ? zero.query.vintage.where('id', wine.vintage_id) : zero.query.vintage.where('id', 'none')
  );
  const vintage = vintagesData[0];

  // Fetch all vintages for blend component lookups
  const [allVintagesData] = useQuery(zero.query.vintage);

  // Check if this is a blend
  const isBlend = wine?.blend_components && Array.isArray(wine.blend_components) && wine.blend_components.length > 0;

  // Fetch stage history
  const [stageHistoryData] = useQuery(
    zero.query.stage_history
      .where('entity_type', 'wine')
      .where('entity_id', wineId)
  );

  // Sort stage history by started_at descending (most recent first)
  const stageHistory = [...stageHistoryData].sort((a, b) => b.started_at - a.started_at);
  const currentStageHistory = stageHistory.find(s => !s.completed_at);

  // Fetch measurements for this wine
  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'wine')
      .where('entity_id', wineId)
  );

  // Sort measurements by date descending
  const measurements = [...measurementsData].sort((a, b) => b.date - a.date);
  const latestMeasurement = measurements[0];

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);

  if (!wine) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div className={styles.errorMessage}>WINE NOT FOUND</div>
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

  const formatStage = (stage: string): string => {
    return stage
      .split('_')
      .map(word => word.toUpperCase())
      .join(' ');
  };

  const getDaysInStage = (): number | null => {
    if (!currentStageHistory) return null;
    const now = Date.now();
    const days = Math.floor((now - currentStageHistory.started_at) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysInStage = getDaysInStage();

  // Show task list view if requested
  if (showTaskList) {
    return (
      <TaskListView
        entityType="wine"
        entityId={wineId}
        entityName={vintage ? `${vintage.vintage_year} ${wine.name}` : wine.name}
        currentStage={wine.current_stage}
        onBack={() => setShowTaskList(false)}
      />
    );
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <button className={styles.backButton} onClick={onBack}>
          ← BACK
        </button>
        <div className={styles.vineyardTitle}>
          {vintage ? `${vintage.vintage_year} ${wine.name}` : wine.name}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <button className={styles.actionButton} onClick={() => setShowTaskList(true)}>
            TASKS
          </button>
          <button className={styles.actionButton} onClick={() => setShowMeasurementModal(true)}>
            ADD MEASUREMENT
          </button>
          <button className={styles.actionButton} onClick={() => setShowStageModal(true)}>
            ADVANCE STAGE
          </button>
          <button className={styles.gearButton} onClick={() => setIsEditModalOpen(true)}>
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      {/* Current Stage */}
      <div className={styles.detailSection}>
        <div className={styles.sectionHeader}>CURRENT STAGE</div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-primary-500)',
          textTransform: 'uppercase'
        }}>
          {formatStage(wine.current_stage)}
          {daysInStage !== null && (
            <span style={{
              marginLeft: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              ({daysInStage} {daysInStage === 1 ? 'day' : 'days'})
            </span>
          )}
        </div>
      </div>

      {/* Wine Details */}
      <div className={styles.detailSection}>
        <div className={styles.sectionHeader}>WINE DETAILS</div>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>TYPE</div>
            <div className={styles.detailValue}>{wine.wine_type.toUpperCase()}</div>
          </div>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>STATUS</div>
            <div className={styles.detailValue}>{wine.status.toUpperCase()}</div>
          </div>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>VOLUME</div>
            <div className={styles.detailValue}>{wine.current_volume_gallons} GAL</div>
          </div>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>STARTING VOLUME</div>
            <div className={styles.detailValue}>{wine.volume_gallons} GAL</div>
          </div>
        </div>
      </div>

      {/* Blend Information or Source Vintage */}
      {isBlend ? (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            BLEND VARIETIES
            <span style={{
              marginLeft: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-primary-500)',
              fontFamily: 'var(--font-body)',
              textTransform: 'none'
            }}>
              (Multi-Vintage Blend)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {(wine.blend_components as Array<{ vintage_id: string; percentage: number }>).map((variety, index) => {
              const varietyVintage = allVintagesData.find(v => v.id === variety.vintage_id);
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)'
                    }}>
                      {varietyVintage ? `${varietyVintage.vintage_year} ${varietyVintage.variety}` : 'Unknown Vintage'}
                    </div>
                    {varietyVintage?.grape_source === 'purchased' && (
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-body)'
                      }}>
                        Purchased{varietyVintage.supplier_name ? ` from ${varietyVintage.supplier_name}` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--font-size-md)',
                    color: 'var(--color-primary-500)'
                  }}>
                    {variety.percentage}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : vintage && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            SOURCE VINTAGE
            <span style={{
              marginLeft: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-primary-500)',
              fontFamily: 'var(--font-body)',
              textTransform: 'none'
            }}>
              (Varietal)
            </span>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>YEAR</div>
              <div className={styles.detailValue}>{vintage.vintage_year}</div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>VARIETY</div>
              <div className={styles.detailValue}>{vintage.variety}</div>
            </div>
            {vintage.grape_source === 'purchased' && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>SOURCE</div>
                <div className={styles.detailValue}>PURCHASED</div>
              </div>
            )}
            {vintage.supplier_name && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>SUPPLIER</div>
                <div className={styles.detailValue}>{vintage.supplier_name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Latest Measurements */}
      {latestMeasurement && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            LATEST MEASUREMENTS
            <span style={{
              marginLeft: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              textTransform: 'none'
            }}>
              ({formatDate(latestMeasurement.date)})
            </span>
          </div>
          <div className={styles.detailGrid}>
            {latestMeasurement.ph !== null && latestMeasurement.ph !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>PH</div>
                <div className={styles.detailValue}>{latestMeasurement.ph}</div>
              </div>
            )}
            {latestMeasurement.ta !== null && latestMeasurement.ta !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>TA</div>
                <div className={styles.detailValue}>{latestMeasurement.ta} G/L</div>
              </div>
            )}
            {latestMeasurement.brix !== null && latestMeasurement.brix !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>BRIX</div>
                <div className={styles.detailValue}>{latestMeasurement.brix}°</div>
              </div>
            )}
            {latestMeasurement.temperature !== null && latestMeasurement.temperature !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>TEMP</div>
                <div className={styles.detailValue}>{latestMeasurement.temperature}°F</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage History */}
      {stageHistory.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>STAGE HISTORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {stageHistory.map((stage) => (
              <div
                key={stage.id}
                style={{
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: !stage.completed_at ? 'rgba(58, 122, 58, 0.1)' : 'transparent',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-primary-500)'
                  }}>
                    {formatStage(stage.stage)}
                  </div>
                  {!stage.completed_at && (
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-success)',
                      fontFamily: 'var(--font-body)'
                    }}>
                      CURRENT
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)'
                }}>
                  Started: {formatDate(stage.started_at)}
                  {stage.completed_at && ` • Completed: ${formatDate(stage.completed_at)}`}
                </div>
                {stage.notes && (
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body)',
                    marginTop: 'var(--spacing-xs)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {stage.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      <EditWineModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(message) => {
          setSuccessMessage(message);
          setTimeout(() => setSuccessMessage(null), 3000);
        }}
        onDelete={onBack}
        wineId={wineId}
      />

      {wine && (
        <StageTransitionModal
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
          entityType="wine"
          entityId={wineId}
          currentStage={wine.current_stage}
          wineType={wine.wine_type}
        />
      )}

      {wine && (
        <AddMeasurementModal
          isOpen={showMeasurementModal}
          onClose={() => setShowMeasurementModal(false)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
          entityType="wine"
          entityId={wineId}
          currentStage={wine.current_stage}
        />
      )}
    </div>
  );
};
