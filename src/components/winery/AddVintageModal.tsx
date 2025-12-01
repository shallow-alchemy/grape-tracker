import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import { useVineyard } from '../vineyard-hooks';
import { taskTemplates, supplyTemplates } from '../../shared/queries';
import { calculateDueDate } from './taskHelpers';
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
  const [taskTemplatesData] = useQuery(taskTemplates(user?.id) as any) as any;
  const [supplyTemplatesData] = useQuery(supplyTemplates(user?.id) as any) as any;

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
            const uniqueSuffix = crypto.randomUUID().slice(0, 8);
            const vintageId = grapeSource === 'purchased' && supplierSlug
              ? `${vintageYear}-${varietySlug}-${supplierSlug}-${uniqueSuffix}`
              : `${vintageYear}-${varietySlug}-${uniqueSuffix}`;

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

            // Create tasks for the initial 'harvested' stage
            const allTemplates = taskTemplatesData || [];
            const relevantTemplates = allTemplates.filter((template: any) => {
              const stageMatch = template.stage === 'harvested';
              const entityMatch = template.entity_type === 'vintage';
              const enabled = !!template.default_enabled;
              return stageMatch && entityMatch && enabled;
            });

            const allSupplyTemplates = supplyTemplatesData || [];

            for (const template of relevantTemplates) {
              const dueDate = calculateDueDate(now, template.frequency, template.frequency_count);
              const taskId = crypto.randomUUID();

              await zero.mutate.task.insert({
                id: taskId,
                user_id: user!.id,
                task_template_id: template.id,
                entity_type: 'vintage',
                entity_id: vintageId,
                stage: 'harvested',
                name: template.name,
                description: template.description,
                due_date: dueDate,
                completed_at: null as any,
                completed_by: '',
                notes: '',
                skipped: false,
                created_at: now,
                updated_at: now,
              });

              // Create supply instances for this task
              const taskSupplyTemplates = allSupplyTemplates.filter(
                (s: any) => s.task_template_id === template.id
              );

              for (const supplyTemplate of taskSupplyTemplates) {
                await zero.mutate.supply_instance.insert({
                  id: crypto.randomUUID(),
                  user_id: user!.id,
                  supply_template_id: supplyTemplate.id,
                  task_id: taskId,
                  entity_type: 'vintage',
                  entity_id: vintageId,
                  calculated_quantity: supplyTemplate.quantity_fixed || 1,
                  verified_at: null,
                  verified_by: null,
                  created_at: now,
                  updated_at: now,
                });
              }
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
          <div className={styles.formHeaderRow}>
            <label className={`${styles.formLabel} ${styles.formLabelNoMargin}`}>VARIETY *</label>
            <button
              type="button"
              onClick={() => setGrapeSource(grapeSource === 'own_vineyard' ? 'purchased' : 'own_vineyard')}
              className={styles.formTextLink}
            >
              {grapeSource === 'own_vineyard' ? 'Use Sourced Grapes' : 'Use Own Vineyard'}
            </button>
          </div>
          {grapeSource === 'own_vineyard' ? (
            <>
              {varieties.length === 0 ? (
                <>
                  <div className={`${styles.formInput} ${styles.formInputDisabled}`}>
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
