import { test, describe } from '@rstest/core';

describe('StageTransitionModal', () => {
  describe('step 1: confirm stage change', () => {
    test.todo('shows current and next stage');
    test.todo('shows cancel button');
    test.todo('shows continue button');
    test.todo('closes modal when cancel clicked');
    test.todo('proceeds to step 2 when continue clicked');
  });

  describe('step 2: task selection', () => {
    test.todo('shows task configuration header');
    test.todo('lists all default tasks for wine type and stage');
    test.todo('shows task descriptions');
    test.todo('shows task frequency hints');
    test.todo('all tasks checked by default');
    test.todo('allows unchecking tasks');
    test.todo('shows back button');
    test.todo('returns to step 1 when back clicked');
    test.todo('shows create button');
  });

  describe('custom task addition', () => {
    test.todo('shows add custom task button');
    test.todo('shows custom task form when clicked');
    test.todo('adds custom task to list');
    test.todo('custom task is checked by default');
  });

  describe('stage transition execution', () => {
    test.todo('disables create button while processing');
    test.todo('completes current stage history');
    test.todo('creates new stage history entry');
    test.todo('updates entity current stage');
    test.todo('creates task records for checked tasks only');
    test.todo('calculates due dates based on frequency');
    test.todo('closes modal on success');
  });

  describe('wine type specific tasks', () => {
    test.todo('shows different tasks for red wine');
    test.todo('shows different tasks for white wine');
    test.todo('shows different tasks for sparkling wine');
  });

  describe('error handling', () => {
    test.todo('shows error when stage transition fails');
    test.todo('does not close modal when error occurs');
    test.todo('re-enables create button after error');
  });

});

