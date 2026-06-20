import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';

export default function WorkoutHomeScreen() {
  const navigation = useNavigation<any>();
  const sessions = useAppSelector(s => s.workout.sessions);

  const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <ScreenContainer>
      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('WorkoutLog')}>
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
          <Text style={styles.actionLabel}>Log Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('WorkoutBuilder')}>
          <Ionicons name="construct" size={32} color={COLORS.secondary} />
          <Text style={styles.actionLabel}>Build Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ExerciseLibrary')}>
          <Ionicons name="list" size={32} color={COLORS.accent} />
          <Text style={styles.actionLabel}>Exercises</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MuscleGrowthProjection')}>
          <Ionicons name="trending-up" size={32} color={COLORS.warning} />
          <Text style={styles.actionLabel}>Projections</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ProgressiveOverload')}>
          <Ionicons name="barbell" size={32} color={COLORS.secondary} />
          <Text style={styles.actionLabel}>Overload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('WorkoutCritique')}>
          <Ionicons name="sparkles" size={32} color={COLORS.primary} />
          <Text style={styles.actionLabel}>AI Critique</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('PlanList')}>
          <Ionicons name="clipboard" size={32} color={COLORS.accent} />
          <Text style={styles.actionLabel}>My Plans</Text>
        </TouchableOpacity>
      </View>

      <SectionHeader title="Session History" />

      {sorted.length === 0 ? (
        <EmptyState icon="barbell-outline" title="No sessions yet" subtitle="Tap Log Session to record your first workout." />
      ) : (
        sorted.map(session => (
          <TouchableOpacity
            key={session.id}
            style={styles.card}
            onPress={() => navigation.navigate('WorkoutLog', { sessionId: session.id })}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardDate}>{new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
              <Text style={styles.cardName}>{session.name}</Text>
              <Text style={styles.cardMeta}>{session.exercises.length} exercises · {session.durationMinutes} min{session.caloriesBurned ? ` · ${session.caloriesBurned} kcal` : ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: { flex: 1 },
  cardDate: { color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardName: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
  cardMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
});
