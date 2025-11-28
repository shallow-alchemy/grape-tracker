import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineEdit } from './InlineEdit';

describe('InlineEdit', () => {
  afterEach(() => {
    cleanup();
    rs.clearAllMocks();
  });

  describe('text input', () => {
    test('displays current value', () => {
      render(
        <InlineEdit
          value="Test Value"
          onSave={rs.fn()}
        />
      );

      expect(screen.getByText('Test Value')).toBeInTheDocument();
    });

    test('shows placeholder when value is empty', () => {
      render(
        <InlineEdit
          value=""
          placeholder="Click to add"
          onSave={rs.fn()}
        />
      );

      expect(screen.getByText('Click to add')).toBeInTheDocument();
    });

    test('enters edit mode on click', async () => {
      const user = userEvent.setup();

      render(
        <InlineEdit
          value="Test Value"
          onSave={rs.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('Test Value');
    });

    test('saves on Enter key', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn().mockResolvedValue(undefined);

      render(
        <InlineEdit
          value="Original"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Updated{Enter}');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('Updated');
      });
    });

    test('cancels on Escape key', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn();

      render(
        <InlineEdit
          value="Original"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Changed{Escape}');

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText('Original')).toBeInTheDocument();
    });

    test('saves on blur', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn().mockResolvedValue(undefined);

      render(
        <InlineEdit
          value="Original"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Updated');
      await user.tab(); // Blur

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('Updated');
      });
    });

    test('does not save if value unchanged', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn();

      render(
        <InlineEdit
          value="Original"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.tab(); // Blur without changes

      expect(onSave).not.toHaveBeenCalled();
    });

    test('shows error on save failure', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn().mockRejectedValue(new Error('Network error'));

      render(
        <InlineEdit
          value="Original"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Updated{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('select input', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ];

    test('displays current value', () => {
      render(
        <InlineEdit
          value="option1"
          type="select"
          options={options}
          formatDisplay={(val) => options.find(o => o.value === val)?.label || val}
          onSave={rs.fn()}
        />
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    test('shows select dropdown when editing', async () => {
      const user = userEvent.setup();

      render(
        <InlineEdit
          value="option1"
          type="select"
          options={options}
          onSave={rs.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('saves when option selected', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn().mockResolvedValue(undefined);

      render(
        <InlineEdit
          value="option1"
          type="select"
          options={options}
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.selectOptions(screen.getByRole('combobox'), 'option2');
      await user.tab(); // Blur to trigger save

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('option2');
      });
    });
  });

  describe('textarea input', () => {
    test('shows textarea when editing', async () => {
      const user = userEvent.setup();

      render(
        <InlineEdit
          value="Some notes"
          type="textarea"
          onSave={rs.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('shows save and cancel buttons for textarea', async () => {
      const user = userEvent.setup();

      render(
        <InlineEdit
          value="Some notes"
          type="textarea"
          onSave={rs.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByTitle('Save')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    });

    test('saves on save button click', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn().mockResolvedValue(undefined);

      render(
        <InlineEdit
          value="Original"
          type="textarea"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Updated notes');
      await user.click(screen.getByTitle('Save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('Updated notes');
      });
    });

    test('cancels on cancel button click', async () => {
      const user = userEvent.setup();
      const onSave = rs.fn();

      render(
        <InlineEdit
          value="Original"
          type="textarea"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Changed');
      await user.click(screen.getByTitle('Cancel'));

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText('Original')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    test('displays value without edit button when disabled', () => {
      render(
        <InlineEdit
          value="Test Value"
          disabled={true}
          onSave={rs.fn()}
        />
      );

      expect(screen.getByText('Test Value')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('with label', () => {
    test('displays label', () => {
      render(
        <InlineEdit
          value="Test Value"
          label="FIELD NAME"
          onSave={rs.fn()}
        />
      );

      expect(screen.getByText('FIELD NAME')).toBeInTheDocument();
      expect(screen.getByText('Test Value')).toBeInTheDocument();
    });
  });
});
