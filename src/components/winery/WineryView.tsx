import { useState } from 'react';
import { useLocation } from 'wouter';
import { useActiveWines } from '../vineyard-hooks';
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
  const [location, setLocation] = useLocation();
  const [showAddVintageModal, setShowAddVintageModal] = useState(false);
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [wineModalInitialVintageId, setWineModalInitialVintageId] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeWinesData = useActiveWines();
  const activeWineCount = activeWinesData.length;

  const activeTab: ActiveTab = location.includes('/winery/wines') ? 'wines' : 'vintages';

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleVintageClick = (vintageId: string) => {
    sessionStorage.setItem('internalNav', 'true');
    setLocation(`/winery/vintages/${vintageId}`);
  };

  const handleWineClick = (wineId: string) => {
    sessionStorage.setItem('internalNav', 'true');
    setLocation(`/winery/wines/${wineId}`);
  };

  const handleCreateWine = (vintageId: string) => {
    setWineModalInitialVintageId(vintageId);
    setShowAddWineModal(true);
  };

  const navigateBack = () => {
    const hasInternalNav = sessionStorage.getItem('internalNav') === 'true';
    if (hasInternalNav) {
      window.history.back();
    } else {
      if (initialVintageId) {
        setLocation('/winery/vintages');
      } else if (initialWineId) {
        setLocation('/winery/wines');
      } else {
        setLocation('/winery/vintages');
      }
    }
  };

  if (initialVintageId) {
    return <VintageDetailsView vintageId={initialVintageId} onBack={navigateBack} onWineClick={handleWineClick} />;
  }

  if (initialWineId) {
    return <WineDetailsView wineId={initialWineId} onBack={navigateBack} />;
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <div className={styles.titleWithBadge}>
          <div className={styles.vineyardTitle}>WINERY</div>
          <span className={styles.activeWinesBadge}>
            {activeWineCount} ACTIVE {activeWineCount === 1 ? 'WINE' : 'WINES'}
          </span>
        </div>
        <button
          className={styles.actionButton}
          onClick={() => {
            if (activeTab === 'vintages') {
              setShowAddVintageModal(true);
            } else {
              setWineModalInitialVintageId(undefined);
              setShowAddWineModal(true);
            }
          }}
        >
          {activeTab === 'vintages' ? 'ADD VINTAGE' : 'ADD WINE'}
        </button>
      </div>

      <div className={styles.tabNav}>
        <button
          onClick={() => setLocation('/winery/vintages')}
          className={`${styles.tabButton} ${activeTab === 'vintages' ? styles.tabButtonActive : ''}`}
        >
          VINTAGES
        </button>
        <button
          onClick={() => setLocation('/winery/wines')}
          className={`${styles.tabButton} ${activeTab === 'wines' ? styles.tabButtonActive : ''}`}
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
        <VintagesList onVintageClick={handleVintageClick} onWineClick={handleWineClick} onCreateWine={handleCreateWine} />
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
        onClose={() => {
          setShowAddWineModal(false);
          setWineModalInitialVintageId(undefined);
        }}
        onSuccess={showSuccessMessage}
        initialVintageId={wineModalInitialVintageId}
      />
    </div>
  );
};
