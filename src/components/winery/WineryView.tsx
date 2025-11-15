import { useEffect } from 'react';
import { useZero } from '../../contexts/ZeroContext';

export const WineryView = () => {
  const zero = useZero();

  useEffect(() => {
    const fetchVintages = async () => {
      await zero.query.vintage.run();
    };

    fetchVintages();

    const interval = setInterval(fetchVintages, 2000);
    return () => clearInterval(interval);
  }, [zero]);

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-accent)' }}>
        WINERY
      </div>
      <div style={{ marginTop: 'var(--spacing-md)', fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
        Winery features coming soon
      </div>
    </div>
  );
};
