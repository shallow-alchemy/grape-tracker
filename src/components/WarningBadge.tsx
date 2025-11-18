import { CSSProperties } from 'react';
import styles from './WarningBadge.module.css';

type WarningBadgeProps = {
  text: string;
  size?: 'small' | 'medium' | 'large';
  style?: CSSProperties;
};

export const WarningBadge = ({ text, size = 'medium', style }: WarningBadgeProps) => {
  return (
    <span className={`${styles.warningBadge} ${styles[size]}`} style={style}>
      {text}
    </span>
  );
};
