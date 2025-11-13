import { UserButton } from '@clerk/clerk-react';
import { Button } from 'react-aria-components';
import { Router, Route, Link } from 'wouter';
import { useState, useEffect } from 'react';
import { ZeroProvider } from './contexts/ZeroContext';
import { VineyardView } from './components/VineyardView';
import { WineryView } from './components/WineryView';
import { QRScanner } from './components/QRScanner';
import { Weather } from './components/Weather';
import styles from './App.module.css';

type AlertSettings = {
  temperature: {
    enabled: boolean;
    highThreshold: number;
    lowThreshold: number;
    daysOut: number;
  };
  frost: {
    enabled: boolean;
    daysOut: number;
  };
  snow: {
    enabled: boolean;
    daysOut: number;
  };
  rain: {
    enabled: boolean;
    daysOut: number;
  };
  thunderstorm: {
    enabled: boolean;
    daysOut: number;
  };
  fog: {
    enabled: boolean;
    daysOut: number;
  };
};

const defaultAlertSettings: AlertSettings = {
  temperature: {
    enabled: false,
    highThreshold: 95,
    lowThreshold: 32,
    daysOut: 7,
  },
  frost: {
    enabled: false,
    daysOut: 3,
  },
  snow: {
    enabled: false,
    daysOut: 7,
  },
  rain: {
    enabled: false,
    daysOut: 7,
  },
  thunderstorm: {
    enabled: false,
    daysOut: 7,
  },
  fog: {
    enabled: false,
    daysOut: 7,
  },
};

export const WeatherAlertSettingsModal = ({ onClose, onSave }: { onClose: () => void; onSave?: () => void }) => {
  const [settings, setSettings] = useState<AlertSettings>(defaultAlertSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track input values as strings to allow empty state during editing
  const [inputValues, setInputValues] = useState({
    tempHigh: defaultAlertSettings.temperature.highThreshold.toString(),
    tempLow: defaultAlertSettings.temperature.lowThreshold.toString(),
    tempDays: defaultAlertSettings.temperature.daysOut.toString(),
    frostDays: defaultAlertSettings.frost.daysOut.toString(),
    snowDays: defaultAlertSettings.snow.daysOut.toString(),
    rainDays: defaultAlertSettings.rain.daysOut.toString(),
    thunderstormDays: defaultAlertSettings.thunderstorm.daysOut.toString(),
    fogDays: defaultAlertSettings.fog.daysOut.toString(),
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/alert-settings/default/weather`);

        if (response.ok) {
          const data = await response.json();
          const loadedSettings = data.settings as AlertSettings;
          setSettings(loadedSettings);
          // Update input values when settings load
          setInputValues({
            tempHigh: loadedSettings.temperature.highThreshold.toString(),
            tempLow: loadedSettings.temperature.lowThreshold.toString(),
            tempDays: loadedSettings.temperature.daysOut.toString(),
            frostDays: loadedSettings.frost.daysOut.toString(),
            snowDays: loadedSettings.snow.daysOut.toString(),
            rainDays: loadedSettings.rain.daysOut.toString(),
            thunderstormDays: loadedSettings.thunderstorm.daysOut.toString(),
            fogDays: loadedSettings.fog.daysOut.toString(),
          });
        }
      } catch (err) {
        console.error('Error loading alert settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/alert-settings/default/weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        // Refetch weather to update alerts with new settings
        if (onSave) {
          onSave();
        }
        onClose();
      } else {
        console.error('Failed to save alert settings');
      }
    } catch (err) {
      console.error('Error saving alert settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>WEATHER ALERTS</h2>
          </div>
          <div className={styles.modalContent}>
            <div className={styles.loadingText}>LOADING SETTINGS...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>WEATHER ALERTS</h2>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.alertSettingSection}>
            <div className={styles.alertSettingHeader}>
              <span className={styles.alertSettingTitle}>TEMPERATURE ALERTS</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={settings.temperature.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    temperature: { ...settings.temperature, enabled: e.target.checked }
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.alertSettingDetails}>
              <div className={styles.settingRow}>
                <label>HIGH THRESHOLD (°F)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.tempHigh}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, tempHigh: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.tempHigh === '' ? 0 : parseInt(inputValues.tempHigh, 10);
                    setSettings({
                      ...settings,
                      temperature: { ...settings.temperature, highThreshold: num }
                    });
                    setInputValues({ ...inputValues, tempHigh: num.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.temperature.enabled}
                />
              </div>
              <div className={styles.settingRow}>
                <label>LOW THRESHOLD (°F)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.tempLow}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, tempLow: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.tempLow === '' ? 0 : parseInt(inputValues.tempLow, 10);
                    setSettings({
                      ...settings,
                      temperature: { ...settings.temperature, lowThreshold: num }
                    });
                    setInputValues({ ...inputValues, tempLow: num.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.temperature.enabled}
                />
              </div>
              <div className={styles.settingRow}>
                <label>DAYS OUT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.tempDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, tempDays: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.tempDays === '' ? 1 : parseInt(inputValues.tempDays, 10);
                    const clamped = Math.min(Math.max(num, 1), 10);
                    setSettings({
                      ...settings,
                      temperature: { ...settings.temperature, daysOut: clamped }
                    });
                    setInputValues({ ...inputValues, tempDays: clamped.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.temperature.enabled}
                />
              </div>
            </div>
          </div>

          <div className={styles.alertSettingSection}>
            <div className={styles.alertSettingHeader}>
              <span className={styles.alertSettingTitle}>FROST WARNINGS (≤32°F)</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={settings.frost.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    frost: { ...settings.frost, enabled: e.target.checked }
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.alertSettingDetails}>
              <div className={styles.settingRow}>
                <label>DAYS OUT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.frostDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, frostDays: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.frostDays === '' ? 1 : parseInt(inputValues.frostDays, 10);
                    const clamped = Math.min(Math.max(num, 1), 10);
                    setSettings({
                      ...settings,
                      frost: { ...settings.frost, daysOut: clamped }
                    });
                    setInputValues({ ...inputValues, frostDays: clamped.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.frost.enabled}
                />
              </div>
            </div>
          </div>

          <div className={styles.alertSettingSection}>
            <div className={styles.alertSettingHeader}>
              <span className={styles.alertSettingTitle}>SNOW ALERTS</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={settings.snow.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    snow: { ...settings.snow, enabled: e.target.checked }
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.alertSettingDetails}>
              <div className={styles.settingRow}>
                <label>DAYS OUT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.snowDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, snowDays: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.snowDays === '' ? 1 : parseInt(inputValues.snowDays, 10);
                    const clamped = Math.min(Math.max(num, 1), 10);
                    setSettings({
                      ...settings,
                      snow: { ...settings.snow, daysOut: clamped }
                    });
                    setInputValues({ ...inputValues, snowDays: clamped.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.snow.enabled}
                />
              </div>
            </div>
          </div>

          <div className={styles.alertSettingSection}>
            <div className={styles.alertSettingHeader}>
              <span className={styles.alertSettingTitle}>RAIN ALERTS</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={settings.rain.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    rain: { ...settings.rain, enabled: e.target.checked }
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.alertSettingDetails}>
              <div className={styles.settingRow}>
                <label>DAYS OUT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.rainDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, rainDays: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.rainDays === '' ? 1 : parseInt(inputValues.rainDays, 10);
                    const clamped = Math.min(Math.max(num, 1), 10);
                    setSettings({
                      ...settings,
                      rain: { ...settings.rain, daysOut: clamped }
                    });
                    setInputValues({ ...inputValues, rainDays: clamped.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.rain.enabled}
                />
              </div>
            </div>
          </div>

          <div className={styles.alertSettingSection}>
            <div className={styles.alertSettingHeader}>
              <span className={styles.alertSettingTitle}>THUNDERSTORM ALERTS</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={settings.thunderstorm.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    thunderstorm: { ...settings.thunderstorm, enabled: e.target.checked }
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.alertSettingDetails}>
              <div className={styles.settingRow}>
                <label>DAYS OUT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.thunderstormDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, thunderstormDays: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.thunderstormDays === '' ? 1 : parseInt(inputValues.thunderstormDays, 10);
                    const clamped = Math.min(Math.max(num, 1), 10);
                    setSettings({
                      ...settings,
                      thunderstorm: { ...settings.thunderstorm, daysOut: clamped }
                    });
                    setInputValues({ ...inputValues, thunderstormDays: clamped.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.thunderstorm.enabled}
                />
              </div>
            </div>
          </div>

          <div className={styles.alertSettingSection}>
            <div className={styles.alertSettingHeader}>
              <span className={styles.alertSettingTitle}>FOG ALERTS</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={settings.fog.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    fog: { ...settings.fog, enabled: e.target.checked }
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.alertSettingDetails}>
              <div className={styles.settingRow}>
                <label>DAYS OUT</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValues.fogDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setInputValues({ ...inputValues, fogDays: val });
                    }
                  }}
                  onBlur={() => {
                    const num = inputValues.fogDays === '' ? 1 : parseInt(inputValues.fogDays, 10);
                    const clamped = Math.min(Math.max(num, 1), 10);
                    setSettings({
                      ...settings,
                      fog: { ...settings.fog, daysOut: clamped }
                    });
                    setInputValues({ ...inputValues, fogDays: clamped.toString() });
                  }}
                  className={styles.numberInput}
                  disabled={!settings.fog.enabled}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalButton} onClick={onClose}>CANCEL</button>
          <button
            className={styles.modalButtonPrimary}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
};


export const QRScanButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.scanButtonContainer}>
      <Button className={styles.scanButton} onPress={onClick}>
        <div className={styles.scanIcon}>⊞</div>
        <div className={styles.scanText}>SCAN QR CODE</div>
      </Button>
    </div>
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
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      <Weather />
      <QRScanButton onClick={() => setShowScanner(true)} />
      <DesktopDashboard />
      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </>
  );
};

const AppContent = () => {
  return (
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
      <Route path="/vineyard/vine/:id">
        {(params) => <VineyardView initialVineId={params.id} />}
      </Route>
      <Route path="/vineyard/block/:id">
        {(params) => <VineyardView initialBlockId={params.id} />}
      </Route>
      <Route path="/vineyard">{() => <VineyardView />}</Route>
      <Route path="/winery" component={WineryView} />
    </div>
  );
};

export const App = () => {
  return (
    <ZeroProvider>
      <Router>
        <AppContent />
      </Router>
    </ZeroProvider>
  );
};
