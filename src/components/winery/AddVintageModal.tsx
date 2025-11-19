import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
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
  const [grapeSource, setGrapeSource] = useState<'own_vineyard' | 'purchased'>('own_vineyard');

  const { user } = useUser();
  const zero = useZero();
  const vineyardData = useVineyard();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const varieties = vineyardData?.varieties || [];

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
            const supplierName = formData.get('supplierName') as string;
            const harvestDate = formData.get('harvestDate') as string;
            const harvestWeight = formData.get('harvestWeight') as string;
            const harvestVolume = formData.get('harvestVolume') as string;
            const brix = formData.get('brix') as string;
            const ph = formData.get('ph') as string;
            const ta = formData.get('ta') as string;
            const notes = formData.get('notes') as string;

            // Validation
            if (!vintageYear) {
              setFormErrors({ vintageYear: 'Vintage year is required' });
              setIsSubmitting(false);
              return;
            }

            if (!variety || variety.trim() === '') {
              setFormErrors({ variety: 'Variety is required' });
              setIsSubmitting(false);
              return;
            }

            if (grapeSource === 'own_vineyard' && !varieties.includes(variety)) {
              setFormErrors({ variety: 'Please select a variety from your vineyard' });
              setIsSubmitting(false);
              return;
            }

            if (brix && (parseFloat(brix) < 0 || parseFloat(brix) > 40)) {
              setFormErrors({ brix: 'Brix must be between 0 and 40' });
              setIsSubmitting(false);
              return;
            }

            const now = Date.now();
            const varietySlug = variety.replace(/\s+/g, '-').toLowerCase();
            const supplierSlug = supplierName ? supplierName.replace(/\s+/g, '-').toLowerCase() : '';
            const vintageId = grapeSource === 'purchased' && supplierSlug
              ? `${vintageYear}-${varietySlug}-${supplierSlug}`
              : `${vintageYear}-${varietySlug}`;

            await zero.mutate.vintage.insert({
              id: vintageId,
              user_id: user!.id,
              vineyard_id: vineyardData?.id || 'default',
              vintage_year: vintageYear,
              variety: variety,
              block_ids: [],
              current_stage: 'harvested',
              harvest_date: harvestDate ? new Date(harvestDate).getTime() : now,
              harvest_weight_lbs: harvestWeight ? parseFloat(harvestWeight) : null,
              harvest_volume_gallons: harvestVolume ? parseFloat(harvestVolume) : null,
              grape_source: grapeSource,
              supplier_name: grapeSource === 'purchased' ? (supplierName || null) : null,
              notes: notes || '',
              created_at: now,
              updated_at: now,
            });

            // Create initial stage history entry
            await zero.mutate.stage_history.insert({
              id: `${vintageId}-harvested-${now}`,
              user_id: user!.id,
              entity_type: 'vintage',
              entity_id: vintageId,
              stage: 'harvested',
              started_at: now,
              completed_at: null,
              skipped: false,
              notes: '',
              created_at: now,
              updated_at: now,
            });

            // Create harvest measurement if any values provided
            const hasMeasurements = brix || ph || ta;
            if (hasMeasurements) {
              const measurementDate = harvestDate ? new Date(harvestDate).getTime() : now;
              await zero.mutate.measurement.insert({
                id: `${vintageId}-harvest-measurement-${now}`,
                user_id: user!.id,
                entity_type: 'vintage',
                entity_id: vintageId,
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
            <label className={styles.formLabel} style={{ marginBottom: 0 }}>VARIETY *</label>
            <button
              type="button"
              onClick={() => setGrapeSource(grapeSource === 'own_vineyard' ? 'purchased' : 'own_vineyard')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary-500)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {grapeSource === 'own_vineyard' ? 'Use Sourced Grapes' : 'Use Own Vineyard'}
            </button>
          </div>
          {grapeSource === 'own_vineyard' ? (
            <>
              {varieties.length === 0 ? (
                <>
                  <div className={styles.formInput} style={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    No varieties configured
                  </div>
                  <div className={styles.formHint}>
                    Add varieties to your vineyard settings before creating vintages
                  </div>
                </>
              ) : (
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
              )}
            </>
          ) : (
            <input
              type="text"
              name="variety"
              className={styles.formInput}
              placeholder="CABERNET SAUVIGNON"
              required
            />
          )}
          {formErrors.variety && (
            <div className={styles.formError}>{formErrors.variety}</div>
          )}
        </div>

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
          <label className={styles.formLabel}>HARVEST DATE</label>
          <input
            type="date"
            name="harvestDate"
            className={styles.formInput}
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>

        {grapeSource === 'own_vineyard' ? (
          <div className={styles.formGroup}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div>
                <label className={styles.formLabel}>WEIGHT (LBS)</label>
                <input
                  type="number"
                  name="harvestWeight"
                  className={styles.formInput}
                  step="0.1"
                  min="0"
                  placeholder="Optional"
                />
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
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>SUPPLIER (OPTIONAL)</label>
            <input
              type="text"
              name="supplierName"
              className={styles.formInput}
              placeholder="Napa Valley Grapes Co."
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>HARVEST MEASUREMENTS (OPTIONAL)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className={styles.formLabel} style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--spacing-xs)', whiteSpace: 'nowrap' }}>BRIX</label>
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className={styles.formLabel} style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--spacing-xs)', whiteSpace: 'nowrap' }}>PH</label>
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className={styles.formLabel} style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--spacing-xs)', whiteSpace: 'nowrap' }}>TA (G/L)</label>
              <input
                type="number"
                name="ta"
                className={styles.formInput}
                step="0.1"
                min="0"
                placeholder="g/L"
              />
            </div>
          </div>
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
            disabled={isSubmitting || (grapeSource === 'own_vineyard' && varieties.length === 0)}
          >
            {isSubmitting ? 'CREATING...' : 'CREATE VINTAGE'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
