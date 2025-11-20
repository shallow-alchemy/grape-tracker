import styles from './WarningBadge.module.css';

type WarningBadgeProps = {
  text: string;
  size?: 'small' | 'medium' | 'large';
  spaced?: boolean;
};

export const WarningBadge = ({ text, size = 'medium', spaced = false }: WarningBadgeProps) => {
  return (
    <span className={`${styles.warningBadge} ${styles[size]} ${spaced ? styles.spacedInline : ''}`}>
      {text}
    </span>
  );
};
