import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { FiSettings } from 'react-icons/fi';
import { useZero } from '../../contexts/ZeroContext';
import { EditVintageModal } from './EditVintageModal';
import { AddWineModal } from './AddWineModal';
import { StageTransitionModal } from './StageTransitionModal';
import { TaskListView } from './TaskListView';
import { formatStage } from './stages';
import styles from '../../App.module.css';

type VintageDetailsViewProps = {
  vintageId: string;
  onBack: () => void;
  onWineClick: (wineId: string) => void;
};

export const VintageDetailsView = ({ vintageId, onBack, onWineClick }: VintageDetailsViewProps) => {
  const zero = useZero();
  const [vintagesData] = useQuery(zero.query.vintage.where('id', vintageId));
  const vintage = vintagesData[0];

  // Fetch all wines to check both primary vintage and blend components
  const [allWinesData] = useQuery(zero.query.wine);

  // Filter wines that use this vintage (either as primary or in blend)
  const wines = allWinesData.filter(wine => {
    // Check if this is the primary vintage
    if (wine.vintage_id === vintageId) {
      return true;
    }

    // Check if this vintage is in the blend components
    if (wine.blend_components && Array.isArray(wine.blend_components)) {
      return wine.blend_components.some((component: any) => component.vintage_id === vintageId);
    }

    return false;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Fetch harvest measurements
  const [measurementsData] = useQuery(
    zero.query.measurement
      .where('entity_type', 'vintage')
      .where('entity_id', vintageId)
      .where('stage', 'harvest')
  );
  const harvestMeasurement = measurementsData[0];

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
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

  // Show task list view if requested
  if (showTaskList) {
    return (
      <TaskListView
        entityType="vintage"
        entityId={vintageId}
        entityName={`${vintage.vintage_year} ${vintage.variety}`}
        currentStage={vintage.current_stage}
        onBack={() => setShowTaskList(false)}
      />
    );
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <button className={styles.backButton} onClick={onBack}>
          ← BACK
        </button>
        <div className={styles.vineyardTitle}>
          {vintage.vintage_year} {vintage.variety}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <button className={styles.actionButton} onClick={() => setShowTaskList(true)}>
            TASKS
          </button>
          <button className={styles.actionButton} onClick={() => setShowAddWineModal(true)}>
            CREATE WINE
          </button>
          <button className={styles.gearButton} onClick={() => setShowEditModal(true)}>
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      {/* Current Stage */}
      <div className={styles.detailSection}>
        <div className={styles.sectionHeader}>CURRENT STAGE</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap'
        }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-primary-500)',
            textTransform: 'uppercase'
          }}>
            {formatStage(vintage.current_stage)}
          </div>
          <button
            className={styles.actionButton}
            onClick={() => setShowStageModal(true)}
            style={{
              fontSize: 'var(--font-size-xs)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
            }}
          >
            ADVANCE STAGE
          </button>
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

      {/* Wines Made From This Vintage */}
      {wines.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.sectionHeader}>
            WINES FROM THIS VINTAGE ({wines.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {wines.map((wine) => {
              const isBlend = wine.blend_components && Array.isArray(wine.blend_components) && wine.blend_components.length > 0;
              return (
                <div
                  key={wine.id}
                  onClick={() => onWineClick(wine.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onWineClick(wine.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.backgroundColor = 'rgba(58, 122, 58, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)'
                    }}>
                      {wine.name}
                      <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-accent)',
                        border: '1px solid var(--color-primary-500)',
                        padding: '2px var(--spacing-xs)',
                        borderRadius: 'var(--radius-sm)',
                      }}>
                        {isBlend ? 'BLEND' : 'VARIETAL'}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-body)',
                      marginTop: 'var(--spacing-xs)'
                    }}>
                      {wine.wine_type.toUpperCase()} • {wine.current_volume_gallons} GAL • {wine.status.toUpperCase()}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    →
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {vintage && (
        <EditVintageModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={showSuccessMessage}
          onDelete={onBack}
          vintage={vintage}
        />
      )}

      <AddWineModal
        isOpen={showAddWineModal}
        onClose={() => setShowAddWineModal(false)}
        onSuccess={showSuccessMessage}
        initialVintageId={vintageId}
      />

      {vintage && (
        <StageTransitionModal
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          onSuccess={showSuccessMessage}
          entityType="vintage"
          entityId={vintageId}
          currentStage={vintage.current_stage}
        />
      )}
    </div>
  );
};
