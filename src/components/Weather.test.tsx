import { test, describe, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Weather } from './Weather';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

rs.mock('../utils/weather', () => ({
  fetchWeather: rs.fn(),
  getWeatherIcon: rs.fn(() => () => null),
}));

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      task: {
        run: rs.fn().mockResolvedValue([]),
      },
    },
  }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [[]],
}));

rs.mock('./winery/taskHelpers', () => ({
  formatDueDate: (timestamp: number) => new Date(timestamp).toLocaleDateString(),
}));

const mockWeatherData = {
  current_temp_f: 72,
  current_condition: 'PARTLY CLOUDY',
  location: 'SANDY, UTAH',
  forecast: Array.from({ length: 10 }, (_, i) => ({
    day: `DAY ${i + 1}`,
    temp_high_f: 75 + i,
    temp_low_f: 55 + i,
    weather_code: 1,
  })),
  alerts: [],
};

describe('Weather', () => {
  const originalGeolocation = global.navigator.geolocation;

  beforeEach(() => {
    const { fetchWeather } = require('../utils/weather');
    fetchWeather.mockReset();
    fetchWeather.mockResolvedValue(mockWeatherData);

    global.localStorage = {
      getItem: rs.fn(() => 'true'),
      setItem: rs.fn(),
      removeItem: rs.fn(),
      clear: rs.fn(),
      length: 0,
      key: rs.fn(),
    } as any;

    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: rs.fn((success) => {
          success({
            coords: {
              latitude: 40.5,
              longitude: -111.9,
            },
          } as any);
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    rs.clearAllMocks();
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  describe('when weather is loading', () => {
    test('shows loading message to user', () => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockImplementation(() => new Promise(() => {}));

      render(<Weather />);

      expect(screen.getByText('LOADING WEATHER...')).toBeInTheDocument();
    });
  });

  describe('when weather loads successfully', () => {
    beforeEach(() => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockResolvedValue(mockWeatherData);
    });

    test('displays current temperature', async () => {
      render(<Weather />);

      await waitFor(() => {
        expect(screen.getByText(/72°F/)).toBeInTheDocument();
      });
    });

    test('displays current condition', async () => {
      render(<Weather />);

      await waitFor(() => {
        expect(screen.getByText('PARTLY CLOUDY')).toBeInTheDocument();
      });
    });

    test('displays location', async () => {
      render(<Weather />);

      await waitFor(() => {
        expect(screen.getByText(/SANDY, UTAH/)).toBeInTheDocument();
      });
    });

    test('displays 10-day forecast', async () => {
      render(<Weather />);

      await waitFor(() => {
        mockWeatherData.forecast.slice(0, 10).forEach((day) => {
          expect(screen.getByText(day.day)).toBeInTheDocument();
        });
      });
    });
  });

  describe('when weather fails to load', () => {
    test('displays error message to user', async () => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockRejectedValue(new Error('Network error'));

      render(<Weather />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load weather data')).toBeInTheDocument();
      });
    });
  });

  describe('temperature unit toggle', () => {
    beforeEach(() => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockResolvedValue(mockWeatherData);
    });

    test('user can switch between high and low temperatures', async () => {
      const user = userEvent.setup();
      render(<Weather />);

      await waitFor(() => {
        expect(screen.getByText(/72°F/)).toBeInTheDocument();
      });

      const toggleButton = screen.getByText('HIGHS ↑');
      await user.click(toggleButton);

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'showHighTemps',
        expect.any(String)
      );
    });
  });

  describe('weather alerts', () => {
    test('displays no alerts when none are present', async () => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockResolvedValue(mockWeatherData);

      render(<Weather />);

      await waitFor(() => {
        expect(screen.queryByText(/WARNING/)).not.toBeInTheDocument();
      });
    });

    test('displays alerts when present', async () => {
      const { fetchWeather } = require('../utils/weather');
      const dataWithAlerts = {
        ...mockWeatherData,
        alerts: [
          {
            alert_type: 'FROST',
            message: 'FROST WARNING: NOV 15-17',
            severity: 'critical' as const,
          },
        ],
      };
      fetchWeather.mockResolvedValue(dataWithAlerts);

      render(<Weather />);

      await waitFor(() => {
        expect(screen.getByText(/FROST WARNING/)).toBeInTheDocument();
      });
    });
  });

  describe('location permissions', () => {
    test('uses default location when geolocation is denied', async () => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockResolvedValue(mockWeatherData);

      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: rs.fn((_, error) => {
            error({ code: 1, message: 'Permission denied' } as any);
          }),
        },
        writable: true,
        configurable: true,
      });

      render(<Weather />);

      await waitFor(() => {
        expect(fetchWeather).toHaveBeenCalledWith(37.7749, -122.4194);
      });
    });

    test('uses user location when geolocation is granted', async () => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockResolvedValue(mockWeatherData);

      render(<Weather />);

      await waitFor(() => {
        expect(fetchWeather).toHaveBeenCalledWith(40.5, -111.9);
      });
    });
  });

  describe('alert settings', () => {
    beforeEach(() => {
      const { fetchWeather } = require('../utils/weather');
      fetchWeather.mockResolvedValue(mockWeatherData);
    });

    test('user can open alert settings modal', async () => {
      const user = userEvent.setup();
      render(<Weather />);

      await waitFor(() => {
        expect(screen.getByText(/72°F/)).toBeInTheDocument();
      });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      expect(screen.getByText('WEATHER ALERTS')).toBeInTheDocument();
    });
  });
});
