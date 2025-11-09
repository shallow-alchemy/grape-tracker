import { FiSettings } from 'react-icons/fi';
import { type BlockData } from './vineyard-types';
import styles from '../App.module.css';

type VineyardViewHeaderProps = {
  displayTitle: string;
  showBlockDropdown: boolean;
  setShowBlockDropdown: (show: boolean) => void;
  navigateToBlock: (blockId: string | null) => void;
  blocks: BlockData[];
  selectedBlock: string | null;
  setShowAddBlockModal: (show: boolean) => void;
  setShowAddVineModal: (show: boolean) => void;
  handleGenerateBatchTags: () => void;
  isSubmitting: boolean;
  vineCount: number;
  handleGearIconClick: () => void;
};

export const VineyardViewHeader = ({
  displayTitle,
  showBlockDropdown,
  setShowBlockDropdown,
  navigateToBlock,
  blocks,
  selectedBlock,
  setShowAddBlockModal,
  setShowAddVineModal,
  handleGenerateBatchTags,
  isSubmitting,
  vineCount,
  handleGearIconClick,
}: VineyardViewHeaderProps) => {
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
      <div className={styles.desktopActions}>
        <button className={styles.actionButton} onClick={() => setShowAddBlockModal(true)}>ADD BLOCK</button>
        <button className={styles.actionButton} onClick={() => setShowAddVineModal(true)}>ADD VINE</button>
        <button
          className={styles.actionButton}
          onClick={handleGenerateBatchTags}
          disabled={isSubmitting || vineCount === 0}
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
