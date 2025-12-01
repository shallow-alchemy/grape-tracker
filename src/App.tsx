import { Route, Link } from 'wouter';
import { AuthGuard } from './components/auth/AuthGuard';
import { VineyardView } from './components/VineyardView';
import { WineryView } from './components/winery/WineryView';
import { AllTasksView } from './components/winery/AllTasksView';
import { DashboardView } from './components/DashboardView';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { UserMenu } from './components/UserMenu';
import { SettingsPage } from './components/settings/SettingsPage';
import { SuppliesPage } from './components/supplies/SuppliesPage';
import styles from './App.module.css';

// App now uses the shared ZeroProvider from index.tsx
// This ensures mutations persist across navigation
export const App = () => {
  return (
    <AuthGuard>
      <div className={styles.app}>
        <header className={styles.header}>
          <Link href="/" className={styles.appTitle}>GILBERT</Link>
          <nav className={styles.nav}>
            <Link href="/vineyard" className={styles.navLink}>VINEYARD</Link>
            <Link href="/winery/vintages" className={styles.navLink}>WINERY</Link>
          </nav>
          <div className={styles.headerActions}>
            <SyncStatusIndicator />
            <UserMenu />
          </div>
        </header>
        <Route path="/" component={DashboardView} />
        <Route path="/supplies" component={SuppliesPage} />
        <Route path="/tasks" component={AllTasksView} />
        <Route path="/settings/:section">
          {(params) => <SettingsPage section={params?.section} />}
        </Route>
        <Route path="/settings">{() => <SettingsPage />}</Route>
        <Route path="/vineyard/vine/:id">
          {(params) => <VineyardView initialVineId={params?.id} />}
        </Route>
        <Route path="/vineyard/block/:id">
          {(params) => <VineyardView initialBlockId={params?.id} />}
        </Route>
        <Route path="/vineyard">{() => <VineyardView />}</Route>
        <Route path="/winery/vintages/:id/tasks">
          {(params) => <WineryView initialVintageTasksId={params?.id} />}
        </Route>
        <Route path="/winery/vintages/:id">
          {(params) => <WineryView initialVintageId={params?.id} />}
        </Route>
        <Route path="/winery/vintages">{() => <WineryView />}</Route>
        <Route path="/winery/wines/:id/tasks">
          {(params) => <WineryView initialWineTasksId={params?.id} />}
        </Route>
        <Route path="/winery/wines/:id">
          {(params) => <WineryView initialWineId={params?.id} />}
        </Route>
        <Route path="/winery/wines">{() => <WineryView />}</Route>
        <Route path="/winery">{() => <WineryView />}</Route>
      </div>
    </AuthGuard>
  );
};
