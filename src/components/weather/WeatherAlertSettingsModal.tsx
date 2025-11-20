import { useState, useEffect } from 'react';
import { getBackendUrl } from '../../config';
import styles from '../../App.module.css';

export type AlertSettings = {
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

export const defaultAlertSettings: AlertSettings = {
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
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/alert-settings/default/weather`);

        if (response.ok) {
          const data = await response.json();
          const loadedSettings = data.settings as AlertSettings;
          setSettings(loadedSettings);
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
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/alert-settings/default/weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        if (onSave) {
          onSave();
        }
        onClose();
      }
    } catch (err) {
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
