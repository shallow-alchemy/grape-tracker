import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Modal } from './Modal';
import { type VineFormData } from './vineyard-types';
import { useZero } from '../contexts/ZeroContext';
import { useVines, useBlocks, useVineyard } from './vineyard-hooks';
import { transformBlockData, validateVineForm, generateBatchVineIds } from './vineyard-utils';
import styles from '../App.module.css';

type AddVineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string, vineId?: string) => void;
};

export const AddVineModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddVineModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useUser();
  const zero = useZero();
  const vinesData = useVines();
  const blocksData = useBlocks();
  const vineyardData = useVineyard();

  const blocks = blocksData.map(transformBlockData);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ADD VINE"
      closeDisabled={isSubmitting}
    >
      <form
        className={styles.vineForm}
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const vineData: VineFormData = {
            block: formData.get('block') as string,
            variety: formData.get('variety') as string,
            plantingDate: new Date(formData.get('plantingDate') as string),
            health: formData.get('health') as string,
            notes: formData.get('notes') as string || undefined,
            quantity: Number(formData.get('quantity')) || 1,
          };

          const errors = validateVineForm(vineData);
          if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
          }

          setFormErrors({});
          setIsSubmitting(true);

          try {
            const quantity = vineData.quantity || 1;
            const now = Date.now();
            const vineIds = generateBatchVineIds(vineData.block, vinesData, quantity);

            for (const { id: newVineId, sequenceNumber } of vineIds) {
              await zero.mutate.vine.insert({
                id: newVineId,
                user_id: user!.id,
                block: vineData.block,
                sequence_number: sequenceNumber,
                variety: vineData.variety.toUpperCase(),
                planting_date: vineData.plantingDate.getTime(),
                health: vineData.health,
                notes: vineData.notes || '',
                qr_generated: 0,
                created_at: now,
                updated_at: now,
              });
            }

            onClose();
            if (quantity === 1) {
              const displayId = vineIds[0].sequenceNumber.toString().padStart(3, '0');
              onSuccess(`Vine ${vineData.block}-${displayId} created successfully`, vineIds[0].id);
            } else {
              const firstDisplayId = vineIds[0].sequenceNumber.toString().padStart(3, '0');
              const lastDisplayId = vineIds[vineIds.length - 1].sequenceNumber.toString().padStart(3, '0');
              onSuccess(`${quantity} vines created successfully (${vineData.block}-${firstDisplayId} - ${vineData.block}-${lastDisplayId})`);
            }
          } catch (error) {
            setFormErrors({ submit: 'Failed to create vine. Please try again.' });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>BLOCK</label>
          <select name="block" className={styles.formSelect} required>
            <option value="">Select Block</option>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.name}
              </option>
            ))}
          </select>
          <div className={styles.formHint}>Vineyard section where vine will be planted</div>
          {formErrors.block && <div className={styles.formError}>{formErrors.block}</div>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>QUANTITY</label>
          <input
            type="number"
            name="quantity"
            className={styles.formInput}
            defaultValue={1}
            min={1}
            max={1000}
            required
          />
          <div className={styles.formHint}>Number of vines to create with these settings</div>
          {formErrors.quantity && <div className={styles.formError}>{formErrors.quantity}</div>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>VARIETY</label>
          {vineyardData && vineyardData.varieties && vineyardData.varieties.length > 0 ? (
            <select
              name="variety"
              className={styles.formSelect}
              required
            >
              <option value="">Select Variety</option>
              {vineyardData.varieties.map((variety: string) => (
                <option key={variety} value={variety}>
                  {variety}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                type="text"
                name="variety"
                className={styles.formInput}
                placeholder="CABERNET SAUVIGNON"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
                required
              />
              <div className={styles.formHint}>Add varieties in Vineyard Settings to use dropdown</div>
            </>
          )}
          {formErrors.variety && <div className={styles.formError}>{formErrors.variety}</div>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>PLANTING DATE</label>
          <input
            type="date"
            name="plantingDate"
            className={styles.formInput}
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />
          {formErrors.planting_date && <div className={styles.formError}>{formErrors.planting_date}</div>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>HEALTH STATUS</label>
          <select name="health" className={styles.formSelect} defaultValue="GOOD" required>
            <option value="EXCELLENT">EXCELLENT</option>
            <option value="GOOD">GOOD</option>
            <option value="FAIR">FAIR</option>
            <option value="NEEDS ATTENTION">NEEDS ATTENTION</option>
          </select>
          {formErrors.health && <div className={styles.formError}>{formErrors.health}</div>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>PLANTING NOTES (OPTIONAL)</label>
          <textarea
            name="notes"
            className={styles.formTextarea}
            placeholder="Any notes about planting..."
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
            {isSubmitting ? 'CREATING...' : 'CREATE VINE'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
