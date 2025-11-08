import { Zero } from '@rocicorp/zero';
import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { FiSettings } from 'react-icons/fi';
import { type Schema } from '../../schema';
import { Modal } from './Modal';
import styles from '../App.module.css';

const calculateAge = (plantingDate: Date): string => {
  const years = new Date().getFullYear() - plantingDate.getFullYear();
  return `${years} YRS`;
};

const generateVineId = (_block: string, vinesData: any[]): { id: string; sequenceNumber: number } => {
  const maxNumber = vinesData.length > 0
    ? Math.max(...vinesData.map(v => v.sequenceNumber))
    : 0;
  const nextNumber = maxNumber + 1;
  const vineId = nextNumber.toString().padStart(3, '0');
  return { id: vineId, sequenceNumber: nextNumber };
};

export const VineyardView = ({ z }: { z: Zero<Schema> }) => {
  const [selectedVine, setSelectedVine] = useState<string | null>(null);
  const [showAddVineModal, setShowAddVineModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showManageBlocksModal, setShowManageBlocksModal] = useState(false);
  const [showEditBlockModal, setShowEditBlockModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteVineConfirmModal, setShowDeleteVineConfirmModal] = useState(false);
  const [showVineyardSettingsModal, setShowVineyardSettingsModal] = useState(false);
  const [showVineSettingsModal, setShowVineSettingsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [vinesData, setVinesData] = useState<any[]>([]);
  const [blocksData, setBlocksData] = useState<any[]>([]);
  const [vineyardData, setVineyardData] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [deleteMigrateToBlock, setDeleteMigrateToBlock] = useState<string | null>(null);
  const [deleteVines, setDeleteVines] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadVines = async () => {
      const result = await z.query.vine.run();
      setVinesData(result);
    };
    loadVines();

    const interval = setInterval(loadVines, 1000);
    return () => clearInterval(interval);
  }, [z]);

  useEffect(() => {
    const loadBlocks = async () => {
      const result = await z.query.block.run();
      setBlocksData(result);
    };
    loadBlocks();

    const interval = setInterval(loadBlocks, 1000);
    return () => clearInterval(interval);
  }, [z]);

  useEffect(() => {
    const loadVineyard = async () => {
      const result = await z.query.vineyard.run();
      if (result.length > 0) {
        setVineyardData(result[0]);
      }
    };
    loadVineyard();

    const interval = setInterval(loadVineyard, 1000);
    return () => clearInterval(interval);
  }, [z]);

  const blocks = blocksData.map((block: any) => ({
    id: block.id,
    name: block.name,
    location: block.location,
    sizeAcres: block.sizeAcres,
    soilType: block.soilType,
    notes: block.notes,
  }));

  const filteredVinesData = selectedBlock
    ? vinesData.filter((vine: any) => vine.block === selectedBlock)
    : vinesData;

  const vines = filteredVinesData.map((vine: any) => ({
    id: vine.id,
    block: vine.block,
    variety: vine.variety,
    plantingDate: new Date(vine.plantingDate),
    age: calculateAge(new Date(vine.plantingDate)),
    health: vine.health,
    notes: vine.notes || '',
    qrGenerated: vine.qrGenerated > 0,
  }));

  const selectedVineData = selectedVine ? vines.find((v: any) => v.id === selectedVine) : null;
  const vineUrl = selectedVineData ? `${window.location.origin}/vineyard/vine/${selectedVineData.id}` : '';

  useEffect(() => {
    if (showQRModal && canvasRef.current && vineUrl) {
      QRCode.toCanvas(canvasRef.current, vineUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    }
  }, [showQRModal, vineUrl]);

  const validateVineForm = (vineData: { block: string; variety: string; plantingDate: Date; health: string }): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!vineData.block) {
      errors.block = 'Block is required';
    }

    if (!vineData.variety || vineData.variety.trim().length === 0) {
      errors.variety = 'Variety is required';
    } else if (vineData.variety.trim().length < 2) {
      errors.variety = 'Variety must be at least 2 characters';
    }

    if (!vineData.plantingDate) {
      errors.plantingDate = 'Planting date is required';
    } else if (vineData.plantingDate > new Date()) {
      errors.plantingDate = 'Planting date cannot be in the future';
    }

    if (!vineData.health) {
      errors.health = 'Health status is required';
    }

    return errors;
  };

  const handleAddVine = async (vineData: { block: string; variety: string; plantingDate: Date; health: string; notes?: string; quantity?: number }) => {
    const errors = validateVineForm(vineData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const quantity = vineData.quantity || 1;
      const now = Date.now();
      const createdVineIds: string[] = [];

      // Create vines sequentially
      for (let i = 0; i < quantity; i++) {
        const { id: newVineId, sequenceNumber } = generateVineId(vineData.block, vinesData);

        await z.mutate.vine.insert({
          id: newVineId,
          block: vineData.block,
          sequenceNumber,
          variety: vineData.variety.toUpperCase(),
          plantingDate: vineData.plantingDate.getTime(),
          health: vineData.health,
          notes: vineData.notes || '',
          qrGenerated: 0,
          createdAt: now,
          updatedAt: now,
        });

        createdVineIds.push(newVineId);

        // Update vinesData to reflect the new vine for next iteration
        vinesData.push({
          id: newVineId,
          block: vineData.block,
          sequenceNumber,
          variety: vineData.variety.toUpperCase(),
          plantingDate: vineData.plantingDate.getTime(),
          health: vineData.health,
          notes: vineData.notes || '',
          qrGenerated: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      setShowAddVineModal(false);
      if (quantity === 1) {
        setSuccessMessage(`Vine ${vineData.block}-${createdVineIds[0]} created successfully`);
        setSelectedVine(createdVineIds[0]);
      } else {
        setSuccessMessage(`${quantity} vines created successfully (${vineData.block}-${createdVineIds[0]} - ${vineData.block}-${createdVineIds[createdVineIds.length - 1]})`);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setFormErrors({ submit: 'Failed to create vine. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBlock = async (blockData: { name: string; location?: string; sizeAcres?: number; soilType?: string; notes?: string }) => {
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const blockId = blockData.name.replace(/^BLOCK\s+/, '').trim();
      const now = Date.now();

      await z.mutate.block.insert({
        id: blockId,
        name: blockData.name.toUpperCase(),
        location: blockData.location || '',
        sizeAcres: blockData.sizeAcres || 0,
        soilType: blockData.soilType || '',
        notes: blockData.notes || '',
        createdAt: now,
        updatedAt: now,
      });

      setShowAddBlockModal(false);
      setSuccessMessage(`Block ${blockData.name} created successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setFormErrors({ submit: 'Failed to create block. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBlock = async (blockId: string, blockData: { name: string; location?: string; sizeAcres?: number; soilType?: string; notes?: string }) => {
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const now = Date.now();

      await z.mutate.block.update({
        id: blockId,
        name: blockData.name.toUpperCase(),
        location: blockData.location || '',
        sizeAcres: blockData.sizeAcres || 0,
        soilType: blockData.soilType || '',
        notes: blockData.notes || '',
        updatedAt: now,
      });

      setEditingBlock(null);
      setShowEditBlockModal(false);
      setSuccessMessage(`Block ${blockData.name} updated successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setFormErrors({ submit: 'Failed to update block. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlock = async () => {
    if (!deleteBlockId) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const vinesToMigrate = vinesData.filter((v: any) => v.block === deleteBlockId);
      const vineCount = vinesToMigrate.length;

      if (vineCount > 0) {
        if (deleteVines) {
          await Promise.all(
            vinesToMigrate.map((v: any) => z.mutate.vine.delete({ id: v.id }))
          );
        } else if (deleteMigrateToBlock) {
          await Promise.all(
            vinesToMigrate.map((v: any) =>
              z.mutate.vine.update({
                id: v.id,
                block: deleteMigrateToBlock,
                updatedAt: Date.now(),
              })
            )
          );
        }
      }

      await z.mutate.block.delete({ id: deleteBlockId });

      setShowDeleteConfirmModal(false);
      setShowManageBlocksModal(false);
      setEditingBlock(null);
      setDeleteBlockId(null);
      setDeleteMigrateToBlock(null);
      setDeleteVines(false);
      setSuccessMessage(`Block deleted successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting block:', error);
      setFormErrors({ submit: `Failed to delete block: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVineyard = async (vineyardData: { name: string; location: string; varieties: string[] }) => {
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const now = Date.now();

      await z.mutate.vineyard.update({
        id: 'default',
        name: vineyardData.name,
        location: vineyardData.location,
        varieties: vineyardData.varieties,
        updatedAt: now,
      });

      setShowVineyardSettingsModal(false);
      setSuccessMessage('Vineyard settings updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating vineyard:', error);
      setFormErrors({ submit: `Failed to update vineyard: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVine = async (vineId: string, block: string) => {
    setIsSubmitting(true);
    setFormErrors({});

    try {
      await z.mutate.vine.delete({ id: vineId });

      setShowDeleteVineConfirmModal(false);
      setShowVineSettingsModal(false);
      setSelectedVine(null);
      setSuccessMessage(`Vine ${block}-${vineId} deleted successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting vine:', error);
      setFormErrors({ submit: `Failed to delete vine: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVine = async (vineId: string, vineData: { block: string; variety: string; plantingDate: Date }) => {
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const now = Date.now();

      await z.mutate.vine.update({
        id: vineId,
        block: vineData.block,
        variety: vineData.variety.toUpperCase(),
        plantingDate: vineData.plantingDate.getTime(),
        updatedAt: now,
      });

      setShowVineSettingsModal(false);
      setSuccessMessage('Vine settings updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating vine:', error);
      setFormErrors({ submit: `Failed to update vine: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGearIconClick = () => {
    if (selectedBlock) {
      // Viewing specific block - open block settings
      setShowEditBlockModal(true);
    } else {
      // Viewing all vineyards - open vineyard settings
      setShowVineyardSettingsModal(true);
    }
  };

  if (selectedVine) {
    const vine = selectedVineData;

    const handleDownloadSVG = () => {
      QRCode.toString(vineUrl, {
        type: 'svg',
        width: 400,
        margin: 2,
      }).then((svg: string) => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vine-${vine?.block}-${vine?.id}.svg`;
        link.click();
        URL.revokeObjectURL(url);

        if (vine && !vine.qrGenerated) {
          z.mutate.vine.update({
            id: vine.id,
            qrGenerated: Date.now(),
            updatedAt: Date.now(),
          });
        }
      });
    };

    return (
      <div className={styles.vineDetails}>
        <button className={styles.backButton} onClick={() => setSelectedVine(null)}>
          {'<'} BACK TO VINES
        </button>
        <div className={styles.vineDetailsHeader}>
          <h1 className={styles.vineDetailsTitle}>VINE {vine?.block}-{vine?.id}</h1>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <button className={styles.actionButton} onClick={() => setShowQRModal(true)}>
              GENERATE TAG
            </button>
            <button
              className={styles.iconButton}
              onClick={() => setShowVineSettingsModal(true)}
              title="Vine Settings"
            >
              <FiSettings size={20} />
            </button>
          </div>
        </div>
        <div className={styles.vineDetailsGrid}>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>DETAILS</h2>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>BLOCK</span>
              <span className={styles.detailValue}>{vine?.block}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>VARIETY</span>
              <span className={styles.detailValue}>{vine?.variety}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>AGE</span>
              <span className={styles.detailValue}>{vine?.age}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>HEALTH</span>
              <span className={styles.detailValue}>{vine?.health}</span>
            </div>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>PHOTOS</h2>
            <p className={styles.sectionPlaceholder}>No photos uploaded</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>TRAINING & PRUNING</h2>
            <p className={styles.sectionPlaceholder}>No notes yet</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>DISEASE NOTES</h2>
            <p className={styles.sectionPlaceholder}>No disease notes</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>WATERING LOG</h2>
            <p className={styles.sectionPlaceholder}>No watering records</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>SPUR PLANNING</h2>
            <p className={styles.sectionPlaceholder}>No spur plans</p>
          </div>
        </div>

        <Modal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          title={`VINE TAG - ${vine?.block}-${vine?.id}`}
        >
          <div className={styles.qrContainer}>
                <canvas ref={canvasRef} className={styles.qrCanvas} />
                <div className={styles.qrInfo}>
                  <div className={styles.qrVineId}>{vine?.block}-{vine?.id}</div>
                  <div className={styles.qrVariety}>{vine?.variety}</div>
                  <div className={styles.qrBlock}>BLOCK {vine?.block}</div>
                </div>
                <div className={styles.qrUrl}>{vineUrl}</div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => setShowQRModal(false)}
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  className={styles.formButton}
                  onClick={handleDownloadSVG}
                >
                  DOWNLOAD SVG
                </button>
              </div>
        </Modal>

        <Modal
          isOpen={showVineSettingsModal}
          onClose={() => {
            setShowVineSettingsModal(false);
            setFormErrors({});
            setIsSubmitting(false);
          }}
          title="VINE SETTINGS"
          size="medium"
          closeDisabled={isSubmitting}
        >
          {vine && (
            <form
              className={styles.vineForm}
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateVine(vine.id, {
                  block: formData.get('block') as string,
                  variety: formData.get('variety') as string,
                  plantingDate: new Date(formData.get('plantingDate') as string),
                });
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>BLOCK</label>
                <select
                  name="block"
                  className={styles.formSelect}
                  defaultValue={vine.block}
                  required
                >
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
                <div className={styles.formHint}>Vineyard block where this vine is located</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>VARIETY</label>
                {vineyardData && vineyardData.varieties && vineyardData.varieties.length > 0 ? (
                  <select
                    name="variety"
                    className={styles.formSelect}
                    defaultValue={vine.variety}
                    required
                  >
                    {vineyardData.varieties.map((variety: string) => (
                      <option key={variety} value={variety}>
                        {variety}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      name="variety"
                      className={styles.formInput}
                      defaultValue={vine.variety}
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                      }}
                      required
                    />
                    <div className={styles.formHint}>Add varieties in Vineyard Settings to use dropdown</div>
                  </>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>PLANTING DATE</label>
                <input
                  type="date"
                  name="plantingDate"
                  className={styles.formInput}
                  defaultValue={vine.plantingDate.toISOString().split('T')[0]}
                  required
                />
              </div>

              {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

              <div className={styles.formActions}>
                <button type="submit" className={styles.formButton} disabled={isSubmitting}>
                  {isSubmitting ? 'SAVING...' : 'SAVE SETTINGS'}
                </button>
              </div>

              <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => {
                    setShowVineSettingsModal(false);
                    setShowDeleteVineConfirmModal(true);
                  }}
                  disabled={isSubmitting}
                >
                  DELETE VINE
                </button>
              </div>
            </form>
          )}
        </Modal>

        <Modal
          isOpen={showDeleteVineConfirmModal}
          onClose={() => {
            setShowDeleteVineConfirmModal(false);
            setFormErrors({});
          }}
          title="DELETE VINE"
          size="medium"
          closeDisabled={isSubmitting}
        >
          {vine && (
            <div>
              <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                Are you sure you want to delete <strong style={{ color: 'var(--color-text-accent)' }}>vine {vine.block}-{vine.id}</strong>? This action cannot be undone.
              </p>

              {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => {
                    setShowDeleteVineConfirmModal(false);
                    setFormErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteVine(vine.id, vine.block)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'DELETING...' : 'CONFIRM DELETE'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  const displayTitle = selectedBlock
    ? blocks.find(b => b.id === selectedBlock)?.name || 'VINEYARD'
    : 'VINEYARD';

  return (
    <div className={styles.vineyardContainer}>
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
                  setSelectedBlock(null);
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
                    setSelectedBlock(block.id);
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
          <button className={styles.actionButton}>VINE TAGS</button>
          <button
            className={styles.iconButton}
            onClick={handleGearIconClick}
            title={selectedBlock ? "Block Settings" : "Vineyard Settings"}
          >
            <FiSettings size={20} />
          </button>
        </div>
      </div>
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}
      <div className={styles.vineList}>
        {vines.map((vine: any) => (
          <div
            key={vine.id}
            className={styles.vineItem}
            onClick={() => setSelectedVine(vine.id)}
          >
            <div className={styles.vineId}>{vine.block}-{vine.id}</div>
            <div className={styles.vineInfo}>
              <div className={styles.vineVariety}>{vine.variety}</div>
              <div className={styles.vineBlock}>BLOCK {vine.block} • {vine.age}</div>
            </div>
            <div className={`${styles.vineHealth} ${vine.health === 'NEEDS ATTENTION' ? styles.vineHealthWarning : ''}`}>
              {vine.health}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showAddVineModal}
        onClose={() => {
          setShowAddVineModal(false);
          setFormErrors({});
          setIsSubmitting(false);
        }}
        title="ADD VINE"
        closeDisabled={isSubmitting}
      >
        <form
              className={styles.vineForm}
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddVine({
                  block: formData.get('block') as string,
                  variety: formData.get('variety') as string,
                  plantingDate: new Date(formData.get('plantingDate') as string),
                  health: formData.get('health') as string,
                  notes: formData.get('notes') as string || undefined,
                  quantity: Number(formData.get('quantity')) || 1,
                });
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>BLOCK</label>
                <select name="block" className={styles.formSelect} required>
                  <option value="">Select Block</option>
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
                <div className={styles.formHint}>Vineyard section where vine will be planted</div>
                {formErrors.block && <div className={styles.formError}>{formErrors.block}</div>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>QUANTITY</label>
                <input
                  type="number"
                  name="quantity"
                  className={styles.formInput}
                  defaultValue={1}
                  min={1}
                  max={1000}
                  required
                />
                <div className={styles.formHint}>Number of vines to create with these settings</div>
                {formErrors.quantity && <div className={styles.formError}>{formErrors.quantity}</div>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>VARIETY</label>
                {vineyardData && vineyardData.varieties && vineyardData.varieties.length > 0 ? (
                  <select
                    name="variety"
                    className={styles.formSelect}
                    required
                  >
                    <option value="">Select Variety</option>
                    {vineyardData.varieties.map((variety: string) => (
                      <option key={variety} value={variety}>
                        {variety}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      name="variety"
                      className={styles.formInput}
                      placeholder="CABERNET SAUVIGNON"
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                      }}
                      required
                    />
                    <div className={styles.formHint}>Add varieties in Vineyard Settings to use dropdown</div>
                  </>
                )}
                {formErrors.variety && <div className={styles.formError}>{formErrors.variety}</div>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>PLANTING DATE</label>
                <input
                  type="date"
                  name="plantingDate"
                  className={styles.formInput}
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
                {formErrors.plantingDate && <div className={styles.formError}>{formErrors.plantingDate}</div>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>HEALTH STATUS</label>
                <select name="health" className={styles.formSelect} defaultValue="GOOD" required>
                  <option value="EXCELLENT">EXCELLENT</option>
                  <option value="GOOD">GOOD</option>
                  <option value="FAIR">FAIR</option>
                  <option value="NEEDS ATTENTION">NEEDS ATTENTION</option>
                </select>
                {formErrors.health && <div className={styles.formError}>{formErrors.health}</div>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>PLANTING NOTES (OPTIONAL)</label>
                <textarea
                  name="notes"
                  className={styles.formTextarea}
                  placeholder="Any notes about planting..."
                  rows={3}
                />
              </div>
              {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => {
                    setShowAddVineModal(false);
                    setFormErrors({});
                    setIsSubmitting(false);
                  }}
                  disabled={isSubmitting}
                >
                  CANCEL
                </button>
                <button type="submit" className={styles.formButton} disabled={isSubmitting}>
                  {isSubmitting ? 'CREATING...' : 'CREATE VINE'}
                </button>
              </div>
            </form>
      </Modal>

      <Modal
        isOpen={showAddBlockModal}
        onClose={() => {
          setShowAddBlockModal(false);
          setFormErrors({});
          setIsSubmitting(false);
        }}
        title="ADD BLOCK"
        closeDisabled={isSubmitting}
      >
        <form
              className={styles.vineForm}
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddBlock({
                  name: formData.get('name') as string,
                  location: formData.get('location') as string || undefined,
                  sizeAcres: formData.get('sizeAcres') ? Number(formData.get('sizeAcres')) : undefined,
                  soilType: formData.get('soilType') as string || undefined,
                  notes: formData.get('notes') as string || undefined,
                });
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>BLOCK NAME</label>
                <input
                  type="text"
                  name="name"
                  className={styles.formInput}
                  placeholder="BLOCK E"
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                  required
                />
                <div className={styles.formHint}>Name of the vineyard block (automatically converted to uppercase)</div>
                {formErrors.name && <div className={styles.formError}>{formErrors.name}</div>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>LOCATION (OPTIONAL)</label>
                <input
                  type="text"
                  name="location"
                  className={styles.formInput}
                  placeholder="North section, near barn"
                />
                <div className={styles.formHint}>Physical location or description</div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SIZE IN ACRES (OPTIONAL)</label>
                <input
                  type="number"
                  name="sizeAcres"
                  className={styles.formInput}
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SOIL TYPE (OPTIONAL)</label>
                <input
                  type="text"
                  name="soilType"
                  className={styles.formInput}
                  placeholder="Clay, sandy loam, etc."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
                <textarea
                  name="notes"
                  className={styles.formTextarea}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
              {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => {
                    setShowAddBlockModal(false);
                    setFormErrors({});
                    setIsSubmitting(false);
                  }}
                  disabled={isSubmitting}
                >
                  CANCEL
                </button>
                <button type="submit" className={styles.formButton} disabled={isSubmitting}>
                  {isSubmitting ? 'CREATING...' : 'CREATE BLOCK'}
                </button>
              </div>
            </form>
      </Modal>

      <Modal
        isOpen={showManageBlocksModal}
        onClose={() => {
          setShowManageBlocksModal(false);
          setEditingBlock(null);
          setFormErrors({});
        }}
        title="MANAGE BLOCKS"
        size="large"
        closeDisabled={isSubmitting}
      >
        {!editingBlock ? (
          <div>
            <div className={styles.blockListContainer}>
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className={styles.manageBlockItem}
                  onClick={() => setEditingBlock(block.id)}
                >
                  <div className={styles.manageBlockName}>{block.name}</div>
                  <div className={styles.manageBlockDetails}>
                    {block.location && <span>{block.location}</span>}
                    {block.sizeAcres > 0 && <span>{block.sizeAcres} acres</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button
              className={styles.backButton}
              onClick={() => {
                setEditingBlock(null);
                setFormErrors({});
              }}
            >
              {'<'} BACK TO BLOCKS
            </button>
            {(() => {
              const blockToEdit = blocks.find(b => b.id === editingBlock);
              if (!blockToEdit) return null;

              const vineCountInBlock = vinesData.filter((v: any) => v.block === editingBlock).length;

              return (
                <form
                  className={styles.vineForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleUpdateBlock(editingBlock, {
                      name: formData.get('name') as string,
                      location: formData.get('location') as string || undefined,
                      sizeAcres: formData.get('sizeAcres') ? Number(formData.get('sizeAcres')) : undefined,
                      soilType: formData.get('soilType') as string || undefined,
                      notes: formData.get('notes') as string || undefined,
                    });
                  }}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>BLOCK NAME</label>
                    <input
                      type="text"
                      name="name"
                      className={styles.formInput}
                      defaultValue={blockToEdit.name}
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                      }}
                      required
                    />
                    {formErrors.name && <div className={styles.formError}>{formErrors.name}</div>}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>LOCATION (OPTIONAL)</label>
                    <input
                      type="text"
                      name="location"
                      className={styles.formInput}
                      defaultValue={blockToEdit.location}
                      placeholder="North section, near barn"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>SIZE IN ACRES (OPTIONAL)</label>
                    <input
                      type="number"
                      name="sizeAcres"
                      className={styles.formInput}
                      defaultValue={blockToEdit.sizeAcres || 0}
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>SOIL TYPE (OPTIONAL)</label>
                    <input
                      type="text"
                      name="soilType"
                      className={styles.formInput}
                      defaultValue={blockToEdit.soilType}
                      placeholder="Clay, sandy loam, etc."
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
                    <textarea
                      name="notes"
                      className={styles.formTextarea}
                      defaultValue={blockToEdit.notes}
                      placeholder="Any additional notes..."
                      rows={3}
                    />
                  </div>
                  {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
                  <div className={styles.formActions}>
                    <button type="submit" className={styles.formButton} disabled={isSubmitting}>
                      {isSubmitting ? 'UPDATING...' : 'UPDATE BLOCK'}
                    </button>
                  </div>
                  <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)' }}>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => {
                        setDeleteBlockId(editingBlock);
                        const availableBlocks = blocks.filter(b => b.id !== editingBlock);
                        if (availableBlocks.length > 0) {
                          setDeleteMigrateToBlock(availableBlocks[0].id);
                          setDeleteVines(false);
                        }
                        setShowDeleteConfirmModal(true);
                      }}
                      disabled={isSubmitting}
                    >
                      DELETE BLOCK {vineCountInBlock > 0 && `(${vineCountInBlock} VINES)`}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setDeleteBlockId(null);
          setDeleteMigrateToBlock(null);
          setDeleteVines(false);
        }}
        title="DELETE BLOCK"
        size="medium"
        closeDisabled={isSubmitting}
      >
        {(() => {
          const blockToDelete = blocks.find(b => b.id === deleteBlockId);
          if (!blockToDelete) return null;

          const vineCountInBlock = vinesData.filter((v: any) => v.block === deleteBlockId).length;
          const availableBlocks = blocks.filter(b => b.id !== deleteBlockId);

          return (
            <div>
              <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                You are about to delete <strong style={{ color: 'var(--color-text-accent)' }}>{blockToDelete.name}</strong>.
                {vineCountInBlock > 0 && (
                  <span> This block contains <strong style={{ color: 'var(--color-text-accent)' }}>{vineCountInBlock} vine{vineCountInBlock > 1 ? 's' : ''}</strong>.</span>
                )}
              </p>

              {vineCountInBlock > 0 && availableBlocks.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={!deleteVines}
                      onChange={() => {
                        setDeleteVines(false);
                        if (availableBlocks.length > 0 && !deleteMigrateToBlock) {
                          setDeleteMigrateToBlock(availableBlocks[0].id);
                        }
                      }}
                      style={{ marginRight: 'var(--spacing-sm)' }}
                    />
                    MIGRATE {vineCountInBlock} VINE{vineCountInBlock > 1 ? 'S' : ''} TO:
                  </label>
                  {!deleteVines && (
                    <select
                      className={styles.formSelect}
                      value={deleteMigrateToBlock || ''}
                      onChange={(e) => setDeleteMigrateToBlock(e.target.value)}
                      style={{ marginTop: 'var(--spacing-sm)' }}
                    >
                      {availableBlocks.map((block) => (
                        <option key={block.id} value={block.id}>
                          {block.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {vineCountInBlock > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={deleteVines}
                      onChange={() => {
                        setDeleteVines(true);
                        setDeleteMigrateToBlock(null);
                      }}
                      style={{ marginRight: 'var(--spacing-sm)' }}
                    />
                    DELETE BLOCK AND ALL {vineCountInBlock} VINE{vineCountInBlock > 1 ? 'S' : ''}
                  </label>
                </div>
              )}

              {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setDeleteBlockId(null);
                    setDeleteMigrateToBlock(null);
                    setDeleteVines(false);
                  }}
                  disabled={isSubmitting}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={handleDeleteBlock}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'DELETING...' : 'CONFIRM DELETE'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={showVineyardSettingsModal}
        onClose={() => {
          setShowVineyardSettingsModal(false);
          setFormErrors({});
          setIsSubmitting(false);
        }}
        title="VINEYARD SETTINGS"
        size="large"
        closeDisabled={isSubmitting}
      >
        {vineyardData && (
          <form
            className={styles.vineForm}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const varietiesInput = formData.get('varieties') as string;
              const varieties = varietiesInput
                .split(',')
                .map(v => v.trim().toUpperCase())
                .filter(v => v.length > 0);

              handleUpdateVineyard({
                name: formData.get('name') as string,
                location: formData.get('location') as string,
                varieties,
              });
            }}
          >
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>VINEYARD NAME</label>
              <input
                type="text"
                name="name"
                className={styles.formInput}
                defaultValue={vineyardData.name}
                placeholder="My Vineyard"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>LOCATION</label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <input
                  type="text"
                  name="location"
                  className={styles.formInput}
                  defaultValue={vineyardData.location}
                  placeholder="Coordinates or address"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => {
                    if ('geolocation' in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const input = document.querySelector('input[name="location"]') as HTMLInputElement;
                          if (input) {
                            input.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                          }
                        },
                        (error) => {
                          setFormErrors({ location: 'Unable to get location: ' + error.message });
                        }
                      );
                    } else {
                      setFormErrors({ location: 'Geolocation not supported' });
                    }
                  }}
                >
                  USE CURRENT LOCATION
                </button>
              </div>
              <div className={styles.formHint}>Geographic coordinates or physical address</div>
              {formErrors.location && <div className={styles.formError}>{formErrors.location}</div>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>VARIETIES</label>
              <textarea
                name="varieties"
                className={styles.formTextarea}
                defaultValue={vineyardData.varieties?.join(', ') || ''}
                placeholder="CABERNET SAUVIGNON, PINOT NOIR, CHARDONNAY"
                rows={4}
              />
              <div className={styles.formHint}>Comma-separated list of grape varieties (automatically converted to uppercase)</div>
            </div>

            {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.formButtonSecondary}
                onClick={() => {
                  setShowVineyardSettingsModal(false);
                  setFormErrors({});
                  setIsSubmitting(false);
                }}
                disabled={isSubmitting}
              >
                CANCEL
              </button>
              <button type="submit" className={styles.formButton} disabled={isSubmitting}>
                {isSubmitting ? 'SAVING...' : 'SAVE SETTINGS'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showEditBlockModal}
        onClose={() => {
          setShowEditBlockModal(false);
          setFormErrors({});
          setIsSubmitting(false);
        }}
        title="BLOCK SETTINGS"
        size="large"
        closeDisabled={isSubmitting}
      >
        {(() => {
          const blockToEdit = blocks.find(b => b.id === selectedBlock);
          if (!blockToEdit) return null;

          const vineCountInBlock = vinesData.filter((v: any) => v.block === selectedBlock).length;

          return (
            <form
              className={styles.vineForm}
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateBlock(selectedBlock!, {
                  name: formData.get('name') as string,
                  location: formData.get('location') as string || undefined,
                  sizeAcres: formData.get('sizeAcres') ? Number(formData.get('sizeAcres')) : undefined,
                  soilType: formData.get('soilType') as string || undefined,
                  notes: formData.get('notes') as string || undefined,
                });
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>BLOCK NAME</label>
                <input
                  type="text"
                  name="name"
                  className={styles.formInput}
                  defaultValue={blockToEdit.name}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>LOCATION (OPTIONAL)</label>
                <input
                  type="text"
                  name="location"
                  className={styles.formInput}
                  defaultValue={blockToEdit.location}
                  placeholder="North section, near barn"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SIZE IN ACRES (OPTIONAL)</label>
                <input
                  type="number"
                  name="sizeAcres"
                  className={styles.formInput}
                  defaultValue={blockToEdit.sizeAcres || 0}
                  step="0.1"
                  min="0"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SOIL TYPE (OPTIONAL)</label>
                <input
                  type="text"
                  name="soilType"
                  className={styles.formInput}
                  defaultValue={blockToEdit.soilType}
                  placeholder="Clay, sandy loam, etc."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>NOTES (OPTIONAL)</label>
                <textarea
                  name="notes"
                  className={styles.formTextarea}
                  defaultValue={blockToEdit.notes}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
              {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
              <div className={styles.formActions}>
                <button type="submit" className={styles.formButton} disabled={isSubmitting}>
                  {isSubmitting ? 'SAVING...' : 'SAVE SETTINGS'}
                </button>
              </div>
              <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => {
                    setDeleteBlockId(selectedBlock);
                    const availableBlocks = blocks.filter(b => b.id !== selectedBlock);
                    if (availableBlocks.length > 0) {
                      setDeleteMigrateToBlock(availableBlocks[0].id);
                      setDeleteVines(false);
                    }
                    setShowEditBlockModal(false);
                    setShowDeleteConfirmModal(true);
                  }}
                  disabled={isSubmitting}
                >
                  DELETE BLOCK {vineCountInBlock > 0 && `(${vineCountInBlock} VINES)`}
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>
    </div>
  );
};
