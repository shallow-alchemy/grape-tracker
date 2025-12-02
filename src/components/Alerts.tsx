import { useState, useEffect } from 'react';
import { Alert } from '../utils/weather';
import styles from '../App.module.css';

type AlertsProps = {
  alerts: Alert[];
};

const DISMISS_KEY = 'alerts_dismissed_at';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const formatAlertLine = (alerts: Alert[]): string => {
  const groups: Record<string, { label: string; entries: string[] }> = {};

  alerts.forEach(alert => {
    const type = alert.alert_type;

    if (!groups[type]) {
      const labelMatch = alert.message.match(/^([^:]+):/);
      groups[type] = {
        label: labelMatch ? labelMatch[1] : type.toUpperCase(),
        entries: [],
      };
    }

    const dayMatch = alert.message.match(/:\s*(\w+)(?:\s+(?:EXPECTED|LOW)\s+(\d+)°F)?/);
    if (dayMatch) {
      const day = dayMatch[1];
      const temp = dayMatch[2];
      groups[type].entries.push(temp ? `${day} ${temp}°F` : day);
    }
  });

  return Object.values(groups)
    .map(group => `${group.label}: ${group.entries.join(', ')}`)
    .join(' │ ');
};

const isDismissed = (): boolean => {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;
  const dismissTime = parseInt(dismissedAt, 10);
  return Date.now() - dismissTime < DISMISS_DURATION_MS;
};

export const Alerts = ({ alerts }: AlertsProps) => {
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setDismissed(isDismissed());
  }, [alerts]);

  if (!alerts || alerts.length === 0 || dismissed) {
    return null;
  }

  const alertLine = formatAlertLine(alerts);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      setDismissed(true);
    }, 300);
  };

  return (
    <div className={`${styles.terminalAlert} ${visible ? '' : styles.terminalAlertFadeOut}`}>
      <span className={styles.terminalAlertIcon}>⚠</span>
      <span className={styles.terminalAlertText}>{alertLine}</span>
      <button
        className={styles.terminalAlertDismiss}
        onClick={handleDismiss}
        aria-label="Dismiss alerts"
      >
        ×
      </button>
    </div>
  );
};
