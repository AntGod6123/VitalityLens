import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useUnits } from '../../hooks/useUnits';
import { COLORS } from '../../constants';
import LineChart, { ChartPoint, ChartSeries } from '../../components/charts/LineChart';
import {
  calculateLBM,
  calculateFatMass,
  calculateFFMI,
  calculateFMI,
} from '../../utils/bodyComposition';
import { estimateBodyCompChange } from '../../utils/energyExpenditure';
import { BiomarkerType } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'body' | 'strength' | 'biomarker';
type BodyMetric = 'weight' | 'bodyfat' | 'lbm' | 'fm' | 'ffmi' | 'fmi';
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

// ─── Config ──────────────────────────────────────────────────────────────────

const BODY_METRIC_CONFIG: Record<BodyMetric, { label: string; unit: string; color: string; description: string }> = {
  weight:  { label: 'Weight',    unit: 'kg', color: COLORS.text,      description: 'Total body weight' },
  bodyfat: { label: 'Body Fat',  unit: '%',  color: COLORS.warning,   description: 'Body fat percentage — dashed = estimated' },
  lbm:     { label: 'LBM',      unit: 'kg', color: COLORS.primary,   description: 'Lean Body Mass — muscle, bone, water' },
  fm:      { label: 'Fat Mass',  unit: 'kg', color: '#F97316',        description: 'Absolute fat mass in kilograms' },
  ffmi:    { label: 'FFMI',      unit: '',   color: COLORS.secondary, description: 'Fat-Free Mass Index — muscle quality score' },
  fmi:     { label: 'FMI',       unit: '',   color: COLORS.accent,    description: 'Fat Mass Index — fat relative to height²' },
};

const BIOMARKER_CONFIG: Partial<Record<BiomarkerType, { label: string; unit: string; color: string; higherIsBetter: boolean }>> = {
  hrv:          { label: 'HRV',          unit: 'ms',      color: COLORS.secondary, higherIsBetter: true },
  resting_hr:   { label: 'Resting HR',   unit: 'bpm',     color: COLORS.danger,    higherIsBetter: false },
  sleep_hours:  { label: 'Sleep',        unit: 'h',       color: '#8B5CF6',        higherIsBetter: true },
  sleep_quality:{ label: 'Sleep Quality',unit: '/10',     color: '#7C3AED',        higherIsBetter: true },
  vo2max:       { label: 'VO₂ Max',      unit: 'mL/kg/min',color: COLORS.primary,  higherIsBetter: true },
  grip_strength:{ label: 'Grip',         unit: 'kg',      color: '#06B6D4',        higherIsBetter: true },
  steps:        { label: 'Steps',        unit: '/day',    color: COLORS.accent,    higherIsBetter: true },
  systolic_bp:  { label: 'Systolic BP',  unit: 'mmHg',    color: '#EF4444',        higherIsBetter: false },
  diastolic_bp: { label: 'Diastolic BP', unit: 'mmHg',    color: '#F87171',        higherIsBetter: false },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cutoffMs(range: TimeRange): number {
  if (range === 'All') return 0;
  const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range];
  return Date.now() - days * 24 * 3600 * 1000;
}

function deltaColor(metric: BodyMetric, delta: number): string {
  const downIsGood = metric === 'bodyfat' || metric === 'fmi' || metric === 'fm';
  if (Math.abs(delta) < 0.05) return COLORS.textMuted;
  if (downIsGood) return delta < 0 ? COLORS.success : COLORS.danger;
  return delta > 0 ? COLORS.success : COLORS.danger;
}

function biomarkerDeltaColor(higherIsBetter: boolean, delta: number): string {
  if (Math.abs(delta) < 0.1) return COLORS.textMuted;
  return higherIsBetter ? (delta > 0 ? COLORS.success : COLORS.danger) : (delta < 0 ? COLORS.success : COLORS.danger);
}

// Epley 1RM estimate
function epley1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={styles.tabBar}>
      {([['body', 'Body Comp'], ['strength', 'Strength'], ['biomarker', 'Biomarkers']] as [Tab, string][]).map(
        ([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabBtn, active === key && styles.tabBtnActive]}
            onPress={() => onChange(key)}
          >
            <Text style={[styles.tabText, active === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ),
      )}
    </View>
  );
}

function RangeSelector({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  return (
    <View style={styles.rangeRow}>
      {(['1M', '3M', '6M', '1Y', 'All'] as TimeRange[]).map(r => (
        <TouchableOpacity
          key={r}
          style={[styles.rangeBtn, value === r && styles.rangeBtnActive]}
          onPress={() => onChange(r)}
        >
          <Text style={[styles.rangeBtnText, value === r && styles.rangeBtnTextActive]}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
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

function SummaryStats({ points, unit, color, metricKey }: {
  points: ChartPoint[];
  unit: string;
  color: string;
  metricKey?: BodyMetric;
}) {
  const measured = points.filter(p => !p.estimated);
  if (measured.length < 2) return null;
  const first = measured[0].y;
  const last = measured[measured.length - 1].y;
  const delta = last - first;
  const min = Math.min(...measured.map(p => p.y));
  const max = Math.max(...measured.map(p => p.y));
  const deltaC = metricKey ? deltaColor(metricKey, delta) : (delta >= 0 ? COLORS.success : COLORS.danger);
  return (
    <View style={styles.statsGrid}>
      <StatBox label="Start" value={`${first.toFixed(1)}${unit}`} color={COLORS.textMuted} />
      <StatBox label="Current" value={`${last.toFixed(1)}${unit}`} color={color} />
      <StatBox label="Change" value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${unit}`} color={deltaC} />
      <StatBox label="Range" value={`${min.toFixed(1)}–${max.toFixed(1)}`} color={COLORS.textMuted} />
    </View>
  );
}

// ─── Body Comp Tab ────────────────────────────────────────────────────────────

function BodyTab() {
  const measurements = useAppSelector(s => s.body.measurements);
  const sessions = useAppSelector(s => s.workout.sessions);
  const { weightUnit, displayWeight: displayWt } = useUnits();

  const [activeMetric, setActiveMetric] = useState<BodyMetric>('weight');
  const [range, setRange] = useState<TimeRange>('3M');

  const cutoff = cutoffMs(range);
  const sorted = useMemo(
    () => [...measurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(m => new Date(m.date).getTime() >= cutoff || range === 'All'),
    [measurements, cutoff, range],
  );

  const estimatedPoint = useMemo(() => {
    if (sorted.length === 0) return null;
    const baseline = [...sorted].reverse().find(m => m.isBaseline && m.bodyFatPercent);
    if (!baseline?.bodyFatPercent) return null;
    const baselineTime = new Date(baseline.date).getTime();
    const daysSince = (Date.now() - baselineTime) / (24 * 3600 * 1000);
    if (daysSince < 1) return null;
    const workoutsSince = sessions.filter(s => new Date(s.date).getTime() > baselineTime);
    const aerobic = workoutsSince.reduce((s, w) => s + (w.energyResult?.aerobicKcal ?? 0), 0);
    const anaerobic = workoutsSince.reduce((s, w) => s + (w.energyResult?.anaerobicKcal ?? 0), 0);
    const result = estimateBodyCompChange({
      daysSinceBaseline: daysSince,
      cumulativeCalorieBalance: 0,
      cumulativeAerobicKcal: aerobic,
      cumulativeAnaerobicKcal: anaerobic,
      baselineWeightKg: baseline.weightKg,
      baselineBFPercent: baseline.bodyFatPercent,
    });
    const estLBM = result.estimatedWeightKg * (1 - result.estimatedBFPercent / 100);
    const estFM = result.estimatedWeightKg * (result.estimatedBFPercent / 100);
    return {
      timestamp: Date.now(),
      weight: result.estimatedWeightKg,
      bodyfat: result.estimatedBFPercent,
      lbm: estLBM,
      fm: estFM,
      ffmi: calculateFFMI(estLBM, baseline.heightCm),
      fmi: calculateFMI(estFM, baseline.heightCm),
    };
  }, [sorted, sessions]);

  const weightMetrics = new Set<BodyMetric>(['weight', 'lbm', 'fm']);

  const buildPoints = (metric: BodyMetric): ChartPoint[] => {
    const convert = weightMetrics.has(metric) ? displayWt : (v: number) => v;
    const pts: ChartPoint[] = sorted
      .map(m => {
        const lbm = m.leanBodyMassKg ?? (m.bodyFatPercent ? calculateLBM(m.weightKg, m.bodyFatPercent) : null);
        const fm = m.fatMassKg ?? (m.bodyFatPercent ? calculateFatMass(m.weightKg, m.bodyFatPercent) : null);
        const vals: Record<BodyMetric, number | null> = {
          weight: m.weightKg,
          bodyfat: m.bodyFatPercent ?? null,
          lbm,
          fm,
          ffmi: lbm ? calculateFFMI(lbm, m.heightCm) : null,
          fmi: fm ? calculateFMI(fm, m.heightCm) : null,
        };
        const v = vals[metric];
        if (v === null) return null;
        return { x: new Date(m.date).getTime(), y: convert(v) };
      })
      .filter((p): p is ChartPoint => p !== null);

    if (estimatedPoint) {
      const ev: Record<BodyMetric, number> = estimatedPoint as any;
      pts.push({ x: estimatedPoint.timestamp, y: convert(ev[metric]), estimated: true });
    }
    return pts;
  };

  const cfgBase = BODY_METRIC_CONFIG[activeMetric];
  const cfg = {
    ...cfgBase,
    unit: weightMetrics.has(activeMetric) ? weightUnit : cfgBase.unit,
  };
  const mainPoints = buildPoints(activeMetric);

  return (
    <>
      {/* Metric chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {(Object.entries(BODY_METRIC_CONFIG) as [BodyMetric, typeof BODY_METRIC_CONFIG[BodyMetric]][]).map(
          ([key, c]) => {
            const chipUnit = weightMetrics.has(key as BodyMetric) ? weightUnit : c.unit;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.metricChip, activeMetric === key && styles.metricChipActive, { borderColor: c.color + '80' }]}
                onPress={() => setActiveMetric(key as BodyMetric)}
              >
                <Text style={[styles.metricChipText, activeMetric === key && { color: c.color }]}>{c.label}</Text>
                {chipUnit ? <Text style={[styles.metricChipUnit, activeMetric === key && { color: c.color + 'aa' }]}>{chipUnit}</Text> : null}
              </TouchableOpacity>
            );
          },
        )}
      </ScrollView>

      <RangeSelector value={range} onChange={setRange} />

      {/* Main chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{cfg.label}{cfg.unit ? ` (${cfg.unit})` : ''}</Text>
        <Text style={styles.chartDesc}>{cfg.description}</Text>
        <LineChart
          series={[{ label: cfg.label, color: cfg.color, unit: cfg.unit, data: mainPoints, showDots: true }]}
          height={220}
          title=""
        />
        {estimatedPoint && (
          <View style={styles.estimatedNote}>
            <Text style={styles.estimatedNoteText}>── Dashed = estimated from workout energy since last baseline</Text>
          </View>
        )}
      </View>

      <SummaryStats points={mainPoints} unit={cfg.unit} color={cfg.color} metricKey={activeMetric} />

      {/* Mini overview */}
      <Text style={styles.overviewTitle}>All Metrics Overview</Text>
      {(Object.entries(BODY_METRIC_CONFIG) as [BodyMetric, typeof BODY_METRIC_CONFIG[BodyMetric]][])
        .filter(([key]) => key !== activeMetric)
        .map(([key, c]) => {
          const pts = buildPoints(key);
          if (pts.filter(p => !p.estimated).length === 0) return null;
          return (
            <TouchableOpacity key={key} style={styles.miniChartCard} onPress={() => setActiveMetric(key)}>
              <LineChart
                series={[{ label: c.label, color: c.color, data: pts }]}
                height={120}
                title={`${c.label}${c.unit ? ` (${c.unit})` : ''}`}
                xLabelCount={3}
                yLabelCount={3}
              />
            </TouchableOpacity>
          );
        })}
    </>
  );
}

// ─── Strength Tab ─────────────────────────────────────────────────────────────

function StrengthTab() {
  const sessions = useAppSelector(s => s.workout.sessions);
  const [range, setRange] = useState<TimeRange>('3M');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const cutoff = cutoffMs(range);

  // Build map: exerciseName → [{date, best1RM}]
  const exerciseHistory = useMemo(() => {
    const map: Record<string, { date: number; best1RM: number }[]> = {};
    [...sessions]
      .filter(s => range === 'All' || new Date(s.date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(session => {
        const ts = new Date(session.date).getTime();
        session.exercises.forEach(ex => {
          if (!ex.exerciseName) return;
          const best = ex.sets.reduce((max, set) => {
            if (!set.weightKg || !set.reps || set.reps < 1) return max;
            const est = epley1RM(set.weightKg, set.reps);
            return est > max ? est : max;
          }, 0);
          if (best === 0) return;
          if (!map[ex.exerciseName]) map[ex.exerciseName] = [];
          // Merge same-day entries: keep best
          const existing = map[ex.exerciseName].find(e => e.date === ts);
          if (existing) {
            if (best > existing.best1RM) existing.best1RM = best;
          } else {
            map[ex.exerciseName].push({ date: ts, best1RM: best });
          }
        });
      });
    // Sort each exercise's history and filter exercises with ≥2 data points
    return Object.entries(map)
      .filter(([, pts]) => pts.length >= 1)
      .sort((a, b) => b[1].length - a[1].length) // most-tracked first
      .map(([name, pts]) => ({ name, pts: pts.sort((a, b) => a.date - b.date) }));
  }, [sessions, range, cutoff]);

  const active = selectedExercise ?? exerciseHistory[0]?.name ?? null;
  const activeSeries = exerciseHistory.find(e => e.name === active);

  if (exerciseHistory.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyTabText}>Log strength workouts with weight and reps to see trends here.</Text>
      </View>
    );
  }

  return (
    <>
      <RangeSelector value={range} onChange={setRange} />

      {/* Exercise picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {exerciseHistory.map(({ name }) => (
          <TouchableOpacity
            key={name}
            style={[styles.metricChip, active === name && styles.metricChipActive, { borderColor: COLORS.primary + '80' }]}
            onPress={() => setSelectedExercise(name)}
          >
            <Text style={[styles.metricChipText, active === name && { color: COLORS.primary }]} numberOfLines={1}>
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeSeries && (
        <>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{activeSeries.name}</Text>
            <Text style={styles.chartDesc}>Estimated 1-Rep Max (Epley formula) over time</Text>
            <LineChart
              series={[{
                label: 'e1RM',
                color: COLORS.primary,
                unit: 'kg',
                data: activeSeries.pts.map(p => ({ x: p.date, y: p.best1RM })),
                showDots: true,
              }]}
              height={200}
              title=""
            />
          </View>
          <SummaryStats
            points={activeSeries.pts.map(p => ({ x: p.date, y: p.best1RM }))}
            unit=" kg"
            color={COLORS.primary}
          />
        </>
      )}

      {/* Mini charts for other exercises */}
      {exerciseHistory.filter(e => e.name !== active).length > 0 && (
        <Text style={styles.overviewTitle}>Other Exercises</Text>
      )}
      {exerciseHistory
        .filter(e => e.name !== active)
        .slice(0, 6)
        .map(({ name, pts }) => (
          <TouchableOpacity key={name} style={styles.miniChartCard} onPress={() => setSelectedExercise(name)}>
            <LineChart
              series={[{ label: name, color: COLORS.primary, unit: 'kg', data: pts.map(p => ({ x: p.date, y: p.best1RM })) }]}
              height={110}
              title={`${name} — e1RM (kg)`}
              xLabelCount={3}
              yLabelCount={3}
            />
          </TouchableOpacity>
        ))}
    </>
  );
}

// ─── Biomarker Tab ────────────────────────────────────────────────────────────

function BiomarkerTab() {
  const logs = useAppSelector(s => s.biomarker.logs);
  const [range, setRange] = useState<TimeRange>('3M');
  const [selectedType, setSelectedType] = useState<BiomarkerType | null>(null);

  const cutoff = cutoffMs(range);

  const trackedTypes = useMemo(() => {
    const typeSet = new Set(
      logs
        .filter(l => range === 'All' || new Date(l.date).getTime() >= cutoff)
        .map(l => l.type),
    );
    return (Object.keys(BIOMARKER_CONFIG) as BiomarkerType[]).filter(t => typeSet.has(t));
  }, [logs, range, cutoff]);

  const active = selectedType ?? trackedTypes[0] ?? null;

  const getPoints = (type: BiomarkerType): ChartPoint[] =>
    logs
      .filter(l => l.type === type && (range === 'All' || new Date(l.date).getTime() >= cutoff))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(l => ({ x: new Date(l.date).getTime(), y: l.value }));

  if (trackedTypes.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyTabText}>Log biomarkers (HRV, resting HR, sleep, etc.) in the Biomarkers tab to see trends here.</Text>
      </View>
    );
  }

  const activeCfg = active ? BIOMARKER_CONFIG[active] : null;
  const activePoints = active ? getPoints(active) : [];

  return (
    <>
      <RangeSelector value={range} onChange={setRange} />

      {/* Type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {trackedTypes.map(type => {
          const cfg = BIOMARKER_CONFIG[type]!;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.metricChip, active === type && styles.metricChipActive, { borderColor: cfg.color + '80' }]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.metricChipText, active === type && { color: cfg.color }]}>{cfg.label}</Text>
              <Text style={[styles.metricChipUnit, active === type && { color: cfg.color + 'aa' }]}>{cfg.unit}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeCfg && active && (
        <>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{activeCfg.label} ({activeCfg.unit})</Text>
            <Text style={styles.chartDesc}>{activeCfg.higherIsBetter ? 'Higher is better' : 'Lower is better'}</Text>
            <LineChart
              series={[{ label: activeCfg.label, color: activeCfg.color, unit: activeCfg.unit, data: activePoints, showDots: true }]}
              height={200}
              title=""
            />
          </View>
          {(() => {
            const measured = activePoints.filter(p => !p.estimated);
            if (measured.length < 2) return null;
            const first = measured[0].y;
            const last = measured[measured.length - 1].y;
            const delta = last - first;
            const dc = biomarkerDeltaColor(activeCfg.higherIsBetter, delta);
            return (
              <View style={styles.statsGrid}>
                <StatBox label="First" value={`${first.toFixed(1)}${activeCfg.unit}`} color={COLORS.textMuted} />
                <StatBox label="Latest" value={`${last.toFixed(1)}${activeCfg.unit}`} color={activeCfg.color} />
                <StatBox label="Change" value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`} color={dc} />
                <StatBox label="Readings" value={String(measured.length)} color={COLORS.textMuted} />
              </View>
            );
          })()}
        </>
      )}

      {/* Mini overviews */}
      {trackedTypes.filter(t => t !== active).length > 0 && (
        <Text style={styles.overviewTitle}>Other Biomarkers</Text>
      )}
      {trackedTypes
        .filter(t => t !== active)
        .map(type => {
          const cfg = BIOMARKER_CONFIG[type]!;
          const pts = getPoints(type);
          return (
            <TouchableOpacity key={type} style={styles.miniChartCard} onPress={() => setSelectedType(type)}>
              <LineChart
                series={[{ label: cfg.label, color: cfg.color, data: pts }]}
                height={110}
                title={`${cfg.label} (${cfg.unit})`}
                xLabelCount={3}
                yLabelCount={3}
              />
            </TouchableOpacity>
          );
        })}
    </>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

export default function ProgressChartsScreen() {
  const [tab, setTab] = useState<Tab>('body');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <TabBar active={tab} onChange={setTab} />

      {tab === 'body' && <BodyTab />}
      {tab === 'strength' && <StrengthTab />}
      {tab === 'biomarker' && <BiomarkerTab />}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  rangeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 7 },
  rangeBtnActive: { backgroundColor: COLORS.surfaceLight },
  rangeBtnText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  rangeBtnTextActive: { color: COLORS.text },

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

  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  chartTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  chartDesc: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12 },
  estimatedNote: { marginTop: 8 },
  estimatedNoteText: { color: COLORS.textMuted, fontSize: 11 },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: '700' },

  overviewTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  miniChartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  emptyTab: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTabText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
