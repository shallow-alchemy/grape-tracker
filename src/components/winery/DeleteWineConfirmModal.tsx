import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type DeleteWineConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  wineId: string;
};

export const DeleteWineConfirmModal = ({
  isOpen,
  onClose,
  onSuccess,
  wineId,
}: DeleteWineConfirmModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zero = useZero();
  const [winesData] = useQuery(zero.query.wine.where('id', wineId));
  const wine = winesData[0];

  const [vintagesData] = useQuery(
    wine ? zero.query.vintage.where('id', wine.vintage_id) : zero.query.vintage.where('id', 'none')
  );
  const vintage = vintagesData[0];

  // Fetch related records to show what will be deleted
  const [stageHistoryData] = useQuery(
    zero.query.stage_history
      .where('entity_type', 'wine')
      .where('entity_id', wineId)
  );

  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'wine')
      .where('entity_id', wineId)
  );

  const [tasksData] = useQuery(
    zero.query.task
      .where('entity_type', 'wine')
      .where('entity_id', wineId)
  );

  const handleDelete = async () => {
    if (!wine) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Delete related stage history
      for (const stage of stageHistoryData) {
        await zero.mutate.stage_history.delete({ id: stage.id });
      }

      // Delete related measurements
      for (const measurement of measurementsData) {
        await zero.mutate.measurement.delete({ id: measurement.id });
      }

      // Delete related tasks
      for (const task of tasksData) {
        await zero.mutate.task.delete({ id: task.id });
      }

      // Delete the wine itself
      await zero.mutate.wine.delete({ id: wineId });

      const wineName = vintage ? `${vintage.vintage_year} ${wine.name}` : wine.name;
      onSuccess(`${wineName} deleted successfully`);
      onClose();
    } catch (err) {
      console.error('Error deleting wine:', err);
      setError('Failed to delete wine. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!wine) return null;

  const wineName = vintage ? `${vintage.vintage_year} ${wine.name}` : wine.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DELETE WINE?"
      closeDisabled={isDeleting}
    >
      <div className={styles.deleteConfirmContent}>
        <p className={styles.deleteConfirmText}>
          Are you sure you want to delete {wineName}?
        </p>

        <div className={styles.deleteWarning}>
          <div className={styles.deleteWarningTitle}>This will also delete:</div>
          <ul className={styles.deleteWarningList}>
            <li>{stageHistoryData.length} stage history {stageHistoryData.length === 1 ? 'record' : 'records'}</li>
            <li>{measurementsData.length} {measurementsData.length === 1 ? 'measurement' : 'measurements'}</li>
            <li>{tasksData.length} {tasksData.length === 1 ? 'task' : 'tasks'}</li>
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
            {isDeleting ? 'DELETING...' : 'DELETE WINE'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
