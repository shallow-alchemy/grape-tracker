import { useState } from 'react';
import { Modal } from './Modal';
import { type VineyardFormData } from './vineyard-types';
import { useZero } from '../contexts/ZeroContext';
import { useVineyard } from './vineyard-hooks';
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

  const zero = useZero();
  const vineyardData = useVineyard();
  return (
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
              const varietiesInput = formData.get('varieties') as string;
              const varieties = varietiesInput
                .split(',')
                .map(v => v.trim().toUpperCase())
                .filter(v => v.length > 0);

              const vineyardFormData: VineyardFormData = {
                name: formData.get('name') as string,
                location: formData.get('location') as string,
                varieties,
              };

              const now = Date.now();

              await zero.mutate.vineyard.update({
                id: 'default',
                name: vineyardFormData.name,
                location: vineyardFormData.location,
                varieties: vineyardFormData.varieties,
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
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <input
                type="text"
                name="location"
                className={styles.formInput}
                defaultValue={vineyardData.location}
                placeholder="Coordinates or address"
                style={{ flex: 1 }}
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
            <textarea
              name="varieties"
              className={styles.formTextarea}
              defaultValue={vineyardData.varieties?.join(', ') || ''}
              placeholder="CABERNET SAUVIGNON, PINOT NOIR, CHARDONNAY"
              rows={4}
            />
            <div className={styles.formHint}>Comma-separated list of grape varieties (automatically converted to uppercase)</div>
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
  );
};
