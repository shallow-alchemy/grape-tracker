import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { FiSettings } from 'react-icons/fi';
import { Modal } from './Modal';
import { useZero } from '../contexts/ZeroContext';
import { useBlocks, useVineyard } from './vineyard-hooks';
import { transformBlockData } from './vineyard-utils';
import { generate3MF } from './vine-stake-3d';
import styles from '../App.module.css';

type VineDetailsViewProps = {
  vine: any;
  onUpdateSuccess: (message: string) => void;
  onDeleteSuccess: (message: string) => void;
  navigateBack: () => void;
};

export const VineDetailsView = ({
  vine,
  onUpdateSuccess,
  onDeleteSuccess,
  navigateBack,
}: VineDetailsViewProps) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVineSettingsModal, setShowVineSettingsModal] = useState(false);
  const [showDeleteVineConfirmModal, setShowDeleteVineConfirmModal] = useState(false);

  const zero = useZero();
  const blocksData = useBlocks();
  const vineyardData = useVineyard();
  const blocks = blocksData.map(transformBlockData);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const vineUrl = vine ? `${window.location.origin}/vineyard/vine/${vine.id}` : '';

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

  if (!vine) {
    return (
      <div className={styles.vineDetails}>
        <button className={styles.backButton} onClick={navigateBack} aria-label="back">
          {'<'} BACK TO VINES
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
      link.download = `vine-${vine?.block}-${vine?.id}.svg`;
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
      link.download = `${vineyardName}-${blockName}-${vine.id}.stl`;
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
        {'<'} BACK TO VINES
      </button>
      <div className={styles.vineDetailsHeader}>
        <h1 className={styles.vineDetailsTitle}>VINE {vine?.block}-{vine?.id}</h1>
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
              <canvas ref={canvasRef} className={styles.qrCanvas} role="img" aria-label="qr code" />
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
              Are you sure you want to delete <strong className={styles.deleteConfirmTextAccent}>vine {vine.block}-{vine.id}</strong>? This action cannot be undone.
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
                    onDeleteSuccess(`Vine ${vine.block}-${vine.id} deleted successfully`);
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
    </div>
  );
};
