import styles from '../App.module.css';

type SkeletonProps = {
  width?: string;
  height?: string;
  variant?: 'text' | 'rect' | 'circle';
  className?: string;
};

export const Skeleton = ({
  width = '100%',
  height = '1em',
  variant = 'text',
  className = '',
}: SkeletonProps) => {
  const variantClass = variant === 'circle' ? styles.skeletonCircle : variant === 'rect' ? styles.skeletonRect : '';

  return (
    <div
      className={`${styles.skeleton} ${variantClass} ${className}`}
      style={{ width, height }}
    />
  );
};

// Pre-built skeleton layouts for common dashboard panels
export const TaskListSkeleton = () => (
  <div className={styles.skeletonTaskList}>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className={styles.skeletonTaskItem}>
        <Skeleton width="70%" height="14px" />
        <Skeleton width="50px" height="14px" />
      </div>
    ))}
  </div>
);

export const VintageListSkeleton = () => (
  <div className={styles.skeletonVintageList}>
    {[1, 2].map((i) => (
      <div key={i} className={styles.skeletonVintageItem}>
        <Skeleton width="60%" height="16px" />
        <div className={styles.skeletonVintageMeta}>
          <Skeleton width="80px" height="12px" />
          <Skeleton width="60px" height="12px" />
        </div>
      </div>
    ))}
  </div>
);

export const WeatherSkeleton = () => (
  <div className={styles.skeletonForecastContent}>
    <div className={styles.skeletonTodayWeather}>
      <Skeleton width="40px" height="12px" />
      <Skeleton width="40px" height="40px" variant="circle" />
      <Skeleton width="50px" height="20px" />
      <Skeleton width="80px" height="12px" />
    </div>
    <div className={styles.skeletonForecastDays}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <div key={i} className={styles.skeletonForecastDay}>
          <Skeleton width="30px" height="12px" />
          <Skeleton width="28px" height="16px" />
          <Skeleton width="32px" height="32px" variant="circle" />
        </div>
      ))}
    </div>
  </div>
);

export const WhatsNextSkeleton = () => (
  <>
    <div className={styles.skeletonWhatsNextTask}>
      <Skeleton width="80%" height="16px" />
      <Skeleton width="60px" height="12px" />
      <Skeleton width="100%" height="14px" />
    </div>
    <div className={styles.skeletonWhatsNextSeasonal}>
      <Skeleton width="70%" height="16px" />
      <Skeleton width="100px" height="12px" />
      <Skeleton width="90%" height="14px" />
    </div>
  </>
);
