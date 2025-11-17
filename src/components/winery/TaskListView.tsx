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

  // Fetch all tasks for this entity
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

  // Categorize tasks
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
        style={{
          padding: 'var(--spacing-md)',
          border: `1px solid ${overdue ? 'var(--color-error)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          backgroundColor: completed || skipped ? 'var(--color-surface)' : 'var(--color-surface-elevated)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => setSelectedTask(task)}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--spacing-xs)',
        }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--font-size-sm)',
            color: completed || skipped ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            textDecoration: completed || skipped ? 'line-through' : 'none',
          }}>
            {task.name}
          </div>
          {overdue && (
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-error)',
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
            }}>
              OVERDUE
            </div>
          )}
          {completed && (
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-success)',
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
            }}>
              COMPLETED
            </div>
          )}
          {skipped && (
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
            }}>
              SKIPPED
            </div>
          )}
        </div>

        {task.description && (
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            marginBottom: 'var(--spacing-xs)',
          }}>
            {task.description}
          </div>
        )}

        <div style={{
          fontSize: 'var(--font-size-xs)',
          color: overdue ? 'var(--color-error)' : 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
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

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader} style={{ color: 'var(--color-error)' }}>
            OVERDUE ({overdueTasks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            UPCOMING ({upcomingTasks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {upcomingTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            COMPLETED ({completedTasks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {completedTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Skipped Tasks */}
      {skippedTasks.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            SKIPPED ({skippedTasks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {skippedTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* No Tasks */}
      {tasksData.length === 0 && (
        <div className={styles.detailSection}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            padding: 'var(--spacing-xl)',
          }}>
            No tasks yet. Create one or advance the stage to generate tasks automatically.
          </div>
        </div>
      )}

      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {/* Task Completion Modal */}
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

      {/* Create Task Modal */}
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
