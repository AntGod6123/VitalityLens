import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LineChart from '../../components/charts/LineChart';
import SectionHeader from '../../components/common/SectionHeader';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import {
  katchMcArdleBMR,
  calculateFFMI,
  calculateFMI,
  calculateLBM,
} from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';
import { computeOverloadTargets } from '../../utils/progressiveOverload';

const GOAL_TYPE_COLORS: Record<string, string> = {
  muscle_gain: COLORS.primary,
  strength: COLORS.secondary,
  endurance: COLORS.accent,
  body_fat: COLORS.danger,
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();

  const latest = useAppSelector(s => s.body.latestMeasurement);
  const measurements = useAppSelector(s => s.body.measurements);
  const sessions = useAppSelector(s => s.workout.sessions);
  const goals = useAppSelector(s => s.goal.goals);
  const plans = useAppSelector(s => s.plan.plans);
  const userProfile = useAppSelector(s => s.user.profile);

  const aiProvider = userProfile?.aiProvider ?? 'none';

  const lbm = latest && latest.bodyFatPercent
    ? calculateLBM(latest.weightKg, latest.bodyFatPercent)
    : latest?.leanBodyMassKg ?? null;
  const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
  const fmi = latest && latest.fatMassKg ? calculateFMI(latest.fatMassKg, latest.heightCm) : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;

  const today = new Date().toDateString();
  const todayWorkoutKcal = sessions
    .filter(s => new Date(s.date).toDateString() === today)
    .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  const tdeeBreakdown = bmr
    ? calculateFullTDEE(bmr, userProfile?.activityLevel ?? 'moderately_active', todayWorkoutKcal)
    : null;

  // Active plan logic for "Workout!" button
  const activePlan = useMemo(() => plans.find(p => p.isActive), [plans]);
  const todayPlanDay = useMemo(() => {
    if (!activePlan?.startDate) return null;
    const start = new Date(activePlan.startDate);
    const daysSince = Math.floor((Date.now() - start.getTime()) / 86400000);
    const dayIdx = daysSince % activePlan.days.length;
    return { day: activePlan.days[dayIdx], dayIdx };
  }, [activePlan]);

  const overloadTargets = useMemo(() => computeOverloadTargets(sessions), [sessions]);
  const overloadMap = useMemo(
    () => new Map(overloadTargets.map(t => [t.exerciseId, t])),
    [overloadTargets],
  );

  function handleWorkoutButton() {
    if (activePlan && todayPlanDay && !todayPlanDay.day?.isRest) {
      const day = todayPlanDay.day!;
      const prefillExercises = day.exercises.map(pe => {
        const overload = overloadMap.get(pe.exerciseId);
        const suggestedWeight = overload?.thresholdMet
          ? overload.nextWeightKg
          : overload?.lastWeightKg ?? pe.weightKg ?? 0;
        return {
          exerciseId: pe.exerciseId,
          exerciseName: pe.exerciseName,
          muscleGroups: pe.muscleGroups,
          sets: Array.from({ length: pe.sets }, (_, i) => ({
            setNumber: i + 1,
            warmup: i === 0,
            targetReps: Math.round((pe.repsMin + pe.repsMax) / 2),
            targetWeightKg: suggestedWeight,
          })),
        };
      });
      navigation.navigate('Workout', {
        screen: 'WorkoutLog',
        params: {
          prefillName: `${activePlan.name} — ${day.label}`,
          prefillType: day.type,
          prefillExercises,
        },
      });
    } else {
      navigation.navigate('Workout', { screen: 'WorkoutLog' });
    }
  }

  // Body comp chart data (last 12 measurements)
  const chartMeasurements = useMemo(
    () => [...measurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12),
    [measurements],
  );

  const weightSeries = useMemo(() => ({
    label: 'Weight',
    color: COLORS.secondary,
    unit: 'kg',
    showDots: true,
    data: chartMeasurements.map(m => ({ x: new Date(m.date).getTime(), y: m.weightKg })),
  }), [chartMeasurements]);

  const bfSeries = useMemo(() => ({
    label: 'Body Fat',
    color: COLORS.warning,
    unit: '%',
    showDots: true,
    data: chartMeasurements
      .filter(m => m.bodyFatPercent != null)
      .map(m => ({ x: new Date(m.date).getTime(), y: m.bodyFatPercent! })),
  }), [chartMeasurements]);

  const activeGoals = goals.filter(g => !g.isCompleted);

  const isRestDay = activePlan && todayPlanDay?.day?.isRest;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <View style={styles.bannerRow}>
        <View>
          <Text style={styles.greeting}>
            {userProfile?.name ? `Hey, ${userProfile.name.split(' ')[0]}` : 'Welcome back'}
          </Text>
          <Text style={styles.tagline}>Track. Visualise. Grow.</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AISettings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
          {aiProvider !== 'none' && <View style={styles.aiBadge} />}
        </TouchableOpacity>
      </View>

      {/* Workout CTA */}
      <View style={styles.ctaRow}>
        {isRestDay ? (
          <View style={styles.restDayBtn}>
            <Ionicons name="bed-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.restDayText}>Rest Day — {activePlan!.name}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.workoutBtn} onPress={handleWorkoutButton}>
            <Ionicons name="barbell-outline" size={20} color="#fff" />
            <Text style={styles.workoutBtnText}>
              {activePlan && todayPlanDay
                ? `Workout! — ${todayPlanDay.day?.label ?? 'Today'}`
                : 'Log Workout'}
            </Text>
          </TouchableOpacity>
        )}
        {aiProvider !== 'none' && (
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => navigation.navigate('QoLRecommendations')}
          >
            <Ionicons name="sparkles" size={18} color={COLORS.secondary} />
            <Text style={styles.aiBtnText}>AI</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Key metrics row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricPill}>
          <Text style={styles.metricPillLabel}>FFMI</Text>
          <Text style={styles.metricPillValue}>{ffmi ? ffmi.toFixed(1) : '—'}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricPillLabel}>FMI</Text>
          <Text style={styles.metricPillValue}>{fmi ? fmi.toFixed(1) : '—'}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricPillLabel}>TDEE</Text>
          <Text style={styles.metricPillValue}>{tdeeBreakdown ? tdeeBreakdown.tdee : '—'}</Text>
          <Text style={styles.metricPillUnit}>kcal</Text>
        </View>
        <TouchableOpacity
          style={[styles.metricPill, { borderColor: COLORS.primary + '60' }]}
          onPress={() => navigation.navigate('Body', { screen: 'BodyHome' })}
        >
          <Text style={[styles.metricPillLabel, { color: COLORS.primary }]}>Body →</Text>
        </TouchableOpacity>
      </View>

      {/* Body comp chart */}
      {chartMeasurements.length >= 2 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Body Composition Trend</Text>
          <LineChart
            series={bfSeries.data.length >= 2 ? [weightSeries, bfSeries] : [weightSeries]}
            height={180}
            xLabelCount={Math.min(chartMeasurements.length, 4)}
          />
        </View>
      )}

      {/* Goals */}
      <SectionHeader
        title={`Goals${activeGoals.length > 0 ? ` (${activeGoals.length})` : ''}`}
        action={{ label: 'Manage →', onPress: () => navigation.navigate('Body', { screen: 'GoalTracker' }) }}
      />
      {activeGoals.length === 0 ? (
        <TouchableOpacity
          style={styles.noGoalsCard}
          onPress={() => navigation.navigate('Body', { screen: 'GoalTracker' })}
        >
          <Ionicons name="flag-outline" size={24} color={COLORS.textMuted} />
          <Text style={styles.noGoalsText}>Set your first goal</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.goalsGrid}>
          {activeGoals.map(goal => {
            const pct = goal.targetValue > 0
              ? Math.min(1, Math.max(0, goal.currentValue / goal.targetValue))
              : 0;
            const color = GOAL_TYPE_COLORS[goal.type] ?? COLORS.primary;
            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                onPress={() => navigation.navigate('Body', { screen: 'GoalTracker' })}
              >
                <View style={[styles.goalColorBar, { backgroundColor: color }]} />
                <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
                <View style={styles.goalProgress}>
                  <View style={[styles.goalProgressFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
                </View>
                <Text style={styles.goalValues}>
                  {goal.currentValue} / {goal.targetValue} {goal.unit}
                </Text>
                <Text style={styles.goalPct}>{Math.round(pct * 100)}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },

  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  tagline: { color: COLORS.textMuted, fontSize: 14, marginTop: 2 },
  settingsBtn: { padding: 6, position: 'relative' },
  aiBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },

  ctaRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 12 },
  workoutBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  workoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  restDayBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  restDayText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  aiBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary + '60',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  aiBtnText: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },

  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metricPill: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricPillLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  metricPillValue: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  metricPillUnit: { color: COLORS.textMuted, fontSize: 9, marginTop: 1 },

  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  chartTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },

  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 110,
  },
  goalColorBar: { height: 3, borderRadius: 2, marginBottom: 8 },
  goalTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 10, flex: 1 },
  goalProgress: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalProgressFill: { height: '100%', borderRadius: 3 },
  goalValues: { color: COLORS.textMuted, fontSize: 11 },
  goalPct: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 4 },

  noGoalsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  noGoalsText: { color: COLORS.textMuted, fontSize: 14 },
});
