import { Zero } from '@rocicorp/zero';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Button } from 'react-aria-components';
import { Router, Route, Link } from 'wouter';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiStrongWind, WiSnow, WiSnowflakeCold } from 'react-icons/wi';
import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
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

const calculateAge = (plantingDate: Date): string => {
  const years = new Date().getFullYear() - plantingDate.getFullYear();
  return `${years} YRS`;
};

const generateVineId = (block: string, vines: any[]): string => {
  const blockVines = vines.filter(v => v.block === block);
  const maxNumber = blockVines.length > 0
    ? Math.max(...blockVines.map(v => parseInt(v.id.split('-')[1])))
    : 0;
  const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${block}-${nextNumber}`;
};

export const VineyardView = ({ z }: { z: Zero<Schema> }) => {
  const [selectedVine, setSelectedVine] = useState<string | null>(null);
  const [showAddVineModal, setShowAddVineModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [vinesData, setVinesData] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadVines = async () => {
      const result = await z.query.vine.run();
      setVinesData(result);
    };
    loadVines();

    const interval = setInterval(loadVines, 1000);
    return () => clearInterval(interval);
  }, [z]);

  const vines = vinesData.map((vine: any) => ({
    id: vine.id,
    block: vine.block,
    variety: vine.variety,
    plantingDate: new Date(vine.plantingDate),
    age: calculateAge(new Date(vine.plantingDate)),
    health: vine.health,
    notes: vine.notes || '',
    qrGenerated: vine.qrGenerated > 0,
  }));

  const selectedVineData = selectedVine ? vines.find((v: any) => v.id === selectedVine) : null;
  const vineUrl = selectedVineData ? `${window.location.origin}/vineyard/vine/${selectedVineData.id}` : '';

  useEffect(() => {
    if (showQRModal && canvasRef.current && vineUrl) {
      QRCode.toCanvas(canvasRef.current, vineUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    }
  }, [showQRModal, vineUrl]);

  const handleAddVine = (vineData: { block: string; variety: string; plantingDate: Date; health: string; notes?: string }) => {
    const newVineId = generateVineId(vineData.block, vines);
    const sequenceNumber = parseInt(newVineId.split('-')[1]);
    const now = Date.now();

    z.mutate.vine.insert({
      id: newVineId,
      block: vineData.block,
      sequenceNumber,
      variety: vineData.variety.toUpperCase(),
      plantingDate: vineData.plantingDate.getTime(),
      health: vineData.health,
      notes: vineData.notes || '',
      qrGenerated: 0,
      createdAt: now,
      updatedAt: now,
    });

    setShowAddVineModal(false);
    setSelectedVine(newVineId);
  };

  if (selectedVine) {
    const vine = selectedVineData;

    const handleDownloadSVG = () => {
      QRCode.toString(vineUrl, {
        type: 'svg',
        width: 400,
        margin: 2,
      }).then((svg: string) => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vine-${vine?.id}.svg`;
        link.click();
        URL.revokeObjectURL(url);

        if (vine && !vine.qrGenerated) {
          z.mutate.vine.update({
            id: vine.id,
            qrGenerated: Date.now(),
            updatedAt: Date.now(),
          });
        }
      });
    };

    return (
      <div className={styles.vineDetails}>
        <button className={styles.backButton} onClick={() => setSelectedVine(null)}>
          {'<'} BACK TO VINES
        </button>
        <div className={styles.vineDetailsHeader}>
          <h1 className={styles.vineDetailsTitle}>VINE {vine?.id}</h1>
          <button className={styles.actionButton} onClick={() => setShowQRModal(true)}>
            GENERATE TAG
          </button>
        </div>
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

        {showQRModal && (
          <div className={styles.modal} onClick={() => setShowQRModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>VINE TAG - {vine?.id}</h2>
              <div className={styles.qrContainer}>
                <canvas ref={canvasRef} className={styles.qrCanvas} />
                <div className={styles.qrInfo}>
                  <div className={styles.qrVineId}>{vine?.id}</div>
                  <div className={styles.qrVariety}>{vine?.variety}</div>
                  <div className={styles.qrBlock}>BLOCK {vine?.block}</div>
                </div>
                <div className={styles.qrUrl}>{vineUrl}</div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => setShowQRModal(false)}
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  className={styles.formButton}
                  onClick={handleDownloadSVG}
                >
                  DOWNLOAD SVG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <h1 className={styles.vineyardTitle}>VINEYARD</h1>
        <div className={styles.desktopActions}>
          <button className={styles.actionButton} onClick={() => setShowAddVineModal(true)}>ADD VINE</button>
          <button className={styles.actionButton}>BATCH GENERATE TAGS</button>
        </div>
      </div>
      <div className={styles.vineList}>
        {vines.map((vine: any) => (
          <div
            key={vine.id}
            className={styles.vineItem}
            onClick={() => setSelectedVine(vine.id)}
          >
            <div className={styles.vineId}>{vine.id}</div>
            <div className={styles.vineInfo}>
              <div className={styles.vineVariety}>{vine.variety}</div>
              <div className={styles.vineBlock}>BLOCK {vine.block} • {vine.age}</div>
            </div>
            <div className={`${styles.vineHealth} ${vine.health === 'NEEDS ATTENTION' ? styles.vineHealthWarning : ''}`}>
              {vine.health}
            </div>
          </div>
        ))}
      </div>

      {showAddVineModal && (
        <div className={styles.modal} onClick={() => setShowAddVineModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>ADD VINE</h2>
            <form
              className={styles.vineForm}
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddVine({
                  block: formData.get('block') as string,
                  variety: formData.get('variety') as string,
                  plantingDate: new Date(formData.get('plantingDate') as string),
                  health: formData.get('health') as string,
                  notes: formData.get('notes') as string || undefined,
                });
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>BLOCK</label>
                <select name="block" className={styles.formSelect} required>
                  <option value="">Select Block</option>
                  <option value="A">BLOCK A</option>
                  <option value="B">BLOCK B</option>
                  <option value="C">BLOCK C</option>
                  <option value="D">BLOCK D</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>VARIETY</label>
                <input
                  type="text"
                  name="variety"
                  className={styles.formInput}
                  placeholder="CABERNET SAUVIGNON"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>PLANTING DATE</label>
                <input
                  type="date"
                  name="plantingDate"
                  className={styles.formInput}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>HEALTH STATUS</label>
                <select name="health" className={styles.formSelect} required>
                  <option value="EXCELLENT">EXCELLENT</option>
                  <option value="GOOD">GOOD</option>
                  <option value="FAIR">FAIR</option>
                  <option value="NEEDS ATTENTION">NEEDS ATTENTION</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>PLANTING NOTES (OPTIONAL)</label>
                <textarea
                  name="notes"
                  className={styles.formTextarea}
                  placeholder="Any notes about planting..."
                  rows={3}
                />
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.formButtonSecondary}
                  onClick={() => setShowAddVineModal(false)}
                >
                  CANCEL
                </button>
                <button type="submit" className={styles.formButton}>
                  CREATE VINE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
