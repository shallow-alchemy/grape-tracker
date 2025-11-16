import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import { Modal } from '../Modal';
import { DeleteWineConfirmModal } from './DeleteWineConfirmModal';
import styles from '../../App.module.css';

type EditWineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onDelete?: () => void;
  wineId: string;
};

export const EditWineModal = ({ isOpen, onClose, onSuccess, onDelete, wineId }: EditWineModalProps) => {
  const zero = useZero();
  const [winesData] = useQuery(zero.query.wine.where('id', wineId));
  const wine = winesData[0];

  const [formData, setFormData] = useState({
    name: wine?.name || '',
    wineType: wine?.wine_type || 'red',
    currentVolumeGallons: wine?.current_volume_gallons?.toString() || '',
    status: wine?.status || 'active',
    tastingNotes: wine?.last_tasting_notes || '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Update form when wine data loads
  if (wine && formData.name === '' && wine.name !== '') {
    setFormData({
      name: wine.name,
      wineType: wine.wine_type,
      currentVolumeGallons: wine.current_volume_gallons.toString(),
      status: wine.status,
      tastingNotes: wine.last_tasting_notes,
    });
  }

  const resetForm = () => {
    if (wine) {
      setFormData({
        name: wine.name,
        wineType: wine.wine_type,
        currentVolumeGallons: wine.current_volume_gallons.toString(),
        status: wine.status,
        tastingNotes: wine.last_tasting_notes,
      });
    }
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Wine name is required');
      return;
    }

    if (!formData.currentVolumeGallons || Number(formData.currentVolumeGallons) <= 0) {
      setError('Current volume must be greater than 0');
      return;
    }

    if (wine && Number(formData.currentVolumeGallons) > wine.volume_gallons) {
      setError('Current volume cannot exceed original volume');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = Date.now();

      await zero.mutate.wine.update({
        id: wineId,
        name: formData.name.trim().toUpperCase(),
        wine_type: formData.wineType,
        current_volume_gallons: Number(formData.currentVolumeGallons),
        status: formData.status,
        last_tasting_notes: formData.tastingNotes.trim(),
        updated_at: now,
      });

      onSuccess(`Wine "${formData.name.trim().toUpperCase()}" updated successfully`);
      handleClose();
    } catch (err) {
      console.error('Failed to update wine:', err);
      setError('Failed to update wine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!wine) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} title="EDIT WINE" onClose={handleClose}>
      <form className={styles.vineForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            WINE NAME (REQUIRED)
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
            CURRENT VOLUME (GALLONS)
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginLeft: 'var(--spacing-xs)' }}>
              Original: {wine.volume_gallons} gal
            </span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max={wine.volume_gallons}
            className={styles.formInput}
            value={formData.currentVolumeGallons}
            onChange={(e) => setFormData({ ...formData, currentVolumeGallons: e.target.value })}
            placeholder="5.0"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            STATUS
          </label>
          <select
            className={styles.formSelect}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="aging">Aging</option>
            <option value="bottled">Bottled</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            TASTING NOTES (OPTIONAL)
          </label>
          <textarea
            className={styles.formTextarea}
            value={formData.tastingNotes}
            onChange={(e) => setFormData({ ...formData, tastingNotes: e.target.value })}
            placeholder="Latest tasting notes..."
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
            {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>

        <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isSubmitting}
          >
            DELETE WINE
          </button>
        </div>
      </form>

      <DeleteWineConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={(message) => {
          onSuccess(message);
          handleClose();
          onDelete?.();
        }}
        wineId={wineId}
      />
    </Modal>
  );
};
