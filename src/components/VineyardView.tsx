import { Zero } from '@rocicorp/zero';
import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { type Schema } from '../../schema';
import styles from '../App.module.css';

const calculateAge = (plantingDate: Date): string => {
  const years = new Date().getFullYear() - plantingDate.getFullYear();
  return `${years} YRS`;
};

const generateVineId = (block: string, vines: any[]): string => {
  const blockVines = vines.filter(v => v.block === block);
  const maxNumber = blockVines.length > 0
    ? Math.max(...blockVines.map(v => parseInt(v.id.split('-')[1])))
    : 0;
  const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${block}-${nextNumber}`;
};

export const VineyardView = ({ z }: { z: Zero<Schema> }) => {
  const [selectedVine, setSelectedVine] = useState<string | null>(null);
  const [showAddVineModal, setShowAddVineModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [vinesData, setVinesData] = useState<any[]>([]);
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

  const vines = vinesData.map((vine: any) => ({
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

  const handleAddVine = async (vineData: { block: string; variety: string; plantingDate: Date; health: string; notes?: string }) => {
    const errors = validateVineForm(vineData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const newVineId = generateVineId(vineData.block, vines);
      const sequenceNumber = parseInt(newVineId.split('-')[1]);
      const now = Date.now();

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

      setShowAddVineModal(false);
      setSuccessMessage(`Vine ${newVineId} created successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setSelectedVine(newVineId);
    } catch (error) {
      setFormErrors({ submit: 'Failed to create vine. Please try again.' });
    } finally {
      setIsSubmitting(false);
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
        link.download = `vine-${vine?.id}.svg`;
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
          <h1 className={styles.vineDetailsTitle}>VINE {vine?.id}</h1>
          <button className={styles.actionButton} onClick={() => setShowQRModal(true)}>
            GENERATE TAG
          </button>
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

        {showQRModal && (
          <div className={styles.modal} onClick={() => setShowQRModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>VINE TAG - {vine?.id}</h2>
              <div className={styles.qrContainer}>
                <canvas ref={canvasRef} className={styles.qrCanvas} />
                <div className={styles.qrInfo}>
                  <div className={styles.qrVineId}>{vine?.id}</div>
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
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <h1 className={styles.vineyardTitle}>VINEYARD</h1>
        <div className={styles.desktopActions}>
          <button className={styles.actionButton} onClick={() => setShowAddVineModal(true)}>ADD VINE</button>
          <button className={styles.actionButton}>VINE TAGS</button>
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
            <div className={styles.vineId}>{vine.id}</div>
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

      {showAddVineModal && (
        <div className={styles.modal} onClick={() => {
          if (!isSubmitting) {
            setShowAddVineModal(false);
            setFormErrors({});
            setIsSubmitting(false);
          }
        }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>ADD VINE</h2>
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
                });
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>BLOCK</label>
                <select name="block" className={styles.formSelect} required>
                  <option value="">Select Block</option>
                  <option value="A">BLOCK A</option>
                  <option value="B">BLOCK B</option>
                  <option value="C">BLOCK C</option>
                  <option value="D">BLOCK D</option>
                </select>
                <div className={styles.formHint}>Vineyard section where vine will be planted</div>
                {formErrors.block && <div className={styles.formError}>{formErrors.block}</div>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>VARIETY</label>
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
                <div className={styles.formHint}>Grape variety name (automatically converted to uppercase)</div>
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
          </div>
        </div>
      )}
    </div>
  );
};
