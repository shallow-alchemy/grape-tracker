import { type ReactNode } from 'react';
import { ZeroProvider as ZeroProviderInternal, useZero as useZeroInternal } from '@rocicorp/zero/react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { schema, type Schema } from '../../schema';
import type { Zero } from '@rocicorp/zero';

export const useZero = (): Zero<Schema> => {
  return useZeroInternal<Schema>();
};

export const ZeroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  // Auth function that provides JWT to Zero
  // Zero will call this to get the token for authentication
  const authFunction = async () => {
    const token = await getToken();
    return token ?? undefined;
  };

  return (
    <ZeroProviderInternal
      userID={user.id}
      server={process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848'}
      schema={schema}
      auth={authFunction}
    >
      {children}
    </ZeroProviderInternal>
  );
};
