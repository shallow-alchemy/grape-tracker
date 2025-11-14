import { expect, rs } from '@rstest/core';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';

expect.extend(jestDomMatchers);

const mockEnv = {
  PUBLIC_ZERO_SERVER: 'http://localhost:4848',
  PUBLIC_BACKEND_URL: 'http://localhost:3001',
  PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_mock',
};

Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: mockEnv,
    },
  },
  writable: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: rs.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: rs.fn(),
    removeListener: rs.fn(),
    addEventListener: rs.fn(),
    removeEventListener: rs.fn(),
    dispatchEvent: rs.fn(),
  })),
});

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
