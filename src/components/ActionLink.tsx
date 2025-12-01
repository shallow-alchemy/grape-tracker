import styles from '../App.module.css';

type ActionLinkProps = {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
};

export const ActionLink = ({ onClick, children, className }: ActionLinkProps) => {
  const combinedClassName = className
    ? `${styles.createNewButton} ${className}`
    : styles.createNewButton;

  return (
    <button className={combinedClassName} onClick={onClick}>
      {children}
    </button>
  );
};
