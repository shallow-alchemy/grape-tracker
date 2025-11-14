import type { ReactNode } from 'react';

const createMockQuery = (data: any[] = []) => ({
  run: async () => data,
  where: () => createMockQuery(data),
  orderBy: () => createMockQuery(data),
});

const createMockMutate = () => ({
  insert: async () => ({}),
  update: async () => ({}),
  delete: async () => ({}),
});

const mockZero = {
  query: {
    vine: createMockQuery([]),
    block: createMockQuery([]),
    vineyard: createMockQuery([]),
    vintage: createMockQuery([]),
    wine: createMockQuery([]),
    stageHistory: createMockQuery([]),
    task: createMockQuery([]),
    taskTemplate: createMockQuery([]),
    measurement: createMockQuery([]),
    measurementRange: createMockQuery([]),
  },
  mutate: {
    vine: createMockMutate(),
    block: createMockMutate(),
    vineyard: createMockMutate(),
    vintage: createMockMutate(),
    wine: createMockMutate(),
    stageHistory: createMockMutate(),
    task: createMockMutate(),
    taskTemplate: createMockMutate(),
    measurement: createMockMutate(),
    measurementRange: createMockMutate(),
  },
};

export const useZero = () => mockZero;
export const ZeroProvider = ({ children }: { children: ReactNode }) => children;
