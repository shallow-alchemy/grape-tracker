import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { FiSettings, FiCheck, FiAlertTriangle, FiX } from 'react-icons/fi';
import { useZero } from '../../contexts/ZeroContext';
import { getBackendUrl } from '../../config';
import { myStageHistoryByEntity, myMeasurementsByEntity, myMeasurementAnalysisByMeasurement, myMeasurementAnalyses, myTasksByEntity } from '../../shared/queries';
import { MeasurementChart } from './MeasurementChart';
import { useWines, useVintages } from '../vineyard-hooks';
import { EditWineModal } from './EditWineModal';
import { StageTransitionModal } from './StageTransitionModal';
import { AddMeasurementModal } from './AddMeasurementModal';
import { getStagesForWineType, type WineType } from './stages';
import { formatDueDate, isDueToday, isOverdue } from './taskHelpers';
import { TaskCompletionModal } from './TaskCompletionModal';
import { CreateTaskModal } from './CreateTaskModal';
import { useDebouncedCompletion } from '../../hooks/useDebouncedCompletion';
import { ActionLink } from '../ActionLink';
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
  const zero = useZero();
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

  // Query for tasks to check which recommendations have been converted
  const [tasksData] = useQuery(myTasksByEntity(user?.id, 'wine', wineId)) as any;
  const existingTaskDescriptions = new Set(
    (tasksData || []).map((t: any) => t.description)
  );

  // Track Zero sync state: undefined = still syncing, [] = synced but no data
  const analysisCacheSynced = cachedAnalysisData !== undefined;
  const hasCachedAnalysis = Array.isArray(cachedAnalysisData) && cachedAnalysisData.length > 0;

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const { removedTaskId, startCompletion, undoCompletion, isPending } = useDebouncedCompletion(
    async (taskId) => {
      await zero.mutate.task.update({
        id: taskId,
        completed_at: Date.now(),
      });
    }
  );

  // Inline measurement editing state
  const [editingField, setEditingField] = useState<'ph' | 'ta' | 'brix' | 'temperature' | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary: string;
    metrics: Array<{ name: string; value: number | null; status: string; analysis: string }>;
    projections: string | null;
    recommendations: Array<{ title: string; description: string }>;
  } | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  // Fetch AI analysis for current measurement
  const fetchAiAnalysis = useCallback(async () => {
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
          wine_type: wine.wine_type || 'red',
          variety: vintage?.variety || 'Unknown',
          blend_components: isBlend ? wine.blend_components : null,
          current_stage: wine.current_stage || 'unknown',
          days_in_stage: currentStageHistory
            ? Math.floor((latestMeasurement.date - currentStageHistory.started_at) / (1000 * 60 * 60 * 24))
            : null,
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
    } catch (err) {
      setAiAnalysisError('Failed to get AI analysis. Please try again.');
      console.error('AI analysis error:', err);
    } finally {
      setAiAnalysisLoading(false);
    }
  }, [latestMeasurement, wine, user?.id, vintage?.variety, isBlend, measurements, currentStageHistory]);

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

  // Track measurement changes and auto-trigger AI analysis
  const lastMeasurementIdRef = useRef<string | null>(null);
  const hasFetchedRef = useRef<Set<string>>(new Set());

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

  // Auto-fetch AI analysis when we have a measurement but no cached analysis
  useEffect(() => {
    if (
      latestMeasurement?.id &&
      analysisCacheSynced &&
      !hasCachedAnalysis &&
      !aiAnalysis &&
      !aiAnalysisLoading &&
      !hasFetchedRef.current.has(latestMeasurement.id)
    ) {
      hasFetchedRef.current.add(latestMeasurement.id);
      fetchAiAnalysis();
    }
  }, [latestMeasurement?.id, analysisCacheSynced, hasCachedAnalysis, aiAnalysis, aiAnalysisLoading, fetchAiAnalysis]);

  // Handle inline measurement edit
  const startEditing = (field: 'ph' | 'ta' | 'brix' | 'temperature', currentValue: number) => {
    setEditingField(field);
    setEditValue(currentValue.toString());
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveMeasurementEdit = async () => {
    if (!editingField || !latestMeasurement) return;

    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) {
      cancelEditing();
      return;
    }

    // Check if value actually changed
    if (latestMeasurement[editingField] === newValue) {
      cancelEditing();
      return;
    }

    try {
      // Update the measurement
      await zero.mutate.measurement.update({
        id: latestMeasurement.id,
        [editingField]: newValue,
      });

      // Delete cached AI analysis to trigger re-analysis
      if (cachedAnalysisData?.[0]?.id) {
        await zero.mutate.measurement_analysis.delete({ id: cachedAnalysisData[0].id });
      }

      // Clear local state to trigger re-fetch
      setAiAnalysis(null);
      hasFetchedRef.current.delete(latestMeasurement.id);

      cancelEditing();
    } catch (err) {
      console.error('Failed to update measurement:', err);
      setAiAnalysisError('Failed to update measurement');
      cancelEditing();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveMeasurementEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Create a task from an AI recommendation
  const createTaskFromRecommendation = async (recommendation: { title: string; description: string }) => {
    if (!user?.id || !wine) return;

    try {
      const now = Date.now();
      // Set due date to 3 days from now
      const dueDate = now + (3 * 24 * 60 * 60 * 1000);

      await zero.mutate.task.insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        task_template_id: null as any,
        entity_type: 'wine',
        entity_id: wineId,
        stage: wine.current_stage,
        name: recommendation.title,
        description: recommendation.description,
        due_date: dueDate,
        completed_at: null as any,
        completed_by: '',
        notes: '',
        skipped: false,
        created_at: now,
        updated_at: now,
      });

      setSuccessMessage('Task created!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to create task:', error);
      setAiAnalysisError('Failed to create task');
    }
  };

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
    const wineStages = getStagesForWineType((wine?.wine_type || 'red') as WineType);

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
          <button className={styles.actionButton} onClick={() => setShowMeasurementModal(true)}>
            ADD MEASUREMENT
          </button>
          <button className={styles.gearButton} onClick={() => setIsEditModalOpen(true)}>
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeader}>CURRENT STAGE</div>
        <div className={styles.currentStageDisplay}>
          {formatStage(wine.current_stage)}
          {daysInStage !== null && (
            <span className={styles.currentStageDays}>
              ({daysInStage} {daysInStage === 1 ? 'day' : 'days'})
            </span>
          )}
          <ActionLink onClick={() => setShowStageModal(true)}>
            →
          </ActionLink>
        </div>
      </div>

      <div className={styles.wineDetailsRow}>
        <div className={styles.wineDetailsMain}>
          <div className={styles.detailSection}>
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

        {/* Next Steps - actionable list next to wine details */}
        <div className={styles.nextStepsPanel}>
          <div className={styles.nextStepsPanelHeader}>NEXT STEPS</div>
          <div className={styles.nextStepsPanelText}>
            {aiAnalysisLoading ? (
              <span className={styles.aiOutlookLoading}>Analyzing measurements...</span>
            ) : aiAnalysis && aiAnalysis.recommendations.length > 0 ? (
              <ul className={styles.nextStepsList}>
                {aiAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx}>
                    {rec.description}
                    {existingTaskDescriptions.has(rec.description) ? (
                      <span className={styles.taskCreatedCheck}>
                        <FiCheck size={14} /> Task created
                      </span>
                    ) : (
                      <button
                        className={styles.makeTaskLink}
                        onClick={() => createTaskFromRecommendation(rec)}
                      >
                        Make a task →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : !latestMeasurement ? (
              <span className={styles.nextStepsEmpty}>Add measurements</span>
            ) : (
              <span className={styles.nextStepsEmpty}>Waiting for analysis...</span>
            )}
          </div>
        </div>
      </div>

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
                  {editingField === 'ph' ? (
                    <input
                      type="number"
                      step="0.01"
                      className={styles.measurementCardInput}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveMeasurementEdit}
                      onKeyDown={handleEditKeyDown}
                      autoFocus
                    />
                  ) : (
                    <div
                      className={styles.measurementCardValueEditable}
                      onClick={() => startEditing('ph', latestMeasurement.ph!)}
                    >
                      {latestMeasurement.ph}
                    </div>
                  )}
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'ph');
                    if (!metric) return null;
                    const StatusIcon = metric.status === 'good' ? FiCheck : metric.status === 'warning' ? FiAlertTriangle : FiX;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        <StatusIcon size={14} />
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
                  {editingField === 'ta' ? (
                    <input
                      type="number"
                      step="0.1"
                      className={styles.measurementCardInput}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveMeasurementEdit}
                      onKeyDown={handleEditKeyDown}
                      autoFocus
                    />
                  ) : (
                    <div
                      className={styles.measurementCardValueEditable}
                      onClick={() => startEditing('ta', latestMeasurement.ta!)}
                    >
                      {latestMeasurement.ta} G/L
                    </div>
                  )}
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'ta');
                    if (!metric) return null;
                    const StatusIcon = metric.status === 'good' ? FiCheck : metric.status === 'warning' ? FiAlertTriangle : FiX;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        <StatusIcon size={14} />
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
                  {editingField === 'brix' ? (
                    <input
                      type="number"
                      step="0.1"
                      className={styles.measurementCardInput}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveMeasurementEdit}
                      onKeyDown={handleEditKeyDown}
                      autoFocus
                    />
                  ) : (
                    <div
                      className={styles.measurementCardValueEditable}
                      onClick={() => startEditing('brix', latestMeasurement.brix!)}
                    >
                      {latestMeasurement.brix}°
                    </div>
                  )}
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'brix');
                    if (!metric) return null;
                    const StatusIcon = metric.status === 'good' ? FiCheck : metric.status === 'warning' ? FiAlertTriangle : FiX;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        <StatusIcon size={14} />
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
                  {editingField === 'temperature' ? (
                    <input
                      type="number"
                      step="1"
                      className={styles.measurementCardInput}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveMeasurementEdit}
                      onKeyDown={handleEditKeyDown}
                      autoFocus
                    />
                  ) : (
                    <div
                      className={styles.measurementCardValueEditable}
                      onClick={() => startEditing('temperature', latestMeasurement.temperature!)}
                    >
                      {latestMeasurement.temperature}°F
                    </div>
                  )}
                  {aiAnalysis && (() => {
                    const metric = aiAnalysis.metrics.find(m => m.name.toLowerCase() === 'temperature');
                    if (!metric) return null;
                    const StatusIcon = metric.status === 'good' ? FiCheck : metric.status === 'warning' ? FiAlertTriangle : FiX;
                    return (
                      <span className={`${styles.aiMetricBadge} ${styles[`aiMetricBadge${metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}`]}`}>
                        <StatusIcon size={14} />
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

          {aiAnalysisError && (
            <div className={styles.errorMessage}>{aiAnalysisError}</div>
          )}

          {/* Measurement History Chart with Projection */}
          {measurements.length > 0 && (
            <>
              <div className={styles.sectionHeader} style={{ marginTop: 'var(--spacing-md)' }}>
                MEASUREMENT HISTORY
              </div>
              <div className={styles.chartWithProjection}>
                <div className={styles.chartMain}>
                  <MeasurementChart measurements={measurements} analyses={allAnalyses} />
                </div>
                <div className={styles.chartProjectionPanel}>
                  <div className={styles.chartProjectionHeader}>PROJECTION</div>
                  <div className={styles.chartProjectionText}>
                    {aiAnalysisLoading ? (
                      <span className={styles.aiOutlookLoading}>Analyzing...</span>
                    ) : aiAnalysis?.projections ? (
                      aiAnalysis.projections
                    ) : (
                      <span className={styles.aiOutlookEmpty}>Waiting for analysis...</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {(() => {
        const activeTasks = (tasksData || [])
          .filter((t: any) => !t.completed_at && !t.skipped && t.id !== removedTaskId);
        return (
          <div className={styles.detailSection}>
            <div className={styles.sectionHeaderWithAction}>
              <div className={styles.sectionHeader}>TASKS ({activeTasks.length})</div>
              <ActionLink onClick={() => setShowCreateTaskModal(true)}>
                + Add
              </ActionLink>
            </div>
            {activeTasks.length > 0 ? (
              <div className={styles.flexColumnGap}>
                {activeTasks.sort((a: any, b: any) => a.due_date - b.due_date).map((task: any) => {
                  const overdue = isOverdue(task.due_date, task.completed_at, task.skipped ? 1 : 0);
                  const dueToday = isDueToday(task.due_date);
                  const taskPending = isPending(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`${styles.stageHistoryCard} ${overdue && !taskPending ? styles.taskCardOverdue : ''} ${taskPending ? styles.taskItemPending : ''}`}
                      onClick={() => !taskPending && setSelectedTask(task)}
                      style={{ cursor: taskPending ? 'default' : 'pointer' }}
                    >
                      <div className={styles.stageHistoryHeader}>
                        <div className={`${styles.stageHistoryTitle} ${taskPending ? styles.taskTextPending : ''}`}>
                          {task.name}
                        </div>
                        {taskPending ? (
                          <ActionLink onClick={(e) => {
                            e.stopPropagation();
                            undoCompletion(task.id);
                          }}>
                            Undo
                          </ActionLink>
                        ) : (
                          <ActionLink onClick={(e) => {
                            e.stopPropagation();
                            startCompletion(task.id);
                          }}>
                            →
                          </ActionLink>
                        )}
                      </div>
                      <div className={styles.stageHistoryBody}>
                        {task.description && (
                          <div className={`${styles.taskDescriptionClamp} ${taskPending ? styles.taskTextPending : ''}`}>
                            {task.description}
                          </div>
                        )}
                        <div className={`${styles.taskMetaRow} ${taskPending ? styles.taskTextPending : ''}`}>
                          <span className={dueToday || overdue ? styles.taskDateUrgent : ''}>
                            {formatDueDate(task.due_date)}
                          </span>
                          {task.notes && <span className={styles.taskHasNotes}>• Has note</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.tasksEmptyState}>No active tasks</div>
            )}
          </div>
        );
      })()}

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

      {selectedTask && (
        <TaskCompletionModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
          taskId={selectedTask.id}
          taskName={selectedTask.name}
          taskDescription={selectedTask.description}
          taskNotes={selectedTask.notes}
          dueDate={selectedTask.due_date}
          currentlySkipped={selectedTask.skipped}
        />
      )}

      {wine && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
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
