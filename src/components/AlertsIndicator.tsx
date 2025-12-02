import { useState, useRef, useEffect } from 'react';
import { FiBell } from 'react-icons/fi';
import { useAlerts } from '../contexts/AlertsContext';
import styles from '../App.module.css';

const DISMISS_KEY = 'alerts_dismissed_at';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const isDismissed = (): boolean => {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;
  const dismissTime = parseInt(dismissedAt, 10);
  return Date.now() - dismissTime < DISMISS_DURATION_MS;
};

const formatAlertMessage = (message: string): string => {
  // Extract the key info from messages like "LOW TEMP: MON EXPECTED LOW 22°F"
  const match = message.match(/^([^:]+):\s*(\w+)(?:\s+(?:EXPECTED\s+)?(?:LOW\s+)?(\d+°F))?/);
  if (match) {
    const [, type, day, temp] = match;
    return temp ? `${type}: ${day} ${temp}` : `${type}: ${day}`;
  }
  return message;
};

export const AlertsIndicator = () => {
  const { alerts } = useAlerts();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAlerts = dismissed ? [] : alerts;
  const hasAlerts = activeAlerts.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset dismissed state when alerts change
  useEffect(() => {
    if (alerts.length > 0) {
      setDismissed(isDismissed());
    }
  }, [alerts]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
    setIsOpen(false);
  };

  return (
    <div className={styles.alertsIndicator} ref={dropdownRef}>
      <button
        className={`${styles.alertsButton} ${hasAlerts ? styles.alertsButtonActive : ''}`}
        onClick={() => hasAlerts && setIsOpen(!isOpen)}
        aria-label={hasAlerts ? `${activeAlerts.length} alerts` : 'No alerts'}
      >
        <FiBell size={18} />
        {hasAlerts && (
          <span className={styles.alertsBadge}>{activeAlerts.length}</span>
        )}
      </button>

      {isOpen && hasAlerts && (
        <div className={styles.alertsDropdown}>
          <div className={styles.alertsDropdownHeader}>
            <span>ALERTS</span>
            <button
              className={styles.alertsDropdownDismiss}
              onClick={handleDismiss}
            >
              Dismiss all
            </button>
          </div>
          <div className={styles.alertsDropdownList}>
            {activeAlerts.map((alert, i) => (
              <div key={i} className={styles.alertsDropdownItem}>
                <span className={styles.alertsDropdownIcon}>⚠</span>
                <span className={styles.alertsDropdownText}>
                  {formatAlertMessage(alert.message)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
