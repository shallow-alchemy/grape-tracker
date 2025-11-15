import { test, describe, expect, rs, afterEach, beforeEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WeatherAlertSettingsModal, defaultAlertSettings } from './WeatherAlertSettingsModal';

// Mock config
rs.mock('../../config', () => ({
  getBackendUrl: () => 'http://localhost:3001',
}));

describe('WeatherAlertSettingsModal', () => {
  beforeEach(() => {
    global.fetch = rs.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe('loading state', () => {
    test('displays loading message while fetching settings', async () => {
      // Make fetch hang to keep loading state
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);

      expect(screen.getByText('LOADING SETTINGS...')).toBeInTheDocument();
      expect(screen.getByText('WEATHER ALERTS')).toBeInTheDocument();
    });

    test('shows modal header during loading', () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);

      expect(screen.getByText('WEATHER ALERTS')).toBeInTheDocument();
    });
  });

  describe('settings loading', () => {
    test('loads settings from backend on mount', async () => {
      const mockSettings = {
        temperature: { enabled: true, highThreshold: 100, lowThreshold: 25, daysOut: 5 },
        frost: { enabled: false, daysOut: 3 },
        snow: { enabled: true, daysOut: 7 },
        rain: { enabled: false, daysOut: 7 },
        thunderstorm: { enabled: false, daysOut: 7 },
        fog: { enabled: false, daysOut: 7 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      });

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);

      // Wait for settings to load
      await new Promise(resolve => setTimeout(resolve, 100));

      // Temperature alert should be enabled (first checkbox)
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
      // Snow alert should be enabled (third checkbox)
      expect(checkboxes[2]).toBeChecked();
    });

    test('uses default settings when fetch fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should use default (all disabled)
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

    test('uses default settings when response not ok', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
      });

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should use defaults
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('toggle switches', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: defaultAlertSettings }),
      });
    });

    test('enables temperature alerts when toggled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const tempCheckbox = checkboxes[0]; // First checkbox is temperature

      expect(tempCheckbox).not.toBeChecked();

      await user.click(tempCheckbox);

      expect(tempCheckbox).toBeChecked();
    });

    test('enables frost alerts when toggled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const frostCheckbox = checkboxes[1]; // Second checkbox is frost

      await user.click(frostCheckbox);

      expect(frostCheckbox).toBeChecked();
    });

    test('enables snow alerts when toggled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const snowCheckbox = checkboxes[2]; // Third checkbox is snow

      await user.click(snowCheckbox);

      expect(snowCheckbox).toBeChecked();
    });

    test('enables rain alerts when toggled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const rainCheckbox = checkboxes[3]; // Fourth checkbox is rain

      await user.click(rainCheckbox);

      expect(rainCheckbox).toBeChecked();
    });

    test('enables thunderstorm alerts when toggled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const thunderstormCheckbox = checkboxes[4]; // Fifth checkbox is thunderstorm

      await user.click(thunderstormCheckbox);

      expect(thunderstormCheckbox).toBeChecked();
    });

    test('enables fog alerts when toggled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const fogCheckbox = checkboxes[5]; // Sixth checkbox is fog

      await user.click(fogCheckbox);

      expect(fogCheckbox).toBeChecked();
    });
  });

  describe('temperature threshold inputs', () => {
    beforeEach(() => {
      const mockSettings = {
        ...defaultAlertSettings,
        temperature: { ...defaultAlertSettings.temperature, enabled: true },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      });
    });

    test('allows changing high threshold', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const highInput = screen.getByDisplayValue('95');

      await user.clear(highInput);
      await user.type(highInput, '100');

      expect(highInput).toHaveValue('100');
    });

    test('allows changing low threshold', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const lowInput = screen.getByDisplayValue('32');

      await user.clear(lowInput);
      await user.type(lowInput, '28');

      expect(lowInput).toHaveValue('28');
    });

    test('converts empty high threshold to 0 on blur', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const highInput = screen.getByDisplayValue('95');

      await user.clear(highInput);
      await user.tab(); // Trigger blur

      expect(highInput).toHaveValue('0');
    });

    test('converts empty low threshold to 0 on blur', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const lowInput = screen.getByDisplayValue('32');

      await user.clear(lowInput);
      await user.tab(); // Trigger blur

      expect(lowInput).toHaveValue('0');
    });

    test('rejects non-numeric input for high threshold', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const highInput = screen.getByDisplayValue('95');

      await user.clear(highInput);
      await user.type(highInput, 'abc');

      // Should remain empty (no letters accepted)
      expect(highInput).toHaveValue('');
    });

    test('rejects non-numeric input for low threshold', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const lowInput = screen.getByDisplayValue('32');

      await user.clear(lowInput);
      await user.type(lowInput, 'xyz');

      expect(lowInput).toHaveValue('');
    });
  });

  describe('days out input validation', () => {
    beforeEach(() => {
      const mockSettings = {
        ...defaultAlertSettings,
        temperature: { ...defaultAlertSettings.temperature, enabled: true },
        frost: { ...defaultAlertSettings.frost, enabled: true },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      });
    });

    test('clamps temperature days out to minimum 1', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Find the temperature days out input (third input in temperature section)
      const textboxes = screen.getAllByRole('textbox');
      const tempDaysInput = textboxes[2]; // high, low, days

      await user.clear(tempDaysInput);
      await user.type(tempDaysInput, '0');
      await user.tab(); // Trigger blur

      expect(tempDaysInput).toHaveValue('1'); // Clamped to minimum
    });

    test('clamps temperature days out to maximum 10', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const textboxes = screen.getAllByRole('textbox');
      const tempDaysInput = textboxes[2];

      await user.clear(tempDaysInput);
      await user.type(tempDaysInput, '15');
      await user.tab();

      expect(tempDaysInput).toHaveValue('10'); // Clamped to maximum
    });

    test('clamps frost days out to minimum 1', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const textboxes = screen.getAllByRole('textbox');
      const frostDaysInput = textboxes[3]; // After temp high, low, days

      await user.clear(frostDaysInput);
      await user.tab();

      expect(frostDaysInput).toHaveValue('1'); // Empty becomes 1
    });

    test('clamps frost days out to maximum 10', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const textboxes = screen.getAllByRole('textbox');
      const frostDaysInput = textboxes[3];

      await user.clear(frostDaysInput);
      await user.type(frostDaysInput, '20');
      await user.tab();

      expect(frostDaysInput).toHaveValue('10');
    });

    test('rejects non-numeric input for days out', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const textboxes = screen.getAllByRole('textbox');
      const tempDaysInput = textboxes[2];

      await user.clear(tempDaysInput);
      await user.type(tempDaysInput, 'abc');

      expect(tempDaysInput).toHaveValue('');
    });
  });

  describe('input disabled states', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: defaultAlertSettings }),
      });
    });

    test('disables temperature inputs when alert disabled', async () => {
      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const textboxes = screen.getAllByRole('textbox');
      const highInput = textboxes[0];
      const lowInput = textboxes[1];
      const daysInput = textboxes[2];

      expect(highInput).toBeDisabled();
      expect(lowInput).toBeDisabled();
      expect(daysInput).toBeDisabled();
    });

    test('enables temperature inputs when alert enabled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const tempCheckbox = checkboxes[0];

      await user.click(tempCheckbox);

      const textboxes = screen.getAllByRole('textbox');
      const highInput = textboxes[0];
      const lowInput = textboxes[1];
      const daysInput = textboxes[2];

      expect(highInput).not.toBeDisabled();
      expect(lowInput).not.toBeDisabled();
      expect(daysInput).not.toBeDisabled();
    });

    test('disables frost input when alert disabled', async () => {
      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const textboxes = screen.getAllByRole('textbox');
      const frostInput = textboxes[3];

      expect(frostInput).toBeDisabled();
    });

    test('enables frost input when alert enabled', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');
      const frostCheckbox = checkboxes[1];

      await user.click(frostCheckbox);

      const textboxes = screen.getAllByRole('textbox');
      const frostInput = textboxes[3];

      expect(frostInput).not.toBeDisabled();
    });
  });

  describe('save functionality', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: defaultAlertSettings }),
      });
    });

    test('saves settings to backend when save clicked', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear the initial fetch call
      (global.fetch as any).mockClear();
      (global.fetch as any).mockResolvedValue({ ok: true });

      const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
      await user.click(saveButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/alert-settings/default/weather',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    test('calls onSave callback after successful save', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} onSave={onSave} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      (global.fetch as any).mockResolvedValue({ ok: true });

      const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
      await user.click(saveButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onSave).toHaveBeenCalled();
    });

    test('calls onClose after successful save', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(<WeatherAlertSettingsModal onClose={onClose} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      (global.fetch as any).mockResolvedValue({ ok: true });

      const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
      await user.click(saveButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onClose).toHaveBeenCalled();
    });

    test('does not call onSave when callback not provided', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(<WeatherAlertSettingsModal onClose={onClose} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      (global.fetch as any).mockResolvedValue({ ok: true });

      const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
      await user.click(saveButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still close without error
      expect(onClose).toHaveBeenCalled();
    });

    test('shows saving state during save', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      (global.fetch as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
      await user.click(saveButton);

      // Should show saving state
      expect(screen.getByRole('button', { name: /SAVING/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /SAVING/i })).toBeDisabled();
    });

    test('handles save error gracefully', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(<WeatherAlertSettingsModal onClose={onClose} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
      await user.click(saveButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not close on error
      expect(onClose).not.toHaveBeenCalled();
    });

    test('handles non-ok response gracefully', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(<WeatherAlertSettingsModal onClose={onClose} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      (global.fetch as any).mockResolvedValue({ ok: false });

      const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
      await user.click(saveButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not close on non-ok response
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('modal interactions', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: defaultAlertSettings }),
      });
    });

    test('calls onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(<WeatherAlertSettingsModal onClose={onClose} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const cancelButton = screen.getByRole('button', { name: /CANCEL/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    test('renders cancel and save buttons', async () => {
      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByRole('button', { name: /CANCEL/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^SAVE$/i })).toBeInTheDocument();
    });
  });

  describe('all alert types', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ settings: defaultAlertSettings }),
      });
    });

    test('renders all alert type sections', async () => {
      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('TEMPERATURE ALERTS')).toBeInTheDocument();
      expect(screen.getByText(/FROST WARNINGS/i)).toBeInTheDocument();
      expect(screen.getByText('SNOW ALERTS')).toBeInTheDocument();
      expect(screen.getByText('RAIN ALERTS')).toBeInTheDocument();
      expect(screen.getByText('THUNDERSTORM ALERTS')).toBeInTheDocument();
      expect(screen.getByText('FOG ALERTS')).toBeInTheDocument();
    });

    test('can toggle all alert types', async () => {
      const user = userEvent.setup();

      render(<WeatherAlertSettingsModal onClose={rs.fn()} />);
      await new Promise(resolve => setTimeout(resolve, 100));

      const checkboxes = screen.getAllByRole('checkbox');

      // All should start unchecked
      checkboxes.forEach(checkbox => expect(checkbox).not.toBeChecked());

      // Toggle all
      for (const checkbox of checkboxes) {
        await user.click(checkbox);
      }

      // All should be checked
      checkboxes.forEach(checkbox => expect(checkbox).toBeChecked());
    });
  });
});
