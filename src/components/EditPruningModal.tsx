import { useState } from 'react';
import { Modal } from './Modal';
import { useZero } from '../contexts/ZeroContext';
import { type PruningLogData } from './vineyard-hooks';
import styles from '../App.module.css';

const PRUNING_TYPE_OPTIONS = [
  { value: 'dormant', label: 'Dormant (Winter)', description: 'Main annual pruning when vine is dormant' },
  { value: 'summer', label: 'Summer', description: 'Canopy management, hedging, shoot thinning' },
  { value: 'corrective', label: 'Corrective', description: 'Removing dead/diseased wood, fixing problems' },
  { value: 'training', label: 'Training', description: 'Establishing vine structure in young vines' },
];

type EditPruningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  pruningLog: PruningLogData | null;
};

export const EditPruningModal = ({
  isOpen,
  onClose,
  onSuccess,
  pruningLog,
}: EditPruningModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const zero = useZero();

  const handleClose = () => {
    setFormErrors({});
    setIsSubmitting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!pruningLog) return;

    setIsSubmitting(true);
    try {
      await zero.mutate.pruning_log.delete({ id: pruningLog.id });
      handleClose();
      onSuccess('Pruning log deleted');
    } catch (error) {
      setFormErrors({ submit: 'Failed to delete pruning log. Please try again.' });
      setIsSubmitting(false);
    }
  };

  if (!pruningLog) return null;

  const formatDateForInput = (timestamp: number): string => {
    return new Date(timestamp).toISOString().split('T')[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="EDIT PRUNING LOG"
      closeDisabled={isSubmitting}
    >
      {showDeleteConfirm ? (
        <div>
          <p className={styles.deleteConfirmText}>
            Are you sure you want to delete this pruning log? This action cannot be undone.
          </p>
          {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.formButtonSecondary}
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'DELETING...' : 'CONFIRM DELETE'}
            </button>
          </div>
        </div>
      ) : (
        <form
          className={styles.vineForm}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            const dateStr = formData.get('date') as string;
            const pruningType = formData.get('pruningType') as string;
            const spursLeftStr = formData.get('spursLeft') as string;
            const canesBeforeStr = formData.get('canesBefore') as string;
            const canesAfterStr = formData.get('canesAfter') as string;
            const notes = formData.get('notes') as string;

            // Validation
            const errors: Record<string, string> = {};
            if (!dateStr) {
              errors.date = 'Date is required';
            }
            if (!pruningType) {
              errors.pruningType = 'Pruning type is required';
            }

            if (Object.keys(errors).length > 0) {
              setFormErrors(errors);
              return;
            }

            setFormErrors({});
            setIsSubmitting(true);

            try {
              await zero.mutate.pruning_log.update({
                id: pruningLog.id,
                date: new Date(dateStr + 'T12:00:00').getTime(),
                pruning_type: pruningType,
                spurs_left: spursLeftStr ? parseInt(spursLeftStr, 10) : null,
                canes_before: canesBeforeStr ? parseInt(canesBeforeStr, 10) : null,
                canes_after: canesAfterStr ? parseInt(canesAfterStr, 10) : null,
                notes: notes || '',
                updated_at: Date.now(),
              });

              handleClose();
              const typeLabel = PRUNING_TYPE_OPTIONS.find(o => o.value === pruningType)?.label || pruningType;
              onSuccess(`${typeLabel} pruning log updated`);
            } catch (error) {
              setFormErrors({ submit: 'Failed to update pruning log. Please try again.' });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DATE</label>
            <input
              type="date"
              name="date"
              className={styles.formInput}
              defaultValue={formatDateForInput(pruningLog.date)}
              required
            />
            {formErrors.date && <div className={styles.formError}>{formErrors.date}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>PRUNING TYPE</label>
            <select
              name="pruningType"
              className={styles.formSelect}
              defaultValue={pruningLog.pruning_type}
              required
            >
              <option value="">Select Type</option>
              {PRUNING_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formErrors.pruningType && <div className={styles.formError}>{formErrors.pruningType}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>SPURS LEFT (OPTIONAL)</label>
            <input
              type="number"
              name="spursLeft"
              className={styles.formInput}
              min={0}
              max={100}
              defaultValue={pruningLog.spurs_left ?? ''}
              placeholder="Number of spurs after pruning"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>CANES BEFORE</label>
              <input
                type="number"
                name="canesBefore"
                className={styles.formInput}
                min={0}
                max={100}
                defaultValue={pruningLog.canes_before ?? ''}
                placeholder="Before"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>CANES AFTER</label>
              <input
                type="number"
                name="canesAfter"
                className={styles.formInput}
                min={0}
                max={100}
                defaultValue={pruningLog.canes_after ?? ''}
                placeholder="After"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
            <textarea
              name="notes"
              className={styles.formTextarea}
              defaultValue={pruningLog.notes}
              placeholder="Observations, techniques used, issues found..."
              rows={3}
            />
          </div>

          {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.formButtonSecondary}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            <button type="submit" className={styles.formButton} disabled={isSubmitting}>
              {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>

          <div className={styles.dangerZoneSeparator}>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
            >
              DELETE LOG
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
