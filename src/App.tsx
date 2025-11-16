import { UserButton } from '@clerk/clerk-react';
import { Router, Route, Link } from 'wouter';
import { ZeroProvider } from './contexts/ZeroContext';
import { VineyardView } from './components/VineyardView';
import { WineryView } from './components/winery/WineryView';
import { DashboardView } from './components/DashboardView';
import styles from './App.module.css';

const AppContent = () => {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link href="/" className={styles.appTitle}>GILBERT</Link>
        <nav className={styles.nav}>
          <Link href="/vineyard" className={styles.navLink}>VINEYARD</Link>
          <Link href="/winery" className={styles.navLink}>WINERY</Link>
        </nav>
        <UserButton />
      </header>
      <Route path="/" component={DashboardView} />
      <Route path="/vineyard/vine/:id">
        {(params) => <VineyardView initialVineId={params.id} />}
      </Route>
      <Route path="/vineyard/block/:id">
        {(params) => <VineyardView initialBlockId={params.id} />}
      </Route>
      <Route path="/vineyard">{() => <VineyardView />}</Route>
      <Route path="/winery/vintage/:id">
        {(params) => <WineryView initialVintageId={params.id} />}
      </Route>
      <Route path="/winery/wine/:id">
        {(params) => <WineryView initialWineId={params.id} />}
      </Route>
      <Route path="/winery">{() => <WineryView />}</Route>
    </div>
  );
};

export const App = () => {
  return (
    <ZeroProvider>
      <Router>
        <AppContent />
      </Router>
    </ZeroProvider>
  );
};
