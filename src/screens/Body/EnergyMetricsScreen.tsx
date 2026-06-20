import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import MetricCard from '../../components/common/MetricCard';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS, ACTIVITY_LEVELS } from '../../constants';
import {
  katchMcArdleBMR,
  calculateLBM,
  cuttingCalories,
  bulkingCalories,
  proteinTargetG,
} from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';

export default function EnergyMetricsScreen() {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const userProfile = useAppSelector(s => s.user.profile);
  const sessions = useAppSelector(s => s.workout.sessions);

  const activityLevel = userProfile?.activityLevel ?? 'moderately_active';
  const activityLabel = ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label ?? activityLevel;

  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;

  const bmr = lbm ? katchMcArdleBMR(lbm) : null;

  // Today's workout kcal from the most recent session (if today)
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.date).toDateString() === today);
  const todayWorkoutKcal = todaySessions.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);

  const tdeeBreakdown = bmr ? calculateFullTDEE(bmr, activityLevel, todayWorkoutKcal) : null;

  const cutting = tdeeBreakdown ? cuttingCalories(tdeeBreakdown.tdee) : null;
  const bulking = tdeeBreakdown ? bulkingCalories(tdeeBreakdown.tdee) : null;
  const protein = lbm ? proteinTargetG(lbm) : null;

  // 7-day average workout kcal
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekSessions = sessions.filter(s => new Date(s.date).getTime() > weekAgo);
  const avgWeeklyWorkoutKcal = weekSessions.length
    ? Math.round(weekSessions.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0) / 7)
    : null;

  return (
    <ScreenContainer>
      <Text style={styles.heading}>Energy & Metabolism</Text>
      <Text style={styles.sub}>
        TDEE = BMR (Katch-McArdle) + NEAT activity + today's workout energy (W=Fd).
      </Text>

      {!latest || !lbm ? (
        <Text style={styles.empty}>Add a measurement with body fat % to unlock energy metrics.</Text>
      ) : (
        <>
          {/* TDEE breakdown waterfall */}
          <Text style={styles.sectionTitle}>TDEE Breakdown — Today</Text>
          <View style={styles.waterfallCard}>
            <WaterfallRow
              label="BMR"
              sublabel="Katch-McArdle (resting)"
              value={Math.round(bmr!)}
              color={COLORS.primary}
              isFirst
            />
            <WaterfallRow
              label="NEAT Activity"
              sublabel={activityLabel}
              value={tdeeBreakdown ? Math.round(tdeeBreakdown.activityKcal) : 0}
              color={COLORS.secondary}
            />
            <WaterfallRow
              label="Workout (W=Fd)"
              sublabel={todaySessions.length ? `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} today` : 'No workout logged today'}
              value={todayWorkoutKcal}
              color={COLORS.accent}
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>= Total TDEE</Text>
              <Text style={styles.totalValue}>{tdeeBreakdown ? tdeeBreakdown.tdee.toLocaleString() : '—'} kcal</Text>
            </View>
          </View>

          {/* 7-day context */}
          {avgWeeklyWorkoutKcal !== null && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                7-day average workout: <Text style={{ color: COLORS.accent, fontWeight: '700' }}>{avgWeeklyWorkoutKcal} kcal/day</Text>
              </Text>
            </View>
          )}

          {/* Calorie targets */}
          <Text style={styles.sectionTitle}>Calorie Targets</Text>
          <View style={styles.grid}>
            <MetricCard label="Maintenance" value={tdeeBreakdown?.tdee ?? 0} unit="kcal" subtitle="TDEE" accentColor={COLORS.secondary} style={styles.gridItem} />
            <MetricCard label="BMR" value={Math.round(bmr!)} unit="kcal" subtitle="At rest" accentColor={COLORS.primary} style={styles.gridItem} />
            <MetricCard label="Cut (−20%)" value={Math.round(cutting!)} unit="kcal" subtitle="Fat loss" accentColor={COLORS.warning} style={styles.gridItem} />
            <MetricCard label="Bulk (+10%)" value={Math.round(bulking!)} unit="kcal" subtitle="Muscle gain" accentColor={COLORS.accent} style={styles.gridItem} />
          </View>

          <View style={styles.proteinCard}>
            <Text style={styles.proteinLabel}>Daily Protein Target</Text>
            <Text style={styles.proteinValue}>{protein} g</Text>
            <Text style={styles.proteinNote}>2.2 g × {lbm.toFixed(1)} kg LBM</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Workout energy is calculated from W = F × d, where F is the weight lifted (kg × 9.81 N) and d is the range of motion derived from your limb measurements. Mechanical efficiency of 25% converts joules to kcal. Set your limb lengths in Body → Add Measurement.
            </Text>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function WaterfallRow({
  label,
  sublabel,
  value,
  color,
  isFirst,
}: {
  label: string;
  sublabel: string;
  value: number;
  color: string;
  isFirst?: boolean;
}) {
  return (
    <View style={[styles.waterfallRow, isFirst ? null : styles.waterfallRowBorder]}>
      {!isFirst && <Text style={[styles.waterfallPlus, { color }]}>+</Text>}
      <View style={{ flex: 1 }}>
        <Text style={styles.waterfallLabel}>{label}</Text>
        <Text style={styles.waterfallSublabel}>{sublabel}</Text>
      </View>
      <Text style={[styles.waterfallValue, { color }]}>{value.toLocaleString()} kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  sub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  empty: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginTop: 60 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  waterfallCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  waterfallRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  waterfallRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  waterfallPlus: { fontSize: 18, fontWeight: '700', marginRight: 10, width: 16 },
  waterfallLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  waterfallSublabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  waterfallValue: { fontSize: 16, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    paddingTop: 12,
    marginTop: 6,
  },
  totalLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridItem: { width: '48%' },
  proteinCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  proteinLabel: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  proteinValue: { color: COLORS.secondary, fontSize: 36, fontWeight: '800', marginVertical: 4 },
  proteinNote: { color: COLORS.textMuted, fontSize: 12 },
  infoBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 16, marginBottom: 12 },
  infoTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
});
