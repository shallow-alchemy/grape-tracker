import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Zero } from '@rocicorp/zero';
import { useUser } from '@clerk/clerk-react';
import { schema, type Schema } from '../../schema';

type ZeroContextValue = Zero<Schema> | null;

const ZeroContext = createContext<ZeroContextValue>(null);

export const useZero = (): Zero<Schema> => {
  const context = useContext(ZeroContext);
  if (!context) {
    throw new Error('useZero must be used within ZeroProvider');
  }
  return context;
};

export const ZeroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [zero, setZero] = useState<Zero<Schema> | null>(null);

  useEffect(() => {
    if (user) {
      const instance = new Zero<Schema>({
        userID: user.id,
        server: process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848',
        schema,
      });
      setZero(instance);

      return () => {
        instance.close();
      };
    }
  }, [user?.id]);

  if (!user || !zero) {
    return <div>Loading...</div>;
  }

  return <ZeroContext.Provider value={zero}>{children}</ZeroContext.Provider>;
};
