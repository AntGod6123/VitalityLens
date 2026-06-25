import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants';
import { EXERCISE_DB } from '../../constants/exercises';
import { MuscleGroup, PlannedDay, PlannedExercise, WorkoutPlan, WorkoutType } from '../../types';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addPlan } from '../../store/slices/planSlice';

type PlanType = 'lifting' | 'cardio';
type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss';
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

const SPLIT_DAY_LABELS: Record<Split, string[]> = {
  full_body: ['Full Body A', 'Full Body B', 'Full Body C'],
  upper_lower: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  push_pull_legs: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
  bro_split: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
};

const SPLIT_TYPES: Record<Split, WorkoutType> = {
  full_body: 'strength',
  upper_lower: 'strength',
  push_pull_legs: 'strength',
  bro_split: 'strength',
};

// Rep schemes per goal
const REP_RANGES: Record<Goal, { min: number; max: number; sets: number; rpe: number }> = {
  strength: { min: 3, max: 6, sets: 4, rpe: 8.5 },
  hypertrophy: { min: 8, max: 12, sets: 3, rpe: 7.5 },
  endurance: { min: 15, max: 20, sets: 3, rpe: 7 },
  weight_loss: { min: 12, max: 15, sets: 3, rpe: 7 },
};

export default function WorkoutBuilderScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [split, setSplit] = useState<Split>('push_pull_legs');
  const [planName, setPlanName] = useState('');
  const [generated, setGenerated] = useState<WorkoutPlan | null>(null);

  // Cardio builder state
  const [cardioWeeks, setCardioWeeks] = useState('8');
  const [cardioSessionsPerWeek, setCardioSessionsPerWeek] = useState('3');
  const [cardioStartDistanceKm, setCardioStartDistanceKm] = useState('3');
  const [cardioGoalDistanceKm, setCardioGoalDistanceKm] = useState('5');

  const injuries = useAppSelector(s => s.medical.injuries);
  const restrictedIds = useMemo(
    () => injuries.filter(i => i.isActive).flatMap(i => i.restrictedExerciseIds ?? []),
    [injuries],
  );

  function buildPlan() {
    const dayMuscles = SPLIT_MUSCLES[split];
    const repRange = REP_RANGES[goal];
    const dayLabels = SPLIT_DAY_LABELS[split];

    const days: PlannedDay[] = dayMuscles.map((muscles, i) => {
      const dayExercises = muscles.flatMap(muscle =>
        EXERCISE_DB
          .filter(ex => ex.muscleGroups.includes(muscle) && !restrictedIds.includes(ex.id))
          .slice(0, 2)
      );
      const unique = [...new Map(dayExercises.map(e => [e.id, e])).values()].slice(0, 6);

      const plannedExercises: PlannedExercise[] = unique.map(ex => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroups: ex.muscleGroups,
        sets: repRange.sets,
        repsMin: repRange.min,
        repsMax: repRange.max,
        rpe: repRange.rpe,
      }));

      return {
        dayIndex: i,
        label: dayLabels[i] ?? `Day ${i + 1}`,
        isRest: false,
        type: SPLIT_TYPES[split],
        exercises: plannedExercises,
      };
    });

    const name = planName.trim() || `${split.replace(/_/g, ' ')} — ${goal.replace('_', ' ')}`;
    const plan: WorkoutPlan = {
      id: `plan-${Date.now()}`,
      name,
      description: `${GOALS.find(g => g.key === goal)?.label} · ${SPLITS.find(s => s.key === split)?.label} · ${days.length}-day cycle`,
      goal,
      split,
      createdAt: new Date().toISOString(),
      isActive: false,
      days,
    };

    setGenerated(plan);
  }

  function buildCardioPlan() {
    const weeks = parseInt(cardioWeeks) || 8;
    const sessionsPerWeek = parseInt(cardioSessionsPerWeek) || 3;
    const startKm = parseFloat(cardioStartDistanceKm) || 3;
    const goalKm = parseFloat(cardioGoalDistanceKm) || 5;
    const kmIncrement = (goalKm - startKm) / weeks;

    const days: PlannedDay[] = [];
    let dayIndex = 0;
    for (let week = 0; week < weeks; week++) {
      const targetKm = Math.round((startKm + kmIncrement * week) * 10) / 10;
      for (let s = 0; s < sessionsPerWeek; s++) {
        days.push({
          dayIndex,
          label: `Week ${week + 1} Run ${s + 1} — ${targetKm} km`,
          isRest: false,
          type: 'cardio',
          exercises: [{
            exerciseId: 'run',
            exerciseName: 'Running',
            muscleGroups: ['quads', 'hamstrings', 'calves'] as any,
            sets: 1,
            repsMin: 1,
            repsMax: 1,
            notes: `${targetKm} km at comfortable pace`,
          }],
        });
        dayIndex++;
      }
    }

    const name = planName.trim() || `${weeks}-Week Running Program`;
    const plan: WorkoutPlan = {
      id: `plan-${Date.now()}`,
      name,
      description: `${sessionsPerWeek}x/week · ${startKm}km → ${goalKm}km over ${weeks} weeks`,
      goal: 'endurance',
      split: 'full_body' as any,
      createdAt: new Date().toISOString(),
      isActive: false,
      days,
    };
    setGenerated(plan);
  }

  function savePlan() {
    if (!generated) return;
    dispatch(addPlan(generated));
    Alert.alert('Plan Saved', `"${generated.name}" is ready. Go to My Plans to activate it.`, [
      { text: 'View Plans', onPress: () => navigation.navigate('PlanList') },
      { text: 'Done' },
    ]);
    setGenerated(null);
    setPlanName('');
    setPlanType(null);
  }

  // Step 0: choose plan type
  if (!planType) {
    return (
      <ScreenContainer>
        <Text style={styles.intro}>What type of program do you want to build?</Text>
        <TouchableOpacity style={styles.typeCard} onPress={() => setPlanType('lifting')}>
          <Text style={styles.typeIcon}>🏋️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.typeLabel}>Lifting Plan</Text>
            <Text style={styles.typeDesc}>Strength, hypertrophy, or endurance — auto-generated by goal and split</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.typeCard} onPress={() => setPlanType('cardio')}>
          <Text style={styles.typeIcon}>🏃</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.typeLabel}>Cardio / Running Plan</Text>
            <Text style={styles.typeDesc}>Progressive running program that builds distance over weeks</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  // Cardio builder
  if (planType === 'cardio') {
    return (
      <ScreenContainer>
        <TouchableOpacity style={styles.backRow} onPress={() => setPlanType(null)}>
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          <Text style={styles.backText}>Change type</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Plan Name (optional)</Text>
        <TextInput
          style={styles.nameInput}
          value={planName}
          onChangeText={setPlanName}
          placeholder="e.g. Couch to 5K"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.sectionTitle}>Program Length (weeks)</Text>
        <TextInput style={styles.nameInput} value={cardioWeeks} onChangeText={setCardioWeeks} keyboardType="numeric" placeholderTextColor={COLORS.textMuted} placeholder="8" />

        <Text style={styles.sectionTitle}>Sessions per Week</Text>
        <TextInput style={styles.nameInput} value={cardioSessionsPerWeek} onChangeText={setCardioSessionsPerWeek} keyboardType="numeric" placeholderTextColor={COLORS.textMuted} placeholder="3" />

        <Text style={styles.sectionTitle}>Starting Distance (km)</Text>
        <TextInput style={styles.nameInput} value={cardioStartDistanceKm} onChangeText={setCardioStartDistanceKm} keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted} placeholder="3" />

        <Text style={styles.sectionTitle}>Goal Distance (km)</Text>
        <TextInput style={styles.nameInput} value={cardioGoalDistanceKm} onChangeText={setCardioGoalDistanceKm} keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted} placeholder="5" />

        <Button title="Generate Cardio Plan" onPress={buildCardioPlan} size="lg" style={styles.btn} />

        {generated && (
          <>
            <Text style={styles.planTitle}>{generated.name}</Text>
            <Text style={styles.planDesc}>{generated.description}</Text>
            {generated.days.slice(0, 5).map((day, i) => (
              <View key={i} style={styles.dayCard}>
                <Text style={styles.dayLabel}>{day.label}</Text>
              </View>
            ))}
            {generated.days.length > 5 && (
              <Text style={styles.planDesc}>… and {generated.days.length - 5} more sessions</Text>
            )}
            <Button title="Save Plan" onPress={savePlan} size="lg" style={{ marginBottom: 16 }} />
          </>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TouchableOpacity style={styles.backRow} onPress={() => setPlanType(null)}>
        <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
        <Text style={styles.backText}>Change type</Text>
      </TouchableOpacity>
      <Text style={styles.intro}>
        Answer two questions and we'll generate a training plan tailored to your goal, respecting any active injury restrictions.
      </Text>

      {/* Plan name */}
      <Text style={styles.sectionTitle}>Plan Name (optional)</Text>
      <TextInput
        style={styles.nameInput}
        value={planName}
        onChangeText={setPlanName}
        placeholder="e.g. Summer Cut 2025"
        placeholderTextColor={COLORS.textMuted}
      />

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

      {/* Generated plan preview */}
      {generated && (
        <>
          <Text style={styles.planTitle}>{generated.name}</Text>
          <Text style={styles.planDesc}>{generated.description}</Text>
          {generated.days.map((day, i) => (
            <View key={i} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {day.exercises.map((ex, j) => (
                <View key={j} style={styles.exRow}>
                  <View style={styles.exDot} />
                  <Text style={styles.exText}>
                    {ex.exerciseName}{'  '}{ex.sets}×{ex.repsMin}–{ex.repsMax}
                  </Text>
                </View>
              ))}
              {day.exercises.length === 0 && (
                <Text style={styles.noEx}>No exercises available (check injury restrictions)</Text>
              )}
            </View>
          ))}
          <Button title="Save Plan" onPress={savePlan} size="lg" style={{ marginBottom: 16 }} />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeIcon: { fontSize: 32 },
  typeLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  intro: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  nameInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
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
  planTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 20, marginBottom: 4 },
  planDesc: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  dayCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12 },
  dayLabel: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  exRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  exDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted, marginRight: 10 },
  exText: { color: COLORS.text, fontSize: 14 },
  noEx: { color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic' },
});
