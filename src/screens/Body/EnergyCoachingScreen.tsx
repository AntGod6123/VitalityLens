import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS, ACTIVITY_LEVELS } from '../../constants';
import {
  calculateLBM,
  katchMcArdleBMR,
} from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';
import { getEnergyCoaching } from '../../services/aiService';
import { EnergyCoachingOutput } from '../../types';

const GOALS = [
  { value: 'fat_loss', label: 'Fat Loss', icon: 'trending-down-outline' },
  { value: 'maintenance', label: 'Maintenance', icon: 'remove-outline' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: 'trending-up-outline' },
  { value: 'performance', label: 'Performance', icon: 'flash-outline' },
];

export default function EnergyCoachingScreen() {
  const userProfile = useAppSelector(s => s.user.profile);
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);

  const [goal, setGoal] = useState('maintenance');
  const [result, setResult] = useState<EnergyCoachingOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiProvider = userProfile?.aiProvider ?? 'none';
  const apiKey = userProfile?.aiApiKeys?.[aiProvider] ?? '';
  const hasAI = aiProvider !== 'none' && !!apiKey;

  const lbm = latest && latest.bodyFatPercent
    ? calculateLBM(latest.weightKg, latest.bodyFatPercent)
    : latest?.leanBodyMassKg ?? null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;
  const activityLevel = userProfile?.activityLevel ?? 'moderately_active';
  const activityLabel = ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label ?? activityLevel;

  const today = new Date().toDateString();
  const todayKcal = sessions
    .filter(s => new Date(s.date).toDateString() === today)
    .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  const tdeeBreakdown = bmr ? calculateFullTDEE(bmr, activityLevel, todayKcal) : null;

  // Last 7 days workout kcal
  const recentWorkoutKcals = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    return sessions
      .filter(s => new Date(s.date).toDateString() === ds)
      .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  }).reverse();

  async function fetchCoaching() {
    if (!hasAI || !bmr || !tdeeBreakdown) return;
    setLoading(true);
    setError(null);
    try {
      const selectedGoalLabel = GOALS.find(g => g.value === goal)?.label ?? goal;
      const res = await getEnergyCoaching(
        { provider: aiProvider, apiKey },
        {
          bmr: Math.round(bmr),
          activityKcal: Math.round(tdeeBreakdown.activityKcal),
          workoutKcal: todayKcal,
          tdee: tdeeBreakdown.tdee,
          goal: selectedGoalLabel,
          recentWorkoutKcals,
        },
      );
      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error ?? 'Unknown error');
      }
    } catch (e: any) {
      setError(e.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      {/* TDEE summary */}
      {tdeeBreakdown ? (
        <View style={styles.tdeeCard}>
          <Text style={styles.tdeeTitle}>Today's Energy</Text>
          <View style={styles.tdeeRow}>
            <TdeeItem label="BMR" value={Math.round(bmr!)} color={COLORS.primary} />
            <Text style={styles.plus}>+</Text>
            <TdeeItem label={activityLabel.split(' ')[0]} value={Math.round(tdeeBreakdown.activityKcal)} color={COLORS.secondary} />
            <Text style={styles.plus}>+</Text>
            <TdeeItem label="Workout" value={todayKcal} color={COLORS.accent} />
            <Text style={styles.equals}>=</Text>
            <TdeeItem label="TDEE" value={tdeeBreakdown.tdee} color={COLORS.warning} big />
          </View>
        </View>
      ) : (
        <View style={styles.noDataCard}>
          <Text style={styles.noDataText}>Add a body measurement with body fat % to unlock energy coaching.</Text>
        </View>
      )}

      {/* Goal selector */}
      <Text style={styles.sectionLabel}>Your Goal</Text>
      <View style={styles.goalRow}>
        {GOALS.map(g => (
          <TouchableOpacity
            key={g.value}
            style={[styles.goalBtn, goal === g.value && styles.goalBtnActive]}
            onPress={() => setGoal(g.value)}
          >
            <Ionicons name={g.icon as any} size={18} color={goal === g.value ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.goalText, goal === g.value && styles.goalTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI button */}
      {!hasAI ? (
        <View style={styles.noAICard}>
          <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.noAIText}>Configure an AI provider in Settings for personalised coaching.</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.fetchBtn, (loading || !tdeeBreakdown) && { opacity: 0.5 }]}
          onPress={fetchCoaching}
          disabled={loading || !tdeeBreakdown}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.fetchBtnText}>{result ? 'Refresh Coaching' : 'Get AI Coaching'}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {result && (
        <>
          <CoachCard
            icon="analytics-outline"
            title="TDEE Assessment"
            text={result.tdeeAssessment}
            color={COLORS.primary}
          />
          <CoachCard
            icon="restaurant-outline"
            title="Calorie Guidance"
            text={result.calorieGuidance}
            color={COLORS.warning}
          />
          <CoachCard
            icon="flash-outline"
            title="Workout Intensity"
            text={result.workoutIntensityFeedback}
            color={COLORS.accent}
          />
          {result.suggestions.length > 0 && (
            <View style={styles.suggestionsCard}>
              <Text style={styles.suggestionsTitle}>Action Items</Text>
              {result.suggestions.map((s, i) => (
                <View key={i} style={styles.suggestionRow}>
                  <View style={styles.suggestionDot} />
                  <Text style={styles.suggestionText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function TdeeItem({ label, value, color, big }: { label: string; value: number; color: string; big?: boolean }) {
  return (
    <View style={styles.tdeeItem}>
      <Text style={[styles.tdeeVal, { color }, big && styles.tdeeBigVal]}>{value.toLocaleString()}</Text>
      <Text style={styles.tdeeItemLabel}>{label}</Text>
    </View>
  );
}

function CoachCard({ icon, title, text, color }: { icon: string; title: string; text: string; color: string }) {
  return (
    <View style={[styles.coachCard, { borderLeftColor: color }]}>
      <View style={styles.coachHeader}>
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={styles.coachTitle}>{title}</Text>
      </View>
      <Text style={styles.coachText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tdeeCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  tdeeTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  tdeeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap' },
  tdeeItem: { alignItems: 'center', minWidth: 48 },
  tdeeVal: { fontSize: 18, fontWeight: '800' },
  tdeeBigVal: { fontSize: 22 },
  tdeeItemLabel: { color: COLORS.textMuted, fontSize: 9, marginTop: 2, textAlign: 'center' },
  plus: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700', paddingBottom: 12 },
  equals: { color: COLORS.textMuted, fontSize: 18, fontWeight: '700', paddingBottom: 12 },
  noDataCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, marginBottom: 16 },
  noDataText: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  goalRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  goalBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  goalText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  goalTextActive: { color: '#fff' },
  noAICard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, alignItems: 'center', gap: 10, marginBottom: 16 },
  noAIText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fetchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  fetchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorBox: {
    backgroundColor: COLORS.danger + '20',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  coachCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  coachTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  coachText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
  suggestionsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  suggestionsTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  suggestionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary, marginTop: 6 },
  suggestionText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
});
