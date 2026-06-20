import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants';
import { EXERCISE_DB } from '../../constants/exercises';
import { MuscleGroup, WorkoutType } from '../../types';
import { useAppSelector } from '../../hooks/useAppSelector';

type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss';
type Frequency = 3 | 4 | 5 | 6;
type Split = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split';

const GOALS: { key: Goal; label: string; icon: string }[] = [
  { key: 'strength', label: 'Build Strength', icon: '💪' },
  { key: 'hypertrophy', label: 'Build Muscle', icon: '🏋️' },
  { key: 'endurance', label: 'Endurance', icon: '🏃' },
  { key: 'weight_loss', label: 'Lose Fat', icon: '🔥' },
];

const SPLITS: { key: Split; label: string; days: string }[] = [
  { key: 'full_body', label: 'Full Body', days: '3x/week' },
  { key: 'upper_lower', label: 'Upper / Lower', days: '4x/week' },
  { key: 'push_pull_legs', label: 'Push / Pull / Legs', days: '6x/week' },
  { key: 'bro_split', label: 'Body Part Split', days: '5x/week' },
];

const SPLIT_MUSCLES: Record<Split, MuscleGroup[][]> = {
  full_body: [
    ['chest', 'back', 'quads', 'hamstrings', 'shoulders'],
    ['chest', 'back', 'quads', 'hamstrings', 'core'],
    ['shoulders', 'back', 'glutes', 'biceps', 'triceps'],
  ],
  upper_lower: [
    ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
    ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  ],
  push_pull_legs: [
    ['chest', 'shoulders', 'triceps'],
    ['back', 'lats', 'biceps'],
    ['quads', 'hamstrings', 'glutes', 'calves'],
    ['chest', 'shoulders', 'triceps'],
    ['back', 'lats', 'biceps'],
    ['quads', 'hamstrings', 'glutes', 'calves'],
  ],
  bro_split: [
    ['chest'],
    ['back', 'traps'],
    ['shoulders'],
    ['biceps', 'triceps'],
    ['quads', 'hamstrings', 'glutes', 'calves'],
  ],
};

export default function WorkoutBuilderScreen() {
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [split, setSplit] = useState<Split>('push_pull_legs');
  const [generated, setGenerated] = useState<{ dayLabel: string; exercises: string[] }[] | null>(null);

  const restrictedIds = useAppSelector(s =>
    s.medical.injuries.filter(i => i.isActive).flatMap(i => i.restrictedExerciseIds ?? [])
  );

  function buildPlan() {
    const dayMuscles = SPLIT_MUSCLES[split];
    const sets = goal === 'strength' ? '4×4–6' : goal === 'hypertrophy' ? '3×8–12' : '3×15–20';

    const plan = dayMuscles.map((muscles, i) => {
      const dayExercises = muscles.flatMap(muscle =>
        EXERCISE_DB
          .filter(ex => ex.muscleGroups.includes(muscle) && !restrictedIds.includes(ex.id))
          .slice(0, 2)
      );
      const unique = [...new Map(dayExercises.map(e => [e.id, e])).values()].slice(0, 6);
      return {
        dayLabel: `Day ${i + 1} — ${muscles.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' / ')}`,
        exercises: unique.map(e => `${e.name}  ${sets}`),
      };
    });

    setGenerated(plan);
  }

  return (
    <ScreenContainer>
      <Text style={styles.intro}>
        Answer two questions and we'll generate a training plan tailored to your goal, respecting any active injury restrictions.
      </Text>

      {/* Goal */}
      <Text style={styles.sectionTitle}>Your Goal</Text>
      <View style={styles.optionGrid}>
        {GOALS.map(g => (
          <TouchableOpacity
            key={g.key}
            style={[styles.optionCard, goal === g.key && styles.optionCardActive]}
            onPress={() => setGoal(g.key)}
          >
            <Text style={styles.optionIcon}>{g.icon}</Text>
            <Text style={[styles.optionLabel, goal === g.key && styles.optionLabelActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Split */}
      <Text style={styles.sectionTitle}>Training Split</Text>
      {SPLITS.map(s => (
        <TouchableOpacity
          key={s.key}
          style={[styles.splitCard, split === s.key && styles.splitCardActive]}
          onPress={() => setSplit(s.key)}
        >
          <View>
            <Text style={[styles.splitLabel, split === s.key && styles.splitLabelActive]}>{s.label}</Text>
            <Text style={styles.splitDays}>{s.days}</Text>
          </View>
          {split === s.key && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
        </TouchableOpacity>
      ))}

      <Button title="Generate Plan" onPress={buildPlan} size="lg" style={styles.btn} />

      {/* Generated plan */}
      {generated && (
        <>
          <Text style={styles.planTitle}>Your Plan</Text>
          {generated.map((day, i) => (
            <View key={i} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              {day.exercises.map((ex, j) => (
                <View key={j} style={styles.exRow}>
                  <View style={styles.exDot} />
                  <Text style={styles.exText}>{ex}</Text>
                </View>
              ))}
              {day.exercises.length === 0 && (
                <Text style={styles.noEx}>No exercises available (check injury restrictions)</Text>
              )}
            </View>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  optionCard: { width: '48%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  optionCardActive: { borderColor: COLORS.primary },
  optionIcon: { fontSize: 28, marginBottom: 8 },
  optionLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  optionLabelActive: { color: COLORS.text },
  splitCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  splitCardActive: { borderColor: COLORS.primary },
  splitLabel: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  splitLabelActive: { color: COLORS.text },
  splitDays: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  btn: { marginTop: 16, marginBottom: 8 },
  planTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  dayCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12 },
  dayLabel: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  exRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  exDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted, marginRight: 10 },
  exText: { color: COLORS.text, fontSize: 14 },
  noEx: { color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic' },
});
