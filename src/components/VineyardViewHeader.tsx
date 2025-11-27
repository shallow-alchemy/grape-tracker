import { useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import JSZip from 'jszip';
import { useZero } from '../contexts/ZeroContext';
import { useVines, useBlocks, useVineyard } from './vineyard-hooks';
import { transformVineData, transformBlockData, filterVinesByBlock } from './vineyard-utils';
import { generate3MF } from './vine-stake-3d';
import styles from '../App.module.css';

type VineyardViewHeaderProps = {
  navigateToBlock: (blockId: string | null) => void;
  selectedBlock: string | null;
  setShowAddBlockModal: (show: boolean) => void;
  setShowAddVineModal: (show: boolean) => void;
  setShowScanner: (show: boolean) => void;
  handleGearIconClick: () => void;
  onSuccess: (message: string) => void;
};

export const VineyardViewHeader = ({
  navigateToBlock,
  selectedBlock,
  setShowAddBlockModal,
  setShowAddVineModal,
  setShowScanner,
  handleGearIconClick,
  onSuccess,
}: VineyardViewHeaderProps) => {
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  const zero = useZero();
  const vinesData = useVines();
  const blocksData = useBlocks();
  const vineyardData = useVineyard();

  const filteredVinesData = filterVinesByBlock(vinesData, selectedBlock);
  const vines = filteredVinesData.map(transformVineData);
  const blocks = blocksData.map(transformBlockData);
  const vineCount = vines.length;

  const displayTitle = selectedBlock
    ? blocks.find(b => b.id === selectedBlock)?.name || 'VINEYARD'
    : 'VINEYARD';

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

      const vineyardName = vineyardData?.name || 'Vineyard';

      for (const vine of vinesToGenerate) {
        const vineUrl = `${window.location.origin}/vineyard/vine/${vine.id}`;
        const stlBlob = await generate3MF(vineUrl);

        const block = blocks.find(b => b.id === vine.block);
        const blockName = block?.name || vine.block;
        const filename = `${vineyardName}-${blockName}-${vine.sequenceNumber.toString().padStart(3, '0')}.stl`;

        zip.file(filename, stlBlob);

        if (!vine.qrGenerated) {
          await zero.mutate.vine.update({
            id: vine.id,
            qr_generated: Date.now(),
            updated_at: Date.now(),
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

      onSuccess(`Generated ${vinesToGenerate.length} vine tag${vinesToGenerate.length > 1 ? 's' : ''}`);
    } catch (error) {
      throw error;
    } finally {
      setIsGeneratingTags(false);
    }
  };
  return (
    <div className={styles.vineyardHeader}>
      <div className={styles.titleDropdownContainer}>
        <h1
          className={styles.vineyardTitle}
          onClick={() => setShowBlockDropdown(!showBlockDropdown)}
        >
          {displayTitle} ▼
        </h1>
        {showBlockDropdown && (
          <div className={styles.blockDropdown}>
            <div
              className={`${styles.dropdownItem} ${!selectedBlock ? styles.dropdownItemActive : ''}`}
              onClick={() => {
                navigateToBlock(null);
                setShowBlockDropdown(false);
              }}
            >
              VINEYARD
            </div>
            {blocks.map((block) => (
              <div
                key={block.id}
                className={`${styles.dropdownItem} ${selectedBlock === block.id ? styles.dropdownItemActive : ''}`}
                onClick={() => {
                  navigateToBlock(block.id);
                  setShowBlockDropdown(false);
                }}
              >
                {block.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <button className={styles.mobileScanButton} onClick={() => setShowScanner(true)}>SCAN TAG</button>
      <div className={styles.desktopActions}>
        <button className={styles.actionButton} onClick={() => setShowAddBlockModal(true)}>ADD BLOCK</button>
        <button className={styles.actionButton} onClick={() => setShowAddVineModal(true)}>ADD VINE</button>
        <button
          className={styles.actionButton}
          onClick={handleGenerateBatchTags}
          disabled={isGeneratingTags || vineCount === 0}
        >
          {selectedBlock ? `GENERATE BLOCK TAGS (${vineCount})` : `GENERATE ALL TAGS (${vineCount})`}
        </button>
        <button
          className={styles.iconButton}
          onClick={handleGearIconClick}
          title={selectedBlock ? "Block Settings" : "Vineyard Settings"}
        >
          <FiSettings size={20} />
        </button>
      </div>
    </div>
  );
};
