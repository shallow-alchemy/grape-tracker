import { Zero } from '@rocicorp/zero';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Button } from 'react-aria-components';
import { Router, Route, Link } from 'wouter';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiStrongWind, WiSnow, WiSnowflakeCold } from 'react-icons/wi';
import { useState } from 'react';
import { schema, type Schema } from '../schema';
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

export const VineyardView = () => {
  const [selectedVine, setSelectedVine] = useState<string | null>(null);

  const vines = [
    { id: 'A-001', block: 'BLOCK A', variety: 'CABERNET SAUVIGNON', age: '5 YRS', health: 'GOOD' },
    { id: 'A-002', block: 'BLOCK A', variety: 'CABERNET SAUVIGNON', age: '5 YRS', health: 'GOOD' },
    { id: 'A-003', block: 'BLOCK A', variety: 'CABERNET SAUVIGNON', age: '5 YRS', health: 'NEEDS ATTENTION' },
    { id: 'B-001', block: 'BLOCK B', variety: 'MERLOT', age: '3 YRS', health: 'GOOD' },
    { id: 'B-002', block: 'BLOCK B', variety: 'MERLOT', age: '3 YRS', health: 'EXCELLENT' },
    { id: 'C-001', block: 'BLOCK C', variety: 'PINOT NOIR', age: '2 YRS', health: 'GOOD' },
  ];

  if (selectedVine) {
    const vine = vines.find(v => v.id === selectedVine);
    return (
      <div className={styles.vineDetails}>
        <button className={styles.backButton} onClick={() => setSelectedVine(null)}>
          {'<'} BACK TO VINES
        </button>
        <h1 className={styles.vineDetailsTitle}>VINE {vine?.id}</h1>
        <div className={styles.vineDetailsGrid}>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>DETAILS</h2>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>BLOCK</span>
              <span className={styles.detailValue}>{vine?.block}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>VARIETY</span>
              <span className={styles.detailValue}>{vine?.variety}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>AGE</span>
              <span className={styles.detailValue}>{vine?.age}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>HEALTH</span>
              <span className={styles.detailValue}>{vine?.health}</span>
            </div>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>PHOTOS</h2>
            <p className={styles.sectionPlaceholder}>No photos uploaded</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>TRAINING & PRUNING</h2>
            <p className={styles.sectionPlaceholder}>No notes yet</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>DISEASE NOTES</h2>
            <p className={styles.sectionPlaceholder}>No disease notes</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>WATERING LOG</h2>
            <p className={styles.sectionPlaceholder}>No watering records</p>
          </div>
          <div className={styles.vineDetailsSection}>
            <h2 className={styles.sectionTitle}>SPUR PLANNING</h2>
            <p className={styles.sectionPlaceholder}>No spur plans</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <h1 className={styles.vineyardTitle}>VINEYARD</h1>
        <div className={styles.desktopActions}>
          <button className={styles.actionButton}>REGISTER QR CODE</button>
          <button className={styles.actionButton}>ADD BLOCK</button>
        </div>
      </div>
      <div className={styles.vineList}>
        {vines.map((vine) => (
          <div
            key={vine.id}
            className={styles.vineItem}
            onClick={() => setSelectedVine(vine.id)}
          >
            <div className={styles.vineId}>{vine.id}</div>
            <div className={styles.vineInfo}>
              <div className={styles.vineVariety}>{vine.variety}</div>
              <div className={styles.vineBlock}>{vine.block} • {vine.age}</div>
            </div>
            <div className={`${styles.vineHealth} ${vine.health === 'NEEDS ATTENTION' ? styles.vineHealthWarning : ''}`}>
              {vine.health}
            </div>
          </div>
        ))}
      </div>
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
