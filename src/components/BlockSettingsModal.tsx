import { useState } from 'react';
import { type Zero } from '@rocicorp/zero';
import { type Schema } from '../../schema';
import { Modal } from './Modal';
import { type BlockFormData } from './vineyard-types';
import { useVines, useBlocks } from './vineyard-hooks';
import { transformBlockData } from './vineyard-utils';
import styles from '../App.module.css';

type BlockSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedBlock: string | null;
  z: Zero<Schema>;
  onSuccess: (message: string) => void;
  onDeleteClick: (blockId: string) => void;
};

export const BlockSettingsModal = ({
  isOpen,
  onClose,
  selectedBlock,
  z,
  onSuccess,
  onDeleteClick,
}: BlockSettingsModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vinesData = useVines(z);
  const blocksData = useBlocks(z);
  const blocks = blocksData.map(transformBlockData);

  const blockToEdit = blocks.find(b => b.id === selectedBlock);
  if (!blockToEdit) return null;

  const vineCountInBlock = vinesData.filter((v) => v.block === selectedBlock).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="BLOCK SETTINGS"
      size="large"
      closeDisabled={isSubmitting}
    >
      <form
        className={styles.vineForm}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSubmitting(true);
          setFormErrors({});

          try {
            const formData = new FormData(e.currentTarget);
            const blockData: BlockFormData = {
              name: formData.get('name') as string,
              location: formData.get('location') as string || undefined,
              sizeAcres: formData.get('sizeAcres') ? Number(formData.get('sizeAcres')) : undefined,
              soilType: formData.get('soilType') as string || undefined,
              notes: formData.get('notes') as string || undefined,
            };

            const now = Date.now();

            await z.mutate.block.update({
              id: selectedBlock!,
              name: blockData.name.toUpperCase(),
              location: blockData.location || '',
              sizeAcres: blockData.sizeAcres || 0,
              soilType: blockData.soilType || '',
              notes: blockData.notes || '',
              updatedAt: now,
            });

            onClose();
            onSuccess(`Block ${blockData.name} updated successfully`);
          } catch (error) {
            setFormErrors({ submit: `Failed to update block: ${error}` });
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
            defaultValue={blockToEdit.name}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
            }}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>LOCATION (OPTIONAL)</label>
          <input
            type="text"
            name="location"
            className={styles.formInput}
            defaultValue={blockToEdit.location}
            placeholder="North section, near barn"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>SIZE IN ACRES (OPTIONAL)</label>
          <input
            type="number"
            name="sizeAcres"
            className={styles.formInput}
            defaultValue={blockToEdit.sizeAcres || 0}
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
            defaultValue={blockToEdit.soilType}
            placeholder="Clay, sandy loam, etc."
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
          <textarea
            name="notes"
            className={styles.formTextarea}
            defaultValue={blockToEdit.notes}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>
        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
        <div className={styles.formActions}>
          <button type="submit" className={styles.formButton} disabled={isSubmitting}>
            {isSubmitting ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
        </div>
        <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => {
              onDeleteClick(selectedBlock!);
            }}
            disabled={isSubmitting}
          >
            DELETE BLOCK {vineCountInBlock > 0 && `(${vineCountInBlock} VINES)`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
