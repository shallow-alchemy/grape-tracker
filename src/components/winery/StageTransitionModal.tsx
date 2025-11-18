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

  // Form state
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
    // No next stage available (already at final stage)
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="STAGE COMPLETE">
        <div className={styles.vineForm}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}>
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
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          margin: 0,
        }}>
          <input
            type="checkbox"
            checked={skipCurrentStage}
            onChange={(e) => setSkipCurrentStage(e.target.checked)}
            disabled={isLoading}
            style={{ cursor: 'pointer' }}
          />
          Skipped
        </label>
      }
      closeDisabled={isLoading}
    >
      <form className={styles.vineForm} onSubmit={handleSubmit}>
        {/* Current → Next Stage Display */}
        <div className={styles.formGroup}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                marginBottom: 'var(--spacing-xs)',
              }}>
                Current Stage
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-primary)',
              }}>
                {currentMeta?.label}
              </div>
            </div>
            <div style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--color-primary-500)',
            }}>
              →
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                marginBottom: 'var(--spacing-xs)',
              }}>
                Next Stage
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-primary-400)',
              }}>
                {selectedMeta?.label}
              </div>
            </div>
          </div>
        </div>

        {/* Skip Ahead Option (if available) */}
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

        {/* Notes */}
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

        {/* Error Display */}
        {(formError || hookError) && (
          <div className={styles.formError}>
            {formError || hookError}
          </div>
        )}

        {/* Actions */}
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
