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
  taskDescription: string;
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
  dueDate,
  currentlySkipped,
}: TaskCompletionModalProps) => {
  const zero = useZero();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const overdue = isOverdue(dueDate, null, currentlySkipped ? 1 : 0);

  const handleComplete = async (skip: boolean) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const now = Date.now();
      await zero.mutate.task.update({
        id: taskId,
        completed_at: (skip ? null : now) as any,
        skipped: skip,
        notes: notes.trim(),
        updated_at: now,
      });

      const message = skip ? `Skipped: ${taskName}` : `Completed: ${taskName}`;
      onSuccess(message);
      onClose();
      setNotes('');
    } catch (error) {
      setFormError(`Failed to update task: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNotes('');
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
        {/* Task Info */}
        <div className={styles.formGroup}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-xs)',
          }}>
            {taskName}
          </div>
          {taskDescription && (
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-sm)',
            }}>
              {taskDescription}
            </div>
          )}
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-sm)',
            color: overdue ? 'var(--color-error)' : 'var(--color-text-secondary)',
          }}>
            Due: {formatDueDate(dueDate)}
          </div>
        </div>

        {/* Notes */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
          <textarea
            className={styles.formTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this task..."
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {formError && (
          <div className={styles.formError}>{formError}</div>
        )}

        {/* Actions */}
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
