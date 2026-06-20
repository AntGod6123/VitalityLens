/**
 * Lightweight SVG line chart using react-native-svg.
 * Supports multiple series, axis labels, a highlighted "today" point,
 * and an optional dashed projection segment for estimated values.
 */
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../constants';

export interface ChartPoint {
  x: number;          // unix timestamp ms
  y: number;
  estimated?: boolean; // dashed / projected point
}

export interface ChartSeries {
  label: string;
  color: string;
  data: ChartPoint[];
  unit?: string;
  showDots?: boolean;
}

interface Props {
  series: ChartSeries[];
  height?: number;
  yMin?: number;
  yMax?: number;
  xLabelCount?: number;
  yLabelCount?: number;
  title?: string;
}

const PADDING = { top: 16, right: 16, bottom: 40, left: 48 };

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatY(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

export default function LineChart({
  series,
  height = 200,
  yMin,
  yMax,
  xLabelCount = 4,
  yLabelCount = 4,
  title,
}: Props) {
  const screenW = Dimensions.get('window').width - 32; // 16px padding each side
  const chartW = screenW - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Flatten all points to derive domain
  const allPoints = series.flatMap(s => s.data);
  if (allPoints.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.empty}><Text style={styles.emptyText}>No data yet</Text></View>
      </View>
    );
  }

  const xVals = allPoints.map(p => p.x);
  const yVals = allPoints.map(p => p.y);

  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const rawYMin = yMin ?? Math.min(...yVals);
  const rawYMax = yMax ?? Math.max(...yVals);

  // Add 5% padding to Y range so points don't sit on the edge
  const yRange = rawYMax - rawYMin || 1;
  const effectiveYMin = rawYMin - yRange * 0.08;
  const effectiveYMax = rawYMax + yRange * 0.08;

  const toX = (ts: number) =>
    xMax === xMin ? PADDING.left + chartW / 2 : PADDING.left + ((ts - xMin) / (xMax - xMin)) * chartW;

  const toY = (val: number) =>
    PADDING.top + chartH - ((val - effectiveYMin) / (effectiveYMax - effectiveYMin)) * chartH;

  // X axis labels
  const xLabels: number[] = [];
  for (let i = 0; i < xLabelCount; i++) {
    xLabels.push(xMin + (i / (xLabelCount - 1)) * (xMax - xMin));
  }

  // Y axis labels
  const yLabels: number[] = [];
  for (let i = 0; i < yLabelCount; i++) {
    yLabels.push(effectiveYMin + (i / (yLabelCount - 1)) * (effectiveYMax - effectiveYMin));
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      {/* Legend */}
      {series.length > 1 && (
        <View style={styles.legend}>
          {series.map(s => (
            <View key={s.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel}>{s.label}{s.unit ? ` (${s.unit})` : ''}</Text>
            </View>
          ))}
        </View>
      )}

      <Svg width={screenW} height={height}>
        <Defs>
          {series.map(s => (
            <LinearGradient key={s.label} id={`grad_${s.label}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity="0.25" />
              <Stop offset="1" stopColor={s.color} stopOpacity="0.02" />
            </LinearGradient>
          ))}
        </Defs>

        {/* Grid lines */}
        {yLabels.map((yv, i) => {
          const cy = toY(yv);
          return (
            <React.Fragment key={i}>
              <Line
                x1={PADDING.left}
                y1={cy}
                x2={PADDING.left + chartW}
                y2={cy}
                stroke={COLORS.border}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={PADDING.left - 6}
                y={cy + 4}
                fontSize={9}
                fill={COLORS.textMuted}
                textAnchor="end"
              >
                {formatY(yv)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X axis labels */}
        {(xMax !== xMin ? xLabels : [xMin]).map((xv, i) => (
          <SvgText
            key={i}
            x={toX(xv)}
            y={height - 6}
            fontSize={9}
            fill={COLORS.textMuted}
            textAnchor="middle"
          >
            {formatDate(xv)}
          </SvgText>
        ))}

        {/* Series */}
        {series.map(s => {
          if (s.data.length === 0) return null;

          // Split into solid (measured) and dashed (estimated) segments
          const solidPoints = s.data.filter(p => !p.estimated);
          const estimatedPoints = s.data.filter(p => p.estimated);

          // Build the full path for the area fill
          const allSorted = [...s.data].sort((a, b) => a.x - b.x);
          const pathD = allSorted
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`)
            .join(' ');

          // Area fill path (close to bottom)
          const areaD =
            pathD +
            ` L${toX(allSorted[allSorted.length - 1].x)},${toY(effectiveYMin)}` +
            ` L${toX(allSorted[0].x)},${toY(effectiveYMin)} Z`;

          // Solid line path
          const solidD = solidPoints
            .sort((a, b) => a.x - b.x)
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`)
            .join(' ');

          // Dashed estimated line: bridge from last solid → estimated
          const lastSolid = solidPoints[solidPoints.length - 1];
          const estSorted = estimatedPoints.sort((a, b) => a.x - b.x);
          const dashedD = lastSolid && estSorted.length > 0
            ? [lastSolid, ...estSorted]
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`)
                .join(' ')
            : '';

          return (
            <React.Fragment key={s.label}>
              {/* Area fill */}
              <Path d={areaD} fill={`url(#grad_${s.label})`} />

              {/* Solid line */}
              {solidD && (
                <Path d={solidD} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Dashed estimated segment */}
              {dashedD && (
                <Path d={dashedD} stroke={s.color} strokeWidth={2} fill="none" strokeDasharray="6,4" strokeLinecap="round" />
              )}

              {/* Dots */}
              {(s.showDots !== false) && s.data.map((p, i) => (
                <Circle
                  key={i}
                  cx={toX(p.x)}
                  cy={toY(p.y)}
                  r={p.estimated ? 3 : 4}
                  fill={p.estimated ? COLORS.background : s.color}
                  stroke={s.color}
                  strokeWidth={p.estimated ? 1.5 : 0}
                />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  title: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 8, paddingHorizontal: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: COLORS.textMuted, fontSize: 11 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },
});
