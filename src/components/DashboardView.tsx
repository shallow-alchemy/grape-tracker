import { useState } from 'react';
import { Button } from 'react-aria-components';
import { Weather } from './Weather';
import { QRScanner } from './QRScanner';
import { DesktopDashboard } from './dashboard/DesktopDashboard';
import styles from '../App.module.css';

export const QRScanButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.scanButtonContainer}>
      <Button className={styles.scanButton} onPress={onClick}>
        <div className={styles.scanIcon}>⊞</div>
        <div className={styles.scanText}>SCAN QR CODE</div>
      </Button>
    </div>
  );
};

export const DashboardView = () => {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      <Weather />
      <QRScanButton onClick={() => setShowScanner(true)} />
      <DesktopDashboard />
      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </>
  );
};
