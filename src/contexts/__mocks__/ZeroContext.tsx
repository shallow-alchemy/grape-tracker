import type { ReactNode } from 'react';

const mockZero = {
  query: {},
  mutate: {},
};

export const useZero = () => mockZero;
export const ZeroProvider = ({ children }: { children: ReactNode }) => children;
