import { useState } from 'react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type DeleteVintageConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  vintage: {
    id: string;
    vintage_year: number;
    variety: string;
  };
};

export const DeleteVintageConfirmModal = ({
  isOpen,
  onClose,
  onSuccess,
  vintage,
}: DeleteVintageConfirmModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zero = useZero();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await zero.mutate.vintage.delete({ id: vintage.id });

      onSuccess(`${vintage.vintage_year} ${vintage.variety} deleted successfully`);
      onClose();
    } catch (err) {
      console.error('Error deleting vintage:', err);
      setError('Failed to delete vintage. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DELETE VINTAGE?"
      closeDisabled={isDeleting}
    >
      <div className={styles.deleteConfirmContent}>
        <p className={styles.deleteConfirmText}>
          Are you sure you want to delete the {vintage.vintage_year} {vintage.variety} vintage?
        </p>

        <div className={styles.deleteWarning}>
          <div className={styles.deleteWarningTitle}>This will also delete:</div>
          <ul className={styles.deleteWarningList}>
            <li>All associated wine records</li>
            <li>Stage history</li>
            <li>Task history</li>
            <li>Measurements</li>
          </ul>
        </div>

        <p className={styles.deleteConfirmWarning}>
          This action cannot be undone.
        </p>

        {error && <div className={styles.formError}>{error}</div>}

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.formButtonSecondary}
            onClick={onClose}
            disabled={isDeleting}
          >
            CANCEL
          </button>
          <button
            type="button"
            className={styles.formButton}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'DELETING...' : 'DELETE VINTAGE'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
