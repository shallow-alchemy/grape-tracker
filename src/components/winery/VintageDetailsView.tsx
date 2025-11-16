import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useZero } from '../../contexts/ZeroContext';
import { EditVintageModal } from './EditVintageModal';
import { DeleteVintageConfirmModal } from './DeleteVintageConfirmModal';
import styles from '../../App.module.css';

type VintageDetailsViewProps = {
  vintageId: string;
  onBack: () => void;
};

export const VintageDetailsView = ({ vintageId, onBack }: VintageDetailsViewProps) => {
  const zero = useZero();
  const [vintagesData] = useQuery(zero.query.vintage.where('id', vintageId));
  const vintage = vintagesData[0];

  // Fetch harvest measurements
  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'vintage')
      .where('entity_id', vintageId)
      .where('stage', 'harvest')
  );
  const harvestMeasurement = measurementsData[0];

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteSuccess = (message: string) => {
    showSuccessMessage(message);
    setTimeout(() => onBack(), 500);
  };

  if (!vintage) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div className={styles.errorMessage}>VINTAGE NOT FOUND</div>
        <button className={styles.actionButton} onClick={onBack}>
          BACK TO LIST
        </button>
      </div>
    );
  }

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatStage = (stage: string): string => {
    return stage
      .split('_')
      .map(word => word.toUpperCase())
      .join(' ');
  };

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <button className={styles.backButton} onClick={onBack}>
          ← BACK
        </button>
        <div className={styles.vineyardTitle}>
          {vintage.vintage_year} {vintage.variety}
        </div>
        <div style={{ width: '80px' }} />
      </div>

      {/* Current Stage */}
      <div className={styles.detailSection}>
        <div className={styles.sectionHeader}>CURRENT STAGE</div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-primary-500)',
          textTransform: 'uppercase'
        }}>
          {formatStage(vintage.current_stage)}
        </div>
      </div>

      {/* Grape Source */}
      {vintage.grape_source === 'purchased' && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>GRAPE SOURCE</div>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>SOURCE</div>
              <div className={styles.detailValue}>PURCHASED</div>
            </div>
            {vintage.supplier_name && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>SUPPLIER</div>
                <div className={styles.detailValue}>{vintage.supplier_name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Harvest Details */}
      {(vintage.harvest_date || vintage.harvest_weight_lbs || vintage.harvest_volume_gallons || harvestMeasurement) && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>HARVEST DETAILS</div>
          <div className={styles.detailGrid}>
            {vintage.harvest_date && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>DATE</div>
                <div className={styles.detailValue}>{formatDate(vintage.harvest_date)}</div>
              </div>
            )}
            {vintage.harvest_weight_lbs !== null && vintage.harvest_weight_lbs !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>WEIGHT</div>
                <div className={styles.detailValue}>{vintage.harvest_weight_lbs} LBS</div>
              </div>
            )}
            {vintage.harvest_volume_gallons !== null && vintage.harvest_volume_gallons !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>VOLUME</div>
                <div className={styles.detailValue}>{vintage.harvest_volume_gallons} GAL</div>
              </div>
            )}
            {harvestMeasurement?.brix !== null && harvestMeasurement?.brix !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>BRIX</div>
                <div className={styles.detailValue}>{harvestMeasurement.brix}°</div>
              </div>
            )}
            {harvestMeasurement?.ph !== null && harvestMeasurement?.ph !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>PH</div>
                <div className={styles.detailValue}>{harvestMeasurement.ph}</div>
              </div>
            )}
            {harvestMeasurement?.ta !== null && harvestMeasurement?.ta !== undefined && (
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>TA</div>
                <div className={styles.detailValue}>{harvestMeasurement.ta} G/L</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {vintage.notes && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>NOTES</div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap'
          }}>
            {vintage.notes}
          </div>
        </div>
      )}

      {/* Actions */}
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      <div className={styles.detailSection} style={{ marginTop: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
          <button className={styles.actionButton} onClick={() => setShowEditModal(true)}>
            EDIT
          </button>
          <button className={styles.deleteButton} onClick={() => setShowDeleteModal(true)}>
            DELETE
          </button>
        </div>
      </div>

      {vintage && (
        <>
          <EditVintageModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSuccess={showSuccessMessage}
            vintage={vintage}
          />

          <DeleteVintageConfirmModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onSuccess={handleDeleteSuccess}
            vintage={vintage}
          />
        </>
      )}
    </div>
  );
};
