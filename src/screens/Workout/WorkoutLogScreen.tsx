import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { addSession } from '../../store/slices/workoutSlice';
import { COLORS } from '../../constants';
import { WorkoutSession, ExerciseSet, SetEntry, WorkoutType } from '../../types';
import Button from '../../components/common/Button';
import ScreenContainer from '../../components/common/ScreenContainer';

const WORKOUT_TYPES: WorkoutType[] = ['strength', 'cardio', 'hiit', 'flexibility', 'sport', 'other'];

export default function WorkoutLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const sessions = useAppSelector(s => s.workout.sessions);
  const restrictedExerciseIds = useAppSelector(s =>
    s.medical.injuries.filter(i => i.isActive).flatMap(i => i.restrictedExerciseIds ?? [])
  );

  const existingSession = route.params?.sessionId
    ? sessions.find(s => s.id === route.params.sessionId)
    : null;

  const [name, setName] = useState(existingSession?.name ?? '');
  const [type, setType] = useState<WorkoutType>(existingSession?.type ?? 'strength');
  const [duration, setDuration] = useState(existingSession?.durationMinutes?.toString() ?? '');
  const [notes, setNotes] = useState(existingSession?.notes ?? '');
  const [exercises, setExercises] = useState<ExerciseSet[]>(existingSession?.exercises ?? []);

  const isReadOnly = !!existingSession;

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
          sets: [{ setNumber: 1 }],
        }]);
      },
    });
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: string) {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) =>
          si !== setIdx ? s : { ...s, [field]: value === '' ? undefined : Number(value) }
        ),
      }
    ));
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : { ...ex, sets: [...ex.sets, { setNumber: ex.sets.length + 1 }] }
    ));
  }

  function removeExercise(exIdx: number) {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  }

  function save() {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a workout name.'); return; }
    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      name: name.trim(),
      type,
      durationMinutes: Number(duration) || 0,
      notes: notes.trim() || undefined,
      exercises,
    };
    dispatch(addSession(session));
    navigation.goBack();
  }

  return (
    <ScreenContainer>
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

      {exercises.map((ex, exIdx) => (
        <View key={exIdx} style={styles.exerciseCard}>
          <View style={styles.exNameRow}>
            <Text style={styles.exName}>{ex.exerciseName}</Text>
            {!isReadOnly && (
              <TouchableOpacity onPress={() => removeExercise(exIdx)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sets header */}
          <View style={styles.setHeader}>
            <Text style={[styles.setCol, { flex: 0.5 }]}>Set</Text>
            <Text style={styles.setCol}>Reps</Text>
            <Text style={styles.setCol}>Weight (kg)</Text>
            <Text style={styles.setCol}>RPE</Text>
          </View>

          {ex.sets.map((set, setIdx) => (
            <View key={setIdx} style={styles.setRow}>
              <Text style={[styles.setNum, { flex: 0.5 }]}>{set.setNumber}</Text>
              <TextInput
                style={styles.setInput}
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
            </View>
          ))}

          {!isReadOnly && (
            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

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
  exNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  exName: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1 },
  setHeader: { flexDirection: 'row', marginBottom: 6 },
  setCol: { flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  setNum: { flex: 1, color: COLORS.textMuted, fontSize: 14 },
  setInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
    textAlign: 'center',
  },
  addSetBtn: { marginTop: 4 },
  addSetText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  saveBtn: { marginTop: 8, marginBottom: 24 },
});
