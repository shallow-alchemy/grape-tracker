import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import { TaskCompletionModal } from './TaskCompletionModal';
import { CreateTaskModal } from './CreateTaskModal';
import { formatDueDate, isOverdue } from './taskHelpers';
import type { EntityType } from './stages';
import styles from '../../App.module.css';

type TaskListViewProps = {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  currentStage: string;
  onBack: () => void;
};

export const TaskListView = ({
  entityType,
  entityId,
  entityName,
  currentStage,
  onBack,
}: TaskListViewProps) => {
  const zero = useZero();

  const [tasksData] = useQuery(
    zero.query.task
      .where('entity_type', entityType)
      .where('entity_id', entityId)
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<typeof tasksData[0] | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const overdueTasks = tasksData.filter(t =>
    isOverdue(t.due_date, t.completed_at, t.skipped ? 1 : 0)
  );

  const upcomingTasks = tasksData.filter(t =>
    !t.completed_at && !t.skipped && t.due_date >= Date.now()
  );

  const completedTasks = tasksData.filter(t =>
    t.completed_at !== null && t.completed_at !== undefined
  );

  const skippedTasks = tasksData.filter(t =>
    t.skipped && !t.completed_at
  );

  const TaskCard = ({ task }: { task: typeof tasksData[0] }) => {
    const overdue = isOverdue(task.due_date, task.completed_at, task.skipped ? 1 : 0);
    const completed = task.completed_at !== null && task.completed_at !== undefined;
    const skipped = task.skipped && !completed;

    return (
      <div
        key={task.id}
        className={`${styles.taskCard} ${overdue ? styles.taskCardOverdue : ''} ${completed || skipped ? styles.taskCardCompleted : ''}`}
        onClick={() => setSelectedTask(task)}
      >
        <div className={styles.taskCardHeader}>
          <div className={`${styles.taskCardTitle} ${completed || skipped ? styles.taskCardTitleMuted : ''}`}>
            {task.name}
          </div>
          {overdue && (
            <div className={`${styles.taskStatusBadge} ${styles.taskStatusOverdue}`}>
              OVERDUE
            </div>
          )}
          {completed && (
            <div className={styles.completedStatusRow}>
              <div className={`${styles.taskStatusBadge} ${styles.taskStatusCompleted}`}>
                COMPLETED
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await zero.mutate.task.update({
                    id: task.id,
                    completed_at: null as any,
                  });
                  showSuccessMessage('Task marked as incomplete');
                }}
                className={styles.taskCompleteButton}
              >
                Undo →
              </button>
            </div>
          )}
          {skipped && (
            <div className={`${styles.taskStatusBadge} ${styles.taskStatusSkipped}`}>
              SKIPPED
            </div>
          )}
        </div>

        {task.description && (
          <div className={styles.taskCardDescription}>
            {task.description}
          </div>
        )}

        <div className={`${styles.taskCardDueDate} ${overdue ? styles.taskCardDueDateOverdue : ''}`}>
          Due: {formatDueDate(task.due_date)}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <button className={styles.backButton} onClick={onBack}>
          ← BACK
        </button>
        <div className={styles.vineyardTitle}>
          TASKS: {entityName}
        </div>
        <button
          className={styles.actionButton}
          onClick={() => setShowCreateModal(true)}
        >
          CREATE TASK
        </button>
      </div>

      {overdueTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={`${styles.sectionHeader} ${styles.sectionHeaderError}`}>
            OVERDUE ({overdueTasks.length})
          </div>
          <div className={styles.tasksListContainer}>
            {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            UPCOMING ({upcomingTasks.length})
          </div>
          <div className={styles.tasksListContainer}>
            {upcomingTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            COMPLETED ({completedTasks.length})
          </div>
          <div className={styles.tasksListContainer}>
            {completedTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {skippedTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            SKIPPED ({skippedTasks.length})
          </div>
          <div className={styles.tasksListContainer}>
            {skippedTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {tasksData.length === 0 && (
        <div className={styles.detailSection}>
          <div className={styles.tasksEmptyState}>
            No tasks yet. Create one or advance the stage to generate tasks automatically.
          </div>
        </div>
      )}

      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {selectedTask && (
        <TaskCompletionModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSuccess={showSuccessMessage}
          taskId={selectedTask.id}
          taskName={selectedTask.name}
          taskDescription={selectedTask.description}
          dueDate={selectedTask.due_date}
          currentlySkipped={selectedTask.skipped}
        />
      )}

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={showSuccessMessage}
        entityType={entityType}
        entityId={entityId}
        currentStage={currentStage}
      />
    </div>
  );
};
