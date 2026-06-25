import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import SectionHeader from '../../components/common/SectionHeader';
import DatePickerModal from '../../components/common/DatePickerModal';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addGoal, deleteGoal, completeGoal } from '../../store/slices/goalSlice';
import { COLORS } from '../../constants';
import { useUnits } from '../../hooks/useUnits';
import { Goal, GoalType } from '../../types';
import { calculateLBM, calculateFatMass } from '../../utils/bodyComposition';

// ─── Types & metadata ─────────────────────────────────────────────────────────

interface GoalMeta {
  label: string;
  unit: string;
  icon: string;
  color: string;
  higherIsBetter: boolean;
  hint: string;
}

const GOAL_META: Record<GoalType, GoalMeta> = {
  muscle_gain: { label: 'Muscle Gain',  unit: 'kg',  icon: 'barbell-outline',   color: COLORS.primary,   higherIsBetter: true,  hint: 'Target lean body mass (LBM) in kg — auto-detected from body measurements.' },
  strength:    { label: 'Strength',     unit: 'kg',  icon: 'fitness-outline',   color: COLORS.secondary, higherIsBetter: true,  hint: 'Target max weight for a specific lift — auto-detected from your workout logs.' },
  endurance:   { label: 'Endurance',    unit: 'min', icon: 'timer-outline',     color: COLORS.accent,    higherIsBetter: true,  hint: 'Target cardio session duration in minutes — auto-detected from cardio sessions.' },
  body_fat:    { label: 'Body Fat %',   unit: '%',   icon: 'body-outline',      color: COLORS.danger,    higherIsBetter: false, hint: 'Target body fat percentage — auto-detected from body measurements.' },
};

const GOAL_TYPE_ORDER: GoalType[] = ['body_fat', 'muscle_gain', 'strength', 'endurance'];
const WEIGHT_GOAL_TYPES = new Set<GoalType>(['muscle_gain', 'strength']);

const COMMON_LIFTS = [
  'Squat', 'Bench Press', 'Deadlift', 'Overhead Press',
  'Barbell Row', 'Pull-up', 'Romanian Deadlift', 'Incline Bench',
];

// ─── Live value resolution ────────────────────────────────────────────────────

function useCurrentValues(exerciseName?: string) {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);

  return useMemo(() => {
    const lbm = latest
      ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
      : null;
    const fm = latest
      ? (latest.fatMassKg ?? (latest.bodyFatPercent ? calculateFatMass(latest.weightKg, latest.bodyFatPercent) : null))
      : null;

    // Best weight for a specific lift
    let bestLiftKg: number | null = null;
    if (exerciseName) {
      const target = exerciseName.toLowerCase();
      for (const session of sessions) {
        for (const ex of session.exercises) {
          if (ex.exerciseName.toLowerCase().includes(target) || target.includes(ex.exerciseName.toLowerCase())) {
            for (const set of ex.sets) {
              const w = set.weightKg ?? set.targetWeightKg ?? 0;
              if (w > (bestLiftKg ?? 0)) bestLiftKg = w;
            }
          }
        }
      }
    }

    // Best cardio duration
    const bestCardioMin = sessions
      .filter(s => s.type === 'cardio' || s.type === 'hiit')
      .reduce((best, s) => Math.max(best, s.durationMinutes ?? 0), 0) || null;

    const map: Record<GoalType, number | null> = {
      muscle_gain: lbm,
      body_fat:    latest?.bodyFatPercent ?? null,
      strength:    bestLiftKg,
      endurance:   bestCardioMin,
    };
    return map;
  }, [latest, sessions, exerciseName]);
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function progressPct(current: number, target: number, start: number, higherIsBetter: boolean): number {
  const range = Math.abs(target - start);
  if (range === 0) return 100;
  if (higherIsBetter) return Math.min(Math.max(((current - start) / range) * 100, 0), 100);
  return Math.min(Math.max(((start - current) / range) * 100, 0), 100);
}

function isAchieved(current: number, target: number, higherIsBetter: boolean): boolean {
  return higherIsBetter ? current >= target : current <= target;
}

// ─── Auto-complete hook ───────────────────────────────────────────────────────

function useAutoComplete(goals: Goal[], currentValues: Record<GoalType, number | null>) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    for (const goal of goals) {
      if (goal.isCompleted) continue;
      const live = currentValues[goal.type];
      if (live == null) continue;
      const meta = GOAL_META[goal.type];
      if (meta && isAchieved(live, goal.targetValue, meta.higherIsBetter)) {
        dispatch(completeGoal(goal.id));
      }
    }
  }, [goals, currentValues, dispatch]);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GoalTrackerScreen() {
  const dispatch = useAppDispatch();
  const goals = useAppSelector(s => s.goal.goals);
  const { weightUnit, displayWeight: displayWt, toKg } = useUnits();

  const [adding, setAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<GoalType>('body_fat');
  const [titleOverride, setTitleOverride] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentOverride, setCurrentOverride] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [showCompleted, setShowCompleted] = useState(false);

  // For strength goal exercise picker in form
  const formCurrentValues = useCurrentValues(selectedType === 'strength' ? exerciseName : undefined);

  const active = goals.filter(g => !g.isCompleted);
  const completed = goals.filter(g => g.isCompleted);

  // Auto-complete all active goals
  const allCurrentValues = useCurrentValues();
  useAutoComplete(active, allCurrentValues);

  function resetForm() {
    setTitleOverride(''); setTargetValue(''); setCurrentOverride('');
    setExerciseName(''); setTargetDate(undefined); setSelectedType('body_fat');
  }

  function saveGoal() {
    const target = parseFloat(targetValue);
    if (isNaN(target)) { Alert.alert('Required', 'Enter a target value.'); return; }
    if (selectedType === 'strength' && !exerciseName.trim()) {
      Alert.alert('Required', 'Select or enter a lift name.'); return;
    }

    const meta = GOAL_META[selectedType];
    const autoVal = selectedType === 'strength'
      ? formCurrentValues.strength
      : formCurrentValues[selectedType];
    const currentVal = currentOverride.trim()
      ? (WEIGHT_GOAL_TYPES.has(selectedType) ? toKg(parseFloat(currentOverride)) : parseFloat(currentOverride))
      : (autoVal ?? (WEIGHT_GOAL_TYPES.has(selectedType) ? toKg(target) : target));

    const title = titleOverride.trim() ||
      (selectedType === 'strength' && exerciseName.trim() ? `${exerciseName} 1RM` : meta.label);

    const targetKg = WEIGHT_GOAL_TYPES.has(selectedType) ? toKg(target) : target;
    const goal: Goal = {
      id: `goal-${Date.now()}`,
      type: selectedType,
      title,
      targetValue: targetKg,
      currentValue: currentVal,
      unit: meta.unit,
      targetDate: targetDate?.toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      isCompleted: false,
      exerciseName: selectedType === 'strength' ? exerciseName.trim() : undefined,
    };
    dispatch(addGoal(goal));
    resetForm();
    setAdding(false);
  }

  function confirmDelete(id: string, title: string) {
    Alert.alert('Delete Goal', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteGoal(id)) },
    ]);
  }

  const selectedMeta = GOAL_META[selectedType];
  const autoCurrentForSelected = selectedType === 'strength'
    ? formCurrentValues.strength
    : formCurrentValues[selectedType];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Button
        title={adding ? 'Cancel' : '+ New Goal'}
        onPress={() => { setAdding(!adding); resetForm(); }}
        variant={adding ? 'ghost' : 'primary'}
        size="lg"
        style={{ marginBottom: 16 }}
      />

      {/* ── Add goal form ── */}
      {adding && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New Goal</Text>

          {/* Goal type */}
          <Text style={styles.fieldLabel}>Goal Type</Text>
          <View style={styles.typeGrid}>
            {GOAL_TYPE_ORDER.map(type => {
              const m = GOAL_META[type];
              const isActive = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, isActive && { backgroundColor: m.color + '33', borderColor: m.color }]}
                  onPress={() => setSelectedType(type)}
                >
                  <Ionicons name={m.icon as any} size={14} color={isActive ? m.color : COLORS.textMuted} />
                  <Text style={[styles.typeChipText, isActive && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hint */}
          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
            <Text style={styles.hintText}>{selectedMeta.hint}</Text>
          </View>

          {/* Lift picker for strength */}
          {selectedType === 'strength' && (
            <>
              <Text style={styles.fieldLabel}>Lift</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {COMMON_LIFTS.map(lift => (
                  <TouchableOpacity
                    key={lift}
                    style={[styles.liftChip, exerciseName === lift && styles.liftChipActive]}
                    onPress={() => setExerciseName(lift)}
                  >
                    <Text style={[styles.liftChipText, exerciseName === lift && styles.liftChipTextActive]}>
                      {lift}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                style={styles.input}
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="Or type a custom lift name"
                placeholderTextColor={COLORS.textMuted}
              />
            </>
          )}

          {/* Title override */}
          <Text style={styles.fieldLabel}>Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={titleOverride}
            onChangeText={setTitleOverride}
            placeholder={selectedType === 'strength' && exerciseName ? `${exerciseName} 1RM` : selectedMeta.label}
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Target */}
          <Text style={styles.fieldLabel}>
            Target Value ({WEIGHT_GOAL_TYPES.has(selectedType) ? weightUnit : selectedMeta.unit})
          </Text>
          <TextInput
            style={styles.input}
            value={targetValue}
            onChangeText={setTargetValue}
            placeholder={`e.g. ${selectedMeta.higherIsBetter ? '80' : '15'}`}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Starting value */}
          <Text style={styles.fieldLabel}>
            Starting Value
            {autoCurrentForSelected != null
              ? ` (auto: ${(WEIGHT_GOAL_TYPES.has(selectedType) ? displayWt(autoCurrentForSelected) : autoCurrentForSelected).toFixed(1)} ${WEIGHT_GOAL_TYPES.has(selectedType) ? weightUnit : selectedMeta.unit})`
              : ' (optional override)'}
          </Text>
          <TextInput
            style={styles.input}
            value={currentOverride}
            onChangeText={setCurrentOverride}
            placeholder={autoCurrentForSelected != null ? String(autoCurrentForSelected.toFixed(1)) : 'Enter current value'}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Target date */}
          <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Target Date (optional)</Text>
          <DatePickerModal
            value={targetDate ?? new Date()}
            onChange={setTargetDate}
            label={targetDate ? undefined : 'Pick a target date'}
          />

          <Button title="Save Goal" onPress={saveGoal} size="lg" style={{ marginTop: 16 }} />
        </View>
      )}

      {/* ── Active goals ── */}
      {active.length === 0 && !adding ? (
        <EmptyState
          icon="flag-outline"
          title="No active goals"
          subtitle="Set targets for body fat %, lean mass, strength, or cardio endurance."
        />
      ) : (
        active.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onDelete={() => confirmDelete(goal.id, goal.title)}
          />
        ))
      )}

      {/* ── Completed goals ── */}
      {completed.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.completedHeader}
            onPress={() => setShowCompleted(v => !v)}
          >
            <Text style={styles.completedHeaderText}>Completed ({completed.length})</Text>
            <Ionicons name={showCompleted ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showCompleted && completed.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={() => confirmDelete(goal.id, goal.title)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: () => void }) {
  const liveValues = useCurrentValues(goal.exerciseName);
  const { weightUnit, displayWeight: displayWt } = useUnits();
  const meta = GOAL_META[goal.type] ?? GOAL_META.body_fat;
  const isWeightGoal = WEIGHT_GOAL_TYPES.has(goal.type);
  const displayUnit = isWeightGoal ? weightUnit : meta.unit;
  const live = goal.type === 'strength' ? liveValues.strength : liveValues[goal.type];
  const current = live ?? goal.currentValue;
  const fmt = (v: number) => isWeightGoal ? displayWt(v).toFixed(1) : v.toFixed(1);
  const pct = progressPct(current, goal.targetValue, goal.currentValue, meta.higherIsBetter);
  const achieved = isAchieved(current, goal.targetValue, meta.higherIsBetter);

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null;

  const barColor = goal.isCompleted || achieved ? COLORS.success : meta.color;

  return (
    <View style={[styles.goalCard, goal.isCompleted && styles.goalCardCompleted]}>
      {/* Header */}
      <View style={styles.goalHeader}>
        <View style={[styles.goalIcon, { backgroundColor: meta.color + '20' }]}>
          <Ionicons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          {goal.exerciseName && (
            <Text style={styles.goalSub}>{goal.exerciseName}</Text>
          )}
          {goal.targetDate && (
            <Text style={[styles.goalDate, daysLeft != null && daysLeft < 7 && daysLeft >= 0 && { color: COLORS.warning }]}>
              {daysLeft != null
                ? daysLeft > 0 ? `${daysLeft}d remaining`
                : daysLeft === 0 ? 'Due today'
                : `${Math.abs(daysLeft)}d overdue`
                : goal.targetDate}
            </Text>
          )}
        </View>
        {(achieved || goal.isCompleted) && (
          <View style={styles.achievedBadge}>
            <Ionicons name={goal.isCompleted ? 'trophy' : 'checkmark-circle'} size={14} color={COLORS.success} />
            <Text style={styles.achievedText}>{goal.isCompleted ? 'Done' : 'Achieved!'}</Text>
          </View>
        )}
      </View>

      {/* Values */}
      <View style={styles.valuesRow}>
        <View style={styles.valueItem}>
          <Text style={[styles.valueNum, { color: meta.color }]}>
            {fmt(current)}{displayUnit}
          </Text>
          <Text style={styles.valueLabel}>{live != null ? 'Live' : 'Starting'}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} style={{ marginHorizontal: 8 }} />
        <View style={styles.valueItem}>
          <Text style={[styles.valueNum, { color: COLORS.text }]}>
            {fmt(goal.targetValue)}{displayUnit}
          </Text>
          <Text style={styles.valueLabel}>Target</Text>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: barColor + '22', marginLeft: 'auto' }]}>
          <Text style={[styles.pctText, { color: barColor }]}>{Math.round(pct)}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>

      {live != null && (
        <Text style={styles.liveHint}>Live from logs · Started at {fmt(goal.currentValue)}{displayUnit}</Text>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.cardAction, styles.cardActionRight]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
          <Text style={[styles.cardActionText, { color: COLORS.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },

  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  formTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  typeChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '12',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  hintText: { color: COLORS.textMuted, fontSize: 12, flex: 1, lineHeight: 17 },
  liftChip: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liftChipActive: { backgroundColor: COLORS.secondary + '33', borderColor: COLORS.secondary },
  liftChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  liftChipTextActive: { color: COLORS.secondary },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalCardCompleted: { opacity: 0.65 },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  goalIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  goalSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  goalDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  achievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  achievedText: { color: COLORS.success, fontSize: 11, fontWeight: '700' },
  valuesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  valueItem: { alignItems: 'center', minWidth: 60 },
  valueNum: { fontSize: 20, fontWeight: '800' },
  valueLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  pctBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pctText: { fontSize: 16, fontWeight: '800' },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: 8, borderRadius: 4 },
  liveHint: { color: COLORS.textMuted, fontSize: 10, marginBottom: 8 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 4,
  },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardActionRight: { marginLeft: 'auto' },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    marginBottom: 4,
  },
  completedHeaderText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
});
