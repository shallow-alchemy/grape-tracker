import { useState, useEffect } from 'react';
import { fetchWeather, getWeatherIcon, WeatherData } from '../utils/weather';
import { Alerts } from './Alerts';
import { WeatherAlertSettingsModal } from '../App';
import styles from '../App.module.css';

export const Weather = () => {
  const [showHighTemps, setShowHighTemps] = useState(() => {
    const saved = localStorage.getItem('showHighTemps');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('showHighTemps', JSON.stringify(showHighTemps));
  }, [showHighTemps]);

  const loadWeather = async () => {
    try {
      // Try to get user's location
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
              console.error('Error fetching weather:', err);
              setError('Failed to load weather data');
              setLoading(false);
            }
          },
          async () => {
            // If location denied, use default coordinates (San Francisco)
            try {
              const data = await fetchWeather(37.7749, -122.4194);
              setWeatherData(data);
              setLoading(false);
            } catch (err) {
              console.error('Error fetching weather:', err);
              setError('Failed to load weather data');
              setLoading(false);
            }
          }
        );
      } else {
        // If geolocation not supported, use default coordinates
        try {
          const data = await fetchWeather(37.7749, -122.4194);
          setWeatherData(data);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching weather:', err);
          setError('Failed to load weather data');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error in weather loading:', err);
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
          <div className={styles.activityItem}>
            <span className={styles.activityText}>{'>'} CHECK VINEYARD CONDITIONS</span>
          </div>
        </div>
      </div>

      <div className={styles.forecast}>
        <div className={styles.forecastHeaderRow}>
          <div className={styles.forecastHeader}>10-DAY FORECAST</div>
          <button
            className={styles.tempToggle}
            onClick={() => setShowHighTemps(!showHighTemps)}
          >
            {showHighTemps ? 'HIGHS ↑' : 'LOWS ↓'}
          </button>
          <div className={styles.weatherLocation}>{weatherData.location}</div>
          <div className={styles.todayWeatherMobile}>
            <TodayIcon className={styles.todayIconMobile} />
            <div className={styles.todayTempMobile}>{weatherData.current_temp_f}°</div>
          </div>
          <div className={styles.forecastControls}>
            <button className={styles.gearButton} onClick={() => setShowSettings(true)}>⚙</button>
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
