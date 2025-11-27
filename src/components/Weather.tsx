import { useState, useEffect } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useZero } from '../contexts/ZeroContext';
import { myTasks } from '../shared/queries';
import { fetchWeather, getWeatherIcon, WeatherData } from '../utils/weather';
import { Alerts } from './Alerts';
import { WeatherAlertSettingsModal } from './weather/WeatherAlertSettingsModal';
import { formatDueDate } from './winery/taskHelpers';
import styles from '../App.module.css';

export const Weather = () => {
  const { user } = useUser();
  const zero = useZero();
  const [, setLocation] = useLocation();
  const [showHighTemps, setShowHighTemps] = useState(() => {
    const saved = localStorage.getItem('showHighTemps');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;

  const nextTask = tasksData
    .filter((t: any) => !t.completed_at && !t.skipped)
    .sort((a: any, b: any) => a.due_date - b.due_date)
    .slice(0, 1);

  useEffect(() => {
    localStorage.setItem('showHighTemps', JSON.stringify(showHighTemps));
  }, [showHighTemps]);

  const loadWeather = async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const data = await fetchWeather(
                position.coords.latitude,
                position.coords.longitude
              );
              setWeatherData(data);
              setLoading(false);
            } catch (err) {
              console.error(err)
              setError('Failed to load weather data');
              setLoading(false);
            }
          },
          async () => {
            try {
              const data = await fetchWeather(37.7749, -122.4194);
              setWeatherData(data);
              setLoading(false);
            } catch (err) {
              console.error('Weather fetch error (location denied):', err);
              setError('Failed to load weather data');
              setLoading(false);
            }
          }
        );
      } else {
        try {
          const data = await fetchWeather(37.7749, -122.4194);
          setWeatherData(data);
          setLoading(false);
        } catch (err) {
          console.error('Weather fetch error (no geolocation):', err);
          setError('Failed to load weather data');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Weather load error (outer):', err);
      setError('Failed to load weather data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  if (loading) {
    return (
      <section className={styles.weatherSection}>
        <div className={styles.forecast}>
          <div className={styles.forecastHeader}>WEATHER</div>
          <div className={styles.condition}>LOADING WEATHER...</div>
        </div>
      </section>
    );
  }

  if (error || !weatherData) {
    return (
      <section className={styles.weatherSection}>
        <div className={styles.forecast}>
          <div className={styles.forecastHeader}>WEATHER</div>
          <div className={styles.condition}>{error || 'NO WEATHER DATA'}</div>
        </div>
      </section>
    );
  }

  const TodayIcon = getWeatherIcon(weatherData.forecast[0]?.weather_code || 0);

  return (
    <section className={styles.weatherSection}>
      <Alerts alerts={weatherData.alerts} />

      <div className={styles.seasonalActivities}>
        <div className={styles.activityHeader}>WHAT'S NEXT</div>
        <div className={styles.seasonalActivitiesContent}>
          {nextTask.length > 0 ? (
            <div className={styles.activityItem}>
              <span
                className={`${styles.activityText} ${styles.clickableActivityText}`}
                onClick={() => {
                  const task = nextTask[0];
                  const route = task.entity_type === 'vintage'
                    ? `/winery/vintages/${task.entity_id}/tasks`
                    : `/winery/wines/${task.entity_id}/tasks`;
                  setLocation(route);
                }}
              >
                {'>'} {nextTask[0].name} — {formatDueDate(nextTask[0].due_date)}
              </span>
              <button
                onClick={async () => {
                  await zero.mutate.task.update({
                    id: nextTask[0].id,
                    completed_at: Date.now(),
                  });
                }}
                className={styles.taskCompleteButton}
              >
                Mark complete →
              </button>
            </div>
          ) : (
            <div className={styles.activityItem}>
              <span className={styles.activityText}>{'>'} NO UPCOMING TASKS</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.forecast}>
        <div className={styles.forecastHeaderRow}>
          <div className={styles.forecastHeader}>10-DAY FORECAST</div>
          <button
            className={styles.tempToggle}
            onClick={() => setShowHighTemps(!showHighTemps)}
            aria-label="toggle"
          >
            {showHighTemps ? 'HIGHS ↑' : 'LOWS ↓'}
          </button>
          <div className={styles.weatherLocation}>{weatherData.location}</div>
          <div className={styles.todayWeatherMobile}>
            <TodayIcon className={styles.todayIconMobile} />
            <div className={styles.todayTempMobile}>{weatherData.current_temp_f}°</div>
          </div>
          <div className={styles.forecastControls}>
            <button className={styles.gearButton} onClick={() => setShowSettings(true)} aria-label="settings">⚙</button>
          </div>
        </div>
        <div className={styles.forecastContent}>
          <div className={styles.todayWeatherDesktop}>
            <div className={styles.todayLabel}>TODAY</div>
            <TodayIcon className={styles.todayIcon} />
            <div className={styles.todayTemp}>{weatherData.current_temp_f}°F</div>
            <div className={styles.todayCondition}>{weatherData.current_condition}</div>
          </div>
          <div className={styles.forecastDays}>
            {weatherData.forecast.map((day, i) => {
              const Icon = getWeatherIcon(day.weather_code);
              const temp = showHighTemps ? day.temp_high_f : day.temp_low_f;
              return (
                <div key={i} className={styles.forecastDay}>
                  <div className={styles.dayLabel}>{day.day}</div>
                  <div className={styles.dayTemp}>{temp}°</div>
                  <Icon className={styles.forecastIcon} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showSettings && <WeatherAlertSettingsModal onClose={() => setShowSettings(false)} onSave={loadWeather} />}
    </section>
  );
};
