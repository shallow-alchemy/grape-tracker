import { Zero } from '@rocicorp/zero';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { type Schema } from '../../schema';
import styles from '../App.module.css';
import { transformVineData, transformBlockData, filterVinesByBlock } from './vineyard-utils';
import { useVines, useBlocks } from './vineyard-hooks';
import { VineDetailsView } from './VineDetailsView';
import { VineyardViewHeader } from './VineyardViewHeader';
import { VineyardViewVineList } from './VineyardViewVineList';
import { AddVineModal } from './AddVineModal';
import { AddBlockModal } from './AddBlockModal';
import { DeleteBlockConfirmModal } from './DeleteBlockConfirmModal';
import { VineyardSettingsModal } from './VineyardSettingsModal';
import { BlockSettingsModal } from './BlockSettingsModal';

export const VineyardView = ({ z, initialVineId, initialBlockId }: { z: Zero<Schema>; initialVineId?: string; initialBlockId?: string }) => {
  const [, setLocation] = useLocation();
  const [selectedVine, setSelectedVine] = useState<string | null>(initialVineId || null);
  const [showAddVineModal, setShowAddVineModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showEditBlockModal, setShowEditBlockModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteVineConfirmModal, setShowDeleteVineConfirmModal] = useState(false);
  const [showVineyardSettingsModal, setShowVineyardSettingsModal] = useState(false);
  const [showVineSettingsModal, setShowVineSettingsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(initialBlockId || null);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const vinesData = useVines(z);
  const blocksData = useBlocks(z);

  useEffect(() => {
    if (initialVineId && vinesData.length > 0) {
      const vineExists = vinesData.some((v) => v.id === initialVineId);
      if (vineExists) {
        setSelectedVine(initialVineId);
      }
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
    if (blockId) {
      setLocation(`/vineyard/block/${blockId}`);
    } else {
      setLocation('/vineyard');
    }
  };

  const navigateToVineyard = () => {
    setSelectedVine(null);
    setSelectedBlock(null);
    setLocation('/vineyard');
  };

  const navigateBack = () => {
    const hasInternalNav = sessionStorage.getItem('internalNav') === 'true';

    if (hasInternalNav) {
      window.history.back();
    } else {
      navigateToVineyard();
    }
  };

  const blocks = blocksData.map(transformBlockData);
  const filteredVinesData = filterVinesByBlock(vinesData, selectedBlock);
  const vines = filteredVinesData.map(transformVineData);
  const selectedVineData = selectedVine ? vines.find((v) => v.id === selectedVine) : null;
  const vineUrl = selectedVineData ? `${window.location.origin}/vineyard/vine/${selectedVineData.id}` : '';

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleGearIconClick = () => {
    if (selectedBlock) {
      setShowEditBlockModal(true);
    } else {
      setShowVineyardSettingsModal(true);
    }
  };

  const handleGenerateBatchTags = async () => {
    setIsGeneratingTags(true);
    try {
      const vinesToGenerate = selectedBlock
        ? vines.filter((v) => v.block === selectedBlock)
        : vines;

      if (vinesToGenerate.length === 0) {
        throw new Error('No vines to generate tags for');
      }

      const zip = new JSZip();

      for (const vine of vinesToGenerate) {
        const vineUrl = `${window.location.origin}/vineyard/vine/${vine.id}`;
        const svg = await QRCode.toString(vineUrl, {
          type: 'svg',
          width: 400,
          margin: 2,
        });

        zip.file(`vine-${vine.block}-${vine.id}.svg`, svg);

        // Mark as generated if not already
        if (!vine.qrGenerated) {
          await z.mutate.vine.update({
            id: vine.id,
            qrGenerated: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      if (selectedBlock) {
        const blockName = blocks.find(b => b.id === selectedBlock)?.name || selectedBlock;
        link.download = `vine-tags-${blockName}.zip`;
      } else {
        link.download = `vine-tags-all.zip`;
      }

      link.click();
      URL.revokeObjectURL(url);

      setSuccessMessage(`Generated ${vinesToGenerate.length} vine tag${vinesToGenerate.length > 1 ? 's' : ''}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error generating batch tags:', error);
      throw error;
    } finally {
      setIsGeneratingTags(false);
    }
  };

  if (selectedVine) {
    return (
      <VineDetailsView
        z={z}
        vine={selectedVineData}
        vineUrl={vineUrl}
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        showVineSettingsModal={showVineSettingsModal}
        setShowVineSettingsModal={setShowVineSettingsModal}
        showDeleteVineConfirmModal={showDeleteVineConfirmModal}
        setShowDeleteVineConfirmModal={setShowDeleteVineConfirmModal}
        onUpdateSuccess={showSuccessMessage}
        onDeleteSuccess={showSuccessMessage}
        navigateBack={navigateBack}
      />
    );
  }

  const displayTitle = selectedBlock
    ? blocks.find(b => b.id === selectedBlock)?.name || 'VINEYARD'
    : 'VINEYARD';

  return (
    <div className={styles.vineyardContainer}>
      <VineyardViewHeader
        displayTitle={displayTitle}
        showBlockDropdown={showBlockDropdown}
        setShowBlockDropdown={setShowBlockDropdown}
        navigateToBlock={navigateToBlock}
        blocks={blocks}
        selectedBlock={selectedBlock}
        setShowAddBlockModal={setShowAddBlockModal}
        setShowAddVineModal={setShowAddVineModal}
        handleGenerateBatchTags={handleGenerateBatchTags}
        isSubmitting={isGeneratingTags}
        vineCount={vines.length}
        handleGearIconClick={handleGearIconClick}
      />
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}
      <VineyardViewVineList vines={vines} navigateToVine={navigateToVine} />

      <AddVineModal
        isOpen={showAddVineModal}
        onClose={() => setShowAddVineModal(false)}
        z={z}
        onSuccess={(message, vineId) => {
          showSuccessMessage(message);
          if (vineId) navigateToVine(vineId);
        }}
      />

      <AddBlockModal
        isOpen={showAddBlockModal}
        onClose={() => setShowAddBlockModal(false)}
        z={z}
        onSuccess={showSuccessMessage}
      />

      <DeleteBlockConfirmModal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setDeleteBlockId(null);
        }}
        deleteBlockId={deleteBlockId}
        z={z}
        onSuccess={showSuccessMessage}
      />

      <VineyardSettingsModal
        isOpen={showVineyardSettingsModal}
        onClose={() => setShowVineyardSettingsModal(false)}
        z={z}
        onSuccess={showSuccessMessage}
      />

      <BlockSettingsModal
        isOpen={showEditBlockModal}
        onClose={() => setShowEditBlockModal(false)}
        selectedBlock={selectedBlock}
        z={z}
        onSuccess={showSuccessMessage}
        onDeleteClick={(blockId) => {
          setDeleteBlockId(blockId);
          setShowEditBlockModal(false);
          setShowDeleteConfirmModal(true);
        }}
      />
    </div>
  );
};
