import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useZero } from '../contexts/ZeroContext';
import { type VineDataRaw } from './vineyard-types';
import styles from '../App.module.css';

type RemoveVarietyConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  removedVarieties: string[];
  affectedVines: VineDataRaw[];
  remainingVarieties: string[];
  onConfirm: () => Promise<void>;
};

export const RemoveVarietyConfirmModal = ({
  isOpen,
  onClose,
  removedVarieties,
  affectedVines,
  remainingVarieties,
  onConfirm,
}: RemoveVarietyConfirmModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteVines, setDeleteVines] = useState(false);
  const [migrateToVariety, setMigrateToVariety] = useState<string | null>(null);

  const zero = useZero();

  useEffect(() => {
    if (isOpen && affectedVines.length > 0) {
      if (remainingVarieties.length > 0) {
        setDeleteVines(false);
        setMigrateToVariety(remainingVarieties[0]);
      } else {
        setDeleteVines(true);
        setMigrateToVariety(null);
      }
    }
  }, [isOpen, affectedVines.length, remainingVarieties.length]);

  const resetState = () => {
    setFormErrors({});
    setIsSubmitting(false);
    setMigrateToVariety(null);
    setDeleteVines(false);
  };

  if (!isOpen) return null;

  const varietyList = removedVarieties.join(', ');
  const vineCount = affectedVines.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetState();
      }}
      title="REMOVE VARIETIES"
      size="medium"
      closeDisabled={isSubmitting}
    >
      <div>
        <p className={styles.deleteWarningText}>
          You are removing {removedVarieties.length === 1 ? 'variety' : 'varieties'}{' '}
          <strong className={styles.deleteWarningHighlight}>{varietyList}</strong>.
          {vineCount > 0 && (
            <span>
              {' '}
              {vineCount} vine{vineCount > 1 ? 's' : ''} {vineCount > 1 ? 'are' : 'is'} using{' '}
              {removedVarieties.length === 1 ? 'this variety' : 'these varieties'}.
            </span>
          )}
        </p>

        {vineCount > 0 && remainingVarieties.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="radio"
                name="deleteOption"
                checked={!deleteVines}
                onChange={() => {
                  setDeleteVines(false);
                  if (remainingVarieties.length > 0 && !migrateToVariety) {
                    setMigrateToVariety(remainingVarieties[0]);
                  }
                }}
                className={styles.radioInputSpaced}
              />
              MIGRATE {vineCount} VINE{vineCount > 1 ? 'S' : ''} TO:
            </label>
            {!deleteVines && (
              <select
                className={`${styles.formSelect} ${styles.selectWithTopMargin}`}
                value={migrateToVariety || ''}
                onChange={(e) => setMigrateToVariety(e.target.value)}
              >
                {remainingVarieties.map((variety) => (
                  <option key={variety} value={variety}>
                    {variety}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {vineCount > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="radio"
                name="deleteOption"
                checked={deleteVines}
                onChange={() => {
                  setDeleteVines(true);
                  setMigrateToVariety(null);
                }}
                className={styles.radioInputSpaced}
              />
              DELETE ALL {vineCount} AFFECTED VINE{vineCount > 1 ? 'S' : ''}
            </label>
          </div>
        )}

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.formButtonSecondary}
            onClick={() => {
              onClose();
              resetState();
            }}
            disabled={isSubmitting}
          >
            CANCEL
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={async () => {
              setIsSubmitting(true);
              setFormErrors({});

              try {
                if (vineCount > 0) {
                  if (deleteVines) {
                    await Promise.all(
                      affectedVines.map((v) => zero.mutate.vine.delete({ id: v.id }))
                    );
                  } else if (migrateToVariety) {
                    await Promise.all(
                      affectedVines.map((v) =>
                        zero.mutate.vine.update({
                          id: v.id,
                          variety: migrateToVariety,
                          updated_at: Date.now(),
                        })
                      )
                    );
                  }
                }

                await onConfirm();
                onClose();
                resetState();
              } catch (error) {
                setFormErrors({ submit: `Failed to update varieties: ${error}` });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'UPDATING...' : 'CONFIRM'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
