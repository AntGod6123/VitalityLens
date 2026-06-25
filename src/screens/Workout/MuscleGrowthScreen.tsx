/**
 * Muscle Growth Projections screen.
 *
 * Two panels:
 * 1. Natural potential gauge — Berkhan/Martin LBM ceiling, % of potential,
 *    estimated months-to-ceiling, per-muscle-group distribution bars.
 * 2. Weekly muscle frequency — how many times each muscle group was trained
 *    in the last 7 days, against the evidence-based target of 2x/week.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useUnits } from '../../hooks/useUnits';
import { COLORS } from '../../constants';
import { naturalLBMCeiling, caseyButtPotential, calculateLBM } from '../../utils/bodyComposition';
import { MuscleGroup } from '../../types';
import LineChart from '../../components/charts/LineChart';
import ScreenContainer from '../../components/common/ScreenContainer';
import EmptyState from '../../components/common/EmptyState';
import InfoButton from '../../components/common/InfoButton';

// ─── Muscle group config ─────────────────────────────────────────────────────

interface MuscleConfig {
  label: string;
  lbmPct: number;   // share of total LBM this muscle group represents
  color: string;
  targetSetsPerWeek: number; // evidence-based MEV (minimum effective volume)
}

const MUSCLE_CONFIG: Record<string, MuscleConfig> = {
  quads:      { label: 'Quads',       lbmPct: 0.14, color: '#3B82F6', targetSetsPerWeek: 10 },
  glutes:     { label: 'Glutes',      lbmPct: 0.12, color: '#8B5CF6', targetSetsPerWeek: 8  },
  hamstrings: { label: 'Hamstrings',  lbmPct: 0.10, color: '#6366F1', targetSetsPerWeek: 8  },
  lats:       { label: 'Lats',        lbmPct: 0.10, color: '#10B981', targetSetsPerWeek: 10 },
  back:       { label: 'Back',        lbmPct: 0.08, color: '#059669', targetSetsPerWeek: 10 },
  chest:      { label: 'Chest',       lbmPct: 0.08, color: '#F59E0B', targetSetsPerWeek: 10 },
  shoulders:  { label: 'Shoulders',   lbmPct: 0.07, color: '#EF4444', targetSetsPerWeek: 8  },
  calves:     { label: 'Calves',      lbmPct: 0.06, color: '#EC4899', targetSetsPerWeek: 8  },
  biceps:     { label: 'Biceps',      lbmPct: 0.03, color: '#F97316', targetSetsPerWeek: 8  },
  triceps:    { label: 'Triceps',     lbmPct: 0.03, color: '#FB923C', targetSetsPerWeek: 8  },
  core:       { label: 'Core',        lbmPct: 0.05, color: '#14B8A6', targetSetsPerWeek: 6  },
  traps:      { label: 'Traps',       lbmPct: 0.04, color: '#A78BFA', targetSetsPerWeek: 6  },
  forearms:   { label: 'Forearms',    lbmPct: 0.02, color: '#94A3B8', targetSetsPerWeek: 4  },
};

type Tab = 'potential' | 'frequency' | 'volume';

export default function MuscleGrowthScreen() {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);
  const userProfile = useAppSelector(s => s.user.profile);
  const { weightUnit, displayWeight: displayWt } = useUnits();
  const [tab, setTab] = useState<Tab>('potential');

  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;

  const naturalCeiling = latest ? naturalLBMCeiling(latest.heightCm) : null;
  const pctOfPotential = lbm && naturalCeiling ? Math.min((lbm / naturalCeiling) * 100, 100) : null;

  // Gain rate slows as you approach ceiling
  const monthlyGainRate = pctOfPotential != null
    ? Math.max(0.05, 1.0 * Math.pow(1 - pctOfPotential / 100, 1.5))
    : null;
  const monthsToNatCeiling = lbm && naturalCeiling && monthlyGainRate
    ? Math.round((naturalCeiling - lbm) / monthlyGainRate)
    : null;

  // Casey Butt potential (requires wrist + ankle from profile or latest)
  const caseyButtCeiling = useMemo(() => {
    if (!latest) return null;
    const wrist = latest.armCm ? latest.armCm * 0.18 : null; // rough wrist estimate from arm circumference
    if (!wrist || !latest.heightCm) return null;
    return caseyButtPotential(latest.heightCm, wrist, 0);
  }, [latest]);

  // Weekly muscle frequency (last 7 days)
  const weekCutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const weekSessions = sessions.filter(s => new Date(s.date).getTime() > weekCutoff);
  const weeklyFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const s of weekSessions) {
      for (const ex of s.exercises) {
        for (const mg of ex.muscleGroups) {
          freq[mg] = (freq[mg] ?? 0) + ex.sets.length;
        }
      }
    }
    return freq;
  }, [weekSessions]);

  // Per-muscle volume over last 8 weeks (for the Volume tab)
  const volumeHistory = useMemo(() => {
    // Build weekly buckets (last 8 weeks)
    const weeks: { start: number; sets: Record<string, number> }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = Date.now() - (i + 1) * 7 * 24 * 3600 * 1000;
      const end = Date.now() - i * 7 * 24 * 3600 * 1000;
      const bucket: Record<string, number> = {};
      for (const s of sessions) {
        const t = new Date(s.date).getTime();
        if (t >= start && t < end) {
          for (const ex of s.exercises) {
            for (const mg of ex.muscleGroups) {
              bucket[mg] = (bucket[mg] ?? 0) + ex.sets.length;
            }
          }
        }
      }
      weeks.push({ start, sets: bucket });
    }
    return weeks;
  }, [sessions]);

  if (!latest && sessions.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="fitness-outline"
          title="No data yet"
          subtitle="Add a body measurement and log workouts to see your muscle growth projections."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Tab bar */}
      <View style={styles.tabs}>
        {([
          { key: 'potential', label: 'Potential', icon: 'body-outline' },
          { key: 'frequency', label: 'Frequency', icon: 'calendar-outline' },
          { key: 'volume', label: 'Volume', icon: 'bar-chart-outline' },
        ] as { key: Tab; label: string; icon: string }[]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={16} color={tab === t.key ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── POTENTIAL TAB ─────────────────────────────────────── */}
      {tab === 'potential' && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={styles.heading}>Natural Muscle Potential</Text>
            <InfoButton
              title="Natural Muscle Potential"
              body="Uses the Berkhan/Martin model: natural LBM ceiling (kg) ≈ height (cm) − 100, measured at ~5% body fat. The Casey Butt model refines this using wrist and ankle measurements. These represent estimated genetic ceilings without performance-enhancing drugs."
            />
          </View>

          {!latest || !lbm ? (
            <Text style={styles.empty}>Add a body measurement with body fat % to calculate potential.</Text>
          ) : (
            <>
              <View style={styles.potCard}>
                <PotRow label="Current LBM" value={`${displayWt(lbm).toFixed(1)} ${weightUnit}`} />
                <PotRow label="Natural ceiling (Berkhan)" value={`${displayWt(naturalCeiling!).toFixed(1)} ${weightUnit}`} />
                {caseyButtCeiling && (
                  <PotRow label="Casey Butt ceiling" value={`${displayWt(caseyButtCeiling).toFixed(1)} ${weightUnit}`} note="wrist/ankle" />
                )}
                <PotRow
                  label="% of potential"
                  value={`${pctOfPotential!.toFixed(1)}%`}
                  highlight
                />
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pctOfPotential}%` }]} />
                </View>
                <PotRow label="Est. monthly gain rate" value={`~${displayWt(monthlyGainRate!).toFixed(2)} ${weightUnit}/mo`} />
                <PotRow label="Months to natural ceiling" value={monthsToNatCeiling ? `${monthsToNatCeiling} months` : '—'} />
              </View>

              <Text style={styles.sectionTitle}>Per Muscle Estimate</Text>
              <Text style={styles.sectionSub}>
                LBM distributed by typical anatomical proportions. DEXA gives precise values.
              </Text>
              {Object.entries(MUSCLE_CONFIG).map(([key, cfg]) => {
                const current = lbm * cfg.lbmPct;
                const ceiling = naturalCeiling! * cfg.lbmPct;
                const pct = Math.min((current / ceiling) * 100, 100);
                return (
                  <View key={key} style={styles.muscleRow}>
                    <View style={styles.muscleInfo}>
                      <Text style={styles.muscleName}>{cfg.label}</Text>
                      <Text style={styles.muscleVals}>
                        {displayWt(current).toFixed(1)} / {displayWt(ceiling).toFixed(1)} {weightUnit}
                      </Text>
                    </View>
                    <View style={styles.muscleBar}>
                      <View style={[styles.muscleBarFill, { width: `${pct}%`, backgroundColor: cfg.color }]} />
                    </View>
                    <Text style={[styles.musclePct, { color: cfg.color }]}>{pct.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ── FREQUENCY TAB ─────────────────────────────────────── */}
      {tab === 'frequency' && (
        <>
          <Text style={styles.heading}>Weekly Muscle Frequency</Text>
          <Text style={styles.sub}>
            Sets per muscle group in the last 7 days. Research supports 10–20 sets/week per group for hypertrophy.
          </Text>
          {weekSessions.length === 0 ? (
            <Text style={styles.empty}>No workouts logged in the last 7 days.</Text>
          ) : (
            Object.entries(MUSCLE_CONFIG).map(([key, cfg]) => {
              const sets = weeklyFrequency[key] ?? 0;
              const pct = Math.min((sets / cfg.targetSetsPerWeek) * 100, 100);
              const overTarget = sets >= cfg.targetSetsPerWeek;
              return (
                <View key={key} style={styles.freqRow}>
                  <View style={styles.freqInfo}>
                    <Text style={styles.freqLabel}>{cfg.label}</Text>
                    <Text style={styles.freqTarget}>target {cfg.targetSetsPerWeek} sets</Text>
                  </View>
                  <View style={styles.freqBarWrap}>
                    <View style={styles.freqBarTrack}>
                      <View
                        style={[
                          styles.freqBarFill,
                          { width: `${pct}%`, backgroundColor: overTarget ? COLORS.success : cfg.color },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={[styles.freqBadge, overTarget && styles.freqBadgeDone]}>
                    <Text style={[styles.freqBadgeText, overTarget && { color: COLORS.success }]}>
                      {sets}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
          <View style={styles.freqLegend}>
            <View style={styles.freqLegendItem}>
              <View style={[styles.freqDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.freqLegendText}>At or above target</Text>
            </View>
            <View style={styles.freqLegendItem}>
              <View style={[styles.freqDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.freqLegendText}>Below target</Text>
            </View>
          </View>
        </>
      )}

      {/* ── VOLUME TAB ────────────────────────────────────────── */}
      {tab === 'volume' && (
        <>
          <Text style={styles.heading}>Volume Trends</Text>
          <Text style={styles.sub}>Weekly sets per major muscle group over the past 8 weeks.</Text>
          {sessions.length === 0 ? (
            <Text style={styles.empty}>No workout data yet.</Text>
          ) : (
            Object.entries(MUSCLE_CONFIG)
              .filter(([key]) => {
                // Only show muscles that have any volume data
                return volumeHistory.some(w => (w.sets[key] ?? 0) > 0);
              })
              .map(([key, cfg]) => {
                const chartData = volumeHistory.map(w => ({
                  x: w.start,
                  y: w.sets[key] ?? 0,
                }));
                return (
                  <View key={key} style={styles.volumeCard}>
                    <LineChart
                      series={[{ label: cfg.label, color: cfg.color, data: chartData, showDots: false }]}
                      height={100}
                      title={`${cfg.label} — sets/week`}
                      xLabelCount={4}
                      yLabelCount={3}
                    />
                    <View style={styles.targetLine}>
                      <Text style={styles.targetLineText}>
                        Target: {cfg.targetSetsPerWeek} sets/week
                      </Text>
                    </View>
                  </View>
                );
              })
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function PotRow({ label, value, highlight, note }: { label: string; value: string; highlight?: boolean; note?: string }) {
  return (
    <View style={styles.potRow}>
      <Text style={styles.potLabel}>
        {label}{note ? <Text style={styles.potNote}> ({note})</Text> : null}
      </Text>
      <Text style={[styles.potValue, highlight && { color: COLORS.secondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 7,
    gap: 5,
  },
  tabActive: { backgroundColor: COLORS.primary + '20' },
  tabText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 40 },
  potCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  potRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  potLabel: { color: COLORS.textMuted, fontSize: 14 },
  potNote: { color: COLORS.textMuted, fontSize: 11 },
  potValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  barTrack: { height: 10, backgroundColor: COLORS.surfaceLight, borderRadius: 5, marginVertical: 6, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: COLORS.secondary, borderRadius: 5 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 14 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  muscleInfo: { width: 106 },
  muscleName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  muscleVals: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  muscleBar: { flex: 1, height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  muscleBarFill: { height: 8, borderRadius: 4 },
  musclePct: { width: 34, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  freqRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  freqInfo: { width: 90 },
  freqLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  freqTarget: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  freqBarWrap: { flex: 1, marginHorizontal: 10 },
  freqBarTrack: { height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  freqBarFill: { height: 8, borderRadius: 4 },
  freqBadge: {
    width: 30,
    height: 24,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqBadgeDone: { backgroundColor: COLORS.success + '20' },
  freqBadgeText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  freqLegend: { flexDirection: 'row', gap: 20, marginTop: 16, marginBottom: 8 },
  freqLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  freqDot: { width: 8, height: 8, borderRadius: 4 },
  freqLegendText: { color: COLORS.textMuted, fontSize: 12 },
  volumeCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 10 },
  targetLine: { marginTop: 4 },
  targetLineText: { color: COLORS.textMuted, fontSize: 11 },
});
