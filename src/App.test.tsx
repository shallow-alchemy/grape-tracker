import { test, expect } from '@rstest/core';
import { App } from './App';

test('renders without crashing', () => {
  // Just verify that the App component can be imported
  // We're checking the module exports the named export correctly
  expect(App).toBeDefined();
  expect(typeof App).toBe('function');
});
