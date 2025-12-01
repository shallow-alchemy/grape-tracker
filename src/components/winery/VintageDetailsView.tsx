import { useState, useRef } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { FiSettings } from 'react-icons/fi';
import { myMeasurementsByEntity, myStageHistoryByEntity, myTasksByEntity } from '../../shared/queries';
import { formatDueDate, isDueToday, isOverdue } from './taskHelpers';
import { useZero } from '../../contexts/ZeroContext';
import { useVintages, useWines } from '../vineyard-hooks';
import { EditVintageModal } from './EditVintageModal';
import { AddWineModal } from './AddWineModal';
import { StageTransitionModal } from './StageTransitionModal';
import { formatStage, getStagesForEntity } from './stages';
import { TaskCompletionModal } from './TaskCompletionModal';
import { CreateTaskModal } from './CreateTaskModal';
import { ActionLink } from '../ActionLink';
import { useDebouncedCompletion } from '../../hooks/useDebouncedCompletion';
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
  const { user } = useUser();
  const zero = useZero();
  const allVintagesData = useVintages();
  const vintage = allVintagesData.find((v: any) => v.id === vintageId);

  const allWinesData = useWines();

  const wines = allWinesData.filter((wine: any) => {
    if (wine.vintage_id === vintageId) {
      return true;
    }

    if (wine.blend_components && Array.isArray(wine.blend_components)) {
      return wine.blend_components.some((component: any) => component.vintage_id === vintageId);
    }

    return false;
  }).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const [allMeasurementsData] = useQuery(
    myMeasurementsByEntity(user?.id, 'vintage', vintageId)
  ) as any;
  const lastMeasurementsRef = useRef<any[]>([]);
  if (allMeasurementsData && allMeasurementsData.length > 0) {
    lastMeasurementsRef.current = allMeasurementsData;
  }
  const cachedMeasurements = allMeasurementsData && allMeasurementsData.length > 0
    ? allMeasurementsData
    : lastMeasurementsRef.current;
  const measurementsData = cachedMeasurements.filter((m: any) => m.stage === 'harvest');
  const harvestMeasurement = measurementsData[0];

  const [stageHistoryData] = useQuery(
    myStageHistoryByEntity(user?.id, 'vintage', vintageId)
  ) as any;
  const lastStageHistoryRef = useRef<any[]>([]);
  if (stageHistoryData && stageHistoryData.length > 0) {
    lastStageHistoryRef.current = stageHistoryData;
  }
  const cachedStageHistory = stageHistoryData && stageHistoryData.length > 0
    ? stageHistoryData
    : lastStageHistoryRef.current;

  const stageHistory = [...cachedStageHistory].sort((a, b) => b.started_at - a.started_at);

  const [tasksData] = useQuery(
    myTasksByEntity(user?.id, 'vintage', vintageId)
  ) as any;

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
        const currentStageIndex = vintageStages.findIndex(s => s.value === next.stage);
        const nextStageIndex = vintageStages.findIndex(s => s.value === current.stage);

        if (currentStageIndex !== -1 && nextStageIndex !== -1) {
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
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { removedTaskId, startCompletion, undoCompletion, isPending } = useDebouncedCompletion(
    async (taskId) => {
      await zero.mutate.task.update({
        id: taskId,
        completed_at: Date.now(),
      });
    }
  );

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (!vintage) {
    return (
      <div className={styles.paddingContainer}>
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

  return (
    <div className={styles.vineyardContainer}>
      <button className={styles.backButton} onClick={onBack}>
        ← BACK TO VINTAGES
      </button>
      <div className={styles.vineyardHeader}>
        <div className={styles.vineyardTitle}>
          {vintage.variety}, {vintage.vintage_year} Vintage{vintage.grape_source === 'purchased' && vintage.supplier_name ? ` from ${vintage.supplier_name}` : ''}
        </div>
        <div className={styles.actionButtonGroup}>
          <button className={styles.actionButton} onClick={() => setShowAddWineModal(true)}>
            CREATE WINE
          </button>
          <button className={styles.gearButton} onClick={() => setShowEditModal(true)}>
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeader}>CURRENT STAGE</div>
        <div className={styles.currentStageDisplay}>
          {formatStage(vintage.current_stage)}
          <ActionLink onClick={() => setShowStageModal(true)}>
            →
          </ActionLink>
        </div>
      </div>

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

      {vintage.notes && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>NOTES</div>
          <div className={styles.notesText}>
            {vintage.notes}
          </div>
        </div>
      )}

      {wines.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            WINES FROM THIS VINTAGE ({wines.length})
          </div>
          <div className={styles.flexColumnGap}>
            {wines.map((wine: any) => {
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
                  className={styles.wineCard}
                >
                  <div>
                    <div className={styles.wineCardHeader}>
                      {wine.name}
                      <span className={styles.wineCardBadge}>
                        {isBlend ? 'BLEND' : 'VARIETAL'}
                      </span>
                    </div>
                    <div className={styles.wineCardSubtext}>
                      {wine.wine_type.toUpperCase()} • {wine.current_volume_gallons} GAL • {formatWineStatus(wine.status)}
                    </div>
                  </div>
                  <div className={styles.wineCardArrow}>
                    →
                  </div>
                </div>
              );
            })}
          </div>
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

      {selectedTask && (
        <TaskCompletionModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSuccess={showSuccessMessage}
          taskId={selectedTask.id}
          taskName={selectedTask.name}
          taskDescription={selectedTask.description}
          taskNotes={selectedTask.notes}
          dueDate={selectedTask.due_date}
          currentlySkipped={selectedTask.skipped}
        />
      )}

      {vintage && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          onSuccess={showSuccessMessage}
          entityType="vintage"
          entityId={vintageId}
          currentStage={vintage.current_stage}
        />
      )}
    </div>
  );
};
