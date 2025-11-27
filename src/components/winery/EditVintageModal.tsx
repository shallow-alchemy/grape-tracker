import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import { myMeasurementsByEntity } from '../../shared/queries';
import { DeleteVintageConfirmModal } from './DeleteVintageConfirmModal';
import styles from '../../App.module.css';

type EditVintageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onDelete?: () => void;
  vintage: {
    id: string;
    vintage_year: number;
    variety: string;
    harvest_date: number;
    harvest_weight_lbs: number | null;
    harvest_volume_gallons: number | null;
    notes: string;
  };
};

export const EditVintageModal = ({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  vintage,
}: EditVintageModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { user } = useUser();
  const zero = useZero();

  const [allMeasurementsData] = useQuery(
    myMeasurementsByEntity(user?.id, 'vintage', vintage.id)
  ) as any;
  const measurementsData = allMeasurementsData.filter((m: any) => m.stage === 'harvest');
  const harvestMeasurement = measurementsData[0];

  const formatDateForInput = (timestamp: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="EDIT VINTAGE"
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

            const harvestDate = formData.get('harvestDate') as string;
            const harvestWeight = formData.get('harvestWeight') as string;
            const harvestVolume = formData.get('harvestVolume') as string;
            const brix = formData.get('brix') as string;
            const ph = formData.get('ph') as string;
            const ta = formData.get('ta') as string;
            const notes = formData.get('notes') as string;

            if (brix && (parseFloat(brix) < 0 || parseFloat(brix) > 40)) {
              setFormErrors({ brix: 'Brix must be between 0 and 40' });
              setIsSubmitting(false);
              return;
            }

            if (ph && (parseFloat(ph) < 0 || parseFloat(ph) > 14)) {
              setFormErrors({ ph: 'pH must be between 0 and 14' });
              setIsSubmitting(false);
              return;
            }

            if (harvestDate && new Date(harvestDate).getTime() > Date.now()) {
              setFormErrors({ harvestDate: 'Harvest date cannot be in the future' });
              setIsSubmitting(false);
              return;
            }

            if (harvestWeight && parseFloat(harvestWeight) < 0) {
              setFormErrors({ harvestWeight: 'Weight must be positive' });
              setIsSubmitting(false);
              return;
            }

            if (harvestVolume && parseFloat(harvestVolume) < 0) {
              setFormErrors({ harvestVolume: 'Volume must be positive' });
              setIsSubmitting(false);
              return;
            }

            const now = Date.now();
            const measurementDate = harvestDate ? new Date(harvestDate).getTime() : vintage.harvest_date;

            await zero.mutate.vintage.update({
              id: vintage.id,
              harvest_date: measurementDate,
              harvest_weight_lbs: harvestWeight ? parseFloat(harvestWeight) : null,
              harvest_volume_gallons: harvestVolume ? parseFloat(harvestVolume) : null,
              notes: notes || '',
              updated_at: now,
            });

            const hasMeasurements = brix || ph || ta;
            if (hasMeasurements) {
              if (harvestMeasurement) {
                await zero.mutate.measurement.update({
                  id: harvestMeasurement.id,
                  date: measurementDate,
                  ph: ph ? parseFloat(ph) : null,
                  ta: ta ? parseFloat(ta) : null,
                  brix: brix ? parseFloat(brix) : null,
                  updated_at: now,
                });
              } else {
                await zero.mutate.measurement.insert({
                  id: `${vintage.id}-harvest-measurement-${now}`,
                  user_id: user!.id,
                  entity_type: 'vintage',
                  entity_id: vintage.id,
                  date: measurementDate,
                  stage: 'harvest',
                  ph: ph ? parseFloat(ph) : null,
                  ta: ta ? parseFloat(ta) : null,
                  brix: brix ? parseFloat(brix) : null,
                  temperature: null,
                  tasting_notes: '',
                  notes: '',
                  created_at: now,
                  updated_at: now,
                });
              }
            } else if (harvestMeasurement) {
              await zero.mutate.measurement.delete({
                id: harvestMeasurement.id,
              });
            }

            onSuccess('Vintage updated successfully');
            onClose();
          } catch (error) {
            console.error('Error updating vintage:', error);
            setFormErrors({ submit: 'Failed to update vintage. Please try again.' });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>VARIETY</label>
          <input
            type="text"
            className={styles.formInput}
            value={vintage.variety}
            disabled
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>VINTAGE YEAR</label>
          <input
            type="text"
            className={styles.formInput}
            value={vintage.vintage_year}
            disabled
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>HARVEST DATE</label>
          <input
            type="date"
            name="harvestDate"
            className={styles.formInput}
            defaultValue={formatDateForInput(vintage.harvest_date)}
          />
          {formErrors.harvestDate && <div className={styles.formError}>{formErrors.harvestDate}</div>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.formGrid2Col}>
            <div>
              <label className={styles.formLabel}>WEIGHT (LBS)</label>
              <input
                type="number"
                name="harvestWeight"
                className={styles.formInput}
                step="0.1"
                min="0"
                placeholder="Optional"
                defaultValue={vintage.harvest_weight_lbs ?? ''}
              />
              {formErrors.harvestWeight && <div className={styles.formError}>{formErrors.harvestWeight}</div>}
            </div>
            <div>
              <label className={styles.formLabel}>VOLUME (GAL)</label>
              <input
                type="number"
                name="harvestVolume"
                className={styles.formInput}
                step="0.1"
                min="0"
                placeholder="Optional"
                defaultValue={vintage.harvest_volume_gallons ?? ''}
              />
              {formErrors.harvestVolume && <div className={styles.formError}>{formErrors.harvestVolume}</div>}
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>HARVEST MEASUREMENTS (OPTIONAL)</label>
          <div className={styles.formGrid3Col}>
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
                defaultValue={harvestMeasurement?.brix ?? ''}
              />
            </div>
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
                defaultValue={harvestMeasurement?.ph ?? ''}
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
                defaultValue={harvestMeasurement?.ta ?? ''}
              />
            </div>
          </div>
          {formErrors.brix && <div className={styles.formError}>{formErrors.brix}</div>}
          {formErrors.ph && <div className={styles.formError}>{formErrors.ph}</div>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES</label>
          <textarea
            name="notes"
            className={styles.formTextarea}
            rows={4}
            placeholder="Optional notes about this vintage..."
            defaultValue={vintage.notes}
          />
        </div>

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.formButtonSecondary}
            onClick={onClose}
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
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isSubmitting}
          >
            DELETE VINTAGE
          </button>
        </div>
      </form>

      <DeleteVintageConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={(message) => {
          onSuccess(message);
          onClose();
          onDelete?.();
        }}
        vintage={vintage}
      />
    </Modal>
  );
};
