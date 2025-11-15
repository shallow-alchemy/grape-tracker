import { useState } from 'react';
import { Modal } from './Modal';
import { type BlockFormData } from './vineyard-types';
import { useZero } from '../contexts/ZeroContext';
import styles from '../App.module.css';

type AddBlockModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export const AddBlockModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddBlockModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const zero = useZero();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ADD BLOCK"
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
            const blockData: BlockFormData = {
              name: formData.get('name') as string,
              location: formData.get('location') as string || undefined,
              sizeAcres: formData.get('sizeAcres') ? Number(formData.get('sizeAcres')) : undefined,
              soilType: formData.get('soilType') as string || undefined,
              notes: formData.get('notes') as string || undefined,
            };

            const blockId = blockData.name.replace(/^BLOCK\s+/, '').trim();
            const now = Date.now();

            await zero.mutate.block.insert({
              id: blockId,
              name: blockData.name.toUpperCase(),
              location: blockData.location || '',
              size_acres: blockData.sizeAcres || 0,
              soil_type: blockData.soilType || '',
              notes: blockData.notes || '',
              created_at: now,
              updated_at: now,
            });

            onClose();
            onSuccess(`Block ${blockData.name} created successfully`);
          } catch (error) {
            setFormErrors({ submit: 'Failed to create block. Please try again.' });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>BLOCK NAME</label>
          <input
            type="text"
            name="name"
            className={styles.formInput}
            placeholder="BLOCK E"
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
            }}
            required
          />
          <div className={styles.formHint}>Name of the vineyard block (automatically converted to uppercase)</div>
          {formErrors.name && <div className={styles.formError}>{formErrors.name}</div>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>LOCATION (OPTIONAL)</label>
          <input
            type="text"
            name="location"
            className={styles.formInput}
            placeholder="North section, near barn"
          />
          <div className={styles.formHint}>Physical location or description</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>SIZE IN ACRES (OPTIONAL)</label>
          <input
            type="number"
            name="sizeAcres"
            className={styles.formInput}
            placeholder="0"
            step="0.1"
            min="0"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>SOIL TYPE (OPTIONAL)</label>
          <input
            type="text"
            name="soilType"
            className={styles.formInput}
            placeholder="Clay, sandy loam, etc."
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
          <textarea
            name="notes"
            className={styles.formTextarea}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>
        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.formButtonSecondary}
            onClick={() => {
              onClose();
              setFormErrors({});
              setIsSubmitting(false);
            }}
            disabled={isSubmitting}
          >
            CANCEL
          </button>
          <button type="submit" className={styles.formButton} disabled={isSubmitting}>
            {isSubmitting ? 'CREATING...' : 'CREATE BLOCK'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
