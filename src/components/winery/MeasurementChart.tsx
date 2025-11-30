import { useMemo, useState } from 'react';
import { FiCheck, FiAlertTriangle, FiX } from 'react-icons/fi';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from '../../App.module.css';

type Measurement = {
  id: string;
  date: number;
  ph: number | null;
  ta: number | null;
  brix: number | null;
  temperature: number | null;
  stage: string;
};

type MeasurementAnalysis = {
  id: string;
  measurement_id: string;
  summary: string;
  metrics: Array<{ name: string; value: number | null; status: string; analysis: string }>;
  projections: string | null;
  recommendations: string[];
};

type MeasurementChartProps = {
  measurements: Measurement[];
  analyses: MeasurementAnalysis[];
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatStage = (stage: string): string => {
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Map dataKey to display name and metric lookup name
const metricConfig: Record<string, { label: string; lookupName: string; color: string; unit: string; decimals: number }> = {
  ph: { label: 'pH', lookupName: 'ph', color: '#ba68c8', unit: '', decimals: 2 },          // Purple (pH indicator)
  ta: { label: 'TA', lookupName: 'ta', color: '#ffab00', unit: ' g/L', decimals: 1 },      // Amber
  brix: { label: 'Brix', lookupName: 'brix', color: '#00bfa5', unit: '°', decimals: 1 },   // Teal
  temperature: { label: 'Temp', lookupName: 'temperature', color: '#ff5252', unit: '°F', decimals: 0 }, // Bright red (heat)
};

// Typical winemaking ranges for normalization
// pH: 2.9-4.0 (lower = more acidic)
// TA: 4-10 g/L (higher = more acidic)
const ACIDITY_RANGES = {
  ph: { min: 2.9, max: 4.0 },
  ta: { min: 4, max: 10 },
};

// Normalize pH and TA to a 0-100 "acidity" scale
// pH is inverted (lower pH = higher acidity = higher on scale)
// TA is normal (higher TA = higher acidity = higher on scale)
const normalizeAcidity = (value: number | null, type: 'ph' | 'ta'): number | null => {
  if (value === null) return null;
  const range = ACIDITY_RANGES[type];
  if (type === 'ph') {
    // Invert pH: low pH (2.9) = 100, high pH (4.0) = 0
    return ((range.max - value) / (range.max - range.min)) * 100;
  } else {
    // Normal TA: low TA (4) = 0, high TA (10) = 100
    return ((value - range.min) / (range.max - range.min)) * 100;
  }
};

// Custom tooltip component - shows only the hovered metric
const CustomTooltip = ({
  active,
  payload,
  analyses,
  hoveredMetric
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  analyses: MeasurementAnalysis[];
  hoveredMetric: string | null;
}) => {
  if (!active || !payload || payload.length === 0 || !hoveredMetric) return null;

  // Map metric names to their dataKeys (pH and TA use normalized acidity values)
  const dataKeyMap: Record<string, string> = {
    ph: 'phAcidity',
    ta: 'taAcidity',
    brix: 'brix',
    temperature: 'temperature',
  };

  // Find the series matching the hovered metric
  const targetDataKey = dataKeyMap[hoveredMetric] || hoveredMetric;
  const hoveredSeries = payload.find(p => p.dataKey === targetDataKey);
  if (!hoveredSeries) return null;

  const data = hoveredSeries.payload;
  const config = metricConfig[hoveredMetric];

  if (!data || !config) return null;

  const value = data[hoveredMetric];
  if (value === null || value === undefined) return null;

  // Find the AI analysis for this measurement
  const analysis = analyses.find(a => a.measurement_id === data.id);
  const metricAnalysis = analysis?.metrics.find(
    m => m.name.toLowerCase() === config.lookupName.toLowerCase()
  );

  return (
    <div className={styles.chartTooltip}>
      <div className={styles.chartTooltipHeader}>
        {formatDate(data.date)}
        <span className={styles.chartTooltipStage}>{formatStage(data.stage)}</span>
      </div>

      <div className={styles.chartTooltipMetric}>
        <span className={styles.chartTooltipLabel} style={{ color: config.color }}>
          {config.label}
        </span>
        <span className={styles.chartTooltipValue}>
          {value.toFixed(config.decimals)}{config.unit}
        </span>
        {metricAnalysis && (() => {
          const StatusIcon = metricAnalysis.status === 'good' ? FiCheck : metricAnalysis.status === 'warning' ? FiAlertTriangle : FiX;
          return (
            <span className={`${styles.chartTooltipAnalysisBadge} ${styles[`chartTooltipBadge${metricAnalysis.status.charAt(0).toUpperCase() + metricAnalysis.status.slice(1)}`]}`}>
              <StatusIcon size={12} />
            </span>
          );
        })()}
      </div>

      {metricAnalysis && (
        <div className={styles.chartTooltipAnalysis}>
          <div className={styles.chartTooltipAnalysisText}>{metricAnalysis.analysis}</div>
        </div>
      )}
    </div>
  );
};

export const MeasurementChart = ({ measurements, analyses }: MeasurementChartProps) => {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // Sort measurements by date ascending for the chart
  const chartData = useMemo(() => {
    return [...measurements]
      .sort((a, b) => a.date - b.date)
      .map(m => ({
        ...m,
        dateLabel: formatDate(m.date),
        // Add normalized acidity values for pH and TA
        phAcidity: normalizeAcidity(m.ph, 'ph'),
        taAcidity: normalizeAcidity(m.ta, 'ta'),
      }));
  }, [measurements]);

  // Calculate domains for each metric
  const domains = useMemo(() => {
    const brixValues = measurements.filter(m => m.brix !== null).map(m => m.brix!);

    return {
      acidity: [0, 100], // Normalized acidity scale
      brix: brixValues.length ? [Math.min(0, Math.min(...brixValues) - 1), Math.max(...brixValues) + 2] : [-2, 30],
      temp: [30, 110], // Fixed scale centered on 70°F for fermentation temps
    };
  }, [measurements]);

  // Check which metrics have data
  const hasData = useMemo(() => ({
    ph: measurements.some(m => m.ph !== null),
    ta: measurements.some(m => m.ta !== null),
    brix: measurements.some(m => m.brix !== null),
    temperature: measurements.some(m => m.temperature !== null),
  }), [measurements]);

  if (measurements.length < 2) {
    return (
      <div className={styles.chartEmpty}>
        Add at least 2 measurements to see trends
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 20, left: -20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3d2d" />

          <XAxis
            dataKey="dateLabel"
            stroke="#65a165"
            tick={{ fill: '#65a165', fontSize: 11 }}
            tickLine={{ stroke: '#65a165' }}
          />

          {/* Acidity axis - left (shared by pH and TA, normalized 0-100) */}
          {(hasData.ph || hasData.ta) && (
            <YAxis
              yAxisId="acidity"
              orientation="left"
              domain={domains.acidity}
              stroke="#8fbe8f"
              tick={{ fill: '#8fbe8f', fontSize: 10 }}
              tickLine={{ stroke: '#8fbe8f' }}
              tickFormatter={() => ''} // Hide tick labels since it's a relative scale
            />
          )}

          {/* Brix axis - right */}
          {hasData.brix && (
            <YAxis
              yAxisId="brix"
              orientation="right"
              domain={domains.brix}
              stroke={metricConfig.brix.color}
              tick={{ fill: metricConfig.brix.color, fontSize: 10 }}
              tickLine={{ stroke: metricConfig.brix.color }}
            />
          )}

          {/* Temperature axis - hidden, just for scaling the area */}
          {hasData.temperature && (
            <YAxis
              yAxisId="temp"
              orientation="right"
              domain={domains.temp}
              hide={true}
            />
          )}

          <Tooltip
            content={<CustomTooltip analyses={analyses} hoveredMetric={hoveredMetric} />}
            wrapperStyle={{ zIndex: 1000 }}
          />

          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => <span style={{ color: '#8fbe8f', fontSize: '11px' }}>{value}</span>}
          />

          {hasData.ph && (
            <Line
              yAxisId="acidity"
              type="monotone"
              dataKey="phAcidity"
              name="pH"
              stroke={metricConfig.ph.color}
              strokeWidth={2}
              dot={{ fill: metricConfig.ph.color, strokeWidth: 0, r: 4, cursor: 'pointer' }}
              activeDot={{
                r: 6,
                fill: metricConfig.ph.color,
                cursor: 'pointer',
                onMouseEnter: () => setHoveredMetric('ph'),
                onMouseLeave: () => setHoveredMetric(null),
              }}
              connectNulls
            />
          )}

          {hasData.ta && (
            <Line
              yAxisId="acidity"
              type="monotone"
              dataKey="taAcidity"
              name="TA (g/L)"
              stroke={metricConfig.ta.color}
              strokeWidth={2}
              dot={{ fill: metricConfig.ta.color, strokeWidth: 0, r: 4, cursor: 'pointer' }}
              activeDot={{
                r: 6,
                fill: metricConfig.ta.color,
                cursor: 'pointer',
                onMouseEnter: () => setHoveredMetric('ta'),
                onMouseLeave: () => setHoveredMetric(null),
              }}
              connectNulls
            />
          )}

          {hasData.brix && (
            <Line
              yAxisId="brix"
              type="monotone"
              dataKey="brix"
              name="Brix"
              stroke={metricConfig.brix.color}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: metricConfig.brix.color, strokeWidth: 0, r: 4, cursor: 'pointer' }}
              activeDot={{
                r: 6,
                fill: metricConfig.brix.color,
                cursor: 'pointer',
                onMouseEnter: () => setHoveredMetric('brix'),
                onMouseLeave: () => setHoveredMetric(null),
              }}
              connectNulls
            />
          )}

          {hasData.temperature && (
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="Temp (°F)"
              stroke="none"
              fill={metricConfig.temperature.color}
              fillOpacity={0.15}
              legendType="rect"
              dot={{ fill: metricConfig.temperature.color, strokeWidth: 0, r: 3, cursor: 'pointer' }}
              activeDot={{
                r: 5,
                fill: metricConfig.temperature.color,
                cursor: 'pointer',
                onMouseEnter: () => setHoveredMetric('temperature'),
                onMouseLeave: () => setHoveredMetric(null),
              }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
