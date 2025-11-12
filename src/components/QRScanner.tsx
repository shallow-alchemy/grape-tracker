import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Html5Qrcode } from 'html5-qrcode';
import styles from '../App.module.css';

type QRScannerProps = {
  onClose: () => void;
};

export const QRScanner = ({ onClose }: QRScannerProps) => {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerInitialized = useRef(false);

  useEffect(() => {
    if (scannerInitialized.current) return;
    scannerInitialized.current = true;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    const handleSuccess = (decodedText: string) => {
      setScanning(false);

      try {
        let vineId = decodedText;

        if (decodedText.includes('/vineyard/vine/')) {
          const match = decodedText.match(/\/vineyard\/vine\/([^/?#]+)/);
          if (match && match[1]) {
            vineId = match[1];
          }
        }

        scanner.stop().then(() => {
          setLocation(`/vineyard/vine/${vineId}`);
          onClose();
        }).catch(err => {
          console.error('Error stopping scanner:', err);
          setLocation(`/vineyard/vine/${vineId}`);
          onClose();
        });
      } catch (err) {
        setError('Invalid QR code format');
        setScanning(true);
      }
    };

    const handleError = (_errorMessage: string) => {
      // Ignore decoding errors - they're normal when no QR code is visible
    };

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 30,
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          const minEdgePercentage = 0.7;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: 1.0,
      },
      handleSuccess,
      handleError
    ).then(() => {
      setScanning(true);
    }).catch(err => {
      console.error('Error starting scanner:', err);
      if (err.toString().includes('NotAllowedError')) {
        setError('Camera permission denied. Please enable camera access in your browser settings.');
      } else if (err.toString().includes('NotFoundError')) {
        setError('No camera found on this device.');
      } else {
        setError('Failed to start camera. Please try again.');
      }
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error('Error stopping scanner on cleanup:', err);
        });
      }
    };
  }, [setLocation, onClose]);

  const handleRetry = () => {
    setError(null);
    scannerInitialized.current = false;
    window.location.reload();
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
              onClick={handleRetry}
            >
              TRY AGAIN
            </button>
          </div>
        ) : (
          <div id="qr-reader" className={styles.qrScannerVideoContainer}></div>
        )}

        <div className={styles.qrScannerInstructions}>
          {scanning ? 'POSITION QR CODE WITHIN THE FRAME' : error ? '' : 'INITIALIZING CAMERA...'}
        </div>
      </div>
    </div>
  );
};
