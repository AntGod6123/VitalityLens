import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';

interface ExerciseProgress {
  exerciseName: string;
  exerciseId: string;
  lastWeight: number;
  lastReps: number;
  bestWeight: number;
  totalSets: number;
  trend: 'up' | 'flat' | 'down' | 'new';
}

export default function ProgressiveOverloadScreen() {
  const sessions = useAppSelector(s => s.workout.sessions);

  // Aggregate per-exercise progress from all sessions
  const progressMap = new Map<string, ExerciseProgress>();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      const prev = progressMap.get(ex.exerciseId);
      const maxWeight = Math.max(...ex.sets.map(s => s.weightKg ?? 0));
      const lastSet = ex.sets[ex.sets.length - 1];

      if (!prev) {
        progressMap.set(ex.exerciseId, {
          exerciseName: ex.exerciseName,
          exerciseId: ex.exerciseId,
          lastWeight: lastSet.weightKg ?? 0,
          lastReps: lastSet.reps ?? 0,
          bestWeight: maxWeight,
          totalSets: ex.sets.length,
          trend: 'new',
        });
      } else {
        const trend = maxWeight > prev.bestWeight ? 'up' : maxWeight < prev.bestWeight ? 'down' : 'flat';
        progressMap.set(ex.exerciseId, {
          ...prev,
          lastWeight: lastSet.weightKg ?? prev.lastWeight,
          lastReps: lastSet.reps ?? prev.lastReps,
          bestWeight: Math.max(maxWeight, prev.bestWeight),
          totalSets: prev.totalSets + ex.sets.length,
          trend,
        });
      }
    }
  }

  const items = [...progressMap.values()].sort((a, b) => b.totalSets - a.totalSets);

  if (items.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState icon="trending-up-outline" title="No data yet" subtitle="Log workouts to track progressive overload across exercises." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.intro}>Track your best lifts and see how you're progressing toward progressive overload targets.</Text>

      {items.map(item => (
        <View key={item.exerciseId} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.exName}>{item.exerciseName}</Text>
            <TrendIcon trend={item.trend} />
          </View>
          <View style={styles.stats}>
            <Stat label="Best Weight" value={`${item.bestWeight} kg`} />
            <Stat label="Last Weight" value={`${item.lastWeight} kg`} />
            <Stat label="Last Reps" value={`${item.lastReps}`} />
            <Stat label="Total Sets" value={`${item.totalSets}`} />
          </View>
          {item.trend === 'up' && (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>New personal best! Keep pushing.</Text>
            </View>
          )}
        </View>
      ))}
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TrendIcon({ trend }: { trend: ExerciseProgress['trend'] }) {
  const map = {
    up: { name: 'trending-up' as const, color: COLORS.secondary },
    down: { name: 'trending-down' as const, color: COLORS.danger },
    flat: { name: 'remove' as const, color: COLORS.textMuted },
    new: { name: 'star-outline' as const, color: COLORS.accent },
  };
  const { name, color } = map[trend];
  return <Ionicons name={name} size={20} color={color} />;
}

const styles = StyleSheet.create({
  intro: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exName: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  progressBadge: { marginTop: 10, backgroundColor: COLORS.secondary + '22', borderRadius: 6, padding: 8 },
  progressText: { color: COLORS.secondary, fontSize: 13, fontWeight: '600' },
});
