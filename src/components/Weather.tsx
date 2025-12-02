import { useState, useEffect } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useZero } from '../contexts/ZeroContext';
import { useAlerts } from '../contexts/AlertsContext';
import { myTasks } from '../shared/queries';
import { fetchWeather, getWeatherIcon, WeatherData } from '../utils/weather';
import { useDebouncedCompletion } from '../hooks/useDebouncedCompletion';
import { WeatherAlertSettingsModal } from './weather/WeatherAlertSettingsModal';
import { formatDueDate } from './winery/taskHelpers';
import { SeasonalTaskCard } from './dashboard/SeasonalTaskCard';
import { ActionLink } from './ActionLink';
import { WeatherSkeleton, WhatsNextSkeleton } from './Skeleton';
import styles from '../App.module.css';

// Module-level cache - persists across component unmount/remount to prevent flash on navigation
// See docs/engineering-principles.md "Zero Query Loading States" for pattern documentation
let cachedTasksData: any[] | null = null;

export const Weather = () => {
  const { user } = useUser();
  const zero = useZero();
  const { setAlerts } = useAlerts();
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

  const { removedTaskId, startCompletion, undoCompletion, isPending } = useDebouncedCompletion(
    async (taskId) => {
      await zero.mutate.task.update({
        id: taskId,
        completed_at: Date.now(),
      });
    }
  );

  // Update module-level cache when we have real data
  if (tasksData && tasksData.length > 0) {
    cachedTasksData = tasksData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  const effectiveTasksData = tasksData && tasksData.length > 0 ? tasksData : cachedTasksData || [];

  const nextTask = effectiveTasksData
    .filter((t: any) => !t.completed_at && !t.skipped && t.id !== removedTaskId)
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
              setAlerts(data.alerts || []);
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
              setAlerts(data.alerts || []);
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
          setAlerts(data.alerts || []);
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
        <div className={styles.seasonalActivities}>
          <div className={styles.whatsNextHeaderRow}>
            <div className={styles.activityHeader}>WHAT'S NEXT</div>
            <SeasonalTaskCard headerOnly />
          </div>
          <div className={styles.whatsNextSplit}>
            <WhatsNextSkeleton />
          </div>
        </div>
        <div className={styles.forecast}>
          <div className={styles.forecastHeaderRow}>
            <div className={styles.forecastHeader}>10-DAY FORECAST</div>
          </div>
          <WeatherSkeleton />
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
      <div className={styles.seasonalActivities}>
        <div className={styles.whatsNextHeaderRow}>
          <div className={styles.activityHeader}>WHAT'S NEXT</div>
          <SeasonalTaskCard headerOnly />
        </div>
        <div className={styles.whatsNextSplit}>
          <div className={styles.whatsNextTask}>
            {nextTask.length > 0 ? (
              <div className={`${styles.seasonalTaskMain} ${isPending(nextTask[0].id) ? styles.taskItemPending : ''}`}>
                <div className={styles.seasonalTaskNameRow}>
                  <div
                    className={`${styles.seasonalTaskName} ${isPending(nextTask[0].id) ? styles.taskTextPending : ''}`}
                    onClick={() => {
                      const task = nextTask[0];
                      const route = task.entity_type === 'vintage'
                        ? `/winery/vintages/${task.entity_id}`
                        : `/winery/wines/${task.entity_id}`;
                      setLocation(route);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {nextTask[0].name.toUpperCase()}
                  </div>
                  {isPending(nextTask[0].id) ? (
                    <ActionLink
                      className={styles.seasonalTaskMoreLink}
                      onClick={() => undoCompletion(nextTask[0].id)}
                    >
                      Undo
                    </ActionLink>
                  ) : (
                    <ActionLink
                      className={styles.seasonalTaskMoreLink}
                      onClick={() => startCompletion(nextTask[0].id)}
                    >
                      →
                    </ActionLink>
                  )}
                </div>
                <div className={`${styles.seasonalTaskTiming} ${isPending(nextTask[0].id) ? styles.taskTextPending : ''}`}>{formatDueDate(nextTask[0].due_date)}</div>
                {nextTask[0].description && (
                  <div className={`${styles.seasonalTaskDetails} ${isPending(nextTask[0].id) ? styles.taskTextPending : ''}`}>{nextTask[0].description}</div>
                )}
              </div>
            ) : (
              <div className={styles.seasonalTaskMain}>
                <div className={styles.seasonalTaskName}>NO UPCOMING TASKS</div>
              </div>
            )}
          </div>
          <div className={styles.whatsNextSeasonal}>
            <SeasonalTaskCard inline />
          </div>
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
