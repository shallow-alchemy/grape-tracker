import { ReactNode } from 'react';
import styles from '../App.module.css';

type ListItemProps = {
  id: string | ReactNode;
  primaryInfo: string | ReactNode;
  secondaryInfo: string | ReactNode;
  status: string | ReactNode;
  statusWarning?: boolean;
  onClick?: () => void;
};

export const ListItem = ({
  id,
  primaryInfo,
  secondaryInfo,
  status,
  statusWarning = false,
  onClick,
}: ListItemProps) => {
  return (
    <div className={styles.vineItem} onClick={onClick}>
      <div className={styles.vineId}>{id}</div>
      <div className={styles.vineInfo}>
        <div className={styles.vineVariety}>{primaryInfo}</div>
        <div className={styles.vineBlock}>{secondaryInfo}</div>
      </div>
      <div className={`${styles.vineHealth} ${statusWarning ? styles.vineHealthWarning : ''}`}>
        {status}
      </div>
    </div>
  );
};
