import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import { AddVintageModal } from './AddVintageModal';
import { AddWineModal } from './AddWineModal';
import { VintagesList } from './VintagesList';
import { WinesList } from './WinesList';
import { VintageDetailsView } from './VintageDetailsView';
import { WineDetailsView } from './WineDetailsView';
import { TaskListView } from './TaskListView';
import styles from '../../App.module.css';

type WineryViewProps = {
  initialVintageId?: string;
  initialWineId?: string;
  initialVintageTasksId?: string;
  initialWineTasksId?: string;
};

type ActiveTab = 'vintages' | 'wines';

export const WineryView = ({ initialVintageId, initialWineId, initialVintageTasksId, initialWineTasksId }: WineryViewProps) => {
  const zero = useZero();
  const [location, setLocation] = useLocation();
  const [showAddVintageModal, setShowAddVintageModal] = useState(false);
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [wineModalInitialVintageId, setWineModalInitialVintageId] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      if (initialVintageId || initialVintageTasksId) {
        setLocation('/winery/vintages');
      } else if (initialWineId || initialWineTasksId) {
        setLocation('/winery/wines');
      } else {
        setLocation('/winery/vintages');
      }
    }
  };

  if (initialVintageTasksId) {
    const [vintagesData] = useQuery(zero.query.vintage.where('id', initialVintageTasksId));
    const vintage = vintagesData[0];

    if (!vintage) {
      return (
        <div className={styles.vineyardContainer}>
          <div className={styles.errorMessage}>VINTAGE NOT FOUND</div>
          <button className={styles.actionButton} onClick={navigateBack}>
            BACK
          </button>
        </div>
      );
    }

    return (
      <TaskListView
        entityType="vintage"
        entityId={initialVintageTasksId}
        entityName={`${vintage.variety}, ${vintage.vintage_year} Vintage${vintage.grape_source === 'purchased' && vintage.supplier_name ? ` from ${vintage.supplier_name}` : ''}`}
        currentStage={vintage.current_stage}
        onBack={navigateBack}
      />
    );
  }

  if (initialWineTasksId) {
    const [winesData] = useQuery(zero.query.wine.where('id', initialWineTasksId));
    const wine = winesData[0];

    if (!wine) {
      return (
        <div className={styles.vineyardContainer}>
          <div className={styles.errorMessage}>WINE NOT FOUND</div>
          <button className={styles.actionButton} onClick={navigateBack}>
            BACK
          </button>
        </div>
      );
    }

    return (
      <TaskListView
        entityType="wine"
        entityId={initialWineTasksId}
        entityName={wine.name}
        currentStage={wine.current_stage}
        onBack={navigateBack}
      />
    );
  }

  if (initialVintageId) {
    return <VintageDetailsView vintageId={initialVintageId} onBack={navigateBack} onWineClick={handleWineClick} />;
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
