import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { RemoveVarietyConfirmModal } from './RemoveVarietyConfirmModal';
import { VarietyInput } from './VarietyInput';
import { type VineyardFormData, type VineDataRaw } from './vineyard-types';
import { useZero } from '../contexts/ZeroContext';
import { useVineyard, useVines } from './vineyard-hooks';
import styles from '../App.module.css';

type VineyardSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export const VineyardSettingsModal = ({
  isOpen,
  onClose,
  onSuccess,
}: VineyardSettingsModalProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRemoveVarietyConfirm, setShowRemoveVarietyConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<VineyardFormData | null>(null);
  const [removedVarieties, setRemovedVarieties] = useState<string[]>([]);
  const [affectedVines, setAffectedVines] = useState<VineDataRaw[]>([]);
  const [varieties, setVarieties] = useState<string[]>([]);

  const zero = useZero();
  const vineyardData = useVineyard();
  const vinesData = useVines();

  // Sync varieties state with vineyard data when modal opens
  useEffect(() => {
    if (isOpen && vineyardData?.varieties) {
      setVarieties(vineyardData.varieties);
    }
  }, [isOpen, vineyardData?.varieties]);
  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="VINEYARD SETTINGS"
      size="large"
      closeDisabled={isSubmitting}
    >
      {vineyardData && (
        <form
          className={styles.vineForm}
          onSubmit={async (e) => {
            e.preventDefault();
            setFormErrors({});
            setIsSubmitting(true);

            try {
              const formData = new FormData(e.currentTarget);
              const laborHoursStr = formData.get('available_labor_hours') as string;

              const vineyardFormData: VineyardFormData = {
                name: formData.get('name') as string,
                location: formData.get('location') as string,
                varieties: varieties,
                available_labor_hours: laborHoursStr ? parseInt(laborHoursStr, 10) : null,
              };

              const currentVarieties = vineyardData.varieties || [];
              const removed = currentVarieties.filter(
                (v: string) => !varieties.includes(v)
              );

              const vinesUsingRemovedVarieties = vinesData.filter((vine) =>
                removed.includes(vine.variety)
              );

              if (vinesUsingRemovedVarieties.length > 0) {
                setPendingFormData(vineyardFormData);
                setRemovedVarieties(removed);
                setAffectedVines(vinesUsingRemovedVarieties);
                setShowRemoveVarietyConfirm(true);
                setIsSubmitting(false);
                return;
              }

              const now = Date.now();

              await zero.mutate.vineyard.update({
                id: vineyardData.id,
                name: vineyardFormData.name,
                location: vineyardFormData.location,
                varieties: vineyardFormData.varieties,
                available_labor_hours: vineyardFormData.available_labor_hours,
                updated_at: now,
              });

              onClose();
              onSuccess('Vineyard settings updated successfully');
            } catch (error) {
              setFormErrors({ submit: `Failed to update vineyard: ${error}` });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>VINEYARD NAME</label>
            <input
              type="text"
              name="name"
              className={styles.formInput}
              defaultValue={vineyardData.name}
              placeholder="My Vineyard"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>LOCATION</label>
            <div className={styles.locationInputRow}>
              <input
                type="text"
                name="location"
                className={`${styles.formInput} ${styles.locationInputFlex}`}
                defaultValue={vineyardData.location}
                placeholder="Coordinates or address"
              />
              <button
                type="button"
                className={styles.formButtonSecondary}
                onClick={() => {
                  if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const input = document.querySelector('input[name="location"]') as HTMLInputElement;
                        if (input) {
                          input.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                        }
                      },
                      (error) => {
                        setFormErrors({ location: 'Unable to get location: ' + error.message });
                      }
                    );
                  } else {
                    setFormErrors({ location: 'Geolocation not supported' });
                  }
                }}
              >
                USE CURRENT LOCATION
              </button>
            </div>
            <div className={styles.formHint}>Geographic coordinates or physical address</div>
            {formErrors.location && <div className={styles.formError}>{formErrors.location}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>VARIETIES</label>
            <VarietyInput
              value={varieties}
              onChange={setVarieties}
              placeholder="Type to search varieties..."
            />
            <div className={styles.formHint}>Select from known varieties or add custom ones</div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>AVAILABLE LABOR HOURS (WEEKLY)</label>
            <input
              type="number"
              name="available_labor_hours"
              className={styles.formInput}
              defaultValue={vineyardData.available_labor_hours || ''}
              placeholder="Hours per week"
              min={0}
              max={168}
            />
            <div className={styles.formHint}>Helps AI suggest manageable training systems</div>
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
              {isSubmitting ? 'SAVING...' : 'SAVE SETTINGS'}
            </button>
          </div>
        </form>
      )}
    </Modal>

      <RemoveVarietyConfirmModal
        isOpen={showRemoveVarietyConfirm}
        onClose={() => {
          setShowRemoveVarietyConfirm(false);
          setPendingFormData(null);
          setRemovedVarieties([]);
          setAffectedVines([]);
        }}
        removedVarieties={removedVarieties}
        affectedVines={affectedVines}
        remainingVarieties={pendingFormData?.varieties || []}
        onConfirm={async () => {
          if (!pendingFormData || !vineyardData) return;
          const now = Date.now();
          await zero.mutate.vineyard.update({
            id: vineyardData.id,
            name: pendingFormData.name,
            location: pendingFormData.location,
            varieties: pendingFormData.varieties,
            available_labor_hours: pendingFormData.available_labor_hours,
            updated_at: now,
          });
          onClose();
          onSuccess('Vineyard settings updated successfully');
        }}
      />
    </>
  );
};
