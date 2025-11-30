import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { FiSettings } from 'react-icons/fi';
import { getBackendUrl } from '../../config';
import { myStageHistoryByEntity, myMeasurementsByEntity, myMeasurementAnalysisByMeasurement, myMeasurementAnalyses } from '../../shared/queries';
import { MeasurementChart } from './MeasurementChart';
import { useWines, useVintages } from '../vineyard-hooks';
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
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const allWinesData = useWines();
  const wine = allWinesData.find((w: any) => w.id === wineId);

  const allVintagesData = useVintages();
  const vintage = allVintagesData.find((v: any) => v.id === wine?.vintage_id);

  const isBlend = wine?.blend_components && Array.isArray(wine.blend_components) && wine.blend_components.length > 0;

  const [stageHistoryData] = useQuery(
    myStageHistoryByEntity(user?.id, 'wine', wineId)
  ) as any;
  const lastStageHistoryRef = useRef<any[]>([]);
  if (stageHistoryData && stageHistoryData.length > 0) {
    lastStageHistoryRef.current = stageHistoryData;
  }
  const cachedStageHistory = stageHistoryData && stageHistoryData.length > 0
    ? stageHistoryData
    : lastStageHistoryRef.current;

  const stageHistory = [...cachedStageHistory].sort((a, b) => b.started_at - a.started_at);
  const currentStageHistory = stageHistory.find(s => !s.completed_at);

  const [measurementsData] = useQuery(
    myMeasurementsByEntity(user?.id, 'wine', wineId)
  ) as any;
  const lastMeasurementsRef = useRef<any[]>([]);
  if (measurementsData && measurementsData.length > 0) {
    lastMeasurementsRef.current = measurementsData;
  }
  const cachedMeasurements = measurementsData && measurementsData.length > 0
    ? measurementsData
    : lastMeasurementsRef.current;

  const measurements = [...cachedMeasurements].sort((a, b) => b.date - a.date);
  const latestMeasurement = measurements[0];

  // Query for cached AI analysis for the latest measurement
  const [cachedAnalysisData] = useQuery(
    myMeasurementAnalysisByMeasurement(user?.id, latestMeasurement?.id || '')
  ) as any;

  // Query for all measurement analyses (for chart tooltips)
  const [allAnalysesData] = useQuery(myMeasurementAnalyses(user?.id)) as any;
  const allAnalyses = Array.isArray(allAnalysesData) ? allAnalysesData : [];

  // Track Zero sync state: undefined = still syncing, [] = synced but no data
  const analysisCacheSynced = cachedAnalysisData !== undefined;
  const hasCachedAnalysis = Array.isArray(cachedAnalysisData) && cachedAnalysisData.length > 0;

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary: string;
    metrics: Array<{ name: string; value: number | null; status: string; analysis: string }>;
    projections: string | null;
    recommendations: string[];
  } | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  // Load cached analysis from Zero when available
  useEffect(() => {
    if (hasCachedAnalysis && !aiAnalysis) {
      const cached = cachedAnalysisData[0];
      setAiAnalysis({
        summary: cached.summary,
        metrics: cached.metrics || [],
        projections: cached.projections || null,
        recommendations: cached.recommendations || [],
      });
    }
  }, [hasCachedAnalysis, cachedAnalysisData, aiAnalysis]);

  // Clear analysis when measurement changes
  const lastMeasurementIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (latestMeasurement?.id && latestMeasurement.id !== lastMeasurementIdRef.current) {
      // Measurement changed - clear local state so we load from cache
      if (lastMeasurementIdRef.current !== null) {
        setAiAnalysis(null);
        setAiAnalysisError(null);
      }
      lastMeasurementIdRef.current = latestMeasurement.id;
    }
  }, [latestMeasurement?.id]);

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

  const fetchAiAnalysis = async () => {
    if (!latestMeasurement || !wine || !user?.id) return;

    setAiAnalysisLoading(true);
    setAiAnalysisError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/ai/measurement-guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          measurement_id: latestMeasurement.id,
          wine_name: wine.name,
          variety: vintage?.variety || 'Unknown',
          blend_components: isBlend ? wine.blend_components : null,
          current_stage: wine.current_stage || 'unknown',
          latest_measurement: {
            ph: latestMeasurement.ph,
            ta: latestMeasurement.ta,
            brix: latestMeasurement.brix,
            temperature: latestMeasurement.temperature,
            date: latestMeasurement.date,
            notes: latestMeasurement.notes,
            tasting_notes: latestMeasurement.tasting_notes,
          },
          previous_measurements: measurements.slice(1, 6).map((m: any) => ({
            ph: m.ph,
            ta: m.ta,
            brix: m.brix,
            temperature: m.temperature,
            date: m.date,
            notes: m.notes,
            tasting_notes: m.tasting_notes,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const data = await response.json();
      setAiAnalysis(data);
      // Wait a moment for Zero to sync the cached analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      setAiAnalysisError('Failed to get AI analysis. Please try again.');
      console.error('AI analysis error:', err);
    } finally {
      setAiAnalysisLoading(false);
    }
  };

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

      <div className={styles.wineDetailsRow}>
        <div className={styles.wineDetailsMain}>
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
              {!isBlend && vintage && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>YEAR</div>
                  <div className={styles.detailValue}>{vintage.vintage_year}</div>
                </div>
              )}
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{isBlend ? 'VARIETIES' : 'VARIETY'}</div>
                <div className={styles.detailValue}>
                  {isBlend ? (
                    (wine.blend_components as Array<{ vintage_id: string; percentage: number }>)
                      .map((comp) => {
                        const v = allVintagesData.find((vint: any) => vint.id === comp.vintage_id);
                        return v ? `${v.variety} (${comp.percentage}%)` : `Unknown (${comp.percentage}%)`;
                      })
                      .join(', ')
                  ) : (
                    vintage?.variety || '—'
                  )}
                </div>
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
        </div>

        {aiAnalysis?.projections && (
          <div className={styles.aiOutlookPanel}>
            <div className={styles.aiOutlookPanelHeader}>PROJECTION</div>
            <div className={styles.aiOutlookPanelText}>{aiAnalysis.projections}</div>
          </div>
        )}
      </div>

      {/* AI Recommendations - shown above Latest Measurements */}
      {aiAnalysis && aiAnalysis.recommendations.length > 0 && (
        <div className={styles.aiInsightsSection}>
          <div className={styles.aiInsightsHeader}>
            <span>NEXT STEPS</span>
          </div>
          <ul className={styles.aiInsightList}>
            {aiAnalysis.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
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

          {/* Measurement cards with inline AI analysis */}
          <div className={styles.measurementCards}>
            {latestMeasurement.ph !== null && latestMeasurement.ph !== undefined && (
              <div className={styles.measurementCard}>
                <div className={styles.measurementCardHeader}>
                  <div className={styles.measurementCardLabel}>PH</div>
                  <div className={styles.measurementCardValue}>{latestMeasurement.ph}</div>
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'ph');
                    if (!metric) return null;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        {metric.status.toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                {aiAnalysis && (() => {
                  const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'ph');
                  if (!metric) return null;
                  return <div className={styles.measurementCardAnalysis}>{metric.analysis}</div>;
                })()}
              </div>
            )}

            {latestMeasurement.ta !== null && latestMeasurement.ta !== undefined && (
              <div className={styles.measurementCard}>
                <div className={styles.measurementCardHeader}>
                  <div className={styles.measurementCardLabel}>TA</div>
                  <div className={styles.measurementCardValue}>{latestMeasurement.ta} G/L</div>
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'ta');
                    if (!metric) return null;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        {metric.status.toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                {aiAnalysis && (() => {
                  const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'ta');
                  if (!metric) return null;
                  return <div className={styles.measurementCardAnalysis}>{metric.analysis}</div>;
                })()}
              </div>
            )}

            {latestMeasurement.brix !== null && latestMeasurement.brix !== undefined && (
              <div className={styles.measurementCard}>
                <div className={styles.measurementCardHeader}>
                  <div className={styles.measurementCardLabel}>BRIX</div>
                  <div className={styles.measurementCardValue}>{latestMeasurement.brix}°</div>
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'brix');
                    if (!metric) return null;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        {metric.status.toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                {aiAnalysis && (() => {
                  const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'brix');
                  if (!metric) return null;
                  return <div className={styles.measurementCardAnalysis}>{metric.analysis}</div>;
                })()}
              </div>
            )}

            {latestMeasurement.temperature !== null && latestMeasurement.temperature !== undefined && (
              <div className={styles.measurementCard}>
                <div className={styles.measurementCardHeader}>
                  <div className={styles.measurementCardLabel}>TEMP</div>
                  <div className={styles.measurementCardValue}>{latestMeasurement.temperature}°F</div>
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'temperature');
                    if (!metric) return null;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        {metric.status.toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                {aiAnalysis && (() => {
                  const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'temperature');
                  if (!metric) return null;
                  return <div className={styles.measurementCardAnalysis}>{metric.analysis}</div>;
                })()}
              </div>
            )}
          </div>

          {/* AI Analysis Button - only show after Zero syncs and confirms no cached analysis */}
          {!aiAnalysis && analysisCacheSynced && !hasCachedAnalysis && (
            <button
              type="button"
              className={styles.aiAnalysisButton}
              onClick={fetchAiAnalysis}
              disabled={aiAnalysisLoading}
            >
              {aiAnalysisLoading ? 'ANALYZING...' : '✨ GET AI ANALYSIS'}
            </button>
          )}

          {aiAnalysisError && (
            <div className={styles.errorMessage}>{aiAnalysisError}</div>
          )}

          {/* Measurement History Chart */}
          {measurements.length > 0 && (
            <>
              <div className={styles.sectionHeader} style={{ marginTop: 'var(--spacing-md)' }}>
                MEASUREMENT HISTORY
              </div>
              <MeasurementChart measurements={measurements} analyses={allAnalyses} />
            </>
          )}
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
