import React, { useState, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { addSession } from '../../store/slices/workoutSlice';
import { COLORS } from '../../constants';
import { WorkoutSession, ExerciseSet, SetEntry, WorkoutType } from '../../types';
import { calculateSessionEnergy } from '../../utils/energyExpenditure';
import { EXERCISE_DB } from '../../constants/exercises';
import Button from '../../components/common/Button';
import ScreenContainer from '../../components/common/ScreenContainer';

const WORKOUT_TYPES: WorkoutType[] = ['strength', 'cardio', 'hiit', 'flexibility', 'sport', 'other'];

export default function WorkoutLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const sessions = useAppSelector(s => s.workout.sessions);
  const userProfile = useAppSelector(s => s.user.profile);
  const restrictedExerciseIds = useAppSelector(s =>
    s.medical.injuries.filter(i => i.isActive).flatMap(i => i.restrictedExerciseIds ?? [])
  );

  const existingSession = route.params?.sessionId
    ? sessions.find(s => s.id === route.params.sessionId)
    : null;

  const prefillExercises: ExerciseSet[] | undefined = route.params?.prefillExercises;

  const [name, setName] = useState(existingSession?.name ?? route.params?.prefillName ?? '');
  const [type, setType] = useState<WorkoutType>(existingSession?.type ?? route.params?.prefillType ?? 'strength');
  const [duration, setDuration] = useState(existingSession?.durationMinutes?.toString() ?? '');
  const [notes, setNotes] = useState(existingSession?.notes ?? '');
  const [exercises, setExercises] = useState<ExerciseSet[]>(
    existingSession?.exercises ?? prefillExercises ?? []
  );

  const isReadOnly = !!existingSession;

  // Live energy calculation using W=Fd
  const energyResult = useMemo(() => {
    if (exercises.length === 0 || !userProfile) return null;
    const limbs = userProfile.limbs ?? {};
    // Attach romType from exercise DB to each ExerciseSet
    const enriched = exercises.map(ex => {
      const dbEntry = EXERCISE_DB.find(e => e.id === ex.exerciseId);
      return { ...ex, _romType: dbEntry?.romType ?? 'fixed_30cm' };
    });
    return calculateSessionEnergy('preview', enriched as any, limbs, type);
  }, [exercises, type, userProfile]);

  function addExercise() {
    navigation.navigate('ExerciseLibrary', {
      onSelect: (ex: { id: string; name: string; muscleGroups: string[] }) => {
        if (restrictedExerciseIds.includes(ex.id)) {
          Alert.alert('Exercise Restricted', 'This exercise is restricted due to an active injury.');
          return;
        }
        setExercises(prev => [...prev, {
          exerciseId: ex.id,
          exerciseName: ex.name,
          muscleGroups: ex.muscleGroups as any,
          sets: [{ setNumber: 1, targetReps: undefined, targetWeightKg: undefined }],
        }]);
      },
    });
  }

  function updateProgrammed(exIdx: number, field: 'programmedReps' | 'programmedWeightKg' | 'programmedSets', value: string) {
    const parsed = value === '' ? undefined : Number(value);
    setExercises(prev => prev.map((ex, ei) => ei !== exIdx ? ex : { ...ex, [field]: parsed }));
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: string | boolean) {
    const parsed = typeof value === 'boolean' ? value : (value === '' ? undefined : Number(value));
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: parsed }),
      }
    ));
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const prev_set = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [...ex.sets, {
          setNumber: ex.sets.length + 1,
          targetReps: ex.programmedReps,
          targetWeightKg: ex.programmedWeightKg,
          reps: prev_set?.reps,
          weightKg: prev_set?.weightKg,
        }],
      };
    }));
  }

  function removeExercise(exIdx: number) {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  }

  function save() {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a workout name.'); return; }

    const limbs = userProfile?.limbs ?? {};
    const enriched = exercises.map(ex => {
      const dbEntry = EXERCISE_DB.find(e => e.id === ex.exerciseId);
      return { ...ex, _romType: dbEntry?.romType ?? 'fixed_30cm' };
    });
    const energy = exercises.length > 0
      ? calculateSessionEnergy(Date.now().toString(), enriched as any, limbs, type)
      : undefined;

    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      name: name.trim(),
      type,
      durationMinutes: Number(duration) || 0,
      notes: notes.trim() || undefined,
      exercises,
      caloriesBurned: energy ? Math.round(energy.totalKcal) : undefined,
      energyResult: energy,
    };
    dispatch(addSession(session));
    navigation.goBack();
  }

  const completedSetsCount = exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.reps && s.reps > 0).length, 0);

  return (
    <ScreenContainer>
      {/* Energy summary banner */}
      {energyResult && energyResult.totalKcal > 0 && (
        <View style={styles.energyBanner}>
          <View style={styles.energyStat}>
            <Text style={styles.energyVal}>{Math.round(energyResult.totalKcal)}</Text>
            <Text style={styles.energyLabel}>kcal burned</Text>
          </View>
          <View style={styles.energyStat}>
            <Text style={styles.energyVal}>{Math.round(energyResult.aerobicKcal)}</Text>
            <Text style={styles.energyLabel}>aerobic</Text>
          </View>
          <View style={styles.energyStat}>
            <Text style={styles.energyVal}>{Math.round(energyResult.anaerobicKcal)}</Text>
            <Text style={styles.energyLabel}>anaerobic</Text>
          </View>
          <View style={styles.energyStat}>
            <Text style={styles.energyVal}>{completedSetsCount}</Text>
            <Text style={styles.energyLabel}>sets done</Text>
          </View>
        </View>
      )}

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Session Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day A"
          placeholderTextColor={COLORS.textMuted}
          editable={!isReadOnly}
        />
      </View>

      {/* Type picker */}
      <Text style={styles.label}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typePicker}>
        {WORKOUT_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, type === t && styles.typeChipActive]}
            onPress={() => !isReadOnly && setType(t)}
          >
            <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Duration */}
      <View style={styles.field}>
        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          placeholder="60"
          placeholderTextColor={COLORS.textMuted}
          editable={!isReadOnly}
        />
      </View>

      {/* Exercises */}
      <View style={styles.exHeader}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        {!isReadOnly && (
          <TouchableOpacity onPress={addExercise} style={styles.addExBtn}>
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.addExText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {exercises.map((ex, exIdx) => {
        const exEnergy = energyResult?.exerciseBreakdown.find(b => b.exerciseId === ex.exerciseId);
        return (
          <View key={exIdx} style={styles.exerciseCard}>
            <View style={styles.exNameRow}>
              <Text style={styles.exName}>{ex.exerciseName}</Text>
              <View style={styles.exNameRight}>
                {exEnergy && (
                  <Text style={styles.exKcal}>{Math.round(exEnergy.kcal)} kcal</Text>
                )}
                {!isReadOnly && (
                  <TouchableOpacity onPress={() => removeExercise(exIdx)} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Programmed target */}
            {!isReadOnly && (
              <View style={styles.programmedRow}>
                <Text style={styles.programmedLabel}>Target:</Text>
                <TextInput
                  style={styles.programmedInput}
                  value={ex.programmedSets?.toString() ?? ''}
                  onChangeText={v => updateProgrammed(exIdx, 'programmedSets', v)}
                  keyboardType="numeric"
                  placeholder="sets"
                  placeholderTextColor={COLORS.textMuted}
                />
                <Text style={styles.programmedSep}>×</Text>
                <TextInput
                  style={styles.programmedInput}
                  value={ex.programmedReps?.toString() ?? ''}
                  onChangeText={v => updateProgrammed(exIdx, 'programmedReps', v)}
                  keyboardType="numeric"
                  placeholder="reps"
                  placeholderTextColor={COLORS.textMuted}
                />
                <Text style={styles.programmedSep}>@</Text>
                <TextInput
                  style={styles.programmedInput}
                  value={ex.programmedWeightKg?.toString() ?? ''}
                  onChangeText={v => updateProgrammed(exIdx, 'programmedWeightKg', v)}
                  keyboardType="decimal-pad"
                  placeholder="kg"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            )}

            {/* Sets header */}
            <View style={styles.setHeader}>
              <Text style={[styles.setCol, { flex: 0.4 }]}>#</Text>
              <Text style={styles.setCol}>Target</Text>
              <Text style={styles.setCol}>Reps</Text>
              <Text style={styles.setCol}>kg</Text>
              <Text style={styles.setCol}>RPE</Text>
              {!isReadOnly && <Text style={[styles.setCol, { flex: 0.5 }]}>✓</Text>}
            </View>

            {ex.sets.map((set, setIdx) => {
              const targetReps = set.targetReps ?? ex.programmedReps;
              const targetWeight = set.targetWeightKg ?? ex.programmedWeightKg;
              const targetLabel = targetReps
                ? `${targetReps}${targetWeight ? `@${targetWeight}` : ''}`
                : '—';
              const isComplete = set.completed !== false && set.reps && set.reps > 0;

              return (
                <View key={setIdx} style={[styles.setRow, isComplete ? styles.setRowComplete : null]}>
                  <Text style={[styles.setNum, { flex: 0.4 }]}>{set.setNumber}</Text>
                  <Text style={[styles.setCol, styles.targetText]}>{targetLabel}</Text>
                  <TextInput
                    style={[styles.setInput, set.reps && set.reps < (targetReps ?? 0) && styles.setInputShort]}
                    value={set.reps?.toString() ?? ''}
                    onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={COLORS.textMuted}
                    editable={!isReadOnly}
                  />
                  <TextInput
                    style={styles.setInput}
                    value={set.weightKg?.toString() ?? ''}
                    onChangeText={v => updateSet(exIdx, setIdx, 'weightKg', v)}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={COLORS.textMuted}
                    editable={!isReadOnly}
                  />
                  <TextInput
                    style={styles.setInput}
                    value={set.rpe?.toString() ?? ''}
                    onChangeText={v => updateSet(exIdx, setIdx, 'rpe', v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={COLORS.textMuted}
                    editable={!isReadOnly}
                  />
                  {!isReadOnly && (
                    <TouchableOpacity
                      style={[styles.completeBtn, { flex: 0.5 }, isComplete ? styles.completeBtnDone : null]}
                      onPress={() => updateSet(exIdx, setIdx, 'completed', !isComplete)}
                    >
                      <Ionicons
                        name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={isComplete ? COLORS.success : COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {!isReadOnly && (
              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
                <Text style={styles.addSetText}>+ Add Set</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it go?"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={3}
          editable={!isReadOnly}
        />
      </View>

      {!isReadOnly && (
        <Button title="Save Session" onPress={save} size="lg" style={styles.saveBtn} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  energyBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  energyStat: { alignItems: 'center' },
  energyVal: { color: COLORS.primary, fontSize: 20, fontWeight: '700' },
  energyLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  field: { marginBottom: 16 },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  typePicker: { marginBottom: 16 },
  typeChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  typeChipTextActive: { color: '#fff' },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  exerciseCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12 },
  exNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exName: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1 },
  exNameRight: { flexDirection: 'row', alignItems: 'center' },
  exKcal: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  programmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  programmedLabel: { color: COLORS.textMuted, fontSize: 12, marginRight: 4 },
  programmedInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  programmedSep: { color: COLORS.textMuted, fontSize: 13, paddingHorizontal: 2 },
  setHeader: { flexDirection: 'row', marginBottom: 6 },
  setCol: { flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  targetText: { color: COLORS.textMuted, fontSize: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderRadius: 6 },
  setRowComplete: { opacity: 0.7 },
  setNum: { flex: 1, color: COLORS.textMuted, fontSize: 14 },
  setInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginRight: 4,
    textAlign: 'center',
  },
  setInputShort: { borderWidth: 1, borderColor: COLORS.warning },
  completeBtn: { alignItems: 'center', justifyContent: 'center' },
  completeBtnDone: {},
  addSetBtn: { marginTop: 4 },
  addSetText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  saveBtn: { marginTop: 8, marginBottom: 24 },
});
