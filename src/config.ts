export const getBackendUrl = () => {
  // @ts-ignore - Rsbuild injects this at build time
  const url = typeof PUBLIC_BACKEND_URL !== 'undefined' ? PUBLIC_BACKEND_URL : undefined;
  return url || 'http://localhost:3001';
};

export const getZeroServerUrl = () => {
  // @ts-ignore - Rsbuild injects this at build time
  const url = typeof PUBLIC_ZERO_SERVER !== 'undefined' ? PUBLIC_ZERO_SERVER : undefined;
  return url || 'http://localhost:4848';
};
