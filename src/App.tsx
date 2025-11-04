import { Zero } from '@rocicorp/zero';
import { useUser, UserButton } from '@clerk/clerk-react';
import { schema, type Schema } from '../schema';
import styles from './App.module.css';

export default function App() {
  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  // @ts-expect-error - Zero instance will be used later
  const z = new Zero<Schema>({
    userID: user.id,
    server: process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848',
    schema,
  });

  return (
    <div className={styles.app}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Mobile App</h1>
        <UserButton />
      </header>
      <p>Your app is ready!</p>
      <p>Signed in as: {user.primaryEmailAddress?.emailAddress}</p>
    </div>
  );
}
