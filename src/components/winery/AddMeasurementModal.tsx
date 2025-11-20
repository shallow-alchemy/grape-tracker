import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type AddMeasurementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  entityType: 'wine' | 'vintage';
  entityId: string;
  currentStage: string;
};

export const AddMeasurementModal = ({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  entityId,
  currentStage,
}: AddMeasurementModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const zero = useZero();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ADD MEASUREMENT"
      closeDisabled={isSubmitting}
    >
      <form
        className={styles.vineForm}
        onSubmit={async (e) => {
          e.preventDefault();
          setFormErrors({});
          setIsSubmitting(true);

          try {
            const formData = new FormData(e.currentTarget);

            const date = formData.get('date') as string;
            const ph = formData.get('ph') as string;
            const ta = formData.get('ta') as string;
            const brix = formData.get('brix') as string;
            const temperature = formData.get('temperature') as string;
            const tastingNotes = formData.get('tastingNotes') as string;
            const notes = formData.get('notes') as string;

            const now = Date.now();
            const measurementDate = date ? new Date(date).getTime() : now;

            await zero.mutate.measurement.insert({
              id: `${entityId}-measurement-${now}`,
              user_id: user!.id,
              entity_type: entityType,
              entity_id: entityId,
              date: measurementDate,
              stage: currentStage,
              ph: ph ? parseFloat(ph) : null,
              ta: ta ? parseFloat(ta) : null,
              brix: brix ? parseFloat(brix) : null,
              temperature: temperature ? parseFloat(temperature) : null,
              tasting_notes: tastingNotes || '',
              notes: notes || '',
              created_at: now,
              updated_at: now,
            });

            onClose();
            onSuccess('Measurement added successfully');
          } catch (error) {
            setFormErrors({ submit: `Failed to add measurement: ${error}` });
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
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>MEASUREMENTS (OPTIONAL)</label>
          <div className={styles.formGrid2Col}>
            <div className={styles.formColumn}>
              <label className={`${styles.formLabel} ${styles.formLabelSmall}`}>PH</label>
              <input
                type="number"
                name="ph"
                className={styles.formInput}
                step="0.01"
                min="0"
                max="14"
                placeholder="0-14"
              />
            </div>
            <div className={styles.formColumn}>
              <label className={`${styles.formLabel} ${styles.formLabelSmall}`}>TA (G/L)</label>
              <input
                type="number"
                name="ta"
                className={styles.formInput}
                step="0.1"
                min="0"
                placeholder="g/L"
              />
            </div>
            <div className={styles.formColumn}>
              <label className={`${styles.formLabel} ${styles.formLabelSmall}`}>BRIX</label>
              <input
                type="number"
                name="brix"
                className={styles.formInput}
                step="0.1"
                min="0"
                max="40"
                placeholder="0-40"
              />
            </div>
            <div className={styles.formColumn}>
              <label className={`${styles.formLabel} ${styles.formLabelSmall}`}>TEMP (°F)</label>
              <input
                type="number"
                name="temperature"
                className={styles.formInput}
                step="0.1"
                placeholder="°F"
              />
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>TASTING NOTES (OPTIONAL)</label>
          <textarea
            name="tastingNotes"
            className={styles.formTextarea}
            rows={3}
            placeholder="Aromas, flavors, body, finish..."
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
          <textarea
            name="notes"
            className={styles.formTextarea}
            rows={2}
            placeholder="Additional notes..."
          />
        </div>

        {formErrors.submit && (
          <div className={styles.formError}>{formErrors.submit}</div>
        )}

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.modalButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            CANCEL
          </button>
          <button
            type="submit"
            className={styles.modalButtonPrimary}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'ADDING...' : 'ADD MEASUREMENT'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
