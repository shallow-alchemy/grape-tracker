import { useState, useEffect } from 'react';
import { useZero } from '../contexts/ZeroContext';
import styles from './SyncStatusIndicator.module.css';

type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export const SyncStatusIndicator = () => {
  const zero = useZero();
  const [status, setStatus] = useState<SyncStatus>('connected');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Monitor Zero connection status
    let statusCheckInterval: number;

    const checkConnectionStatus = () => {
      // Zero doesn't expose connection status directly, so we monitor activity
      // This is a workaround until Zero adds official connection status API

      try {
        // If we can access zero object, we're likely connected
        if (zero) {
          // Default to connected if we can access Zero
          if (status === 'offline' || status === 'error') {
            // Only update if we were previously offline/error
            setStatus('connected');
          }
        } else {
          setStatus('offline');
        }
      } catch (error) {
        console.error('Zero connection check failed:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Connection check failed');
      }
    };

    // Check every 5 seconds
    statusCheckInterval = window.setInterval(checkConnectionStatus, 5000);

    // Listen for network online/offline events
    const handleOnline = () => {
      setStatus('syncing');
      setErrorMessage('');
      setTimeout(() => setStatus('connected'), 2000);
    };

    const handleOffline = () => {
      setStatus('offline');
      setErrorMessage('No internet connection');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setStatus('offline');
      setErrorMessage('No internet connection');
    }

    return () => {
      if (statusCheckInterval) clearInterval(statusCheckInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [zero, status]);

  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
        return 'var(--color-success)';
      case 'syncing':
        return 'var(--color-warning)';
      case 'offline':
      case 'error':
        return 'var(--color-danger)';
      default:
        return 'var(--color-text-muted)';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'connected':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Sync Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case 'connected':
        return '●'; // Solid circle
      case 'syncing':
        return '◐'; // Half circle (rotating in CSS)
      case 'offline':
        return '○'; // Empty circle
      case 'error':
        return '⚠';
      default:
        return '?';
    }
  };

  return (
    <div className={styles.syncIndicator}>
      <button
        className={styles.statusButton}
        onClick={() => setShowDetails(!showDetails)}
        style={{ color: getStatusColor() }}
        aria-label="Sync status"
      >
        <span className={status === 'syncing' ? styles.rotating : ''}>
          {getStatusIcon()}
        </span>
        <span className={styles.statusText}>{getStatusText()}</span>
      </button>

      {showDetails && (
        <div className={styles.detailsPopup}>
          <div className={styles.detailsHeader}>
            <span>Sync Status</span>
            <button
              className={styles.closeButton}
              onClick={() => setShowDetails(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className={styles.detailsContent}>
            <div className={styles.statusRow}>
              <span className={styles.label}>Status:</span>
              <span style={{ color: getStatusColor() }}>{getStatusText()}</span>
            </div>

            {errorMessage && (
              <div className={styles.errorMessage}>
                {errorMessage}
              </div>
            )}

            {status === 'offline' && (
              <div className={styles.offlineWarning}>
                ⚠️ Changes are saved locally but won't sync until you're back online.
              </div>
            )}

            {status === 'error' && (
              <div className={styles.errorWarning}>
                ⚠️ Sync error detected. Your changes may not be saved to the server.
                <button
                  className={styles.retryButton}
                  onClick={() => window.location.reload()}
                >
                  Refresh to retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
