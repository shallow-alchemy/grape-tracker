import { useState } from 'react';
import { Modal } from '../Modal';
import { useStageTransition } from './useStageTransition';
import {
  type EntityType,
  getNextStage,
  getSkippableStages,
  getStageMetadata,
  getSkippedStageCount,
} from './stages';
import styles from '../../App.module.css';

type StageTransitionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  entityType: EntityType;
  entityId: string;
  currentStage: string;
  wineType?: string;
};

export const StageTransitionModal = ({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  entityId,
  currentStage,
  wineType,
}: StageTransitionModalProps) => {
  const { advanceStage, isLoading, error: hookError } = useStageTransition(entityType, entityId, wineType);

  const nextStage = getNextStage(currentStage, entityType);
  const skippableStages = getSkippableStages(currentStage, entityType);
  const currentMeta = getStageMetadata(currentStage, entityType);

  const [selectedStage, setSelectedStage] = useState(nextStage?.value || '');
  const [notes, setNotes] = useState('');
  const [skipCurrentStage, setSkipCurrentStage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isOpen && selectedStage === '' && nextStage) {
    setSelectedStage(nextStage.value);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedStage) {
      setFormError('Please select a stage to advance to');
      return;
    }

    const result = await advanceStage(currentStage, {
      toStage: selectedStage,
      notes: notes.trim(),
      skipCurrentStage,
    });

    if (result.success) {
      const selectedMeta = getStageMetadata(selectedStage, entityType);
      const skippedCount = getSkippedStageCount(currentStage, selectedStage, entityType);

      let message = `Advanced to ${selectedMeta?.label || selectedStage}`;
      if (skippedCount > 0) {
        message += ` (skipped ${skippedCount} stage${skippedCount > 1 ? 's' : ''})`;
      }
      if (result.tasksCreated !== undefined && result.tasksCreated > 0) {
        message += ` • Created ${result.tasksCreated} task${result.tasksCreated > 1 ? 's' : ''}`;
      }

      onSuccess(message);
      onClose();
    } else {
      setFormError(result.error || 'Failed to advance stage');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedStage(nextStage?.value || '');
      setNotes('');
      setSkipCurrentStage(false);
      setFormError(null);
      onClose();
    }
  };

  if (!nextStage) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="STAGE COMPLETE">
        <div className={styles.vineForm}>
          <p className={styles.stageCompleteMessage}>
            This {entityType} is already at the final stage: <strong>{currentMeta?.label}</strong>
          </p>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.formButton}
              onClick={handleClose}
            >
              CLOSE
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const selectedMeta = getStageMetadata(selectedStage, entityType);
  const skippedCount = getSkippedStageCount(currentStage, selectedStage, entityType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="COMPLETE STAGE"
      titleRight={
        <label className={styles.skipCheckboxLabel}>
          <input
            type="checkbox"
            checked={skipCurrentStage}
            onChange={(e) => setSkipCurrentStage(e.target.checked)}
            disabled={isLoading}
            className={styles.checkboxCursor}
          />
          Skipped
        </label>
      }
      closeDisabled={isLoading}
    >
      <form className={styles.vineForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <div className={styles.stageTransitionContainer}>
            <div className={styles.stageColumn}>
              <div className={styles.stageLabel}>
                Current Stage
              </div>
              <div className={styles.currentStageValue}>
                {currentMeta?.label}
              </div>
            </div>
            <div className={styles.stageArrow}>
              →
            </div>
            <div className={styles.stageColumn}>
              <div className={styles.stageLabel}>
                Next Stage
              </div>
              <div className={styles.nextStageValue}>
                {selectedMeta?.label}
              </div>
            </div>
          </div>
        </div>

        {skippableStages.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>OR SKIP AHEAD TO</label>
            <select
              className={styles.formSelect}
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              disabled={isLoading}
            >
              <option value={nextStage.value}>{nextStage.label} (next)</option>
              {skippableStages.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
            {skippedCount > 0 && (
              <div className={styles.formHint}>
                This will skip {skippedCount} stage{skippedCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
          <textarea
            className={styles.formTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Notes about ${currentMeta?.label.toLowerCase() || currentStage} stage...`}
            rows={3}
            disabled={isLoading}
          />
        </div>

        {(formError || hookError) && (
          <div className={styles.formError}>
            {formError || hookError}
          </div>
        )}

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.formButtonSecondary}
            onClick={handleClose}
            disabled={isLoading}
          >
            CANCEL
          </button>
          <button
            type="submit"
            className={styles.formButton}
            disabled={isLoading}
          >
            {isLoading ? 'COMPLETING...' : 'COMPLETE STAGE'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
