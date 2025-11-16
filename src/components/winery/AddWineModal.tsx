import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import { Modal } from '../Modal';
import styles from '../../App.module.css';

type AddWineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export const AddWineModal = ({ isOpen, onClose, onSuccess }: AddWineModalProps) => {
  const zero = useZero();
  const [vintagesData] = useQuery(zero.query.vintage);

  // Sort vintages by year descending
  const vintages = [...vintagesData].sort((a, b) => b.vintage_year - a.vintage_year);

  const [formData, setFormData] = useState({
    vintageId: '',
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

    // Validation
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

    // Blend validation
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

      // Check for duplicate vintages (including primary)
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

      // Prepare blend components if this is a blend
      let blendComponentsData = null;
      if (isBlend) {
        const filledVarieties = blendVarieties.filter(v => v.vintageId && v.percentage);
        const varietiesTotal = filledVarieties.reduce((sum, v) => sum + Number(v.percentage), 0);
        const primaryPercentage = 100 - varietiesTotal;

        // Include primary vintage with its calculated percentage
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

      // Create wine record
      await zero.mutate.wine.insert({
        id: wineId,
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

      // Create initial stage history
      await zero.mutate.stage_history.insert({
        id: crypto.randomUUID(),
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

  return (
    <Modal isOpen={isOpen} title="ADD WINE" onClose={handleClose}>
      <form className={styles.vineForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
            <label className={styles.formLabel} style={{ marginBottom: 0 }}>
              VINTAGE (REQUIRED)
            </label>
            <button
              type="button"
              onClick={() => setIsBlend(!isBlend)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary-500)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
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
          <div className={styles.infoBox} style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {selectedVintage.harvest_volume_gallons !== null && selectedVintage.harvest_volume_gallons !== undefined && (
                <div>Harvest Volume: {selectedVintage.harvest_volume_gallons} gallons</div>
              )}
              {selectedVintage.grape_source === 'purchased' && selectedVintage.supplier_name && (
                <div>Supplier: {selectedVintage.supplier_name}</div>
              )}
            </div>
          </div>
        )}

        {/* Blend Varieties */}
        {isBlend && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              BLEND VARIETIES
              {selectedVintage && (
                <span style={{
                  marginLeft: 'var(--spacing-sm)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  textTransform: 'none'
                }}>
                  {selectedVintage.vintage_year} {selectedVintage.variety} gets remaining {getPrimaryPercentage().toFixed(1)}%
                </span>
              )}
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              {blendVarieties.map((variety, index) => (
                <div key={index} style={{
                  display: 'flex',
                  gap: 'var(--spacing-sm)',
                  alignItems: 'center'
                }}>
                  <select
                    className={styles.formSelect}
                    value={variety.vintageId}
                    onChange={(e) => updateBlendVariety(index, 'vintageId', e.target.value)}
                    style={{ flex: 2 }}
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
                    className={styles.formInput}
                    value={variety.percentage}
                    onChange={(e) => updateBlendVariety(index, 'percentage', e.target.value)}
                    placeholder="0"
                    style={{ width: '80px', textAlign: 'right' }}
                  />
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    width: '20px'
                  }}>
                    %
                  </span>

                  {blendVarieties.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlendVariety(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-md)',
                        padding: 'var(--spacing-xs)',
                        width: '24px'
                      }}
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
              className={styles.modalButton}
              onClick={addBlendVariety}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: 'var(--spacing-xs) var(--spacing-sm)'
              }}
            >
              + ADD VARIETY
            </button>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            WINE NAME (REQUIRED)
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginLeft: 'var(--spacing-xs)' }}>
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
            <option value="crush">Crush</option>
            <option value="primary_fermentation">Primary Fermentation</option>
            <option value="secondary_fermentation">Secondary Fermentation</option>
            <option value="racking">Racking</option>
            <option value="oaking">Oaking</option>
            <option value="aging">Aging</option>
            <option value="bottling">Bottling</option>
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
          <div className={styles.errorMessage} style={{ marginBottom: 'var(--spacing-md)' }}>
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
