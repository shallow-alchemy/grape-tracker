import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import styles from '../App.module.css';
import { useVines } from './vineyard-hooks';
import { VineDetailsView } from './VineDetailsView';
import { BlockDetailsView } from './BlockDetailsView';
import { VineyardViewHeader } from './VineyardViewHeader';
import { VineyardViewVineList } from './VineyardViewVineList';
import { AddVineModal } from './AddVineModal';
import { AddBlockModal } from './AddBlockModal';
import { VineyardSettingsModal } from './VineyardSettingsModal';
import { QRScanner } from './QRScanner';

export const VineyardView = ({
  initialVineId,
  initialBlockId
}: {
  initialVineId?: string;
  initialBlockId?: string
}) => {
  const [, setLocation] = useLocation();

  const [selectedVine, setSelectedVine] = useState<string | null>(initialVineId || null);
  const [showAddVineModal, setShowAddVineModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showVineyardSettingsModal, setShowVineyardSettingsModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(initialBlockId || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const vinesData = useVines();

  useEffect(() => {
    if (initialVineId && vinesData.length > 0) {
      const vineExists = vinesData.some((v) => v.id === initialVineId);
      if (vineExists) setSelectedVine(initialVineId);
    }
  }, [initialVineId, vinesData]);

  const navigateToVine = (vineId: string) => {
    sessionStorage.setItem('internalNav', 'true');
    // Store origin for back button label - check if we're navigating from a block
    sessionStorage.setItem('vineNavOrigin', selectedBlock || 'vineyard');
    setSelectedVine(vineId);
    setLocation(`/vineyard/vine/${vineId}`);
  };

  const navigateToBlock = (blockId: string | null) => {
    sessionStorage.setItem('internalNav', 'true');
    setSelectedBlock(blockId);
    if (blockId) return setLocation(`/vineyard/block/${blockId}`);
    setLocation('/vineyard');
  };

  const navigateToVineyard = () => {
    setSelectedVine(null);
    setSelectedBlock(null);
    setLocation('/vineyard');
  };

  const navigateBack = () => {
    const hasInternalNav = sessionStorage.getItem('internalNav') === 'true';
    if (hasInternalNav) window.history.back();
    if (!hasInternalNav) navigateToVineyard();
  };

  const foundVine = selectedVine ? vinesData.find((v) => v.id === selectedVine) : null;

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleGearIconClick = () => {
    setShowVineyardSettingsModal(true);
  };

  // Show BlockDetailsView when a block is selected
  if (selectedBlock) {
    return (
      <BlockDetailsView
        blockId={selectedBlock}
        onUpdateSuccess={showSuccessMessage}
        onDeleteSuccess={(message) => {
          showSuccessMessage(message);
          navigateToVineyard();
        }}
        navigateBack={navigateBack}
        navigateToVine={navigateToVine}
      />
    );
  }

  if (selectedVine) {
    const vineNavOrigin = sessionStorage.getItem('vineNavOrigin');
    const originBlockId = vineNavOrigin && vineNavOrigin !== 'vineyard' ? vineNavOrigin : undefined;
    return (
      <VineDetailsView
        vine={foundVine}
        onUpdateSuccess={showSuccessMessage}
        onDeleteSuccess={showSuccessMessage}
        navigateBack={navigateBack}
        originBlockId={originBlockId}
      />
    );
  }

  return (
    <div className={styles.vineyardContainer}>
      <VineyardViewHeader
        navigateToBlock={navigateToBlock}
        selectedBlock={selectedBlock}
        setShowAddBlockModal={setShowAddBlockModal}
        setShowAddVineModal={setShowAddVineModal}
        setShowScanner={setShowScanner}
        handleGearIconClick={handleGearIconClick}
        onSuccess={showSuccessMessage}
      />
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}
      <VineyardViewVineList selectedBlock={selectedBlock} navigateToVine={navigateToVine} navigateToBlock={navigateToBlock} />

      <AddVineModal
        isOpen={showAddVineModal}
        onClose={() => setShowAddVineModal(false)}
        onSuccess={(message, vineId) => {
          showSuccessMessage(message);
          if (vineId) navigateToVine(vineId);
        }}
      />

      <AddBlockModal
        isOpen={showAddBlockModal}
        onClose={() => setShowAddBlockModal(false)}
        onSuccess={showSuccessMessage}
      />

      <VineyardSettingsModal
        isOpen={showVineyardSettingsModal}
        onClose={() => setShowVineyardSettingsModal(false)}
        onSuccess={showSuccessMessage}
      />

      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
};
