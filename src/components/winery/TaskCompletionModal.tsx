import { useState } from 'react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import { formatDueDate, isOverdue } from './taskHelpers';
import styles from '../../App.module.css';

type TaskCompletionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  taskId: string;
  taskName: string;
  taskDescription?: string;
  taskNotes?: string;
  dueDate: number;
  currentlySkipped: boolean;
};

export const TaskCompletionModal = ({
  isOpen,
  onClose,
  onSuccess,
  taskId,
  taskName,
  taskDescription,
  taskNotes,
  dueDate,
  currentlySkipped,
}: TaskCompletionModalProps) => {
  const zero = useZero();
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const overdue = isOverdue(dueDate, null, currentlySkipped ? 1 : 0);

  const handleComplete = async (skip: boolean) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const now = Date.now();
      // Append completion notes to existing notes
      const updatedNotes = completionNotes.trim()
        ? (taskNotes ? `${taskNotes}\n\n[${skip ? 'Skipped' : 'Completed'}] ${completionNotes.trim()}` : completionNotes.trim())
        : taskNotes || '';

      await zero.mutate.task.update({
        id: taskId,
        completed_at: (skip ? null : now) as any,
        skipped: skip,
        notes: updatedNotes,
        updated_at: now,
      });

      const message = skip ? `Skipped: ${taskName}` : `Completed: ${taskName}`;
      onSuccess(message);
      onClose();
      setCompletionNotes('');
    } catch (error) {
      setFormError(`Failed to update task: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCompletionNotes('');
      setFormError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={currentlySkipped ? 'SKIPPED TASK' : 'COMPLETE TASK'}
      closeDisabled={isSubmitting}
    >
      <div className={styles.vineForm}>
        <div className={styles.formGroup}>
          <div className={styles.taskCompletionName}>
            {taskName}
          </div>
          <div className={overdue ? styles.taskCompletionDueDateOverdue : styles.taskCompletionDueDate}>
            Due: {formatDueDate(dueDate)}
          </div>
        </div>

        {taskDescription && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DESCRIPTION</label>
            <div className={styles.taskModalScrollableText}>
              {taskDescription}
            </div>
          </div>
        )}

        {taskNotes && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>NOTES</label>
            <div className={styles.taskModalScrollableText}>
              {taskNotes}
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ADD NOTE (OPTIONAL)</label>
          <textarea
            className={styles.formTextarea}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Add a note when completing..."
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        {formError && (
          <div className={styles.formError}>{formError}</div>
        )}

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.modalButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            CANCEL
          </button>
          <button
            type="button"
            className={styles.modalButton}
            onClick={() => handleComplete(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'SKIPPING...' : 'SKIP'}
          </button>
          <button
            type="button"
            className={styles.modalButtonPrimary}
            onClick={() => handleComplete(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'COMPLETING...' : 'COMPLETE'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
