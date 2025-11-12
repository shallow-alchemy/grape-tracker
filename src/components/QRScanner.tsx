import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import QrScanner from 'qr-scanner';
import styles from '../App.module.css';

type QRScannerProps = {
  onClose: () => void;
};

export const QRScanner = ({ onClose }: QRScannerProps) => {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        setScanning(false);

        try {
          let vineId = result.data;

          if (result.data.includes('/vineyard/vine/')) {
            const match = result.data.match(/\/vineyard\/vine\/([^/?#]+)/);
            if (match && match[1]) {
              vineId = match[1];
            }
          }

          scanner.stop();
          setLocation(`/vineyard/vine/${vineId}`);
          onClose();
        } catch (err) {
          setError('Invalid QR code format');
          setScanning(true);
        }
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
      }
    );

    scannerRef.current = scanner;

    scanner.start().then(() => {
      setScanning(true);
    }).catch(err => {
      console.error('Error starting scanner:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please enable camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to start camera. Please try again.');
      }
    });

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [setLocation, onClose]);

  const handleRetry = () => {
    setError(null);
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
          <div className={styles.qrScannerVideoContainer}>
            <video ref={videoRef} className={styles.qrScannerVideo}></video>
          </div>
        )}

        <div className={styles.qrScannerInstructions}>
          {scanning ? 'POSITION QR CODE WITHIN THE FRAME' : error ? '' : 'INITIALIZING CAMERA...'}
        </div>
      </div>
    </div>
  );
};
