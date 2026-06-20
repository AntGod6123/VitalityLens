/**
 * Progress charts — Weight, Body Fat %, LBM, FFMI, FMI over time.
 *
 * When the most recent measurement is a baseline (isBaseline) and
 * there is subsequent workout + nutrition data, we append an
 * "estimated today" point using estimateBodyCompChange() so the
 * user can see projected progress between lab-quality baselines.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import LineChart, { ChartPoint, ChartSeries } from '../../components/charts/LineChart';
import {
  calculateLBM,
  calculateFatMass,
  calculateFFMI,
  calculateFMI,
} from '../../utils/bodyComposition';
import { estimateBodyCompChange } from '../../utils/energyExpenditure';

type Metric = 'weight' | 'bodyfat' | 'lbm' | 'ffmi' | 'fmi';

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string; description: string }> = {
  weight:  { label: 'Weight',    unit: 'kg',  color: COLORS.text,      description: 'Total body weight' },
  bodyfat: { label: 'Body Fat',  unit: '%',   color: COLORS.warning,   description: 'Body fat percentage — dashed = estimated' },
  lbm:     { label: 'LBM',      unit: 'kg',  color: COLORS.primary,   description: 'Lean Body Mass — muscle, bone, water' },
  ffmi:    { label: 'FFMI',      unit: '',    color: COLORS.secondary,  description: 'Fat-Free Mass Index — muscle quality score' },
  fmi:     { label: 'FMI',       unit: '',    color: COLORS.accent,    description: 'Fat Mass Index — fat relative to height²' },
};

const RANGES: Record<string, '1M' | '3M' | '6M' | '1Y' | 'All'> = {};

export default function ProgressChartsScreen() {
  const measurements = useAppSelector(s => s.body.measurements);
  const sessions = useAppSelector(s => s.workout.sessions);
  const userProfile = useAppSelector(s => s.user.profile);

  const [activeMetric, setActiveMetric] = useState<Metric>('weight');
  const [range, setRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'All'>('3M');

  const sex = userProfile?.sex ?? 'male';

  // Filter measurements by selected time range
  const filteredMeasurements = useMemo(() => {
    const sorted = [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (range === 'All' || sorted.length === 0) return sorted;
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range];
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    return sorted.filter(m => new Date(m.date).getTime() >= cutoff);
  }, [measurements, range]);

  // Build estimated "today" point from the last baseline measurement
  const estimatedPoint = useMemo(() => {
    if (filteredMeasurements.length === 0) return null;

    // Find the most recent measurement marked as a baseline
    const baselineCandidates = [...filteredMeasurements].reverse().filter(m => m.isBaseline && m.bodyFatPercent);
    const baseline = baselineCandidates[0];
    if (!baseline || !baseline.bodyFatPercent) return null;

    const baselineTime = new Date(baseline.date).getTime();
    const now = Date.now();
    const daysSince = (now - baselineTime) / (24 * 3600 * 1000);
    if (daysSince < 1) return null;

    // Sum calorie balance from nutrition logs (placeholder: not yet tracked)
    // Sum workout energy since baseline
    const workoutsSinceBaseline = sessions.filter(
      s => new Date(s.date).getTime() > baselineTime,
    );
    const cumulativeAerobicKcal = workoutsSinceBaseline.reduce(
      (sum, s) => sum + (s.energyResult?.aerobicKcal ?? 0), 0,
    );
    const cumulativeAnaerobicKcal = workoutsSinceBaseline.reduce(
      (sum, s) => sum + (s.energyResult?.anaerobicKcal ?? 0), 0,
    );

    const result = estimateBodyCompChange({
      daysSinceBaseline: daysSince,
      cumulativeCalorieBalance: 0,  // will add nutrition integration later
      cumulativeAerobicKcal,
      cumulativeAnaerobicKcal,
      baselineWeightKg: baseline.weightKg,
      baselineBFPercent: baseline.bodyFatPercent,
    });

    return {
      timestamp: now,
      weightKg: result.estimatedWeightKg,
      bodyFatPercent: result.estimatedBFPercent,
      lbm: result.estimatedWeightKg * (1 - result.estimatedBFPercent / 100),
      ffmi: calculateFFMI(
        result.estimatedWeightKg * (1 - result.estimatedBFPercent / 100),
        baseline.heightCm,
      ),
      fmi: calculateFMI(
        result.estimatedWeightKg * (result.estimatedBFPercent / 100),
        baseline.heightCm,
      ),
    };
  }, [filteredMeasurements, sessions]);

  // Build chart series for the active metric
  const chartSeries = useMemo((): ChartSeries[] => {
    const config = METRIC_CONFIG[activeMetric];

    const measuredPoints: ChartPoint[] = filteredMeasurements
      .map(m => {
        const lbm = m.leanBodyMassKg ?? (m.bodyFatPercent ? calculateLBM(m.weightKg, m.bodyFatPercent) : null);
        const fm = m.fatMassKg ?? (m.bodyFatPercent ? calculateFatMass(m.weightKg, m.bodyFatPercent) : null);
        const ffmi = lbm ? calculateFFMI(lbm, m.heightCm) : null;
        const fmi = fm ? calculateFMI(fm, m.heightCm) : null;

        const y: Record<Metric, number | null> = {
          weight:  m.weightKg,
          bodyfat: m.bodyFatPercent ?? null,
          lbm:     lbm,
          ffmi:    ffmi,
          fmi:     fmi,
        };

        const val = y[activeMetric];
        if (val === null) return null;
        return { x: new Date(m.date).getTime(), y: val };
      })
      .filter((p): p is ChartPoint => p !== null);

    // Add estimated today point (dashed)
    const estimatedPoints: ChartPoint[] = [];
    if (estimatedPoint) {
      const estY: Record<Metric, number> = {
        weight:  estimatedPoint.weightKg,
        bodyfat: estimatedPoint.bodyFatPercent,
        lbm:     estimatedPoint.lbm,
        ffmi:    estimatedPoint.ffmi,
        fmi:     estimatedPoint.fmi,
      };
      estimatedPoints.push({ x: estimatedPoint.timestamp, y: estY[activeMetric], estimated: true });
    }

    return [{
      label: config.label,
      color: config.color,
      unit: config.unit,
      data: [...measuredPoints, ...estimatedPoints],
      showDots: true,
    }];
  }, [activeMetric, filteredMeasurements, estimatedPoint]);

  // Summary stats for active metric
  const summaryStats = useMemo(() => {
    const points = chartSeries[0]?.data.filter(p => !p.estimated) ?? [];
    if (points.length < 2) return null;
    const first = points[0].y;
    const last = points[points.length - 1].y;
    const delta = last - first;
    const min = Math.min(...points.map(p => p.y));
    const max = Math.max(...points.map(p => p.y));
    return { first, last, delta, min, max };
  }, [chartSeries]);

  const config = METRIC_CONFIG[activeMetric];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Metric selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricPicker}>
        {(Object.entries(METRIC_CONFIG) as [Metric, typeof METRIC_CONFIG[Metric]][]).map(([key, cfg]) => (
          <TouchableOpacity
            key={key}
            style={[styles.metricChip, activeMetric === key && styles.metricChipActive, { borderColor: cfg.color + '80' }]}
            onPress={() => setActiveMetric(key)}
          >
            <Text style={[styles.metricChipText, activeMetric === key && { color: cfg.color }]}>
              {cfg.label}
            </Text>
            {cfg.unit ? <Text style={[styles.metricChipUnit, activeMetric === key && { color: cfg.color + 'aa' }]}>{cfg.unit}</Text> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Time range selector */}
      <View style={styles.rangeRow}>
        {(['1M', '3M', '6M', '1Y', 'All'] as const).map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{config.label}{config.unit ? ` (${config.unit})` : ''}</Text>
        <Text style={styles.chartDesc}>{config.description}</Text>
        <LineChart
          series={chartSeries}
          height={220}
          title=""
        />
        {estimatedPoint && (
          <View style={styles.estimatedNote}>
            <View style={styles.estimatedDash} />
            <Text style={styles.estimatedNoteText}>Dashed = estimated from workout energy since last baseline</Text>
          </View>
        )}
      </View>

      {/* Summary stats */}
      {summaryStats && (
        <View style={styles.statsGrid}>
          <StatBox
            label="Start"
            value={`${summaryStats.first.toFixed(1)}${config.unit}`}
            color={COLORS.textMuted}
          />
          <StatBox
            label="Now"
            value={`${summaryStats.last.toFixed(1)}${config.unit}`}
            color={config.color}
          />
          <StatBox
            label="Change"
            value={`${summaryStats.delta >= 0 ? '+' : ''}${summaryStats.delta.toFixed(1)}${config.unit}`}
            color={deltaColor(activeMetric, summaryStats.delta)}
          />
          <StatBox
            label="Range"
            value={`${summaryStats.min.toFixed(1)}–${summaryStats.max.toFixed(1)}`}
            color={COLORS.textMuted}
          />
        </View>
      )}

      {/* Individual metric charts — mini overview below */}
      <Text style={styles.overviewTitle}>All Metrics Overview</Text>
      {(Object.entries(METRIC_CONFIG) as [Metric, typeof METRIC_CONFIG[Metric]][])
        .filter(([key]) => key !== activeMetric)
        .map(([key, cfg]) => {
          const pts: ChartPoint[] = filteredMeasurements
            .map(m => {
              const lbm = m.leanBodyMassKg ?? (m.bodyFatPercent ? calculateLBM(m.weightKg, m.bodyFatPercent) : null);
              const fm = m.fatMassKg ?? (m.bodyFatPercent ? calculateFatMass(m.weightKg, m.bodyFatPercent) : null);
              const ffmi = lbm ? calculateFFMI(lbm, m.heightCm) : null;
              const fmi = fm ? calculateFMI(fm, m.heightCm) : null;
              const vals: Record<Metric, number | null> = {
                weight: m.weightKg,
                bodyfat: m.bodyFatPercent ?? null,
                lbm, ffmi, fmi,
              };
              const v = vals[key];
              if (v === null) return null;
              return { x: new Date(m.date).getTime(), y: v };
            })
            .filter((p): p is ChartPoint => p !== null);

          if (estimatedPoint) {
            const estVals: Record<Metric, number> = {
              weight: estimatedPoint.weightKg,
              bodyfat: estimatedPoint.bodyFatPercent,
              lbm: estimatedPoint.lbm,
              ffmi: estimatedPoint.ffmi,
              fmi: estimatedPoint.fmi,
            };
            pts.push({ x: estimatedPoint.timestamp, y: estVals[key], estimated: true });
          }

          return (
            <TouchableOpacity
              key={key}
              style={styles.miniChartCard}
              onPress={() => setActiveMetric(key)}
            >
              <LineChart
                series={[{ label: cfg.label, color: cfg.color, data: pts }]}
                height={120}
                title={`${cfg.label}${cfg.unit ? ` (${cfg.unit})` : ''}`}
                xLabelCount={3}
                yLabelCount={3}
              />
            </TouchableOpacity>
          );
        })}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function deltaColor(metric: Metric, delta: number): string {
  // For body fat and FMI: down = good (green). For LBM, FFMI, weight gain: up = good.
  const downIsGood = metric === 'bodyfat' || metric === 'fmi';
  if (Math.abs(delta) < 0.05) return COLORS.textMuted;
  if (downIsGood) return delta < 0 ? COLORS.success : COLORS.danger;
  return delta > 0 ? COLORS.success : COLORS.danger;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  metricPicker: { marginBottom: 12 },
  metricChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  metricChipActive: { backgroundColor: COLORS.surface },
  metricChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  metricChipUnit: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 7 },
  rangeBtnActive: { backgroundColor: COLORS.primary },
  rangeBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  rangeBtnTextActive: { color: '#fff' },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  chartTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  chartDesc: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12 },
  estimatedNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  estimatedDash: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.textMuted,
    borderRadius: 1,
    borderStyle: 'dashed',
  },
  estimatedNoteText: { color: COLORS.textMuted, fontSize: 11, flex: 1 },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  overviewTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  miniChartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
});
