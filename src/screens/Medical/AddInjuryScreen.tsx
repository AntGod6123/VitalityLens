import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { useAppDispatch } from '../../hooks/useAppSelector';
import { addInjury } from '../../store/slices/medicalSlice';
import { restrictExercise } from '../../store/slices/workoutSlice';
import { COLORS } from '../../constants';
import { EXERCISE_DB } from '../../constants/exercises';
import { InjuryRecord, MuscleGroup } from '../../types';

const BODY_PARTS = ['Shoulder', 'Lower Back', 'Knee', 'Hip', 'Elbow', 'Wrist', 'Ankle', 'Neck', 'Upper Back', 'Chest', 'Hamstring', 'Quad', 'Calf', 'Groin', 'Other'];
const SEVERITY_OPTIONS = ['mild', 'moderate', 'severe'] as const;
const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'lats', 'traps', 'forearms'];

export default function AddInjuryScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const [bodyPart, setBodyPart] = useState('');
  const [severity, setSeverity] = useState<typeof SEVERITY_OPTIONS[number]>('mild');
  const [description, setDescription] = useState('');
  const [recovery, setRecovery] = useState('');
  const [restrictedMuscles, setRestrictedMuscles] = useState<MuscleGroup[]>([]);

  function toggleMuscle(m: MuscleGroup) {
    setRestrictedMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  // Find exercises that target any of the restricted muscles
  const autoRestrictedExercises = EXERCISE_DB.filter(ex =>
    ex.muscleGroups.some(m => restrictedMuscles.includes(m))
  );

  function save() {
    if (!bodyPart.trim()) { Alert.alert('Required', 'Select or enter a body part.'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Describe the injury.'); return; }

    const restrictedExerciseIds = autoRestrictedExercises.map(e => e.id);

    const record: InjuryRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      bodyPart: bodyPart.trim(),
      severity,
      description: description.trim(),
      restrictedMuscleGroups: restrictedMuscles,
      restrictedExerciseIds,
      expectedRecoveryDate: recovery ? new Date(recovery).toISOString() : undefined,
      isActive: true,
    };

    dispatch(addInjury(record));
    // Auto-restrict exercises in workout store
    restrictedExerciseIds.forEach(id => dispatch(restrictExercise({ exerciseId: id, restricted: true })));
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      {/* Body part */}
      <Text style={styles.label}>Body Part</Text>
      <View style={styles.partGrid}>
        {BODY_PARTS.map(p => (
          <TouchableOpacity key={p} style={[styles.partChip, bodyPart === p && styles.partChipActive]} onPress={() => setBodyPart(p)}>
            <Text style={[styles.partText, bodyPart === p && styles.partTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Severity */}
      <Text style={styles.label}>Severity</Text>
      <View style={styles.severityRow}>
        {SEVERITY_OPTIONS.map(s => (
          <TouchableOpacity key={s} style={[styles.severityBtn, severity === s && styles.severityBtnActive(s)]} onPress={() => setSeverity(s)}>
            <Text style={[styles.severityText, severity === s && styles.severityTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.textArea}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the injury, how it happened, symptoms..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={4}
      />

      {/* Expected recovery */}
      <Text style={styles.label}>Expected Recovery Date (optional)</Text>
      <TextInput
        style={styles.input}
        value={recovery}
        onChangeText={setRecovery}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={COLORS.textMuted}
      />

      {/* Restricted muscles */}
      <Text style={styles.label}>Restricted Muscle Groups</Text>
      <Text style={styles.sublabel}>Exercises targeting these muscles will be flagged in the workout builder</Text>
      <View style={styles.muscleGrid}>
        {MUSCLE_GROUPS.map(m => (
          <TouchableOpacity key={m} style={[styles.muscleChip, restrictedMuscles.includes(m) && styles.muscleChipActive]} onPress={() => toggleMuscle(m)}>
            <Text style={[styles.muscleText, restrictedMuscles.includes(m) && styles.muscleTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Auto-restricted exercises preview */}
      {autoRestrictedExercises.length > 0 && (
        <View style={styles.restrictedPreview}>
          <Text style={styles.restrictedPreviewTitle}>
            {autoRestrictedExercises.length} exercises will be restricted:
          </Text>
          {autoRestrictedExercises.slice(0, 6).map(ex => (
            <Text key={ex.id} style={styles.restrictedExName}>• {ex.name}</Text>
          ))}
          {autoRestrictedExercises.length > 6 && (
            <Text style={styles.restrictedExName}>...and {autoRestrictedExercises.length - 6} more</Text>
          )}
        </View>
      )}

      <Button title="Log Injury" onPress={save} size="lg" style={styles.saveBtn} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  sublabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10, marginTop: -8 },
  partGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partChip: { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  partChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  partText: { color: COLORS.textMuted, fontSize: 13 },
  partTextActive: { color: '#fff', fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: 10 },
  severityBtn: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  severityBtnActive: (s: string) => ({
    borderColor: s === 'mild' ? COLORS.warning : s === 'moderate' ? COLORS.accent : COLORS.danger,
    backgroundColor: (s === 'mild' ? COLORS.warning : s === 'moderate' ? COLORS.accent : COLORS.danger) + '22',
  }),
  severityText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  severityTextActive: { color: COLORS.text },
  textArea: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 100, textAlignVertical: 'top' },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  muscleChipActive: { backgroundColor: COLORS.danger + '22', borderColor: COLORS.danger },
  muscleText: { color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
  muscleTextActive: { color: COLORS.danger, fontWeight: '600' },
  restrictedPreview: { backgroundColor: COLORS.danger + '11', borderRadius: 10, padding: 14, marginTop: 12, borderWidth: 1, borderColor: COLORS.danger + '33' },
  restrictedPreviewTitle: { color: COLORS.danger, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  restrictedExName: { color: COLORS.text, fontSize: 13, marginBottom: 4 },
  saveBtn: { marginTop: 20, marginBottom: 24 },
});
