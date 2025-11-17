import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
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

  // Query all related records
  const [winesData] = useQuery(zero.query.wine.where('vintage_id', vintage.id));

  const [stageHistoryData] = useQuery(
    zero.query.stage_history
      .where('entity_type', 'vintage')
      .where('entity_id', vintage.id)
  );

  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'vintage')
      .where('entity_id', vintage.id)
  );

  const [tasksData] = useQuery(
    zero.query.task
      .where('entity_type', 'vintage')
      .where('entity_id', vintage.id)
  );

  // Also need to get tasks/measurements/stage_history for all wines
  const [allWineTasksData] = useQuery(
    winesData.length > 0
      ? zero.query.task.where('entity_type', 'wine')
      : zero.query.task.where('id', 'none')
  );
  const wineTasksData = allWineTasksData.filter(t => winesData.some(w => w.id === t.entity_id));

  const [allWineMeasurementsData] = useQuery(
    winesData.length > 0
      ? zero.query.measurement.where('entity_type', 'wine')
      : zero.query.measurement.where('id', 'none')
  );
  const wineMeasurementsData = allWineMeasurementsData.filter(m => winesData.some(w => w.id === m.entity_id));

  const [allWineStageHistoryData] = useQuery(
    winesData.length > 0
      ? zero.query.stage_history.where('entity_type', 'wine')
      : zero.query.stage_history.where('id', 'none')
  );
  const wineStageHistoryData = allWineStageHistoryData.filter(s => winesData.some(w => w.id === s.entity_id));

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Delete all wine-related records first
      for (const task of wineTasksData) {
        await zero.mutate.task.delete({ id: task.id });
      }

      for (const measurement of wineMeasurementsData) {
        await zero.mutate.measurement.delete({ id: measurement.id });
      }

      for (const stage of wineStageHistoryData) {
        await zero.mutate.stage_history.delete({ id: stage.id });
      }

      for (const wine of winesData) {
        await zero.mutate.wine.delete({ id: wine.id });
      }

      // Delete vintage-related records
      for (const task of tasksData) {
        await zero.mutate.task.delete({ id: task.id });
      }

      for (const measurement of measurementsData) {
        await zero.mutate.measurement.delete({ id: measurement.id });
      }

      for (const stage of stageHistoryData) {
        await zero.mutate.stage_history.delete({ id: stage.id });
      }

      // Finally delete the vintage itself
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
            <li>{winesData.length} {winesData.length === 1 ? 'wine' : 'wines'}</li>
            <li>{stageHistoryData.length + wineStageHistoryData.length} stage history {stageHistoryData.length + wineStageHistoryData.length === 1 ? 'record' : 'records'}</li>
            <li>{tasksData.length + wineTasksData.length} {tasksData.length + wineTasksData.length === 1 ? 'task' : 'tasks'}</li>
            <li>{measurementsData.length + wineMeasurementsData.length} {measurementsData.length + wineMeasurementsData.length === 1 ? 'measurement' : 'measurements'}</li>
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
