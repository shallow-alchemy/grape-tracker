import { useState } from 'react';
import { FiChevronLeft, FiSettings, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { InlineEdit } from './InlineEdit';
import { ListItem } from './ListItem';
import { AITrainingHelper } from './AITrainingHelper';
import { BlockSettingsModal } from './BlockSettingsModal';
import { DeleteBlockConfirmModal } from './DeleteBlockConfirmModal';
import { useZero } from '../contexts/ZeroContext';
import { useVines, useBlocks, useVineyard } from './vineyard-hooks';
import { transformBlockData, transformVineData, filterVinesByBlock } from './vineyard-utils';
import { type BlockDataRaw } from './vineyard-types';
import styles from '../App.module.css';

const TRAINING_METHOD_OPTIONS = [
  { value: '', label: 'Not Set' },
  { value: 'HEAD_TRAINING', label: 'Head Training (Goblet)' },
  { value: 'BILATERAL_CORDON', label: 'Bilateral Cordon' },
  { value: 'VERTICAL_CORDON', label: 'Vertical Cordon' },
  { value: 'FOUR_ARM_KNIFFEN', label: 'Four-Arm Kniffen' },
  { value: 'GENEVA_DOUBLE_CURTAIN', label: 'Geneva Double Curtain (GDC)' },
  { value: 'UMBRELLA_KNIFFEN', label: 'Umbrella Kniffen' },
  { value: 'CANE_PRUNED', label: 'Cane Pruned (Guyot)' },
  { value: 'VSP', label: 'Vertical Shoot Positioning (VSP)' },
  { value: 'SCOTT_HENRY', label: 'Scott-Henry' },
  { value: 'LYRE', label: 'Lyre (U-Shape)' },
  { value: 'OTHER', label: 'Other (Custom)' },
];

type BlockDetailsViewProps = {
  blockId: string;
  onUpdateSuccess: (message: string) => void;
  onDeleteSuccess: (message: string) => void;
  navigateBack: () => void;
  navigateToVine: (vineId: string) => void;
};

export const BlockDetailsView = ({
  blockId,
  onUpdateSuccess,
  onDeleteSuccess,
  navigateBack,
  navigateToVine,
}: BlockDetailsViewProps) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);

  const zero = useZero();
  const blocksData = useBlocks();
  const vinesData = useVines();
  const vineyardData = useVineyard();

  const blockRaw = blocksData.find((b: BlockDataRaw) => b.id === blockId);
  const block = blockRaw ? transformBlockData(blockRaw) : null;
  const vinesInBlock = filterVinesByBlock(vinesData, blockId);
  const vines = vinesInBlock.map(transformVineData);

  // Get unique varieties in this block
  const varieties = [...new Set(vines.map((v) => v.variety))];

  if (!block) {
    return (
      <div className={styles.vineDetails}>
        <button className={styles.backButton} onClick={navigateBack} type="button">
          <FiChevronLeft size={24} />
          <span>VINEYARD</span>
        </button>
        <div className={styles.errorMessage}>Block not found</div>
      </div>
    );
  }

  const getTrainingMethodLabel = (method: string | null): string => {
    if (!method) return 'Not Set';
    const option = TRAINING_METHOD_OPTIONS.find((o) => o.value === method);
    return option?.label || method;
  };

  return (
    <div className={styles.vineDetails}>
      <button className={styles.backButton} onClick={navigateBack} type="button">
        <FiChevronLeft size={24} />
        <span>VINEYARD</span>
      </button>
      <div className={styles.vineDetailsHeader}>
        <h1 className={styles.vineDetailsTitle}>{block.name}</h1>
        <div className={styles.actionButtonGroup}>
          <span className={styles.vineDetailsSubtitle}>
            {vines.length} vine{vines.length !== 1 ? 's' : ''}
            {varieties.length > 0 && ` • ${varieties.join(', ')}`}
          </span>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setShowSettingsModal(true)}
            title="Block settings"
          >
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      <div className={styles.vineDetailsGrid}>
        <div className={styles.vineDetailsSection}>
          <h2 className={styles.sectionTitle}>TRAINING & PRUNING</h2>
          <InlineEdit
            label="TRAINING METHOD"
            value={block.trainingMethod || ''}
            type="select"
            options={TRAINING_METHOD_OPTIONS}
            formatDisplay={(method) => getTrainingMethodLabel(method)}
            onSave={async (newMethod) => {
              await zero.mutate.block.update({
                id: block.id,
                training_method: newMethod || undefined,
                training_method_other: newMethod === 'OTHER' ? block.trainingMethodOther || undefined : undefined,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Training method updated');
            }}
          />
          {block.trainingMethod === 'OTHER' && (
            <InlineEdit
              label="CUSTOM METHOD"
              value={block.trainingMethodOther || ''}
              type="text"
              placeholder="Describe your training system..."
              onSave={async (newDescription) => {
                await zero.mutate.block.update({
                  id: block.id,
                  training_method_other: newDescription,
                  updated_at: Date.now(),
                });
                onUpdateSuccess('Custom training method updated');
              }}
            />
          )}
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className={styles.formButtonSecondary}
              onClick={() => setShowAIHelper(!showAIHelper)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
            >
              {showAIHelper ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
              Help me choose a training method
            </button>
          </div>
          {showAIHelper && (
            <AITrainingHelper
              blockName={block.name}
              varieties={varieties}
              location={block.location || undefined}
              vineyardLocation={vineyardData?.location || undefined}
              soilType={block.soilType || undefined}
              sizeAcres={block.sizeAcres || undefined}
              vineCount={vines.length}
              onSelectMethod={async (method) => {
                await zero.mutate.block.update({
                  id: block.id,
                  training_method: method,
                  updated_at: Date.now(),
                });
                onUpdateSuccess(`Training method set to ${getTrainingMethodLabel(method)}`);
                setShowAIHelper(false);
              }}
            />
          )}
        </div>

        <div className={styles.vineDetailsSection}>
          <h2 className={styles.sectionTitle}>SEASONAL STAGE</h2>
          <p className={styles.sectionPlaceholder}>Coming soon...</p>
        </div>

        <div className={styles.vineDetailsSection}>
          <h2 className={styles.sectionTitle}>BLOCK DETAILS</h2>
          <InlineEdit
            label="NAME"
            value={block.name}
            type="text"
            onSave={async (newName) => {
              await zero.mutate.block.update({
                id: block.id,
                name: newName,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Block name updated');
            }}
          />
          <InlineEdit
            label="LOCATION"
            value={block.location || ''}
            type="text"
            placeholder="e.g., North slope, near barn"
            onSave={async (newLocation) => {
              await zero.mutate.block.update({
                id: block.id,
                location: newLocation,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Location updated');
            }}
          />
          <InlineEdit
            label="SIZE (ACRES)"
            value={block.sizeAcres?.toString() || ''}
            type="text"
            placeholder="e.g., 0.5"
            onSave={async (newSize) => {
              await zero.mutate.block.update({
                id: block.id,
                size_acres: newSize ? parseFloat(newSize) : undefined,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Size updated');
            }}
          />
          <InlineEdit
            label="SOIL TYPE"
            value={block.soilType || ''}
            type="text"
            placeholder="e.g., Clay loam, Sandy"
            onSave={async (newSoil) => {
              await zero.mutate.block.update({
                id: block.id,
                soil_type: newSoil,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Soil type updated');
            }}
          />
          <InlineEdit
            label="NOTES"
            value={block.notes || ''}
            type="textarea"
            placeholder="Any notes about this block..."
            onSave={async (newNotes) => {
              await zero.mutate.block.update({
                id: block.id,
                notes: newNotes,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Notes updated');
            }}
          />
        </div>

        <div className={styles.vineDetailsSection}>
          <h2 className={styles.sectionTitle}>VINES IN THIS BLOCK ({vines.length})</h2>
          {vines.length > 0 ? (
            <div className={styles.blockVinesList}>
              {vines.map((vine) => (
                <ListItem
                  key={vine.id}
                  id={`${vine.block}-${vine.sequenceNumber.toString().padStart(3, '0')}`}
                  primaryInfo={vine.variety}
                  secondaryInfo={vine.age}
                  status={vine.health}
                  statusWarning={vine.health === 'NEEDS ATTENTION'}
                  onClick={() => navigateToVine(vine.id)}
                />
              ))}
            </div>
          ) : (
            <p className={styles.sectionPlaceholder}>No vines in this block yet</p>
          )}
        </div>
      </div>

      <BlockSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        selectedBlock={blockId}
        onSuccess={onUpdateSuccess}
        onDeleteClick={() => {
          setShowSettingsModal(false);
          setShowDeleteConfirmModal(true);
        }}
      />

      <DeleteBlockConfirmModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        deleteBlockId={blockId}
        onSuccess={(message) => {
          onDeleteSuccess(message);
          navigateBack();
        }}
      />
    </div>
  );
};
