import { Zero } from '@rocicorp/zero';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Button } from 'react-aria-components';
import { Router, Route, Link } from 'wouter';
import { schema, type Schema } from '../schema';
import styles from './App.module.css';

export const WeatherSection = () => {
  return (
    <section className={styles.weatherSection}>
      <div className={styles.warnings}>
        <div className={styles.warningHeader}>WEATHER WARNINGS</div>
        <div className={styles.warningItem}>FROST WARNING: NOV 15-17</div>
        <div className={styles.warningItem}>HARVEST WINDOW: OPTIMAL</div>
      </div>

      <div className={styles.seasonalActivities}>
        <div className={styles.activityHeader}>WHAT'S NEXT</div>
        <div className={styles.activityItem}>{'>'} WINTER PRUNING DUE: DEC 1-15</div>
        <div className={styles.activityItem}>{'>'} FROST PROTECTION RECOMMENDED</div>
        <div className={styles.activityItem}>{'>'} HARVEST GRAPES BEFORE NOV 20</div>
      </div>

      <div className={styles.currentWeather}>
        <div className={styles.temperature}>72°F</div>
        <div className={styles.condition}>PARTLY CLOUDY</div>
        <div className={styles.location}>CURRENT LOCATION</div>
      </div>

      <div className={styles.forecast}>
        <div className={styles.forecastHeader}>10-DAY FORECAST</div>
        <div className={styles.forecastDays}>
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED'].map((day, i) => (
            <div key={i} className={styles.forecastDay}>
              <div className={styles.dayLabel}>{day}</div>
              <div className={styles.dayTemp}>{65 + i}°</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const QRScanButton = () => {
  return (
    <Button className={styles.scanButton}>
      <div className={styles.scanIcon}>⊞</div>
      <div className={styles.scanText}>SCAN QR CODE</div>
    </Button>
  );
};

export const DashboardView = () => {
  return (
    <>
      <WeatherSection />
      <QRScanButton />
    </>
  );
};

export const VineyardView = () => {
  return (
    <div className={styles.viewContainer}>
      <h1 className={styles.viewTitle}>VINEYARD</h1>
      <p className={styles.viewPlaceholder}>Vineyard management coming soon...</p>
    </div>
  );
};

export const WineryView = () => {
  return (
    <div className={styles.viewContainer}>
      <h1 className={styles.viewTitle}>WINERY</h1>
      <p className={styles.viewPlaceholder}>Winery management coming soon...</p>
    </div>
  );
};

export const App = () => {
  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  // @ts-expect-error - Zero instance will be used later
  const z = new Zero<Schema>({
    userID: user.id,
    server: process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848',
    schema,
  });

  return (
    <Router>
      <div className={styles.app}>
        <header className={styles.header}>
          <Link href="/" className={styles.appTitle}>GILBERT</Link>
          <nav className={styles.nav}>
            <Link href="/vineyard" className={styles.navLink}>VINEYARD</Link>
            <Link href="/winery" className={styles.navLink}>WINERY</Link>
          </nav>
          <UserButton />
        </header>
        <Route path="/" component={DashboardView} />
        <Route path="/vineyard" component={VineyardView} />
        <Route path="/winery" component={WineryView} />
      </div>
    </Router>
  );
};
