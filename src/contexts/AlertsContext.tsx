import { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from '../utils/weather';

type AlertsContextType = {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
};

const AlertsContext = createContext<AlertsContextType | null>(null);

export const AlertsProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  return (
    <AlertsContext.Provider value={{ alerts, setAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
};
