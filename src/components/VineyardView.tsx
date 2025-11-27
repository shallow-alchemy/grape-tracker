import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import styles from '../App.module.css';
import { useVines } from './vineyard-hooks';
import { VineDetailsView } from './VineDetailsView';
import { VineyardViewHeader } from './VineyardViewHeader';
import { VineyardViewVineList } from './VineyardViewVineList';
import { AddVineModal } from './AddVineModal';
import { AddBlockModal } from './AddBlockModal';
import { DeleteBlockConfirmModal } from './DeleteBlockConfirmModal';
import { VineyardSettingsModal } from './VineyardSettingsModal';
import { BlockSettingsModal } from './BlockSettingsModal';
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
  const [showEditBlockModal, setShowEditBlockModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showVineyardSettingsModal, setShowVineyardSettingsModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(initialBlockId || null);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
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
    if (selectedBlock) return setShowEditBlockModal(true);
    setShowVineyardSettingsModal(true);
  };

  if (selectedVine) {
    return (
      <VineDetailsView
        vine={foundVine}
        onUpdateSuccess={showSuccessMessage}
        onDeleteSuccess={showSuccessMessage}
        navigateBack={navigateBack}
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
      <VineyardViewVineList selectedBlock={selectedBlock} navigateToVine={navigateToVine} />

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

      <DeleteBlockConfirmModal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setDeleteBlockId(null);
        }}
        deleteBlockId={deleteBlockId}
        onSuccess={showSuccessMessage}
      />

      <VineyardSettingsModal
        isOpen={showVineyardSettingsModal}
        onClose={() => setShowVineyardSettingsModal(false)}
        onSuccess={showSuccessMessage}
      />

      <BlockSettingsModal
        isOpen={showEditBlockModal}
        onClose={() => setShowEditBlockModal(false)}
        selectedBlock={selectedBlock}
        onSuccess={showSuccessMessage}
        onDeleteClick={(blockId) => {
          setDeleteBlockId(blockId);
          setShowEditBlockModal(false);
          setShowDeleteConfirmModal(true);
        }}
      />

      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
};
