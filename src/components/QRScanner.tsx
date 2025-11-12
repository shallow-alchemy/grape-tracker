import { useState } from 'react';
import { useLocation } from 'wouter';
import { QrReader } from 'react-qr-reader';
import styles from '../App.module.css';

type QRScannerProps = {
  onClose: () => void;
};

export const QRScanner = ({ onClose }: QRScannerProps) => {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const handleScan = (result: any) => {
    if (result) {
      setScanning(false);
      const text = result?.text || result;

      // Extract vine ID from URL
      // Expected format: https://domain.com/vineyard/vine/VINE_ID or just VINE_ID
      try {
        let vineId = text;

        // If it's a URL, extract the vine ID
        if (text.includes('/vineyard/vine/')) {
          const match = text.match(/\/vineyard\/vine\/([^/?#]+)/);
          if (match && match[1]) {
            vineId = match[1];
          }
        }

        // Navigate to the vine details
        setLocation(`/vineyard/vine/${vineId}`);
        onClose();
      } catch (err) {
        setError('Invalid QR code format');
        setScanning(true);
      }
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner error:', err);
    if (err?.name === 'NotAllowedError') {
      setError('Camera permission denied. Please enable camera access in your browser settings.');
    } else if (err?.name === 'NotFoundError') {
      setError('No camera found on this device.');
    } else {
      setError('Failed to start camera. Please try again.');
    }
    setScanning(false);
  };

  return (
    <div className={styles.qrScannerOverlay}>
      <div className={styles.qrScannerContainer}>
        <div className={styles.qrScannerHeader}>
          <h2 className={styles.qrScannerTitle}>SCAN QR CODE</h2>
          <button
            className={styles.qrScannerClose}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className={styles.qrScannerError}>
            <div className={styles.qrScannerErrorIcon}>⚠</div>
            <div className={styles.qrScannerErrorText}>{error}</div>
            <button
              className={styles.qrScannerRetry}
              onClick={() => {
                setError(null);
                setScanning(true);
              }}
            >
              TRY AGAIN
            </button>
          </div>
        ) : (
          <div className={styles.qrScannerVideoContainer}>
            {scanning && (
              <QrReader
                onResult={handleScan}
                constraints={{
                  facingMode: 'environment', // Use back camera on mobile
                }}
                videoStyle={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                containerStyle={{
                  width: '100%',
                  height: '100%',
                }}
                videoContainerStyle={{
                  width: '100%',
                  height: '100%',
                  paddingTop: '0',
                }}
                // @ts-ignore - types are outdated
                onLoad={() => setError(null)}
                // @ts-ignore
                onError={handleError}
              />
            )}
            <div className={styles.qrScannerOverlayBox}>
              <div className={styles.qrScannerCorner} style={{ top: 0, left: 0 }} />
              <div className={styles.qrScannerCorner} style={{ top: 0, right: 0 }} />
              <div className={styles.qrScannerCorner} style={{ bottom: 0, left: 0 }} />
              <div className={styles.qrScannerCorner} style={{ bottom: 0, right: 0 }} />
            </div>
          </div>
        )}

        <div className={styles.qrScannerInstructions}>
          {scanning ? 'POSITION QR CODE WITHIN THE FRAME' : 'PROCESSING...'}
        </div>
      </div>
    </div>
  );
};
