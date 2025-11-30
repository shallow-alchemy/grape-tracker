import { useState, useRef, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import styles from './UserMenu.module.css';

export const UserMenu = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSettings = () => {
    setIsOpen(false);
    setLocation('/settings');
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
  };

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        className={styles.menuTrigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt="User avatar"
            className={styles.avatar}
          />
        ) : (
          <span className={styles.avatarInitials}>
            <FiUser className={styles.avatarIcon} />
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {user?.firstName || user?.username || 'User'}
            </span>
            <span className={styles.userEmail}>
              {user?.primaryEmailAddress?.emailAddress || ''}
            </span>
          </div>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={handleSettings}
            role="menuitem"
          >
            <FiSettings className={styles.menuIcon} />
            <span>Settings</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={handleLogout}
            role="menuitem"
          >
            <FiLogOut className={styles.menuIcon} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};
