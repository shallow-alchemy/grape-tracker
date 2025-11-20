import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useLocation } from 'wouter';
import { FiSettings } from 'react-icons/fi';
import { useZero } from '../../contexts/ZeroContext';
import { EditWineModal } from './EditWineModal';
import { StageTransitionModal } from './StageTransitionModal';
import { AddMeasurementModal } from './AddMeasurementModal';
import { getStagesForEntity } from './stages';
import styles from '../../App.module.css';

const formatWineStatus = (status: string): string => {
  if (status === 'active') return 'FERMENTING';
  return status.toUpperCase();
};

type WineDetailsViewProps = {
  wineId: string;
  onBack: () => void;
};

export const WineDetailsView = ({ wineId, onBack }: WineDetailsViewProps) => {
  const zero = useZero();
  const [, setLocation] = useLocation();
  const [winesData] = useQuery(zero.query.wine.where('id', wineId));
  const wine = winesData[0];

  const [vintagesData] = useQuery(
    wine ? zero.query.vintage.where('id', wine.vintage_id) : zero.query.vintage.where('id', 'none')
  );
  const vintage = vintagesData[0];

  const [allVintagesData] = useQuery(zero.query.vintage);

  const isBlend = wine?.blend_components && Array.isArray(wine.blend_components) && wine.blend_components.length > 0;

  const [stageHistoryData] = useQuery(
    zero.query.stage_history
      .where('entity_type', 'wine')
      .where('entity_id', wineId)
  );

  const stageHistory = [...stageHistoryData].sort((a, b) => b.started_at - a.started_at);
  const currentStageHistory = stageHistory.find(s => !s.completed_at);

  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'wine')
      .where('entity_id', wineId)
  );

  const measurements = [...measurementsData].sort((a, b) => b.date - a.date);
  const latestMeasurement = measurements[0];

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  if (!wine) {
    return (
      <div className={styles.paddingContainer}>
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
    const wineStages = getStagesForEntity('wine');

    for (let i = 0; i < stageHistory.length; i++) {
      const current = stageHistory[i];

      expanded.push({
        id: current.id,
        stage: current.stage,
        started_at: current.started_at,
        completed_at: current.completed_at,
        skipped: !!current.skipped,
        notes: current.notes || '',
        isSkippedPlaceholder: false,
      });

      if (i < stageHistory.length - 1) {
        const next = stageHistory[i + 1];
        const currentStageIndex = wineStages.findIndex(s => s.value === next.stage);
        const nextStageIndex = wineStages.findIndex(s => s.value === current.stage);

        if (currentStageIndex !== -1 && nextStageIndex !== -1) {
          for (let j = currentStageIndex + 1; j < nextStageIndex; j++) {
            expanded.push({
              id: `skipped-${wineStages[j].value}-${i}`,
              stage: wineStages[j].value,
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

  return (
    <div className={styles.vineyardContainer}>
      <button className={styles.backButton} onClick={onBack}>
        ← BACK TO WINES
      </button>
      <div className={styles.vineyardHeader}>
        <div className={styles.vineyardTitle}>
          {vintage ? `${vintage.vintage_year} ${wine.name}` : wine.name}
        </div>
        <div className={styles.actionButtonGroup}>
          <button className={styles.actionButton} onClick={() => setLocation(`/winery/wines/${wineId}/tasks`)}>
            TASKS
          </button>
          <button className={styles.actionButton} onClick={() => setShowMeasurementModal(true)}>
            ADD MEASUREMENT
          </button>
          <button className={styles.gearButton} onClick={() => setIsEditModalOpen(true)}>
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.stageHeaderRow}>
          <div className={`${styles.sectionHeader} ${styles.sectionHeaderNoMargin}`}>CURRENT STAGE</div>
          <button onClick={() => setShowStageModal(true)} className={styles.markCompleteButton}>
            Mark Complete →
          </button>
        </div>
        <div className={styles.currentStageDisplay}>
          {formatStage(wine.current_stage)}
          {daysInStage !== null && (
            <span className={styles.currentStageDays}>
              ({daysInStage} {daysInStage === 1 ? 'day' : 'days'})
            </span>
          )}
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeader}>WINE DETAILS</div>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>TYPE</div>
            <div className={styles.detailValue}>{wine.wine_type.toUpperCase()}</div>
          </div>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>STATUS</div>
            <div className={styles.detailValue}>{formatWineStatus(wine.status)}</div>
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

      {isBlend ? (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            BLEND VARIETIES
            <span className={styles.sectionHeaderBadge}>
              (Multi-Vintage Blend)
            </span>
          </div>
          <div className={styles.flexColumnGap}>
            {(wine.blend_components as Array<{ vintage_id: string; percentage: number }>).map((variety, index) => {
              const varietyVintage = allVintagesData.find(v => v.id === variety.vintage_id);
              return (
                <div key={index} className={styles.blendVarietyCard}>
                  <div>
                    <div className={styles.blendVarietyName}>
                      {varietyVintage ? `${varietyVintage.vintage_year} ${varietyVintage.variety}` : 'Unknown Vintage'}
                    </div>
                    {varietyVintage?.grape_source === 'purchased' && (
                      <div className={styles.blendVarietySource}>
                        Purchased{varietyVintage.supplier_name ? ` from ${varietyVintage.supplier_name}` : ''}
                      </div>
                    )}
                  </div>
                  <div className={styles.blendVarietyPercentage}>
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
            <span className={styles.sectionHeaderBadge}>
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

      {latestMeasurement && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            LATEST MEASUREMENTS
            <span className={styles.sectionHeaderDate}>
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

      {expandedStageHistory.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>STAGE HISTORY</div>
          <div className={styles.flexColumnGap}>
            {expandedStageHistory.map((stage) => {
              const isCurrentStage = !stage.completed_at;
              return (
                <div
                  key={stage.id}
                  className={`${styles.stageHistoryCard} ${isCurrentStage ? styles.stageHistoryCardCurrent : ''} ${stage.isSkippedPlaceholder ? styles.stageHistoryCardSkipped : ''}`}
                >
                  <div className={styles.stageHistoryHeader}>
                    <div className={`${styles.stageHistoryTitle} ${isCurrentStage ? styles.stageHistoryTitleCurrent : ''} ${stage.isSkippedPlaceholder ? styles.stageHistoryTitleSkipped : ''}`}>
                      {formatStage(stage.stage)}
                    </div>
                    <div className={styles.stageHistoryStatus}>
                      {isCurrentStage ? (
                        <div className={styles.stageHistoryStatusInProgress}>IN PROGRESS</div>
                      ) : stage.skipped ? (
                        <div className={styles.stageHistoryStatusSkipped}>SKIPPED</div>
                      ) : (
                        <div className={styles.stageHistoryStatusComplete}>COMPLETE ✓</div>
                      )}
                    </div>
                  </div>
                  {!stage.isSkippedPlaceholder && (
                    <div className={styles.stageHistoryBody}>
                      <div className={styles.stageHistoryNotes}>
                        {stage.notes || ''}
                      </div>
                      <div className={styles.stageHistoryDate}>
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
