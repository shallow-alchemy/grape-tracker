import { useEffect, useState } from 'react';
import { useZero } from '../../contexts/ZeroContext';
import { AddVintageModal } from './AddVintageModal';
import styles from '../../App.module.css';

export const WineryView = () => {
  const zero = useZero();
  const [showAddVintageModal, setShowAddVintageModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchVintages = async () => {
      const vintages = await zero.query.vintage.run();
      console.log('Vintages:', vintages);
    };

    fetchVintages();

    const interval = setInterval(fetchVintages, 2000);
    return () => clearInterval(interval);
  }, [zero]);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--spacing-md)'
      }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-accent)' }}>
          WINERY
        </div>
        <button
          className={styles.actionButton}
          onClick={() => setShowAddVintageModal(true)}
        >
          ADD VINTAGE
        </button>
      </div>

      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      <div style={{ marginTop: 'var(--spacing-md)', fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
        Check console for vintage data
      </div>

      <AddVintageModal
        isOpen={showAddVintageModal}
        onClose={() => setShowAddVintageModal(false)}
        onSuccess={showSuccessMessage}
      />
    </div>
  );
};
