import { useState } from 'react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import type { EntityType } from './stages';
import styles from '../../App.module.css';

type CreateTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  entityType: EntityType;
  entityId: string;
  currentStage: string;
};

export const CreateTaskModal = ({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  entityId,
  currentStage,
}: CreateTaskModalProps) => {
  const zero = useZero();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const dueDateStr = formData.get('dueDate') as string;
      const notes = formData.get('notes') as string;

      if (!name.trim()) {
        setFormErrors({ name: 'Task name is required' });
        setIsSubmitting(false);
        return;
      }

      const now = Date.now();
      const dueDate = dueDateStr ? new Date(dueDateStr).getTime() : now;

      await zero.mutate.task.insert({
        id: crypto.randomUUID(),
        task_template_id: null as any,
        entity_type: entityType,
        entity_id: entityId,
        stage: currentStage,
        name: name.trim(),
        description: description.trim(),
        due_date: dueDate,
        completed_at: null as any,
        completed_by: '',
        notes: notes.trim(),
        skipped: false,
        created_at: now,
        updated_at: now,
      });

      onSuccess(`Created task: ${name.trim()}`);
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      setFormErrors({ submit: `Failed to create task: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormErrors({});
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="CREATE TASK"
      closeDisabled={isSubmitting}
    >
      <form className={styles.vineForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="task-name" className={styles.formLabel}>TASK NAME *</label>
          <input
            id="task-name"
            type="text"
            name="name"
            className={styles.formInput}
            placeholder="Task name..."
            disabled={isSubmitting}
            required
          />
          {formErrors.name && (
            <div className={styles.formError}>{formErrors.name}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="task-description" className={styles.formLabel}>DESCRIPTION (OPTIONAL)</label>
          <textarea
            id="task-description"
            name="description"
            className={styles.formTextarea}
            placeholder="Task description..."
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="task-due-date" className={styles.formLabel}>DUE DATE (OPTIONAL)</label>
          <input
            id="task-due-date"
            type="date"
            name="dueDate"
            className={styles.formInput}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="task-notes" className={styles.formLabel}>NOTES (OPTIONAL)</label>
          <textarea
            id="task-notes"
            name="notes"
            className={styles.formTextarea}
            placeholder="Additional notes..."
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        {formErrors.submit && (
          <div className={styles.formError}>{formErrors.submit}</div>
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
            type="submit"
            className={styles.modalButtonPrimary}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'CREATING...' : 'CREATE TASK'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
