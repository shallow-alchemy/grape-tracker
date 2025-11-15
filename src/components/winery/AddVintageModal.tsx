import { useState } from 'react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import { useVineyard } from '../vineyard-hooks';
import styles from '../../App.module.css';

type AddVintageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export const AddVintageModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddVintageModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const zero = useZero();
  const vineyardData = useVineyard();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Common grape varieties
  const varieties = [
    'Cabernet Sauvignon',
    'Cabernet Franc',
    'Merlot',
    'Pinot Noir',
    'Chardonnay',
    'Sauvignon Blanc',
    'Riesling',
    'Zinfandel',
    'Syrah',
    'Other',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ADD VINTAGE"
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

            const vintageYear = parseInt(formData.get('vintageYear') as string);
            const variety = formData.get('variety') as string;
            const harvestDate = formData.get('harvestDate') as string;
            const harvestWeight = formData.get('harvestWeight') as string;
            const harvestVolume = formData.get('harvestVolume') as string;
            const brix = formData.get('brix') as string;
            const notes = formData.get('notes') as string;

            // Validation
            if (!vintageYear) {
              setFormErrors({ vintageYear: 'Vintage year is required' });
              setIsSubmitting(false);
              return;
            }

            if (!variety) {
              setFormErrors({ variety: 'Variety is required' });
              setIsSubmitting(false);
              return;
            }

            if (brix && (parseFloat(brix) < 0 || parseFloat(brix) > 40)) {
              setFormErrors({ brix: 'Brix must be between 0 and 40' });
              setIsSubmitting(false);
              return;
            }

            const now = Date.now();
            const vintageId = `${vintageYear}-${variety.replace(/\s+/g, '-').toLowerCase()}`;

            await zero.mutate.vintage.insert({
              id: vintageId,
              vineyard_id: vineyardData?.id || 'default',
              vintage_year: vintageYear,
              variety: variety,
              block_ids: [],
              current_stage: 'harvest',
              harvest_date: harvestDate ? new Date(harvestDate).getTime() : now,
              harvest_weight_lbs: harvestWeight ? parseFloat(harvestWeight) : null,
              harvest_volume_gallons: harvestVolume ? parseFloat(harvestVolume) : null,
              brix_at_harvest: brix ? parseFloat(brix) : null,
              notes: notes || '',
              created_at: now,
              updated_at: now,
            });

            // Create initial stage history entry
            await zero.mutate.stage_history.insert({
              id: `${vintageId}-harvest-${now}`,
              entity_type: 'vintage',
              entity_id: vintageId,
              stage: 'harvest',
              started_at: now,
              completed_at: null,
              skipped: false,
              notes: '',
              created_at: now,
              updated_at: now,
            });

            onClose();
            onSuccess(`Vintage ${vintageYear} ${variety} created successfully`);
          } catch (error) {
            setFormErrors({ submit: `Failed to create vintage: ${error}` });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>VINTAGE YEAR *</label>
          <select
            name="vintageYear"
            className={styles.formInput}
            required
          >
            <option value="">Select year...</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {formErrors.vintageYear && (
            <div className={styles.formError}>{formErrors.vintageYear}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>VARIETY *</label>
          <select
            name="variety"
            className={styles.formInput}
            required
          >
            <option value="">Select variety...</option>
            {varieties.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {formErrors.variety && (
            <div className={styles.formError}>{formErrors.variety}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>HARVEST DATE</label>
          <input
            type="date"
            name="harvestDate"
            className={styles.formInput}
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>HARVEST WEIGHT (LBS)</label>
          <input
            type="number"
            name="harvestWeight"
            className={styles.formInput}
            step="0.1"
            min="0"
            placeholder="Optional"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>HARVEST VOLUME (GALLONS)</label>
          <input
            type="number"
            name="harvestVolume"
            className={styles.formInput}
            step="0.1"
            min="0"
            placeholder="Optional"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>BRIX AT HARVEST</label>
          <input
            type="number"
            name="brix"
            className={styles.formInput}
            step="0.1"
            min="0"
            max="40"
            placeholder="Optional (0-40)"
          />
          {formErrors.brix && (
            <div className={styles.formError}>{formErrors.brix}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES</label>
          <textarea
            name="notes"
            className={styles.formTextarea}
            rows={3}
            placeholder="Optional notes about this harvest..."
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
            {isSubmitting ? 'CREATING...' : 'CREATE VINTAGE'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
