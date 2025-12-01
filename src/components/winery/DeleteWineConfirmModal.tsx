import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import { myWines, myVintages, myStageHistoryByEntity, myMeasurementsByEntity, myTasksByEntity } from '../../shared/queries';
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
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zero = useZero();
  const [allWinesData] = useQuery(myWines(user?.id) as any) as any;
  // Safe access - prevent crash if data not yet loaded
  const wine = (allWinesData || []).find((w: any) => w.id === wineId);

  const [allVintagesData] = useQuery(myVintages(user?.id) as any) as any;
  const vintage = (allVintagesData || []).find((v: any) => v.id === wine?.vintage_id);

  const [stageHistoryDataRaw] = useQuery(
    myStageHistoryByEntity(user?.id, 'wine', wineId)
  ) as any;
  const stageHistoryData = stageHistoryDataRaw || [];

  const [measurementsDataRaw] = useQuery(
    myMeasurementsByEntity(user?.id, 'wine', wineId)
  ) as any;
  const measurementsData = measurementsDataRaw || [];

  const [tasksDataRaw] = useQuery(
    myTasksByEntity(user?.id, 'wine', wineId)
  ) as any;
  const tasksData = tasksDataRaw || [];

  const handleDelete = async () => {
    if (!wine) return;

    setIsDeleting(true);
    setError(null);

    try {
      for (const stage of stageHistoryData) {
        await zero.mutate.stage_history.delete({ id: stage.id });
      }

      for (const measurement of measurementsData) {
        await zero.mutate.measurement.delete({ id: measurement.id });
      }

      for (const task of tasksData) {
        await zero.mutate.task.delete({ id: task.id });
      }

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
