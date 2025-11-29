import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Modal } from './Modal';
import { useZero } from '../contexts/ZeroContext';
import styles from '../App.module.css';

const PRUNING_TYPE_OPTIONS = [
  { value: 'dormant', label: 'Dormant (Winter)', description: 'Main annual pruning when vine is dormant' },
  { value: 'summer', label: 'Summer', description: 'Canopy management, hedging, shoot thinning' },
  { value: 'corrective', label: 'Corrective', description: 'Removing dead/diseased wood, fixing problems' },
  { value: 'training', label: 'Training', description: 'Establishing vine structure in young vines' },
];

type AddPruningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  vineId: string;
};

export const AddPruningModal = ({
  isOpen,
  onClose,
  onSuccess,
  vineId,
}: AddPruningModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useUser();
  const zero = useZero();

  const handleClose = () => {
    setFormErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="LOG PRUNING"
      closeDisabled={isSubmitting}
    >
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
            const now = Date.now();
            const pruningId = crypto.randomUUID();

            await zero.mutate.pruning_log.insert({
              id: pruningId,
              user_id: user!.id,
              vine_id: vineId,
              date: new Date(dateStr + 'T12:00:00').getTime(),
              pruning_type: pruningType,
              spurs_left: spursLeftStr ? parseInt(spursLeftStr, 10) : null,
              canes_before: canesBeforeStr ? parseInt(canesBeforeStr, 10) : null,
              canes_after: canesAfterStr ? parseInt(canesAfterStr, 10) : null,
              notes: notes || '',
              created_at: now,
              updated_at: now,
            });

            handleClose();
            const typeLabel = PRUNING_TYPE_OPTIONS.find(o => o.value === pruningType)?.label || pruningType;
            onSuccess(`${typeLabel} pruning logged successfully`);
          } catch (error) {
            setFormErrors({ submit: 'Failed to log pruning. Please try again.' });
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
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />
          {formErrors.date && <div className={styles.formError}>{formErrors.date}</div>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>PRUNING TYPE</label>
          <select name="pruningType" className={styles.formSelect} required>
            <option value="">Select Type</option>
            {PRUNING_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className={styles.formHint}>
            {PRUNING_TYPE_OPTIONS.map(o => `${o.label}: ${o.description}`).join(' | ')}
          </div>
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
            placeholder="Number of spurs after pruning"
          />
          <div className={styles.formHint}>How many spurs remain after pruning</div>
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
              placeholder="After"
            />
          </div>
        </div>
        <div className={styles.formHint} style={{ marginTop: 'calc(-1 * var(--space-2))' }}>
          Optional: Track cane count before and after pruning
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
          <textarea
            name="notes"
            className={styles.formTextarea}
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
            {isSubmitting ? 'SAVING...' : 'LOG PRUNING'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
