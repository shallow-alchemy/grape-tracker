import { Link } from 'wouter';
import { GiGrapes } from 'react-icons/gi';
import styles from './LandingPage.module.css';

export const LandingPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.appTitle}>GILBERT</div>
        <div className={styles.authButtons}>
          <Link href="/sign-up">
            <button className={styles.signUpButton}>SIGN UP</button>
          </Link>
          <Link href="/sign-in">
            <button className={styles.signInButton}>SIGN IN</button>
          </Link>
        </div>
        <GiGrapes className={styles.grapes} />
      </div>
    </div>
  );
};
