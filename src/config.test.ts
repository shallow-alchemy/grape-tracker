import { test, describe, expect } from '@rstest/core';
import { getBackendUrl, getZeroServerUrl } from './config';

describe('config', () => {
  describe('getBackendUrl', () => {
    test('returns default URL when PUBLIC_BACKEND_URL is not defined', () => {
      const url = getBackendUrl();
      expect(url).toBe('http://localhost:3001');
    });
  });

  describe('getZeroServerUrl', () => {
    test('returns default URL when PUBLIC_ZERO_SERVER is not defined', () => {
      const url = getZeroServerUrl();
      expect(url).toBe('http://localhost:4848');
    });
  });
});
