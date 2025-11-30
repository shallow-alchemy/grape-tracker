import { ComingSoonPlaceholder } from '../ComingSoonPlaceholder';

export const NotificationsSection = () => {
  return (
    <ComingSoonPlaceholder
      title="Notification Settings"
      features={[
        'Push notification preferences',
        'Email notification preferences',
        'Task due date reminders',
        'Weather alert thresholds',
        'Quiet hours configuration',
      ]}
    />
  );
};
