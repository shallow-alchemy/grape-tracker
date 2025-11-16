import { useState } from 'react';
import { useLocation } from 'wouter';
import { AddVintageModal } from './AddVintageModal';
import { AddWineModal } from './AddWineModal';
import { VintagesList } from './VintagesList';
import { WinesList } from './WinesList';
import { VintageDetailsView } from './VintageDetailsView';
import { WineDetailsView } from './WineDetailsView';
import styles from '../../App.module.css';

type WineryViewProps = {
  initialVintageId?: string;
  initialWineId?: string;
};

type ActiveTab = 'vintages' | 'wines';

export const WineryView = ({ initialVintageId, initialWineId }: WineryViewProps) => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('vintages');
  const [showAddVintageModal, setShowAddVintageModal] = useState(false);
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleVintageClick = (vintageId: string) => {
    sessionStorage.setItem('internalNav', 'true');
    setLocation(`/winery/vintage/${vintageId}`);
  };

  const handleWineClick = (wineId: string) => {
    sessionStorage.setItem('internalNav', 'true');
    setLocation(`/winery/wine/${wineId}`);
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

  if (initialWineId) {
    return <WineDetailsView wineId={initialWineId} onBack={navigateBack} />;
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <div className={styles.vineyardTitle}>WINERY</div>
        <button
          className={styles.actionButton}
          onClick={() => {
            if (activeTab === 'vintages') {
              setShowAddVintageModal(true);
            } else {
              setShowAddWineModal(true);
            }
          }}
        >
          {activeTab === 'vintages' ? 'ADD VINTAGE' : 'ADD WINE'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--spacing-sm)',
      }}>
        <button
          onClick={() => setActiveTab('vintages')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'vintages' ? 'var(--color-primary-500)' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderBottom: activeTab === 'vintages' ? '2px solid var(--color-primary-500)' : 'none',
            transition: 'color 0.2s ease',
          }}
        >
          VINTAGES
        </button>
        <button
          onClick={() => setActiveTab('wines')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'wines' ? 'var(--color-primary-500)' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderBottom: activeTab === 'wines' ? '2px solid var(--color-primary-500)' : 'none',
            transition: 'color 0.2s ease',
          }}
        >
          WINES
        </button>
      </div>

      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {activeTab === 'vintages' ? (
        <VintagesList onVintageClick={handleVintageClick} />
      ) : (
        <WinesList onWineClick={handleWineClick} />
      )}

      <AddVintageModal
        isOpen={showAddVintageModal}
        onClose={() => setShowAddVintageModal(false)}
        onSuccess={showSuccessMessage}
      />

      <AddWineModal
        isOpen={showAddWineModal}
        onClose={() => setShowAddWineModal(false)}
        onSuccess={showSuccessMessage}
      />
    </div>
  );
};
