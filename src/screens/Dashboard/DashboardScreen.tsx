import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  calculateFatMass,
} from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';
import { computeOverloadTargets } from '../../utils/progressiveOverload';
import { useUnits } from '../../hooks/useUnits';
import {
  computeLongevityScore,
  BIOMARKER_META,
  RATING_COLORS,
  estimateBiologicalAge,
  MarkerSummary,
} from '../../utils/longevityScore';
import { getLongevityAnalysis } from '../../services/aiService';
import { BiomarkerType, LongevityAnalysisOutput } from '../../types';

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

  const logs = useAppSelector(s => s.biomarker.logs);
  const aiProvider = userProfile?.aiProvider ?? 'none';
  const { formatWeight } = useUnits();

  // Longevity state
  const [longevityAiResult, setLongevityAiResult] = useState<LongevityAnalysisOutput | null>(null);
  const [longevityAiLoading, setLongevityAiLoading] = useState(false);
  const [longevityAiError, setLongevityAiError] = useState<string | null>(null);

  const lbm = latest && latest.bodyFatPercent
    ? calculateLBM(latest.weightKg, latest.bodyFatPercent)
    : latest?.leanBodyMassKg ?? null;
  const fm = latest && latest.bodyFatPercent
    ? calculateFatMass(latest.weightKg, latest.bodyFatPercent)
    : latest?.fatMassKg ?? null;
  const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
  const fmi = latest && fm ? calculateFMI(fm, latest.heightCm) : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;

  // Longevity computed values
  const sex = userProfile?.sex ?? 'male';
  const dob = userProfile?.dateOfBirth;
  const chronoAge = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
    : undefined;
  const ALL_LONGEVITY_TYPES: BiomarkerType[] = [
    'vo2max', 'resting_hr', 'hrv', 'grip_strength',
    'sleep_hours', 'sleep_quality', 'systolic_bp', 'diastolic_bp', 'steps',
  ];
  const scoreResult = useMemo(() => computeLongevityScore(logs, sex), [logs, sex]);
  const bioAge = chronoAge && scoreResult.trackedCount >= 3
    ? estimateBiologicalAge(chronoAge, scoreResult.composite)
    : null;
  const trackedTypes = new Set(scoreResult.markers.map(m => m.type));
  const untrackedTypes = ALL_LONGEVITY_TYPES.filter(t => !trackedTypes.has(t));
  const apiKey = userProfile?.aiApiKeys?.[aiProvider] ?? '';
  const hasAI = aiProvider !== 'none' && !!apiKey;
  const scoreColor =
    scoreResult.composite >= 80 ? COLORS.success
    : scoreResult.composite >= 60 ? COLORS.primary
    : scoreResult.composite >= 40 ? COLORS.warning
    : COLORS.danger;

  async function fetchLongevityAI() {
    if (!hasAI || scoreResult.trackedCount === 0) return;
    setLongevityAiLoading(true);
    setLongevityAiError(null);
    try {
      const res = await getLongevityAnalysis(
        { provider: aiProvider, apiKey },
        {
          chronologicalAge: chronoAge,
          sex,
          ffmi: ffmi ?? undefined,
          fmi: fmi ?? undefined,
          markers: scoreResult.markers.map(m => ({
            label: BIOMARKER_META[m.type].label,
            value: m.latestValue,
            unit: BIOMARKER_META[m.type].unit,
            rating: m.rating,
          })),
          compositeScore: scoreResult.composite,
        },
      );
      if (res.success) setLongevityAiResult(res.data);
      else setLongevityAiError(res.error ?? 'Unknown error');
    } catch (e: any) {
      setLongevityAiError(e.message ?? 'Request failed');
    } finally {
      setLongevityAiLoading(false);
    }
  }

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
      {/* ── Longevity ─────────────────────────────────────────── */}
      <SectionHeader
        title="Longevity"
        action={{ label: 'Details →', onPress: () => navigation.navigate('Longevity', { screen: 'LongevityHome' }) }}
      />

      {/* Score hero */}
      <View style={styles.longevityHero}>
        <View style={styles.scoreRingOuter}>
          <View style={[styles.scoreRingInner, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>
              {scoreResult.trackedCount > 0 ? scoreResult.composite : '—'}
            </Text>
            <Text style={styles.scoreSubLabel}>/100</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.longevityTitle}>Longevity Score</Text>
          {scoreResult.trackedCount > 0 ? (
            <>
              <View style={[styles.ratingBadge, { backgroundColor: scoreColor + '22' }]}>
                <Text style={[styles.ratingBadgeText, { color: scoreColor }]}>
                  {scoreResult.rating.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.longevitySub}>{scoreResult.trackedCount} of {ALL_LONGEVITY_TYPES.length} markers tracked</Text>
              {bioAge !== null && chronoAge !== undefined && (
                <Text style={styles.longevitySub}>
                  Bio age: <Text style={{ color: bioAge < chronoAge ? COLORS.success : COLORS.danger, fontWeight: '800' }}>{bioAge}</Text>
                  {' '}(chrono: {chronoAge})
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.longevitySub}>
              Log a biomarker in the Longevity tab to see your score.
            </Text>
          )}
        </View>
      </View>

      {/* Tracked markers */}
      {scoreResult.markers.length > 0 && (
        <>
          <Text style={styles.longevitySectionLabel}>Tracked Markers</Text>
          {scoreResult.markers.map(m => (
            <DashMarkerCard
              key={m.type}
              marker={m}
              onPress={() => navigation.navigate('Longevity', { screen: 'BiomarkerDetail', params: { type: m.type } })}
            />
          ))}
        </>
      )}

      {/* Untracked markers */}
      {untrackedTypes.length > 0 && (
        <>
          <Text style={styles.longevitySectionLabel}>Not Yet Tracked</Text>
          <View style={styles.untrackedGrid}>
            {untrackedTypes.map(t => (
              <TouchableOpacity
                key={t}
                style={styles.untrackedChip}
                onPress={() => navigation.navigate('Longevity', { screen: 'LogBiomarker', params: { type: t } })}
              >
                <Ionicons name={BIOMARKER_META[t].icon as any} size={16} color={COLORS.textMuted} />
                <Text style={styles.untrackedText}>{BIOMARKER_META[t].label}</Text>
                <Ionicons name="add" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* AI analysis */}
      {scoreResult.trackedCount >= 2 && (
        <>
          <Text style={styles.longevitySectionLabel}>AI Longevity Analysis</Text>
          {!hasAI ? (
            <View style={styles.noAICard}>
              <Ionicons name="cloud-offline-outline" size={24} color={COLORS.textMuted} />
              <Text style={styles.noAIText}>Configure an AI provider in Settings for personalised longevity coaching.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.longevityAiBtn, longevityAiLoading && { opacity: 0.6 }]}
              onPress={fetchLongevityAI}
              disabled={longevityAiLoading}
            >
              {longevityAiLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.longevityAiBtnText}>{longevityAiResult ? 'Refresh Analysis' : 'Get AI Analysis'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {longevityAiError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{longevityAiError}</Text>
            </View>
          )}
          {longevityAiResult && <DashAIResultCard result={longevityAiResult} />}
        </>
      )}
    </ScrollView>
  );
}

function DashMarkerCard({ marker, onPress }: { marker: MarkerSummary; onPress: () => void }) {
  const meta = BIOMARKER_META[marker.type];
  const ratingColor = RATING_COLORS[marker.rating];
  const trendIcon = marker.trend === 'up' ? 'trending-up' : marker.trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = meta.higherIsBetter
    ? (marker.trend === 'up' ? COLORS.success : marker.trend === 'down' ? COLORS.danger : COLORS.textMuted)
    : (marker.trend === 'down' ? COLORS.success : marker.trend === 'up' ? COLORS.danger : COLORS.textMuted);

  return (
    <TouchableOpacity style={[styles.markerCard, { borderLeftColor: ratingColor }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.markerLeft}>
        <View style={[styles.markerIcon, { backgroundColor: ratingColor + '20' }]}>
          <Ionicons name={meta.icon as any} size={18} color={ratingColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.markerName}>{meta.label}</Text>
          <Text style={styles.markerDate}>{new Date(marker.latestDate).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.markerRight}>
        {marker.history.length > 1 && (
          <View style={styles.sparkRow}>
            {marker.history.map((h, i) => {
              const h2 = Math.max(4, Math.round((h.score / 100) * 24));
              const c = h.score >= 75 ? COLORS.success : h.score >= 55 ? COLORS.primary : h.score >= 35 ? COLORS.warning : COLORS.danger;
              return (
                <View key={i} style={styles.sparkBarWrap}>
                  <View style={[styles.sparkBar, { height: h2, backgroundColor: c }]} />
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.markerValueRow}>
          <Text style={[styles.markerValue, { color: ratingColor }]}>
            {marker.latestValue}{meta.unit === 'steps' ? '' : ` ${meta.unit}`}
          </Text>
          <Ionicons name={trendIcon as any} size={14} color={trendColor} />
        </View>
        <View style={[styles.ratingPill, { backgroundColor: ratingColor + '20' }]}>
          <Text style={[styles.ratingPillText, { color: ratingColor }]}>{marker.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DashAIResultCard({ result }: { result: LongevityAnalysisOutput }) {
  return (
    <View style={styles.aiResultCard}>
      <Text style={styles.aiAssessment}>{result.overallAssessment}</Text>
      {result.biologicalAgeEstimate !== undefined && (
        <View style={styles.bioAgeAI}>
          <Text style={styles.bioAgeAILabel}>AI Biological Age Estimate</Text>
          <Text style={[styles.bioAgeAIVal, { color: COLORS.secondary }]}>{result.biologicalAgeEstimate}</Text>
        </View>
      )}
      {result.topStrengths.length > 0 && (
        <View style={styles.aiSection}>
          <Text style={[styles.aiSectionTitle, { color: COLORS.success }]}>Strengths</Text>
          {result.topStrengths.map((s, i) => (
            <View key={i} style={styles.aiBullet}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.aiBulletText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
      {result.topRisks.length > 0 && (
        <View style={styles.aiSection}>
          <Text style={[styles.aiSectionTitle, { color: COLORS.danger }]}>Risks</Text>
          {result.topRisks.map((r, i) => (
            <View key={i} style={styles.aiBullet}>
              <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
              <Text style={styles.aiBulletText}>{r}</Text>
            </View>
          ))}
        </View>
      )}
      {result.priorityActions.length > 0 && (
        <View style={styles.aiSection}>
          <Text style={[styles.aiSectionTitle, { color: COLORS.primary }]}>Priority Actions</Text>
          {result.priorityActions.map((a, i) => (
            <View key={i} style={styles.actionRow}>
              <Text style={styles.actionBiomarker}>{a.biomarker}</Text>
              <Text style={styles.actionText}>{a.action}</Text>
              <Text style={styles.actionTimeframe}>{a.timeframe}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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

  // Longevity section
  longevityHero: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreRingOuter: { alignItems: 'center', justifyContent: 'center' },
  scoreRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  scoreSubLabel: { color: COLORS.textMuted, fontSize: 10 },
  longevityTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  ratingBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  ratingBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  longevitySub: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  longevitySectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  markerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  markerIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  markerName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  markerDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  markerRight: { alignItems: 'flex-end', gap: 4 },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 24 },
  sparkBarWrap: { width: 6, alignItems: 'center', justifyContent: 'flex-end', height: 24 },
  sparkBar: { width: 5, borderRadius: 2, minHeight: 4 },
  markerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markerValue: { fontSize: 15, fontWeight: '800' },
  ratingPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  untrackedGrid: { gap: 8, marginBottom: 16 },
  untrackedChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  untrackedText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  noAICard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8, marginBottom: 12 },
  noAIText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  longevityAiBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  longevityAiBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  errorBox: { backgroundColor: COLORS.danger + '20', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  aiResultCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  aiAssessment: { color: COLORS.text, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  bioAgeAI: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: COLORS.secondary + '15', borderRadius: 10, padding: 12 },
  bioAgeAILabel: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  bioAgeAIVal: { fontSize: 26, fontWeight: '900' },
  aiSection: { marginBottom: 12 },
  aiSectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  aiBullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  aiBulletText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  actionRow: { backgroundColor: COLORS.surfaceLight, borderRadius: 8, padding: 10, marginBottom: 6 },
  actionBiomarker: { color: COLORS.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  actionText: { color: COLORS.text, fontSize: 13, lineHeight: 17, marginBottom: 3 },
  actionTimeframe: { color: COLORS.textMuted, fontSize: 11 },
});
