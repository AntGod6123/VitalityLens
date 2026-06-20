import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addLog } from '../../store/slices/biomarkerSlice';
import { COLORS } from '../../constants';
import { BIOMARKER_META, scoreBiomarker, ratingFromScore, markerInterpretation, RATING_COLORS } from '../../utils/longevityScore';
import { BiomarkerType } from '../../types';

const ALL_TYPES: BiomarkerType[] = [
  'vo2max', 'resting_hr', 'hrv', 'grip_strength',
  'sleep_hours', 'sleep_quality', 'systolic_bp', 'diastolic_bp', 'steps',
];

const HINTS: Record<BiomarkerType, string> = {
  vo2max:        'Typical range: 25–65 mL/kg/min. Use a fitness test, treadmill protocol, or estimate from a cardio session.',
  resting_hr:    'Measure in the morning before getting up. Typical: 45–80 bpm.',
  hrv:           'RMSSD in ms. Most wearables report this. Typical healthy range: 20–100 ms.',
  grip_strength: 'Squeeze a dynamometer with your dominant hand. Typical: 30–65 kg for men, 20–45 kg for women.',
  sleep_hours:   'Total hours slept last night, including naps.',
  sleep_quality:'Rate last night\'s sleep from 1 (terrible) to 10 (perfect).',
  systolic_bp:   'Upper number on your blood pressure reading. Optimal: <120 mmHg.',
  diastolic_bp:  'Lower number on your blood pressure reading. Optimal: <80 mmHg.',
  steps:         'Total steps for today from your phone or wearable.',
};

const SOURCES = ['manual', 'wearable', 'lab'] as const;
type Source = typeof SOURCES[number];

export default function LogBiomarkerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector(s => s.user.profile);

  const [type, setType] = useState<BiomarkerType>(route.params?.type ?? 'resting_hr');
  const [value, setValue] = useState('');
  const [source, setSource] = useState<Source>('manual');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const sex = userProfile?.sex ?? 'male';
  const meta = BIOMARKER_META[type];

  const numValue = parseFloat(value);
  const isValid = !isNaN(numValue) && numValue > 0;
  const score = isValid ? scoreBiomarker(type, numValue, sex) : null;
  const rating = score !== null ? ratingFromScore(score) : null;
  const interp = isValid && rating ? markerInterpretation(type, numValue, sex) : null;

  function handleSave() {
    if (!isValid) {
      Alert.alert('Invalid value', `Please enter a valid number for ${meta.label}.`);
      return;
    }
    dispatch(addLog({
      id: `${type}_${Date.now()}`,
      date,
      type,
      value: numValue,
      notes: notes.trim() || undefined,
      source,
    }));
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer>
        {/* Type selector */}
        <Text style={styles.sectionLabel}>Biomarker Type</Text>
        <View style={styles.typeGrid}>
          {ALL_TYPES.map(t => {
            const m = BIOMARKER_META[t];
            const active = type === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => { setType(t); setValue(''); }}
              >
                <Ionicons name={m.icon as any} size={14} color={active ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]} numberOfLines={1}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descText}>{meta.description}</Text>
          <Text style={styles.hintText}>{HINTS[type]}</Text>
        </View>

        {/* Value input */}
        <Text style={styles.sectionLabel}>Value ({meta.unit})</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={`e.g. ${type === 'steps' ? '8500' : type === 'sleep_hours' ? '7.5' : type === 'sleep_quality' ? '8' : type === 'resting_hr' ? '62' : type === 'hrv' ? '55' : type === 'vo2max' ? '45' : type === 'grip_strength' ? '48' : type === 'systolic_bp' ? '118' : '76'}`}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.unitLabel}>{meta.unit}</Text>
        </View>

        {/* Live feedback */}
        {isValid && score !== null && rating !== null && (
          <View style={[styles.feedbackCard, { borderColor: RATING_COLORS[rating] + '60' }]}>
            <View style={styles.feedbackHeader}>
              <View style={[styles.ratingBadge, { backgroundColor: RATING_COLORS[rating] + '22' }]}>
                <Text style={[styles.ratingText, { color: RATING_COLORS[rating] }]}>{rating.toUpperCase()}</Text>
              </View>
              <Text style={[styles.scoreText, { color: RATING_COLORS[rating] }]}>{Math.round(score)}/100</Text>
            </View>
            {interp && <Text style={styles.interpText}>{interp}</Text>}
          </View>
        )}

        {/* Date */}
        <Text style={styles.sectionLabel}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
        />

        {/* Source */}
        <Text style={styles.sectionLabel}>Source</Text>
        <View style={styles.sourceRow}>
          {SOURCES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sourceBtn, source === s && styles.sourceBtnActive]}
              onPress={() => setSource(s)}
            >
              <Ionicons
                name={s === 'manual' ? 'hand-left-outline' : s === 'wearable' ? 'watch-outline' : 'flask-outline'}
                size={14}
                color={source === s ? '#fff' : COLORS.textMuted}
              />
              <Text style={[styles.sourceBtnText, source === s && styles.sourceBtnTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any context about this reading..."
          placeholderTextColor={COLORS.textMuted}
          multiline
        />

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !isValid && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Save Reading</Text>
        </TouchableOpacity>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  descCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginTop: 8 },
  descText: { color: COLORS.text, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  hintText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16,
    padding: 14,
  },
  unitLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', minWidth: 60 },
  feedbackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ratingBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  scoreText: { fontSize: 15, fontWeight: '700' },
  interpText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  sourceRow: { flexDirection: 'row', gap: 8 },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sourceBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sourceBtnText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  sourceBtnTextActive: { color: '#fff' },
  notesInput: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  saveBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
