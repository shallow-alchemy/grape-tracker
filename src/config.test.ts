import { test, describe, expect, beforeEach, afterEach } from '@rstest/core';
import { getBackendUrl, getZeroServerUrl } from './config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBackendUrl', () => {
    test('returns default URL when PUBLIC_BACKEND_URL is not defined', () => {
      delete process.env.PUBLIC_BACKEND_URL;
      const url = getBackendUrl();
      expect(url).toBe('http://localhost:3001');
    });

    test('returns environment variable when PUBLIC_BACKEND_URL is defined', () => {
      process.env.PUBLIC_BACKEND_URL = 'https://production-backend.example.com';
      const url = getBackendUrl();
      expect(url).toBe('https://production-backend.example.com');
    });

    test('uses process.env syntax (regression test)', () => {
      process.env.PUBLIC_BACKEND_URL = 'https://test-backend.example.com';
      const url = getBackendUrl();
      expect(url).not.toBe('http://localhost:3001');
      expect(url).toBe('https://test-backend.example.com');
    });
  });

  describe('getZeroServerUrl', () => {
    test('returns default URL when PUBLIC_ZERO_SERVER is not defined', () => {
      delete process.env.PUBLIC_ZERO_SERVER;
      const url = getZeroServerUrl();
      expect(url).toBe('http://localhost:4848');
    });

    test('returns environment variable when PUBLIC_ZERO_SERVER is defined', () => {
      process.env.PUBLIC_ZERO_SERVER = 'wss://production-zero.example.com';
      const url = getZeroServerUrl();
      expect(url).toBe('wss://production-zero.example.com');
    });

    test('uses process.env syntax (regression test)', () => {
      process.env.PUBLIC_ZERO_SERVER = 'wss://test-zero.example.com';
      const url = getZeroServerUrl();
      expect(url).not.toBe('http://localhost:4848');
      expect(url).toBe('wss://test-zero.example.com');
    });
  });
});
