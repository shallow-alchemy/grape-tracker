import { useState, useEffect } from 'react';
import { useZero } from '../contexts/ZeroContext';

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export const useSyncStatus = () => {
  const zero = useZero();
  const [status, setStatus] = useState<SyncStatus>('connected');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('Failed to connect') ||
          message.includes('WebSocket') ||
          message.includes('Connect timed out')) {
        setStatus('error');
        setErrorMessage('Error syncing data. Your changes may not be saved.');
      }
      originalConsoleError.apply(console, args);
    };

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
    } else if (zero) {
      setStatus('connected');
    }

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [zero]);

  const isHealthy = status === 'connected' || status === 'syncing';

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

  return { status, isHealthy, errorMessage, getStatusText };
};
