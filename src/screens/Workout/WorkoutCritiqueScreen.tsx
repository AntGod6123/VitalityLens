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
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import { exerciseCompletionRate } from '../../utils/progressiveOverload';
import { getWorkoutCritique } from '../../services/aiService';
import { WorkoutCritiqueOutput, WorkoutSession } from '../../types';

const RECOVERY_COLORS: Record<string, string> = {
  low: COLORS.success,
  moderate: COLORS.warning,
  high: COLORS.danger,
};

export default function WorkoutCritiqueScreen() {
  const userProfile = useAppSelector(s => s.user.profile);
  const sessions = useAppSelector(s => s.workout.sessions);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<WorkoutCritiqueOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiProvider = userProfile?.aiProvider ?? 'none';
  const apiKey = userProfile?.aiApiKeys?.[aiProvider] ?? '';
  const hasAI = aiProvider !== 'none' && !!apiKey;

  const recent = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const selectedSession = recent.find(s => s.id === selectedId) ?? recent[0] ?? null;

  if (sessions.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="barbell-outline"
          title="No sessions yet"
          subtitle="Log a workout first to get an AI critique."
        />
      </ScreenContainer>
    );
  }

  async function fetchCritique() {
    if (!hasAI || !selectedSession) return;
    setLoading(true);
    setError(null);
    try {
      const exerciseSummaries = selectedSession.exercises.map(ex => {
        const { rate, totalActual } = exerciseCompletionRate(ex);
        const maxWeight = Math.max(...ex.sets.map(s => s.weightKg ?? 0), 0);
        const rpeValues = ex.sets.map(s => s.rpe).filter((r): r is number => r !== undefined);
        const avgRpe = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : undefined;
        return {
          name: ex.exerciseName,
          sets: ex.sets.length,
          totalReps: totalActual,
          maxWeightKg: maxWeight,
          completionRate: rate,
          avgRpe,
        };
      });

      const totalActualReps = exerciseSummaries.reduce((s, e) => s + e.totalReps, 0);
      const totalTargetReps = selectedSession.exercises.reduce((sum, ex) => {
        return sum + ex.sets.reduce((s2, set) => s2 + (set.targetReps ?? set.reps ?? 0), 0);
      }, 0);
      const overallCompletionRate = totalTargetReps > 0 ? totalActualReps / totalTargetReps : 1;

      const res = await getWorkoutCritique(
        { provider: aiProvider, apiKey },
        {
          sessionName: selectedSession.name,
          sessionType: selectedSession.type,
          durationMinutes: selectedSession.durationMinutes,
          totalKcal: selectedSession.caloriesBurned ?? 0,
          exercises: exerciseSummaries,
          overallCompletionRate,
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
      {/* Session selector */}
      <Text style={styles.sectionLabel}>Select Session</Text>
      {recent.map(session => (
        <TouchableOpacity
          key={session.id}
          style={[
            styles.sessionRow,
            (selectedId === session.id || (!selectedId && session.id === recent[0]?.id)) && styles.sessionRowActive,
          ]}
          onPress={() => {
            setSelectedId(session.id);
            setResult(null);
            setError(null);
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionName}>{session.name}</Text>
            <Text style={styles.sessionMeta}>
              {new Date(session.date).toLocaleDateString()} · {session.durationMinutes} min · {session.exercises.length} exercises
            </Text>
          </View>
          {(selectedId === session.id || (!selectedId && session.id === recent[0]?.id)) && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      ))}

      {/* Selected session exercise list */}
      {selectedSession && (
        <View style={styles.exerciseSummaryCard}>
          <Text style={styles.exerciseSummaryTitle}>{selectedSession.name} — Exercises</Text>
          {selectedSession.exercises.map((ex, i) => {
            const { rate } = exerciseCompletionRate(ex);
            const pct = Math.round(rate * 100);
            const maxW = Math.max(...ex.sets.map(s => s.weightKg ?? 0), 0);
            return (
              <View key={i} style={styles.exRow}>
                <Text style={styles.exName}>{ex.exerciseName}</Text>
                <Text style={styles.exDetail}>{ex.sets.length}×  {maxW > 0 ? `${maxW}kg` : 'BW'}</Text>
                <Text style={[styles.exPct, { color: pct >= 93 ? COLORS.success : pct >= 80 ? COLORS.warning : COLORS.danger }]}>
                  {pct}%
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* AI button */}
      {!hasAI ? (
        <View style={styles.noAICard}>
          <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.noAIText}>Configure an AI provider in Settings to critique workouts.</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.fetchBtn, loading && { opacity: 0.6 }]}
          onPress={fetchCritique}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.fetchBtnText}>{result ? 'Re-critique Session' : 'Critique This Session'}</Text>
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
          {/* Overall rating */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingCircle}>
              <Text style={[styles.ratingNum, { color: result.overallRating >= 8 ? COLORS.success : result.overallRating >= 6 ? COLORS.warning : COLORS.danger }]}>
                {result.overallRating}
              </Text>
              <Text style={styles.ratingDenom}>/10</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ratingTitle}>Overall Session Rating</Text>
              <View style={[styles.recoveryBadge, { backgroundColor: RECOVERY_COLORS[result.recoveryRisk] + '25' }]}>
                <Ionicons name="body-outline" size={12} color={RECOVERY_COLORS[result.recoveryRisk]} />
                <Text style={[styles.recoveryText, { color: RECOVERY_COLORS[result.recoveryRisk] }]}>
                  {result.recoveryRisk} recovery demand
                </Text>
              </View>
            </View>
          </View>

          <CritiqueCard
            icon="stats-chart-outline"
            title="Volume"
            text={result.volumeAssessment}
            color={COLORS.primary}
          />
          <CritiqueCard
            icon="flash-outline"
            title="Intensity"
            text={result.intensityAssessment}
            color={COLORS.accent}
          />

          {result.strongPoints.length > 0 && (
            <BulletCard
              title="What you did well"
              items={result.strongPoints}
              icon="checkmark-circle-outline"
              color={COLORS.success}
            />
          )}

          {result.improvements.length > 0 && (
            <BulletCard
              title="Improvements for next time"
              items={result.improvements}
              icon="arrow-up-circle-outline"
              color={COLORS.warning}
            />
          )}

          <View style={styles.focusCard}>
            <Ionicons name="flag-outline" size={18} color={COLORS.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.focusLabel}>Next Session Focus</Text>
              <Text style={styles.focusText}>{result.nextSessionFocus}</Text>
            </View>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function CritiqueCard({ icon, title, text, color }: { icon: string; title: string; text: string; color: string }) {
  return (
    <View style={[styles.critiqueCard, { borderLeftColor: color }]}>
      <View style={styles.critiqueHeader}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={styles.critiqueTitle}>{title}</Text>
      </View>
      <Text style={styles.critiqueText}>{text}</Text>
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
  sectionLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sessionRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionRowActive: { borderColor: COLORS.primary },
  sessionName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  sessionMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  exerciseSummaryCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 14 },
  exerciseSummaryTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60' },
  exName: { color: COLORS.text, fontSize: 13, flex: 1 },
  exDetail: { color: COLORS.textMuted, fontSize: 12, marginRight: 10 },
  exPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
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
  ratingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  ratingCircle: { alignItems: 'center', minWidth: 56 },
  ratingNum: { fontSize: 36, fontWeight: '800' },
  ratingDenom: { color: COLORS.textMuted, fontSize: 14 },
  ratingTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  recoveryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  recoveryText: { fontSize: 12, fontWeight: '600' },
  critiqueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  critiqueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  critiqueTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  critiqueText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
  bulletCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  bulletTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bulletText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  focusCard: {
    backgroundColor: COLORS.secondary + '18',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary + '40',
  },
  focusLabel: { color: COLORS.secondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  focusText: { color: COLORS.text, fontSize: 14, lineHeight: 19 },
});
