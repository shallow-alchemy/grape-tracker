import { FiFileText } from 'react-icons/fi';
import { ActionLink } from '../ActionLink';
import { formatDueDate, isOverdue, isDueToday } from './taskHelpers';
import styles from '../../App.module.css';

type Task = {
  id: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  due_date?: number | null;
  completed_at?: number | null;
  skipped?: number | null;
};

type TaskRowProps = {
  task: Task;
  isPending: boolean;
  onComplete: () => void;
  onUndo: () => void;
  onClick?: () => void;
  contextLabel?: string; // e.g., wine name for vintage-level task lists
};

export const TaskRow = ({
  task,
  isPending,
  onComplete,
  onUndo,
  onClick,
  contextLabel,
}: TaskRowProps) => {
  const overdue = isOverdue(task.due_date, task.completed_at, task.skipped ? 1 : 0);
  const dueToday = isDueToday(task.due_date);

  return (
    <div
      className={`${styles.stageHistoryCard} ${overdue && !isPending ? styles.taskCardOverdue : ''} ${isPending ? styles.taskItemPending : ''}`}
      onClick={(e) => {
        if (!isPending && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      style={{ cursor: isPending ? 'default' : onClick ? 'pointer' : 'default' }}
    >
      <div className={styles.stageHistoryHeader}>
        <div className={styles.taskRowTitleGroup}>
          <div className={`${styles.stageHistoryTitle} ${isPending ? styles.taskTextPending : ''}`}>
            {task.name}
          </div>
          {overdue && !isPending && (
            <span className={styles.allTaskBadgeOverdue}>OVERDUE</span>
          )}
        </div>
        {isPending ? (
          <ActionLink onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}>
            Undo
          </ActionLink>
        ) : (
          <ActionLink onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}>
            →
          </ActionLink>
        )}
      </div>
      <div className={styles.stageHistoryBody}>
        {task.description && (
          <div className={`${styles.taskDescriptionClamp} ${isPending ? styles.taskTextPending : ''}`}>
            {task.description}
          </div>
        )}
        <div className={`${styles.allTaskCardMeta} ${isPending ? styles.taskTextPending : ''}`}>
          {contextLabel && (
            <>
              <span className={styles.allTaskMetaSource}>{contextLabel}</span>
              <span className={styles.allTaskMetaSeparator}>•</span>
            </>
          )}
          <span className={dueToday || overdue ? styles.taskDateUrgent : ''}>
            {formatDueDate(task.due_date)}
          </span>
          {task.notes && <FiFileText className={styles.taskHasNotes} size={14} title="Has notes" />}
        </div>
      </div>
    </div>
  );
};
