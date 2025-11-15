import { test, describe, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { getWeatherIcon, fetchWeather } from './weather';
import { WiDaySunny, WiCloudy, WiRain, WiThunderstorm, WiSnow, WiFog } from 'react-icons/wi';

describe('weather utils', () => {
  describe('getWeatherIcon', () => {
    test('returns WiDaySunny for clear sky (code 0)', () => {
      const icon = getWeatherIcon(0);
      expect(icon).toBe(WiDaySunny);
    });

    test('returns WiCloudy for partly cloudy (code 1)', () => {
      const icon = getWeatherIcon(1);
      expect(icon).toBe(WiCloudy);
    });

    test('returns WiCloudy for partly cloudy (code 2)', () => {
      const icon = getWeatherIcon(2);
      expect(icon).toBe(WiCloudy);
    });

    test('returns WiCloudy for partly cloudy (code 3)', () => {
      const icon = getWeatherIcon(3);
      expect(icon).toBe(WiCloudy);
    });

    test('returns WiFog for fog (code 45)', () => {
      const icon = getWeatherIcon(45);
      expect(icon).toBe(WiFog);
    });

    test('returns WiFog for fog (code 48)', () => {
      const icon = getWeatherIcon(48);
      expect(icon).toBe(WiFog);
    });

    test('returns WiRain for drizzle (code 51)', () => {
      const icon = getWeatherIcon(51);
      expect(icon).toBe(WiRain);
    });

    test('returns WiRain for rain (code 61)', () => {
      const icon = getWeatherIcon(61);
      expect(icon).toBe(WiRain);
    });

    test('returns WiRain for heavy rain (code 67)', () => {
      const icon = getWeatherIcon(67);
      expect(icon).toBe(WiRain);
    });

    test('returns WiSnow for light snow (code 71)', () => {
      const icon = getWeatherIcon(71);
      expect(icon).toBe(WiSnow);
    });

    test('returns WiSnow for heavy snow (code 86)', () => {
      const icon = getWeatherIcon(86);
      expect(icon).toBe(WiSnow);
    });

    test('returns WiThunderstorm for thunderstorm (code 95)', () => {
      const icon = getWeatherIcon(95);
      expect(icon).toBe(WiThunderstorm);
    });

    test('returns WiThunderstorm for severe thunderstorm (code 99)', () => {
      const icon = getWeatherIcon(99);
      expect(icon).toBe(WiThunderstorm);
    });

    test('returns WiCloudy as default for unknown code', () => {
      const icon = getWeatherIcon(999);
      expect(icon).toBe(WiCloudy);
    });

    test('returns WiCloudy as default for negative code', () => {
      const icon = getWeatherIcon(-1);
      expect(icon).toBe(WiCloudy);
    });
  });

  describe('fetchWeather', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = rs.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('fetches weather data successfully', async () => {
      const mockWeatherData = {
        current_temp_f: 72,
        current_condition: 'Partly Cloudy',
        location: 'Napa Valley',
        forecast: [
          {
            day: 'Monday',
            temp_high_f: 75,
            temp_low_f: 55,
            weather_code: 2,
          },
        ],
        alerts: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData,
      });

      const result = await fetchWeather(38.5, -122.5);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/weather?latitude=38.5&longitude=-122.5&vineyard_id=default'
      );
      expect(result).toEqual(mockWeatherData);
    });

    test('uses custom vineyard ID when provided', async () => {
      const mockWeatherData = {
        current_temp_f: 68,
        current_condition: 'Clear',
        location: 'Sonoma',
        forecast: [],
        alerts: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData,
      });

      await fetchWeather(38.3, -122.7, 'vineyard-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/weather?latitude=38.3&longitude=-122.7&vineyard_id=vineyard-123'
      );
    });

    test('uses custom backend URL from environment', async () => {
      const originalEnv = process.env.PUBLIC_BACKEND_URL;
      process.env.PUBLIC_BACKEND_URL = 'https://api.example.com';

      const mockWeatherData = {
        current_temp_f: 70,
        current_condition: 'Sunny',
        location: 'Test Location',
        forecast: [],
        alerts: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData,
      });

      await fetchWeather(40.0, -120.0);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/weather?latitude=40&longitude=-120&vineyard_id=default'
      );

      process.env.PUBLIC_BACKEND_URL = originalEnv;
    });

    test('throws error when fetch fails', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(fetchWeather(38.5, -122.5)).rejects.toThrow('Failed to fetch weather data');
    });

    test('throws error when network request fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(fetchWeather(38.5, -122.5)).rejects.toThrow('Network error');
    });

    test('handles forecast data with multiple days', async () => {
      const mockWeatherData = {
        current_temp_f: 72,
        current_condition: 'Sunny',
        location: 'Test',
        forecast: [
          { day: 'Mon', temp_high_f: 75, temp_low_f: 55, weather_code: 0 },
          { day: 'Tue', temp_high_f: 78, temp_low_f: 58, weather_code: 1 },
          { day: 'Wed', temp_high_f: 80, temp_low_f: 60, weather_code: 2 },
        ],
        alerts: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData,
      });

      const result = await fetchWeather(38.5, -122.5);

      expect(result.forecast.length).toBe(3);
      expect(result.forecast[0].day).toBe('Mon');
      expect(result.forecast[1].day).toBe('Tue');
      expect(result.forecast[2].day).toBe('Wed');
    });

    test('handles weather alerts', async () => {
      const mockWeatherData = {
        current_temp_f: 85,
        current_condition: 'Hot',
        location: 'Test',
        forecast: [],
        alerts: [
          {
            alert_type: 'Heat Warning',
            message: 'Extreme heat expected',
            severity: 'critical' as const,
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherData,
      });

      const result = await fetchWeather(38.5, -122.5);

      expect(result.alerts.length).toBe(1);
      expect(result.alerts[0].alert_type).toBe('Heat Warning');
      expect(result.alerts[0].severity).toBe('critical');
    });
  });
});
