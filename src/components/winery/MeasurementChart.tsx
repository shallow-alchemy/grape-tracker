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
  ph: { label: 'pH', lookupName: 'ph', color: '#65a165', unit: '', decimals: 2 },          // Green
  ta: { label: 'TA', lookupName: 'ta', color: '#6ba3d6', unit: ' g/L', decimals: 1 },      // Blue
  brix: { label: 'Brix', lookupName: 'brix', color: '#d4a85c', unit: '°', decimals: 1 },   // Amber
  temperature: { label: 'Temp', lookupName: 'temperature', color: '#d66b6b', unit: '°F', decimals: 0 }, // Red
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

  // Find the series matching the hovered metric
  const hoveredSeries = payload.find(p => p.dataKey === hoveredMetric);
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
      }));
  }, [measurements]);

  // Calculate domains for each metric
  const domains = useMemo(() => {
    const phValues = measurements.filter(m => m.ph !== null).map(m => m.ph!);
    const taValues = measurements.filter(m => m.ta !== null).map(m => m.ta!);
    const brixValues = measurements.filter(m => m.brix !== null).map(m => m.brix!);

    return {
      ph: phValues.length ? [Math.min(...phValues) - 0.2, Math.max(...phValues) + 0.2] : [2.8, 4.2],
      ta: taValues.length ? [Math.min(...taValues) - 0.5, Math.max(...taValues) + 0.5] : [4, 10],
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
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3d2d" />

          <XAxis
            dataKey="dateLabel"
            stroke="#65a165"
            tick={{ fill: '#65a165', fontSize: 11 }}
            tickLine={{ stroke: '#65a165' }}
          />

          {/* pH axis - left */}
          {hasData.ph && (
            <YAxis
              yAxisId="ph"
              orientation="left"
              domain={domains.ph}
              stroke={metricConfig.ph.color}
              tick={{ fill: metricConfig.ph.color, fontSize: 10 }}
              tickLine={{ stroke: metricConfig.ph.color }}
              label={{ value: 'pH', angle: -90, position: 'insideLeft', fill: metricConfig.ph.color, fontSize: 11 }}
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
              label={{ value: 'Brix°', angle: 90, position: 'insideRight', fill: metricConfig.brix.color, fontSize: 11 }}
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
              yAxisId="ph"
              type="monotone"
              dataKey="ph"
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
              yAxisId="ph"
              type="monotone"
              dataKey="ta"
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
              stroke={metricConfig.temperature.color}
              strokeWidth={1}
              fill={metricConfig.temperature.color}
              fillOpacity={0.15}
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
