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
    let statusCheckInterval: number;

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('Failed to connect') ||
          message.includes('WebSocket') ||
          message.includes('Connect timed out')) {
        setStatus('error');
        setErrorMessage('Zero sync server not responding. Changes may not be saved.');
      }
      originalConsoleError.apply(console, args);
    };

    const checkConnectionStatus = () => {
      try {
        if (zero) {
          if (status !== 'error') {
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

    statusCheckInterval = window.setInterval(checkConnectionStatus, 5000);

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

    if (!navigator.onLine) {
      setStatus('offline');
      setErrorMessage('No internet connection');
    }

    return () => {
      if (statusCheckInterval) clearInterval(statusCheckInterval);
      console.error = originalConsoleError;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [zero, status]);

  const getStatusColorClass = (): string => {
    switch (status) {
      case 'connected':
        return styles.statusConnected;
      case 'syncing':
        return styles.statusSyncing;
      case 'offline':
        return styles.statusOffline;
      case 'error':
        return styles.statusError;
      default:
        return '';
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
        return '●';
      case 'syncing':
        return '◐';
      case 'offline':
        return '○';
      case 'error':
        return '⚠';
      default:
        return '?';
    }
  };

  return (
    <div className={styles.syncIndicator}>
      <button
        className={`${styles.statusButton} ${getStatusColorClass()}`}
        onClick={() => setShowDetails(!showDetails)}
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
              <span className={getStatusColorClass()}>{getStatusText()}</span>
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
