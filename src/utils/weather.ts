import { IconType } from 'react-icons';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiSnow, WiFog } from 'react-icons/wi';
import { getBackendUrl } from '../config';

export type WeatherData = {
  current_temp_f: number;
  current_condition: string;
  location: string;
  forecast: DayForecast[];
  alerts: Alert[];
};

export type DayForecast = {
  day: string;
  temp_high_f: number;
  temp_low_f: number;
  weather_code: number;
};

export type Alert = {
  alert_type: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
};

export const getWeatherIcon = (code: number): IconType => {
  if (code === 0) return WiDaySunny;
  if (code >= 1 && code <= 3) return WiCloudy;
  if (code >= 45 && code <= 48) return WiFog;
  if (code >= 51 && code <= 67) return WiRain;
  if (code >= 71 && code <= 86) return WiSnow;
  if (code >= 95 && code <= 99) return WiThunderstorm;
  return WiCloudy;
};

export const fetchWeather = async (latitude: number, longitude: number, vineyardId = 'default'): Promise<WeatherData> => {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/weather?latitude=${latitude}&longitude=${longitude}&vineyard_id=${vineyardId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  return response.json();
};
