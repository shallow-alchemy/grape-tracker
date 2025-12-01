import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { Modal } from '../Modal';
import { useZero } from '../../contexts/ZeroContext';
import { myWinesByVintage, myStageHistoryByEntity, myMeasurementsByEntity, myTasksByEntity } from '../../shared/queries';
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
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zero = useZero();

  // Safe access - prevent crash if data not yet loaded
  const [winesDataRaw] = useQuery(myWinesByVintage(user?.id, vintage.id) as any) as any;
  const winesData = winesDataRaw || [];

  const [stageHistoryDataRaw] = useQuery(
    myStageHistoryByEntity(user?.id, 'vintage', vintage.id)
  ) as any;
  const stageHistoryData = stageHistoryDataRaw || [];

  const [measurementsDataRaw] = useQuery(
    myMeasurementsByEntity(user?.id, 'vintage', vintage.id)
  ) as any;
  const measurementsData = measurementsDataRaw || [];

  const [tasksDataRaw] = useQuery(
    myTasksByEntity(user?.id, 'vintage', vintage.id)
  ) as any;
  const tasksData = tasksDataRaw || [];

  const [allWineTasksDataRaw] = useQuery(myTasksByEntity(user?.id, 'wine', winesData[0]?.id || 'none') as any) as any;
  const wineTasksData = (allWineTasksDataRaw || []).filter((t: any) => winesData.some((w: any) => w.id === t.entity_id));

  const [allWineMeasurementsDataRaw] = useQuery(myMeasurementsByEntity(user?.id, 'wine', winesData[0]?.id || 'none') as any) as any;
  const wineMeasurementsData = (allWineMeasurementsDataRaw || []).filter((m: any) => winesData.some((w: any) => w.id === m.entity_id));

  const [allWineStageHistoryDataRaw] = useQuery(myStageHistoryByEntity(user?.id, 'wine', winesData[0]?.id || 'none') as any) as any;
  const wineStageHistoryData = (allWineStageHistoryDataRaw || []).filter((s: any) => winesData.some((w: any) => w.id === s.entity_id));

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
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

      for (const task of tasksData) {
        await zero.mutate.task.delete({ id: task.id });
      }

      for (const measurement of measurementsData) {
        await zero.mutate.measurement.delete({ id: measurement.id });
      }

      for (const stage of stageHistoryData) {
        await zero.mutate.stage_history.delete({ id: stage.id });
      }

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
