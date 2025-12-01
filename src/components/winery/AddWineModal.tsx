import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import { myVintages, taskTemplates, supplyTemplates } from '../../shared/queries';
import { Modal } from '../Modal';
import { getStagesForWineType, type WineType } from './stages';
import { calculateDueDate } from './taskHelpers';
import styles from '../../App.module.css';

type AddWineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialVintageId?: string;
};

export const AddWineModal = ({ isOpen, onClose, onSuccess, initialVintageId }: AddWineModalProps) => {
  const { user } = useUser();
  const zero = useZero();
  const [vintagesData] = useQuery(myVintages(user?.id) as any) as any;
  const [taskTemplatesData] = useQuery(taskTemplates(user?.id) as any) as any;
  const [supplyTemplatesData] = useQuery(supplyTemplates(user?.id) as any) as any;

  // Safe access - prevent crash if data not yet loaded
  const vintages = [...(vintagesData || [])].sort((a, b) => b.vintage_year - a.vintage_year);

  const [formData, setFormData] = useState({
    vintageId: initialVintageId || '',
    name: '',
    wineType: 'red',
    volumeGallons: '',
    currentStage: 'crush',
    notes: '',
  });

  const [isBlend, setIsBlend] = useState(false);
  const [blendVarieties, setBlendVarieties] = useState<Array<{ vintageId: string; percentage: string }>>([
    { vintageId: '', percentage: '' }
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && initialVintageId) {
      setFormData(prev => ({ ...prev, vintageId: initialVintageId }));
    }
  }, [isOpen, initialVintageId]);

  const resetForm = () => {
    setFormData({
      vintageId: '',
      name: '',
      wineType: 'red',
      volumeGallons: '',
      currentStage: 'crush',
      notes: '',
    });
    setIsBlend(false);
    setBlendVarieties([{ vintageId: '', percentage: '' }]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addBlendVariety = () => {
    setBlendVarieties([...blendVarieties, { vintageId: '', percentage: '' }]);
  };

  const removeBlendVariety = (index: number) => {
    setBlendVarieties(blendVarieties.filter((_, i) => i !== index));
  };

  const updateBlendVariety = (index: number, field: 'vintageId' | 'percentage', value: string) => {
    const updated = [...blendVarieties];
    updated[index][field] = value;
    setBlendVarieties(updated);
  };

  const getVarietiesTotal = (): number => {
    return blendVarieties
      .filter(v => v.percentage)
      .reduce((sum, v) => sum + Number(v.percentage), 0);
  };

  const getPrimaryPercentage = (): number => {
    return 100 - getVarietiesTotal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.vintageId) {
      setError('Please select a primary vintage');
      return;
    }

    if (!formData.name.trim()) {
      setError('Wine name is required');
      return;
    }

    if (!formData.volumeGallons || Number(formData.volumeGallons) <= 0) {
      setError('Volume must be greater than 0');
      return;
    }

    const selectedVintage = vintages.find(v => v.id === formData.vintageId);
    if (!selectedVintage) {
      setError('Selected vintage not found');
      return;
    }

    if (isBlend) {
      const filledVarieties = blendVarieties.filter(v => v.vintageId && v.percentage);

      if (filledVarieties.length === 0) {
        setError('Please add at least one variety to the blend');
        return;
      }

      const varietiesTotal = filledVarieties.reduce((sum, v) => sum + Number(v.percentage), 0);

      if (varietiesTotal >= 100) {
        setError('Blend varieties cannot total 100% or more (primary variety needs a percentage)');
        return;
      }

      const vintageIds = [...filledVarieties.map(v => v.vintageId), formData.vintageId];
      const uniqueIds = new Set(vintageIds);
      if (vintageIds.length !== uniqueIds.size) {
        setError('Cannot use the same vintage multiple times in a blend');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const wineId = crypto.randomUUID();
      const now = Date.now();

      let blendComponentsData = null;
      if (isBlend) {
        const filledVarieties = blendVarieties.filter(v => v.vintageId && v.percentage);
        const varietiesTotal = filledVarieties.reduce((sum, v) => sum + Number(v.percentage), 0);
        const primaryPercentage = 100 - varietiesTotal;

        blendComponentsData = [
          {
            vintage_id: formData.vintageId,
            percentage: primaryPercentage
          },
          ...filledVarieties.map(v => ({
            vintage_id: v.vintageId,
            percentage: Number(v.percentage)
          }))
        ];
      }

      await zero.mutate.wine.insert({
        id: wineId,
        user_id: user!.id,
        vintage_id: formData.vintageId,
        vineyard_id: selectedVintage.vineyard_id,
        name: formData.name.trim().toUpperCase(),
        wine_type: formData.wineType,
        volume_gallons: Number(formData.volumeGallons),
        current_volume_gallons: Number(formData.volumeGallons),
        current_stage: formData.currentStage,
        status: 'active',
        last_tasting_notes: '',
        blend_components: blendComponentsData,
        created_at: now,
        updated_at: now,
      });

      await zero.mutate.stage_history.insert({
        id: crypto.randomUUID(),
        user_id: user!.id,
        entity_type: 'wine',
        entity_id: wineId,
        stage: formData.currentStage,
        started_at: now,
        completed_at: null,
        skipped: false,
        notes: formData.notes.trim(),
        created_at: now,
        updated_at: now,
      });

      // Create tasks for the initial stage
      const allTemplates = taskTemplatesData || [];
      const relevantTemplates = allTemplates.filter((template: any) => {
        const stageMatch = template.stage === formData.currentStage;
        const entityMatch = template.entity_type === 'wine';
        const wineTypeMatch = !template.wine_type || template.wine_type === formData.wineType;
        const enabled = !!template.default_enabled;
        return stageMatch && entityMatch && wineTypeMatch && enabled;
      });

      const allSupplyTemplates = supplyTemplatesData || [];

      for (const template of relevantTemplates) {
        const dueDate = calculateDueDate(now, template.frequency, template.frequency_count);
        const taskId = crypto.randomUUID();

        await zero.mutate.task.insert({
          id: taskId,
          user_id: user!.id,
          task_template_id: template.id,
          entity_type: 'wine',
          entity_id: wineId,
          stage: formData.currentStage,
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
            entity_type: 'wine',
            entity_id: wineId,
            calculated_quantity: supplyTemplate.quantity_fixed || 1,
            verified_at: null,
            verified_by: null,
            created_at: now,
            updated_at: now,
          });
        }
      }

      const wineType = isBlend ? 'Blend' : 'Varietal';
      onSuccess(`${wineType} "${formData.name.trim().toUpperCase()}" created successfully`);
      handleClose();
    } catch (err) {
      console.error('Failed to create wine:', err);
      setError('Failed to create wine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVintage = vintages.find(v => v.id === formData.vintageId);

  // Get applicable stages for the selected wine type
  const applicableStages = useMemo(() => {
    return getStagesForWineType(formData.wineType as WineType);
  }, [formData.wineType]);

  // Reset stage to crush if current stage is not applicable for new wine type
  useEffect(() => {
    const isCurrentStageValid = applicableStages.some(s => s.value === formData.currentStage);
    if (!isCurrentStageValid) {
      setFormData(prev => ({ ...prev, currentStage: 'crush' }));
    }
  }, [applicableStages, formData.currentStage]);

  return (
    <Modal isOpen={isOpen} title="ADD WINE" onClose={handleClose}>
      <form className={styles.vineForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <div className={styles.formHeaderRow}>
            <label className={`${styles.formLabel} ${styles.formLabelNoMargin}`}>
              VINTAGE (REQUIRED)
            </label>
            <button
              type="button"
              onClick={() => setIsBlend(!isBlend)}
              className={styles.formTextLink}
            >
              {isBlend ? 'Single vintage' : 'This is a blend'}
            </button>
          </div>
          <select
            className={styles.formSelect}
            value={formData.vintageId}
            onChange={(e) => setFormData({ ...formData, vintageId: e.target.value })}
            required
          >
            <option value="">Select vintage...</option>
            {vintages.map((vintage) => (
              <option key={vintage.id} value={vintage.id}>
                {vintage.vintage_year} {vintage.variety}
                {vintage.grape_source === 'purchased' && ' (PURCHASED)'}
              </option>
            ))}
          </select>
        </div>

        {selectedVintage && !isBlend && (
          <div className={`${styles.infoBox} ${styles.infoBoxWithMargin}`}>
            <div className={styles.infoBoxText}>
              {selectedVintage.harvest_volume_gallons !== null && selectedVintage.harvest_volume_gallons !== undefined && (
                <div>Harvest Volume: {selectedVintage.harvest_volume_gallons} gallons</div>
              )}
              {selectedVintage.grape_source === 'purchased' && selectedVintage.supplier_name && (
                <div>Supplier: {selectedVintage.supplier_name}</div>
              )}
            </div>
          </div>
        )}

        {isBlend && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              BLEND VARIETIES
              {selectedVintage && (
                <span className={styles.blendInfoHint}>
                  {selectedVintage.vintage_year} {selectedVintage.variety} gets remaining {getPrimaryPercentage().toFixed(1)}%
                </span>
              )}
            </label>

            <div className={styles.blendVarietiesContainer}>
              {blendVarieties.map((variety, index) => (
                <div key={index} className={styles.blendVarietyRow}>
                  <select
                    className={`${styles.formSelect} ${styles.blendVarietySelect}`}
                    value={variety.vintageId}
                    onChange={(e) => updateBlendVariety(index, 'vintageId', e.target.value)}
                  >
                    <option value="">Select vintage...</option>
                    {vintages.map((vintage) => (
                      <option key={vintage.id} value={vintage.id}>
                        {vintage.vintage_year} {vintage.variety}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className={`${styles.formInput} ${styles.blendPercentageInput}`}
                    value={variety.percentage}
                    onChange={(e) => updateBlendVariety(index, 'percentage', e.target.value)}
                    placeholder="0"
                  />
                  <span className={styles.blendPercentSymbol}>
                    %
                  </span>

                  {blendVarieties.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlendVariety(index)}
                      className={styles.blendRemoveButton}
                      title="Remove variety"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className={`${styles.modalButton} ${styles.smallModalButton}`}
              onClick={addBlendVariety}
            >
              + ADD VARIETY
            </button>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            WINE NAME (REQUIRED)
            <span className={styles.formHintLabel}>
              e.g., "Lodi", "Azure", "Reserve"
            </span>
          </label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            placeholder="LODI"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            WINE TYPE (REQUIRED)
          </label>
          <select
            className={styles.formSelect}
            value={formData.wineType}
            onChange={(e) => setFormData({ ...formData, wineType: e.target.value })}
            required
          >
            <option value="red">Red</option>
            <option value="white">White</option>
            <option value="rosé">Rosé</option>
            <option value="dessert">Dessert</option>
            <option value="sparkling">Sparkling</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            VOLUME (GALLONS)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            className={styles.formInput}
            value={formData.volumeGallons}
            onChange={(e) => setFormData({ ...formData, volumeGallons: e.target.value })}
            placeholder="5.0"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            STARTING STAGE
          </label>
          <select
            className={styles.formSelect}
            value={formData.currentStage}
            onChange={(e) => setFormData({ ...formData, currentStage: e.target.value })}
          >
            {applicableStages.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            NOTES (OPTIONAL)
          </label>
          <textarea
            className={styles.formTextarea}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any notes about this wine..."
            rows={3}
          />
        </div>

        {error && (
          <div className={`${styles.errorMessage} ${styles.formErrorWithMargin}`}>
            {error}
          </div>
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
            {isSubmitting ? 'CREATING...' : 'CREATE WINE'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
