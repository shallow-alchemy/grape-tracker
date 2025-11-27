import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useZero } from '../../contexts/ZeroContext';
import { Modal } from '../Modal';
import styles from '../../App.module.css';

type OnboardingModalProps = {
  isOpen: boolean;
  onComplete: () => void;
};

export const OnboardingModal = ({ isOpen, onComplete }: OnboardingModalProps) => {
  const { user } = useUser();
  const zero = useZero();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[OnboardingModal] Form submitted');
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const vineyardName = formData.get('name') as string;
      const location = formData.get('location') as string;

      console.log('[OnboardingModal] vineyardName:', vineyardName, 'location:', location);

      if (!vineyardName.trim()) {
        setFormErrors({ name: 'Vineyard name is required' });
        setIsSubmitting(false);
        return;
      }

      const vineyardId = crypto.randomUUID();
      const now = Date.now();

      console.log('[OnboardingModal] Creating vineyard:', vineyardId);
      // Create vineyard first
      await zero.mutate.vineyard.insert({
        id: vineyardId,
        user_id: user!.id,
        name: vineyardName.trim(),
        location: location.trim(),
        varieties: [],
        created_at: now,
        updated_at: now,
      });
      console.log('[OnboardingModal] Vineyard created');

      console.log('[OnboardingModal] Creating user record:', user!.id);
      // Create user record
      await zero.mutate.user.insert({
        id: user!.id, // Clerk ID as primary key
        email: user!.primaryEmailAddress?.emailAddress || '',
        display_name: user!.fullName || user!.username || 'User',
        vineyard_id: vineyardId,
        role: 'owner',
        onboarding_completed: true,
        created_at: now,
        updated_at: now,
      });
      console.log('[OnboardingModal] User record created');

      // Wait for mutations to sync to server before navigating
      // Without this delay, the page navigation destroys the Zero client
      // before mutations can be sent to the server
      console.log('[OnboardingModal] Waiting for sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('[OnboardingModal] Calling onComplete');
      onComplete();
    } catch (error) {
      console.error('[OnboardingModal] Error:', error);
      setFormErrors({ submit: `Failed to complete setup: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Cannot close - must complete onboarding
      title="WELCOME TO GILBERT"
      closeDisabled={true}
    >
      <form className={styles.vineForm} onSubmit={handleSubmit}>
        <p className={styles.formHint} style={{ marginBottom: 'var(--spacing-xl)' }}>
          Let's set up your vineyard to get started.
        </p>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>VINEYARD NAME</label>
          <input
            type="text"
            name="name"
            className={styles.formInput}
            placeholder="My Vineyard"
            required
            autoFocus
          />
          {formErrors.name && <div className={styles.formError}>{formErrors.name}</div>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>LOCATION (OPTIONAL)</label>
          <div className={styles.locationInputRow}>
            <input
              type="text"
              name="location"
              className={`${styles.formInput} ${styles.locationInputFlex}`}
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
                    (error) => setFormErrors({ location: 'Unable to get location: ' + error.message })
                  );
                } else {
                  setFormErrors({ location: 'Geolocation not supported' });
                }
              }}
            >
              USE CURRENT LOCATION
            </button>
          </div>
          {formErrors.location && <div className={styles.formError}>{formErrors.location}</div>}
        </div>

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

        <div className={styles.formActions}>
          <button type="submit" className={styles.formButton} disabled={isSubmitting}>
            {isSubmitting ? 'SETTING UP...' : 'GET STARTED'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
