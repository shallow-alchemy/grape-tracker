import { useEffect } from 'react';
import { useZero } from '../../contexts/ZeroContext';

export const WineryView = () => {
  const zero = useZero();

  useEffect(() => {
    const fetchVintages = async () => {
      const vintages = await zero.query.vintage.run();
      console.log('Vintages:', vintages);
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
        Check console for vintage data
      </div>
    </div>
  );
};
