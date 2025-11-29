import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { FiSettings } from 'react-icons/fi';
import { Modal } from './Modal';
import { InlineEdit } from './InlineEdit';
import { AddPruningModal } from './AddPruningModal';
import { EditPruningModal } from './EditPruningModal';
import { useZero } from '../contexts/ZeroContext';
import { useBlocks, useVineyard, usePruningLogs, type PruningLogData } from './vineyard-hooks';
import { transformBlockData } from './vineyard-utils';
import { generate3MF } from './vine-stake-3d';
import styles from '../App.module.css';

const HEALTH_OPTIONS = [
  { value: 'EXCELLENT', label: 'EXCELLENT' },
  { value: 'GOOD', label: 'GOOD' },
  { value: 'FAIR', label: 'FAIR' },
  { value: 'POOR', label: 'POOR' },
  { value: 'DEAD', label: 'DEAD' },
];

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

const PRUNING_TYPE_LABELS: Record<string, string> = {
  dormant: 'Dormant',
  summer: 'Summer',
  corrective: 'Corrective',
  training: 'Training',
};

const formatPruningDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const calculateAge = (plantingDate: number | undefined): string => {
  if (!plantingDate) return 'Unknown';

  const planted = new Date(plantingDate);
  const now = new Date();

  const years = now.getFullYear() - planted.getFullYear();
  const months = now.getMonth() - planted.getMonth();

  const totalMonths = years * 12 + months;

  if (totalMonths < 1) return 'Just planted';
  if (totalMonths < 12) return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`;
  if (totalMonths < 24) return '1 year';
  return `${Math.floor(totalMonths / 12)} years`;
};

type VineDetailsViewProps = {
  vine: any;
  onUpdateSuccess: (message: string) => void;
  onDeleteSuccess: (message: string) => void;
  navigateBack: () => void;
  originBlockId?: string;
};

export const VineDetailsView = ({
  vine,
  onUpdateSuccess,
  onDeleteSuccess,
  navigateBack,
  originBlockId,
}: VineDetailsViewProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVineSettingsModal, setShowVineSettingsModal] = useState(false);
  const [showDeleteVineConfirmModal, setShowDeleteVineConfirmModal] = useState(false);
  const [showAddPruningModal, setShowAddPruningModal] = useState(false);
  const [editingPruningLog, setEditingPruningLog] = useState<PruningLogData | null>(null);

  const zero = useZero();
  const blocksData = useBlocks();
  const vineyardData = useVineyard();
  const pruningLogs = usePruningLogs(vine?.id || '');
  const blocks = blocksData.map(transformBlockData);

  // Sort pruning logs by date descending (most recent first)
  const sortedPruningLogs = [...pruningLogs].sort((a, b) => b.date - a.date);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const vineUrl = vine?.id ? `${window.location.origin}/vineyard/vine/${vine.id}` : '';
  const vineDisplayId = vine?.sequence_number != null ? vine.sequence_number.toString().padStart(3, '0') : '';

  // Compute back button label based on navigation origin
  const getBackLabel = () => {
    if (originBlockId) {
      const originBlock = blocks.find((b) => b.id === originBlockId);
      return originBlock ? `BACK TO ${originBlock.name.toUpperCase()}` : 'BACK TO BLOCK';
    }
    return 'BACK TO VINEYARD';
  };
  const backLabel = getBackLabel();

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

  if (!vine || vine.sequence_number == null) {
    return (
      <div className={styles.vineDetails}>
        <button className={styles.backButton} onClick={navigateBack} aria-label="back">
          {'<'} {backLabel}
        </button>
        <div className={styles.vineDetailsHeader}>
          <h1 className={styles.vineDetailsTitle}>VINE NOT FOUND</h1>
        </div>
        <p className={styles.notFoundMessage}>
          The requested vine could not be found.
        </p>
      </div>
    );
  }

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
      link.download = `vine-${vine?.block}-${vineDisplayId}.svg`;
      link.click();
      URL.revokeObjectURL(url);

      if (vine && !vine.qr_generated) {
        zero.mutate.vine.update({
          id: vine.id,
          qr_generated: Date.now(),
          updated_at: Date.now(),
        });
      }
    });
  };

  const handleDownload3MF = async () => {
    if (!vine) return;

    try {
      const blob = await generate3MF(vineUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const vineyardName = vineyardData?.name || 'Vineyard';
      const block = blocks.find(b => b.id === vine.block);
      const blockName = block?.name || vine.block;
      link.download = `${vineyardName}-${blockName}-${vineDisplayId}.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (!vine.qr_generated) {
        zero.mutate.vine.update({
          id: vine.id,
          qr_generated: Date.now(),
          updated_at: Date.now(),
        });
      }
    } catch (error) {
    }
  };

  return (
    <div className={styles.vineDetails}>
      <button className={styles.backButton} onClick={navigateBack}>
        {'<'} {backLabel}
      </button>
      <div className={styles.vineDetailsHeader}>
        <h1 className={styles.vineDetailsTitle}>VINE {vine?.block}-{vineDisplayId}</h1>
        <div className={styles.actionButtonGroup}>
          <button className={styles.actionButton} onClick={() => setShowQRModal(true)}>
            GENERATE TAG
          </button>
          <button
            className={styles.iconButton}
            onClick={() => setShowVineSettingsModal(true)}
            title="Vine Settings"
            aria-label="settings"
          >
            <FiSettings size={20} />
          </button>
        </div>
      </div>
      <div className={styles.vineDetailsGrid}>
        <div className={styles.vineDetailsSection}>
          <h2 className={styles.sectionTitle}>DETAILS</h2>
          <InlineEdit
            label="BLOCK"
            value={vine?.block || ''}
            type="select"
            options={blocks.map((b) => ({ value: b.id, label: b.name }))}
            formatDisplay={(blockId) => {
              const block = blocks.find((b) => b.id === blockId);
              return block?.name || blockId;
            }}
            onSave={async (newBlock) => {
              await zero.mutate.vine.update({
                id: vine.id,
                block: newBlock,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Block updated');
            }}
          />
          <InlineEdit
            label="VARIETY"
            value={vine?.variety || ''}
            type="select"
            options={
              vineyardData?.varieties && vineyardData.varieties.length > 0
                ? vineyardData.varieties.map((v: string) => ({ value: v, label: v }))
                : [{ value: vine?.variety || '', label: vine?.variety || '' }]
            }
            onSave={async (newVariety) => {
              await zero.mutate.vine.update({
                id: vine.id,
                variety: newVariety.toUpperCase(),
                updated_at: Date.now(),
              });
              onUpdateSuccess('Variety updated');
            }}
          />
          <InlineEdit
            label="PLANTED"
            value={vine?.planting_date ? new Date(vine.planting_date).toISOString().split('T')[0] : ''}
            type="date"
            placeholder="Set planting date"
            formatDisplay={(dateStr) => {
              if (!dateStr) return '';
              const date = new Date(dateStr);
              return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }}
            onSave={async (newDateStr) => {
              const timestamp = new Date(newDateStr).getTime();
              await zero.mutate.vine.update({
                id: vine.id,
                planting_date: timestamp,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Planting date updated');
            }}
          />
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>AGE</span>
            <span className={styles.detailValue}>{calculateAge(vine?.planting_date)}</span>
          </div>
          <InlineEdit
            label="HEALTH"
            value={vine?.health || 'GOOD'}
            type="select"
            options={HEALTH_OPTIONS}
            onSave={async (newHealth) => {
              await zero.mutate.vine.update({
                id: vine.id,
                health: newHealth,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Health status updated');
            }}
          />
          <InlineEdit
            label="NOTES"
            value={vine?.notes || ''}
            type="textarea"
            placeholder="Add notes about this vine..."
            onSave={async (newNotes) => {
              await zero.mutate.vine.update({
                id: vine.id,
                notes: newNotes,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Notes updated');
            }}
          />
        </div>
        <div className={styles.vineDetailsSection}>
          <h2 className={styles.sectionTitle}>PHOTOS</h2>
          <p className={styles.sectionPlaceholder}>No photos uploaded</p>
        </div>
        <div className={styles.vineDetailsSection}>
          <h2 className={styles.sectionTitle}>TRAINING & PRUNING</h2>
          <InlineEdit
            label="TRAINING METHOD"
            value={vine?.training_method || ''}
            type="select"
            options={TRAINING_METHOD_OPTIONS}
            formatDisplay={(method) => {
              if (!method) return '';
              const option = TRAINING_METHOD_OPTIONS.find((o) => o.value === method);
              return option?.label || method;
            }}
            onSave={async (newMethod) => {
              await zero.mutate.vine.update({
                id: vine.id,
                training_method: newMethod || null,
                training_method_other: newMethod === 'OTHER' ? vine?.training_method_other : null,
                updated_at: Date.now(),
              });
              onUpdateSuccess('Training method updated');
            }}
          />
          {vine?.training_method === 'OTHER' && (
            <InlineEdit
              label="CUSTOM METHOD"
              value={vine?.training_method_other || ''}
              type="text"
              placeholder="Describe your training system..."
              onSave={async (newDescription) => {
                await zero.mutate.vine.update({
                  id: vine.id,
                  training_method_other: newDescription,
                  updated_at: Date.now(),
                });
                onUpdateSuccess('Custom training method updated');
              }}
            />
          )}
          <div className={styles.detailRow} style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className={styles.formButtonSecondary}
              onClick={() => setShowAddPruningModal(true)}
            >
              LOG PRUNING
            </button>
          </div>
          {sortedPruningLogs.length > 0 ? (
            <div className={styles.pruningLogList} style={{ marginTop: 'var(--space-3)' }}>
              {sortedPruningLogs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  className={styles.pruningLogEntry}
                  onClick={() => setEditingPruningLog(log)}
                  title="Click to edit"
                >
                  <div className={styles.pruningLogHeader}>
                    <span className={styles.pruningLogDate}>{formatPruningDate(log.date)}</span>
                    <span className={styles.pruningLogType}>{PRUNING_TYPE_LABELS[log.pruning_type] || log.pruning_type}</span>
                  </div>
                  {(log.spurs_left != null || log.canes_before != null || log.canes_after != null) && (
                    <div className={styles.pruningLogStats}>
                      {log.spurs_left != null && <span>{log.spurs_left} spurs</span>}
                      {log.canes_before != null && log.canes_after != null && (
                        <span>Canes: {log.canes_before} → {log.canes_after}</span>
                      )}
                    </div>
                  )}
                  {log.notes && (
                    <div className={styles.pruningLogNotes}>{log.notes}</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.sectionPlaceholder} style={{ marginTop: 'var(--space-3)' }}>
              No pruning records yet
            </p>
          )}
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
        title={`VINE TAG - ${vine?.block}-${vineDisplayId}`}
      >
        <div className={styles.qrContainer}>
              <canvas ref={canvasRef} className={styles.qrCanvas} role="img" aria-label="qr code" />
              <div className={styles.qrInfo}>
                <div className={styles.qrVineId}>{vine?.block}-{vineDisplayId}</div>
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
              <button
                type="button"
                className={styles.formButton}
                onClick={handleDownload3MF}
              >
                DOWNLOAD 3D FILE
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
            onSubmit={async (e) => {
              e.preventDefault();
              setFormErrors({});
              setIsSubmitting(true);

              try {
                const formData = new FormData(e.currentTarget);
                const now = Date.now();

                await zero.mutate.vine.update({
                  id: vine.id,
                  block: formData.get('block') as string,
                  variety: (formData.get('variety') as string).toUpperCase(),
                  planting_date: new Date(formData.get('plantingDate') as string).getTime(),
                  updated_at: now,
                });

                setShowVineSettingsModal(false);
                onUpdateSuccess('Vine settings updated successfully');
              } catch (error) {
                setFormErrors({ submit: `Failed to update vine: ${error}` });
              } finally {
                setIsSubmitting(false);
              }
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
                defaultValue={vine.planting_date ? new Date(vine.planting_date).toISOString().split('T')[0] : ''}
                required
              />
            </div>

            {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}

            <div className={styles.formActions}>
              <button type="submit" className={styles.formButton} disabled={isSubmitting}>
                {isSubmitting ? 'SAVING...' : 'SAVE SETTINGS'}
              </button>
            </div>

            <div className={styles.dangerZoneSeparator}>
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
            <p className={styles.deleteConfirmText}>
              Are you sure you want to delete <strong className={styles.deleteConfirmTextAccent}>vine {vine.block}-{vineDisplayId}</strong>? This action cannot be undone.
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
                onClick={async () => {
                  setIsSubmitting(true);
                  setFormErrors({});

                  try {
                    await zero.mutate.vine.delete({ id: vine.id });

                    setShowDeleteVineConfirmModal(false);
                    setShowVineSettingsModal(false);
                    navigateBack();
                    onDeleteSuccess(`Vine ${vine.block}-${vineDisplayId} deleted successfully`);
                  } catch (error) {
                    setFormErrors({ submit: `Failed to delete vine: ${error}` });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'DELETING...' : 'CONFIRM DELETE'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AddPruningModal
        isOpen={showAddPruningModal}
        onClose={() => setShowAddPruningModal(false)}
        onSuccess={onUpdateSuccess}
        vineId={vine?.id || ''}
      />

      <EditPruningModal
        isOpen={editingPruningLog !== null}
        onClose={() => setEditingPruningLog(null)}
        onSuccess={onUpdateSuccess}
        pruningLog={editingPruningLog}
      />
    </div>
  );
};
