import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import {
  calculateLBM,
  katchMcArdleBMR,
  proteinTargetG,
} from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';
import { getNutritionAnalysis } from '../../services/aiService';
import { NutritionAnalysisOutput } from '../../types';

const GOAL_OPTIONS = ['fat_loss', 'maintenance', 'muscle_gain', 'performance'];
const GOAL_LABELS: Record<string, string> = {
  fat_loss: 'Fat Loss',
  maintenance: 'Maintenance',
  muscle_gain: 'Muscle Gain',
  performance: 'Performance',
};

const BALANCE_COLORS: Record<string, string> = {
  surplus: COLORS.accent,
  maintenance: COLORS.secondary,
  deficit: COLORS.primary,
};

const PROTEIN_COLORS: Record<string, string> = {
  adequate: COLORS.success,
  low: COLORS.danger,
  high: COLORS.warning,
};

export default function NutritionAnalysisScreen() {
  const userProfile = useAppSelector(s => s.user.profile);
  const logs = useAppSelector(s => s.nutrition.logs);
  const sessions = useAppSelector(s => s.workout.sessions);
  const latest = useAppSelector(s => s.body.latestMeasurement);

  const [goal, setGoal] = useState('maintenance');
  const [result, setResult] = useState<NutritionAnalysisOutput | null>(null);
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
  const todayKcal = sessions
    .filter(s => new Date(s.date).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  const tdeeBreakdown = bmr ? calculateFullTDEE(bmr, activityLevel, todayKcal) : null;

  // Last 30 days averages
  const stats = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    const recent = logs.filter(l => new Date(l.date).getTime() > cutoff);
    if (recent.length === 0) return null;
    const n = recent.length;
    return {
      daysLogged: n,
      avgCalories: Math.round(recent.reduce((s, l) => s + l.totalCalories, 0) / n),
      avgProtein: Math.round(recent.reduce((s, l) => s + l.totalProteinG, 0) / n),
      avgCarbs: Math.round(recent.reduce((s, l) => s + l.totalCarbsG, 0) / n),
      avgFat: Math.round(recent.reduce((s, l) => s + l.totalFatG, 0) / n),
    };
  }, [logs]);

  if (logs.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="nutrition-outline"
          title="No nutrition logs"
          subtitle="Log your meals in the Food Log section to get AI nutrition analysis."
        />
      </ScreenContainer>
    );
  }

  async function fetchAnalysis() {
    if (!hasAI || !stats) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNutritionAnalysis(
        { provider: aiProvider, apiKey },
        {
          avgDailyCalories: stats.avgCalories,
          avgProteinG: stats.avgProtein,
          avgCarbsG: stats.avgCarbs,
          avgFatG: stats.avgFat,
          tdee: tdeeBreakdown?.tdee ?? stats.avgCalories,
          goal: GOAL_LABELS[goal],
          daysLogged: stats.daysLogged,
          lbmKg: lbm ?? undefined,
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
      {/* Stats summary */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Last 30 Days Average ({stats.daysLogged} days logged)</Text>
          <View style={styles.statsRow}>
            <StatChip label="Calories" value={`${stats.avgCalories}`} unit="kcal" color={COLORS.warning} />
            <StatChip label="Protein" value={`${stats.avgProtein}`} unit="g" color={COLORS.primary} />
            <StatChip label="Carbs" value={`${stats.avgCarbs}`} unit="g" color={COLORS.secondary} />
            <StatChip label="Fat" value={`${stats.avgFat}`} unit="g" color={COLORS.accent} />
          </View>
          {tdeeBreakdown && (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>vs TDEE ({tdeeBreakdown.tdee} kcal): </Text>
              <Text style={[
                styles.balanceValue,
                { color: stats.avgCalories > tdeeBreakdown.tdee ? COLORS.accent : stats.avgCalories < tdeeBreakdown.tdee - 50 ? COLORS.primary : COLORS.secondary },
              ]}>
                {stats.avgCalories - tdeeBreakdown.tdee > 0 ? '+' : ''}{stats.avgCalories - tdeeBreakdown.tdee} kcal/day
              </Text>
            </View>
          )}
          {lbm && (
            <Text style={styles.proteinTarget}>
              Protein target: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{proteinTargetG(lbm)}g</Text>
              {' '}(2.2g × {lbm.toFixed(1)}kg LBM) · current avg: {' '}
              <Text style={{ color: stats.avgProtein >= proteinTargetG(lbm) ? COLORS.success : COLORS.danger, fontWeight: '700' }}>
                {stats.avgProtein}g
              </Text>
            </Text>
          )}
        </View>
      )}

      {/* Goal selector */}
      <Text style={styles.sectionLabel}>Your Goal</Text>
      <View style={styles.goalRow}>
        {GOAL_OPTIONS.map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.goalChip, goal === g && styles.goalChipActive]}
            onPress={() => setGoal(g)}
          >
            <Text style={[styles.goalChipText, goal === g && styles.goalChipTextActive]}>
              {GOAL_LABELS[g]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI button */}
      {!hasAI ? (
        <View style={styles.noAICard}>
          <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.noAIText}>Configure an AI provider in Settings for personalised nutrition analysis.</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.fetchBtn, (loading || !stats) && { opacity: 0.5 }]}
          onPress={fetchAnalysis}
          disabled={loading || !stats}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.fetchBtnText}>{result ? 'Refresh Analysis' : 'Analyse My Nutrition'}</Text>
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
          {/* Assessment */}
          <View style={styles.assessmentCard}>
            <Text style={styles.assessmentText}>{result.assessment}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge
                label="Calorie Balance"
                value={result.calorieBalance}
                color={BALANCE_COLORS[result.calorieBalance]}
              />
              <StatusBadge
                label="Protein"
                value={result.proteinAdequacy}
                color={PROTEIN_COLORS[result.proteinAdequacy]}
              />
            </View>
          </View>

          {result.micronutrientFlags.length > 0 && (
            <BulletCard
              title="Micronutrient Flags"
              items={result.micronutrientFlags}
              icon="warning-outline"
              color={COLORS.warning}
            />
          )}

          {result.suggestions.length > 0 && (
            <BulletCard
              title="Dietary Improvements"
              items={result.suggestions}
              icon="checkmark-circle-outline"
              color={COLORS.secondary}
            />
          )}

          {result.mealTimingTips.length > 0 && (
            <BulletCard
              title="Meal Timing Tips"
              items={result.mealTimingTips}
              icon="time-outline"
              color={COLORS.primary}
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function StatChip({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: color + '18' }]}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
      <Text style={styles.statusBadgeLabel}>{label}</Text>
      <Text style={[styles.statusBadgeVal, { color }]}>{value}</Text>
    </View>
  );
}

function BulletCard({ title, items, icon, color }: { title: string; items: string[]; icon: string; color: string }) {
  return (
    <View style={styles.bulletCard}>
      <Text style={[styles.bulletTitle, { color }]}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Ionicons name={icon as any} size={14} color={color} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 14 },
  statsTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statChip: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800' },
  statUnit: { color: COLORS.textMuted, fontSize: 9 },
  statLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  balanceLabel: { color: COLORS.textMuted, fontSize: 12 },
  balanceValue: { fontSize: 12, fontWeight: '700' },
  proteinTarget: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  goalRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  goalChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  goalChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  goalChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  goalChipTextActive: { color: '#fff' },
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
  assessmentCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  assessmentText: { color: COLORS.text, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 10 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  statusBadgeLabel: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  statusBadgeVal: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize', marginTop: 2 },
  bulletCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  bulletTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bulletText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
});
