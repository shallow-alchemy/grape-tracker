import { test, describe } from '@rstest/core';

describe('AddVintageModal', () => {
  describe('visibility', () => {
    test.todo('does not render when closed');
    test.todo('renders when opened');
    test.todo('closes when cancel button clicked');
    test.todo('closes when successfully submitted');
  });

  describe('form fields', () => {
    test.todo('displays vintage year dropdown');
    test.todo('displays variety dropdown');
    test.todo('displays block selection');
    test.todo('displays harvest date picker with today as default');
    test.todo('displays optional harvest weight field');
    test.todo('displays optional harvest volume field');
    test.todo('displays optional brix field');
    test.todo('displays optional notes textarea');
  });

  describe('validation', () => {
    test.todo('shows error when vintage year not selected');
    test.todo('shows error when variety not selected');
    test.todo('shows error when duplicate vintage exists');
    test.todo('allows submission when no blocks selected');
    test.todo('validates brix is between 0 and 40');
  });

  describe('form interaction', () => {
    test.todo('allows selecting multiple blocks');
    test.todo('clears form after successful submission');
    test.todo('disables submit button while submitting');
    test.todo('re-enables submit button after submission completes');
  });

  describe('data persistence', () => {
    test.todo('creates vintage record with correct data');
    test.todo('creates initial stage history entry');
  });

  describe('error handling', () => {
    test.todo('shows error message when submission fails');
    test.todo('keeps form data when submission fails');
  });
});
