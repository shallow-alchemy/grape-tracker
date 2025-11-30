import { FiClock } from 'react-icons/fi';
import styles from './SettingsPage.module.css';

type ComingSoonPlaceholderProps = {
  title: string;
  features: string[];
};

export const ComingSoonPlaceholder = ({ title, features }: ComingSoonPlaceholderProps) => {
  return (
    <div className={styles.sectionContent}>
      <div className={styles.comingSoonContainer}>
        <div className={styles.comingSoonHeader}>
          <FiClock className={styles.comingSoonIcon} />
          <span className={styles.comingSoonBadge}>Coming Soon</span>
        </div>

        <h2 className={styles.comingSoonTitle}>{title}</h2>

        <div className={styles.comingSoonFeatures}>
          <p className={styles.comingSoonLabel}>Planned features:</p>
          <ul className={styles.featureList}>
            {features.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
