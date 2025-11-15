import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useZero } from '../contexts/ZeroContext';
import { useVines, useBlocks } from './vineyard-hooks';
import { transformBlockData } from './vineyard-utils';
import styles from '../App.module.css';

type DeleteBlockConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  deleteBlockId: string | null;
  onSuccess: (message: string) => void;
};

export const DeleteBlockConfirmModal = ({
  isOpen,
  onClose,
  deleteBlockId,
  onSuccess,
}: DeleteBlockConfirmModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteVines, setDeleteVines] = useState(false);
  const [deleteMigrateToBlock, setDeleteMigrateToBlock] = useState<string | null>(null);

  const zero = useZero();
  const vinesData = useVines();
  const blocksData = useBlocks();
  const blocks = blocksData.map(transformBlockData);

  const blockToDelete = blocks.find(b => b.id === deleteBlockId);
  const vineCountInBlock = vinesData.filter((v) => v.block === deleteBlockId).length;
  const availableBlocks = blocks.filter(b => b.id !== deleteBlockId);

  useEffect(() => {
    if (isOpen && vineCountInBlock > 0) {
      if (availableBlocks.length > 0) {
        setDeleteVines(false);
        setDeleteMigrateToBlock(availableBlocks[0].id);
      } else {
        setDeleteVines(true);
        setDeleteMigrateToBlock(null);
      }
    }
  }, [isOpen, vineCountInBlock, availableBlocks.length]);

  if (!isOpen) return null;
  if (!blockToDelete) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DELETE BLOCK"
      size="medium"
      closeDisabled={isSubmitting}
    >
      <div>
        <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
          You are about to delete <strong style={{ color: 'var(--color-text-accent)' }}>{blockToDelete.name}</strong>.
          {vineCountInBlock > 0 && (
            <span> This block contains <strong style={{ color: 'var(--color-text-accent)' }}>{vineCountInBlock} vine{vineCountInBlock > 1 ? 's' : ''}</strong>.</span>
          )}
        </p>

        {vineCountInBlock > 0 && availableBlocks.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="radio"
                name="deleteOption"
                checked={!deleteVines}
                onChange={() => {
                  setDeleteVines(false);
                  if (availableBlocks.length > 0 && !deleteMigrateToBlock) {
                    setDeleteMigrateToBlock(availableBlocks[0].id);
                  }
                }}
                style={{ marginRight: 'var(--spacing-sm)' }}
              />
              MIGRATE {vineCountInBlock} VINE{vineCountInBlock > 1 ? 'S' : ''} TO:
            </label>
            {!deleteVines && (
              <select
                className={styles.formSelect}
                value={deleteMigrateToBlock || ''}
                onChange={(e) => setDeleteMigrateToBlock(e.target.value)}
                style={{ marginTop: 'var(--spacing-sm)' }}
              >
                {availableBlocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {vineCountInBlock > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="radio"
                name="deleteOption"
                checked={deleteVines}
                onChange={() => {
                  setDeleteVines(true);
                  setDeleteMigrateToBlock(null);
                }}
                style={{ marginRight: 'var(--spacing-sm)' }}
              />
              DELETE BLOCK AND ALL {vineCountInBlock} VINE{vineCountInBlock > 1 ? 'S' : ''}
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
              setFormErrors({});
              setIsSubmitting(false);
              setDeleteMigrateToBlock(null);
              setDeleteVines(false);
            }}
            disabled={isSubmitting}
          >
            CANCEL
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={async () => {
              if (!deleteBlockId) return;
              setIsSubmitting(true);
              setFormErrors({});

              try {
                const vinesToMigrate = vinesData.filter((v) => v.block === deleteBlockId);
                const vineCount = vinesToMigrate.length;

                if (vineCount > 0) {
                  if (deleteVines) {
                    await Promise.all(
                      vinesToMigrate.map((v) => zero.mutate.vine.delete({ id: v.id }))
                    );
                  } else if (deleteMigrateToBlock) {
                    await Promise.all(
                      vinesToMigrate.map((v) =>
                        zero.mutate.vine.update({
                          id: v.id,
                          block: deleteMigrateToBlock,
                          updated_at: Date.now(),
                        })
                      )
                    );
                  }
                }

                await zero.mutate.block.delete({ id: deleteBlockId });

                onClose();
                setDeleteMigrateToBlock(null);
                setDeleteVines(false);
                onSuccess('Block deleted successfully');
              } catch (error) {
                setFormErrors({ submit: `Failed to delete block: ${error}` });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'DELETING...' : 'CONFIRM DELETE'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
