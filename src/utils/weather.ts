import { IconType } from 'react-icons';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiSnow, WiFog } from 'react-icons/wi';

export type WeatherData = {
  current_temp_f: number;
  current_condition: string;
  forecast: DayForecast[];
};

export type DayForecast = {
  day: string;
  temp_high_f: number;
  temp_low_f: number;
  weather_code: number;
};

export const getWeatherIcon = (code: number): IconType => {
  if (code === 0) return WiDaySunny; // Clear sky
  if (code >= 1 && code <= 3) return WiCloudy; // Partly cloudy
  if (code >= 45 && code <= 48) return WiFog; // Foggy
  if (code >= 51 && code <= 67) return WiRain; // Drizzle/Rain
  if (code >= 71 && code <= 86) return WiSnow; // Snow
  if (code >= 95 && code <= 99) return WiThunderstorm; // Thunderstorm
  return WiCloudy; // Default
};

export const fetchWeather = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const response = await fetch(`${backendUrl}/weather?latitude=${latitude}&longitude=${longitude}`);

  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  return response.json();
};
