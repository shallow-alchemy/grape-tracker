import { type ReactNode } from 'react';
import { ZeroProvider as ZeroProviderInternal, useZero as useZeroInternal } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { schema, type Schema } from '../../schema';
import type { Zero } from '@rocicorp/zero';

export const useZero = (): Zero<Schema> => {
  return useZeroInternal<Schema>();
};

export const ZeroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ZeroProviderInternal
      userID={user.id}
      server={process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848'}
      schema={schema}
    >
      {children}
    </ZeroProviderInternal>
  );
};
