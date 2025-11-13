import { Alert } from '../utils/weather';
import styles from '../App.module.css';

type AlertsProps = {
  alerts: Alert[];
};

const groupAlerts = (alerts: Alert[]) => {
  const groups: Record<string, { label: string; entries: string[]; severity: string }> = {};

  alerts.forEach(alert => {
    const type = alert.alert_type;

    if (!groups[type]) {
      // Extract the label (everything before the colon or first day)
      const labelMatch = alert.message.match(/^([^:]+):/);
      groups[type] = {
        label: labelMatch ? labelMatch[1] : type.toUpperCase(),
        entries: [],
        severity: alert.severity
      };
    }

    // Extract day and value info from message
    // Patterns: "DAY EXPECTED XX°F", "DAY LOW XX°F", or just "DAY"
    const dayMatch = alert.message.match(/:\s*(\w+)(?:\s+(?:EXPECTED|LOW)\s+(\d+)°F)?/);
    if (dayMatch) {
      const day = dayMatch[1];
      const temp = dayMatch[2];
      groups[type].entries.push(temp ? `${day} (${temp}°F)` : day);
    }
  });

  return Object.values(groups).map(group => ({
    message: `${group.label}: ${group.entries.join(', ')}`,
    severity: group.severity
  }));
};

export const Alerts = ({ alerts }: AlertsProps) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const groupedAlerts = groupAlerts(alerts);

  return (
    <div className={styles.warnings}>
      <div className={styles.warningHeader}>ALERTS</div>
      {groupedAlerts.map((alert, i) => (
        <div key={i} className={styles.warningItem}>
          {alert.message}
        </div>
      ))}
    </div>
  );
};
