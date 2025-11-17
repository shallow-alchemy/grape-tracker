import { useEffect } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
  closeDisabled?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export const Modal = ({ isOpen, onClose, title, titleRight, children, closeDisabled = false, size = 'medium' }: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !closeDisabled) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, closeDisabled]);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (!closeDisabled) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div
        className={`${styles.modalContent} ${styles[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: titleRight ? 0 : undefined }}>
          <h2 className={styles.modalTitle} style={{ marginBottom: titleRight ? 0 : undefined }}>{title}</h2>
          {titleRight && <div>{titleRight}</div>}
        </div>
        {children}
      </div>
    </div>
  );
};
