import { Zero } from '@rocicorp/zero';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Button } from 'react-aria-components';
import { Router, Route, Link } from 'wouter';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiStrongWind, WiSnow, WiSnowflakeCold } from 'react-icons/wi';
import { useState, useEffect } from 'react';
import { schema, type Schema } from '../schema';
import { VineyardView } from './components/VineyardView';
import styles from './App.module.css';

export const WeatherSection = () => {
  const [showHighTemps, setShowHighTemps] = useState(true);

  return (
    <section className={styles.weatherSection}>
      <div className={styles.warnings}>
        <div className={styles.warningHeader}>WEATHER WARNINGS</div>
        <div className={styles.warningItem}>FROST WARNING: NOV 15-17</div>
      </div>

      <div className={styles.seasonalActivities}>
        <div className={styles.activityHeader}>WHAT'S NEXT</div>
        <div className={styles.seasonalActivitiesContent}>
          <div className={styles.activityItem}>
            <span className={styles.activityText}>{'>'} HARVEST GRAPES BEFORE NOV 20</span>
          </div>
        </div>
      </div>

      <div className={styles.currentWeather}>
        <div className={styles.temperature}>72°F</div>
        <div className={styles.condition}>PARTLY CLOUDY</div>
        <div className={styles.location}>CURRENT LOCATION</div>
      </div>

      <div className={styles.forecast}>
        <div className={styles.forecastHeaderRow}>
          <div className={styles.forecastHeader}>10-DAY FORECAST</div>
          <button
            className={styles.tempToggle}
            onClick={() => setShowHighTemps(!showHighTemps)}
          >
            {showHighTemps ? 'SHOW LOW TEMPS' : 'SHOW HIGH TEMPS'}
          </button>
        </div>
        <div className={styles.forecastContent}>
          <div className={styles.todayWeatherDesktop}>
            <div className={styles.todayLabel}>TODAY</div>
            <WiCloudy className={styles.todayIcon} />
            <div className={styles.todayTemp}>72°F</div>
            <div className={styles.todayCondition}>PARTLY CLOUDY</div>
          </div>
          <div className={styles.forecastDays}>
            {[
              { day: 'MON', temp: 65, icon: WiDaySunny },
              { day: 'TUE', temp: 66, icon: WiCloudy },
              { day: 'WED', temp: 67, icon: WiRain },
              { day: 'THU', temp: 68, icon: WiThunderstorm },
              { day: 'FRI', temp: 69, icon: WiStrongWind },
              { day: 'SAT', temp: 70, icon: WiCloudy },
              { day: 'SUN', temp: 71, icon: WiSnow },
              { day: 'MON', temp: 72, icon: WiSnowflakeCold },
              { day: 'TUE', temp: 73, icon: WiDaySunny },
              { day: 'WED', temp: 74, icon: WiCloudy }
            ].map((forecast, i) => (
              <div key={i} className={styles.forecastDay}>
                <div className={styles.dayLabel}>{forecast.day}</div>
                <div className={styles.dayTemp}>{forecast.temp}°</div>
                <forecast.icon className={styles.forecastIcon} />
              </div>
            ))}
          </div>
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

export const RecentActivity = () => {
  return (
    <div className={styles.desktopPanel}>
      <h2 className={styles.panelTitle}>RECENT ACTIVITY</h2>
      <div className={styles.activityList}>
        <div className={styles.activityItem}>
          <span className={styles.activityTime}>10:23 AM</span>
          <span className={styles.activityText}>VINE A-123 SCANNED</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityTime}>09:45 AM</span>
          <span className={styles.activityText}>BATCH B-456 UPDATED</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityTime}>08:12 AM</span>
          <span className={styles.activityText}>HARVEST LOG CREATED</span>
        </div>
      </div>
    </div>
  );
};

export const CurrentVintage = () => {
  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>CURRENT VINTAGE</h2>
        <a href="#vintages" className={styles.panelLink}>VIEW ALL VINTAGES</a>
      </div>
      <div className={styles.vintageName}>2024 CABERNET SAUVIGNON</div>
      <div className={styles.vintageMetrics}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>HARVEST BRIX</span>
          <span className={styles.metricValue}>24.5</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>TA</span>
          <span className={styles.metricValue}>6.2 g/L</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>PH</span>
          <span className={styles.metricValue}>3.65</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>OAK TIME</span>
          <span className={styles.metricValue}>8 MONTHS</span>
        </div>
      </div>
      <div className={styles.tastingNote}>
        <div className={styles.tastingHeader}>LATEST TASTING (NOV 1)</div>
        <div className={styles.tastingText}>DEVELOPING WELL. BERRY FORWARD WITH SOFT TANNINS. HINTS OF VANILLA FROM OAK.</div>
      </div>
    </div>
  );
};

export const SuppliesNeeded = () => {
  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>SUPPLIES NEEDED</h2>
        <a href="#inventory" className={styles.panelLink}>VIEW INVENTORY</a>
      </div>
      <div className={styles.suppliesList}>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>YEAST (RED STAR)</span>
          <span className={styles.supplyReason}>HARVEST - NOV 20</span>
        </div>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>POTASSIUM METABISULFATE</span>
          <span className={styles.supplyReason}>HARVEST - NOV 20</span>
        </div>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>CARBOYS (5 GAL)</span>
          <span className={styles.supplyReason}>SECONDARY FERMENT</span>
        </div>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>SANITIZER</span>
          <span className={styles.supplyReason}>EQUIPMENT MAINT</span>
        </div>
      </div>
    </div>
  );
};

export const TaskManagement = () => {
  return (
    <div className={styles.desktopPanel}>
      <h2 className={styles.panelTitle}>TASK MANAGEMENT</h2>
      <div className={styles.taskList}>
        <div className={styles.taskItem}>
          <input type="checkbox" className={styles.taskCheckbox} />
          <span className={styles.taskText}>WINTER PRUNING DUE: DEC 1-15</span>
          <span className={styles.taskDate}>DEC 1</span>
        </div>
        <div className={styles.taskItem}>
          <input type="checkbox" className={styles.taskCheckbox} />
          <span className={styles.taskText}>FROST PROTECTION RECOMMENDED</span>
          <span className={styles.taskDate}>NOV 15</span>
        </div>
        <div className={styles.taskItem}>
          <input type="checkbox" className={styles.taskCheckbox} />
          <span className={styles.taskText}>HARVEST GRAPES BEFORE NOV 20</span>
          <span className={styles.taskDate}>NOV 20</span>
        </div>
        <div className={styles.taskItem}>
          <input type="checkbox" className={styles.taskCheckbox} />
          <span className={styles.taskText}>EQUIPMENT MAINTENANCE CHECK</span>
          <span className={styles.taskDate}>DEC 10</span>
        </div>
      </div>
    </div>
  );
};

export const DesktopDashboard = () => {
  return (
    <div className={styles.desktopDashboard}>
      <div className={styles.desktopRow}>
        <RecentActivity />
        <CurrentVintage />
      </div>
      <div className={styles.desktopRow}>
        <SuppliesNeeded />
        <TaskManagement />
      </div>
    </div>
  );
};

export const DashboardView = () => {
  return (
    <>
      <WeatherSection />
      <QRScanButton />
      <DesktopDashboard />
    </>
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
  const [z, setZ] = useState<Zero<Schema> | null>(null);

  useEffect(() => {
    if (user) {
      const zero = new Zero<Schema>({
        userID: user.id,
        server: process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848',
        schema,
      });
      setZ(zero);

      return () => {
        zero.close();
      };
    }
  }, [user?.id]);

  if (!user || !z) {
    return <div>Loading...</div>;
  }

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
        <Route path="/vineyard">{() => <VineyardView z={z} />}</Route>
        <Route path="/winery" component={WineryView} />
      </div>
    </Router>
  );
};
