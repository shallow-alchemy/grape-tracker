import { Zero } from '@rocicorp/zero';
import { schema, type Schema } from '../schema';
import styles from './App.module.css';

// @ts-expect-error - Zero instance will be used later
const z = new Zero<Schema>({
  userID: 'anon',
  server: process.env.PUBLIC_ZERO_SERVER || 'http://localhost:4848',
  schema,
});

export default function App() {
  return (
    <div className={styles.app}>
      <h1>Mobile App</h1>
      <p>Your app is ready!</p>
    </div>
  );
}
