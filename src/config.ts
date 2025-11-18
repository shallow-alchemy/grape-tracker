export const getBackendUrl = () => {
  return process.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
};

export const getZeroServerUrl = () => {
  return process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848';
};
