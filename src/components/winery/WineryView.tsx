import { useState } from 'react';
import { useLocation } from 'wouter';
import { AddVintageModal } from './AddVintageModal';
import { VintagesList } from './VintagesList';
import { VintageDetailsView } from './VintageDetailsView';
import styles from '../../App.module.css';

type WineryViewProps = {
  initialVintageId?: string;
};

export const WineryView = ({ initialVintageId }: WineryViewProps) => {
  const [, setLocation] = useLocation();
  const [showAddVintageModal, setShowAddVintageModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleVintageClick = (vintageId: string) => {
    sessionStorage.setItem('internalNav', 'true');
    setLocation(`/winery/vintage/${vintageId}`);
  };

  const navigateBack = () => {
    const hasInternalNav = sessionStorage.getItem('internalNav') === 'true';
    if (hasInternalNav) {
      window.history.back();
    } else {
      setLocation('/winery');
    }
  };

  if (initialVintageId) {
    return <VintageDetailsView vintageId={initialVintageId} onBack={navigateBack} />;
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <div className={styles.vineyardTitle}>WINERY</div>
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

      <VintagesList onVintageClick={handleVintageClick} />

      <AddVintageModal
        isOpen={showAddVintageModal}
        onClose={() => setShowAddVintageModal(false)}
        onSuccess={showSuccessMessage}
      />
    </div>
  );
};
