import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { Assertion } from '@rstest/core';

declare module '@rstest/core' {
  interface Assertion<T = any> extends TestingLibraryMatchers<T, void> {}
}
