import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import {
  calculateFFMI,
  calculateFMI,
  calculateLBM,
  calculateFatMass,
  katchMcArdleBMR,
} from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';
import { getQoLRecommendations } from '../../services/aiService';
import { QoLRecommendationsOutput } from '../../types';

type Category = 'all' | 'training' | 'nutrition' | 'recovery' | 'medical' | 'lifestyle';

const CATEGORY_ICONS: Record<string, string> = {
  training: 'barbell-outline',
  nutrition: 'nutrition-outline',
  recovery: 'bed-outline',
  medical: 'medkit-outline',
  lifestyle: 'leaf-outline',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: COLORS.danger,
  medium: COLORS.warning,
  low: COLORS.success,
};

export default function QoLRecommendationsScreen() {
  const userProfile = useAppSelector(s => s.user.profile);
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);
  const injuries = useAppSelector(s => s.medical.injuries.filter(i => i.isActive));

  const [result, setResult] = useState<QoLRecommendationsOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category>('all');

  const aiProvider = userProfile?.aiProvider ?? 'none';
  const apiKey = userProfile?.aiApiKeys?.[aiProvider] ?? '';
  const hasAI = aiProvider !== 'none' && !!apiKey;

  const lbm = latest && latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : latest?.leanBodyMassKg ?? null;
  const fm = latest && latest.bodyFatPercent ? calculateFatMass(latest.weightKg, latest.bodyFatPercent) : latest?.fatMassKg ?? null;
  const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
  const fmi = latest && fm ? calculateFMI(fm, latest.heightCm) : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;
  const todayKcal = sessions
    .filter(s => new Date(s.date).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  const tdeeBreakdown = bmr ? calculateFullTDEE(bmr, userProfile?.activityLevel ?? 'moderately_active', todayKcal) : null;

  const weekSessions = sessions.filter(s => Date.now() - new Date(s.date).getTime() < 7 * 86400000);

  const dob = userProfile?.dateOfBirth;
  const ageYears = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
    : undefined;

  async function fetchRecommendations() {
    if (!hasAI) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getQoLRecommendations(
        { provider: aiProvider, apiKey },
        {
          ffmi: ffmi ?? undefined,
          fmi: fmi ?? undefined,
          tdee: tdeeBreakdown?.tdee,
          workoutFrequency: weekSessions.length,
          conditions: injuries.map(i => `${i.bodyPart} (${i.severity})`),
          ageYears,
          sex: userProfile?.sex,
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

  const filtered = result?.recommendations.filter(
    r => filter === 'all' || r.category === filter,
  ) ?? [];

  const scoreColor =
    (result?.longevityScore ?? 0) >= 75
      ? COLORS.success
      : (result?.longevityScore ?? 0) >= 50
      ? COLORS.warning
      : COLORS.danger;

  return (
    <ScreenContainer>
      {/* Context summary */}
      <View style={styles.contextCard}>
        <Text style={styles.contextTitle}>Your Health Context</Text>
        <View style={styles.contextRow}>
          {ffmi != null && <ContextChip label="FFMI" value={ffmi.toFixed(1)} color={COLORS.primary} />}
          {fmi != null && <ContextChip label="FMI" value={fmi.toFixed(1)} color={COLORS.accent} />}
          {tdeeBreakdown && <ContextChip label="TDEE" value={`${tdeeBreakdown.tdee}`} color={COLORS.warning} />}
          <ContextChip label="Sessions/wk" value={`${weekSessions.length}`} color={COLORS.secondary} />
        </View>
      </View>

      {/* Action button */}
      {!hasAI ? (
        <View style={styles.noAICard}>
          <Ionicons name="cloud-offline-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.noAIText}>Configure an AI provider in Settings to get personalised recommendations.</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.fetchBtn, loading && { opacity: 0.6 }]}
          onPress={fetchRecommendations}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.fetchBtnText}>{result ? 'Refresh Recommendations' : 'Get AI Recommendations'}</Text>
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
          {/* Longevity score */}
          {result.longevityScore != null && (
            <View style={styles.scoreCard}>
              <View style={styles.scoreCircle}>
                <Text style={[styles.scoreNum, { color: scoreColor }]}>{result.longevityScore}</Text>
                <Text style={styles.scoreLabel}>/100</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreTitle}>Longevity Score</Text>
                <Text style={styles.scoreSub}>Based on your current metrics and training habits</Text>
              </View>
            </View>
          )}

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {(['all', 'training', 'nutrition', 'recovery', 'medical', 'lifestyle'] as Category[]).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filter === cat && styles.filterChipActive]}
                onPress={() => setFilter(cat)}
              >
                <Text style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Recommendation cards */}
          {filtered.length === 0 ? (
            <Text style={styles.empty}>No recommendations in this category.</Text>
          ) : (
            filtered.map((rec, i) => (
              <View key={i} style={[styles.recCard, { borderLeftColor: PRIORITY_COLORS[rec.priority] }]}>
                <View style={styles.recHeader}>
                  <Ionicons
                    name={CATEGORY_ICONS[rec.category] as any ?? 'information-circle-outline'}
                    size={18}
                    color={PRIORITY_COLORS[rec.priority]}
                  />
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[rec.priority] + '25' }]}>
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[rec.priority] }]}>
                      {rec.priority}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recDetail}>{rec.detail}</Text>
                <Text style={styles.recCategory}>{rec.category}</Text>
              </View>
            ))
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function ContextChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.contextChip, { backgroundColor: color + '20' }]}>
      <Text style={[styles.contextChipVal, { color }]}>{value}</Text>
      <Text style={styles.contextChipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contextCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 14 },
  contextTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  contextRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  contextChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 64 },
  contextChipVal: { fontSize: 16, fontWeight: '800' },
  contextChipLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  noAICard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, alignItems: 'center', gap: 12, marginBottom: 16 },
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
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  scoreCircle: { alignItems: 'center', minWidth: 64 },
  scoreNum: { fontSize: 36, fontWeight: '800' },
  scoreLabel: { color: COLORS.textMuted, fontSize: 12 },
  scoreTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  scoreSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 },
  filterScroll: { marginBottom: 12 },
  filterContent: { gap: 8, paddingRight: 4 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  recCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  recDetail: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  recCategory: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
});
