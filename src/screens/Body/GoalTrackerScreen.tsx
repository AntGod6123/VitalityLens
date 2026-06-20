import React, { useState, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addGoal, deleteGoal, completeGoal } from '../../store/slices/goalSlice';
import { COLORS } from '../../constants';
import { Goal, GoalType } from '../../types';
import {
  calculateFFMI,
  calculateFMI,
  calculateLBM,
  calculateFatMass,
} from '../../utils/bodyComposition';
import { computeLongevityScore } from '../../utils/longevityScore';
import { computeOverloadTargets } from '../../utils/progressiveOverload';

// ─── Goal type metadata ──────────────────────────────────────────────────────

interface GoalMeta {
  label: string;
  unit: string;
  icon: string;
  color: string;
  higherIsBetter: boolean;
  hint: string;
}

const GOAL_META: Record<GoalType, GoalMeta> = {
  weight_loss:   { label: 'Weight Loss',    unit: 'kg',   icon: 'scale-outline',        color: COLORS.warning,   higherIsBetter: false, hint: 'Target body weight in kg' },
  muscle_gain:   { label: 'Muscle Gain',    unit: 'kg',   icon: 'barbell-outline',      color: COLORS.primary,   higherIsBetter: true,  hint: 'Target lean body mass in kg' },
  strength:      { label: 'Strength',       unit: 'kg',   icon: 'fitness-outline',      color: COLORS.secondary, higherIsBetter: true,  hint: 'Target lift weight in kg' },
  endurance:     { label: 'Endurance',      unit: 'min',  icon: 'timer-outline',        color: COLORS.accent,    higherIsBetter: true,  hint: 'Target cardio duration in minutes' },
  body_fat:      { label: 'Body Fat %',     unit: '%',    icon: 'body-outline',         color: COLORS.danger,    higherIsBetter: false, hint: 'Target body fat percentage' },
  ffmi:          { label: 'FFMI',           unit: '',     icon: 'trending-up-outline',  color: COLORS.primary,   higherIsBetter: true,  hint: 'Fat-Free Mass Index target' },
  fmi:           { label: 'FMI',            unit: '',     icon: 'trending-down-outline',color: COLORS.warning,   higherIsBetter: false, hint: 'Fat Mass Index target' },
  nutrition:     { label: 'Nutrition',      unit: 'kcal', icon: 'nutrition-outline',    color: COLORS.secondary, higherIsBetter: false, hint: 'Daily calorie target' },
  longevity:     { label: 'Longevity Score',unit: '/100', icon: 'heart-outline',        color: '#8B5CF6',        higherIsBetter: true,  hint: 'Composite longevity score target' },
  custom:        { label: 'Custom Goal',    unit: '',     icon: 'flag-outline',         color: COLORS.textMuted, higherIsBetter: true,  hint: 'Any custom target' },
};

const GOAL_TYPE_ORDER: GoalType[] = [
  'weight_loss', 'muscle_gain', 'body_fat', 'ffmi', 'fmi',
  'strength', 'endurance', 'nutrition', 'longevity', 'custom',
];

// ─── Live value resolution ────────────────────────────────────────────────────

function useCurrentValues() {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);
  const biomarkerLogs = useAppSelector(s => s.biomarker.logs);
  const nutritionLogs = useAppSelector(s => s.nutrition.logs);
  const userProfile = useAppSelector(s => s.user.profile);
  const sex = userProfile?.sex ?? 'male';

  return useMemo(() => {
    const lbm = latest
      ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
      : null;
    const fm = latest
      ? (latest.fatMassKg ?? (latest.bodyFatPercent ? calculateFatMass(latest.weightKg, latest.bodyFatPercent) : null))
      : null;
    const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
    const fmi = latest && fm ? calculateFMI(fm, latest.heightCm) : null;

    const overload = computeOverloadTargets(sessions);
    const bestLift = overload.length > 0
      ? Math.max(...overload.map(o => o.allTimeBestKg))
      : null;

    const recentCardio = [...sessions]
      .filter(s => s.type === 'cardio' || s.type === 'hiit')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const longevityResult = computeLongevityScore(biomarkerLogs, sex);
    const longevityScore = longevityResult.trackedCount > 0 ? longevityResult.composite : null;

    // Average daily calories over last 7 days
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recentNutrLogs = nutritionLogs.filter(l => new Date(l.date).getTime() > sevenDaysAgo);
    const avgCalories = recentNutrLogs.length > 0
      ? Math.round(recentNutrLogs.reduce((s, l) => s + l.totalCalories, 0) / recentNutrLogs.length)
      : null;

    const map: Partial<Record<GoalType, number | null>> = {
      weight_loss:  latest?.weightKg ?? null,
      muscle_gain:  lbm,
      body_fat:     latest?.bodyFatPercent ?? null,
      ffmi,
      fmi,
      strength:     bestLift,
      endurance:    recentCardio ? recentCardio.durationMinutes : null,
      nutrition:    avgCalories,
      longevity:    longevityScore,
      custom:       null,
    };
    return map;
  }, [latest, sessions, biomarkerLogs, nutritionLogs, sex]);
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function progressPct(current: number, target: number, start: number, higherIsBetter: boolean): number {
  const range = Math.abs(target - start);
  if (range === 0) return 100;
  if (higherIsBetter) {
    return Math.min(Math.max(((current - start) / range) * 100, 0), 100);
  } else {
    return Math.min(Math.max(((start - current) / range) * 100, 0), 100);
  }
}

function isAchieved(current: number, target: number, higherIsBetter: boolean): boolean {
  return higherIsBetter ? current >= target : current <= target;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GoalTrackerScreen() {
  const dispatch = useAppDispatch();
  const goals = useAppSelector(s => s.goal.goals);
  const currentValues = useCurrentValues();

  const [adding, setAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<GoalType>('weight_loss');
  const [titleOverride, setTitleOverride] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentOverride, setCurrentOverride] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const active = goals.filter(g => !g.isCompleted);
  const completed = goals.filter(g => g.isCompleted);

  function resetForm() {
    setTitleOverride(''); setTargetValue(''); setCurrentOverride('');
    setTargetDate(''); setSelectedType('weight_loss');
  }

  function saveGoal() {
    const target = parseFloat(targetValue);
    if (isNaN(target)) { Alert.alert('Required', 'Enter a target value.'); return; }

    const meta = GOAL_META[selectedType];
    const autoCurrentVal = currentValues[selectedType];
    const currentVal = currentOverride.trim()
      ? parseFloat(currentOverride)
      : (autoCurrentVal ?? target); // fallback to target so progress starts at 0

    const goal: Goal = {
      id: `goal-${Date.now()}`,
      type: selectedType,
      title: titleOverride.trim() || meta.label,
      targetValue: target,
      currentValue: currentVal,
      unit: meta.unit,
      targetDate: targetDate.trim() || undefined,
      createdAt: new Date().toISOString(),
      isCompleted: false,
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

  function markComplete(goal: Goal) {
    Alert.alert('Mark Complete', `Mark "${goal.title}" as achieved?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Achieved!', onPress: () => dispatch(completeGoal(goal.id)) },
    ]);
  }

  const selectedMeta = GOAL_META[selectedType];
  const autoCurrentForSelected = currentValues[selectedType];

  return (
    <ScreenContainer>
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

          {/* Goal type picker */}
          <Text style={styles.fieldLabel}>Goal Type</Text>
          <View style={styles.typeGrid}>
            {GOAL_TYPE_ORDER.map(type => {
              const m = GOAL_META[type];
              const active = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, active && { backgroundColor: m.color + '33', borderColor: m.color }]}
                  onPress={() => setSelectedType(type)}
                >
                  <Ionicons name={m.icon as any} size={14} color={active ? m.color : COLORS.textMuted} />
                  <Text style={[styles.typeChipText, active && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hint */}
          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
            <Text style={styles.hintText}>{selectedMeta.hint}</Text>
          </View>

          {/* Title override */}
          <Text style={styles.fieldLabel}>Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={titleOverride}
            onChangeText={setTitleOverride}
            placeholder={selectedMeta.label}
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Target */}
          <Text style={styles.fieldLabel}>
            Target Value {selectedMeta.unit ? `(${selectedMeta.unit})` : ''}
          </Text>
          <TextInput
            style={styles.input}
            value={targetValue}
            onChangeText={setTargetValue}
            placeholder={`e.g. ${selectedMeta.higherIsBetter ? '80' : '15'}`}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Current value — show auto-detected or allow override */}
          <Text style={styles.fieldLabel}>
            Starting Value {autoCurrentForSelected != null
              ? `(auto-detected: ${autoCurrentForSelected.toFixed(1)}${selectedMeta.unit})`
              : '(enter manually)'}
          </Text>
          <TextInput
            style={styles.input}
            value={currentOverride}
            onChangeText={setCurrentOverride}
            placeholder={autoCurrentForSelected != null
              ? String(autoCurrentForSelected.toFixed(1))
              : 'Enter current value'}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Target date */}
          <Text style={styles.fieldLabel}>Target Date (optional)</Text>
          <TextInput
            style={styles.input}
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
          />

          <Button title="Save Goal" onPress={saveGoal} size="lg" style={{ marginTop: 8 }} />
        </View>
      )}

      {/* ── Active goals ── */}
      {active.length === 0 && !adding ? (
        <EmptyState
          icon="flag-outline"
          title="No active goals"
          subtitle="Set a target for weight, muscle, body fat, strength or any custom metric."
        />
      ) : (
        active.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            liveValue={currentValues[goal.type] ?? null}
            onDelete={() => confirmDelete(goal.id, goal.title)}
            onComplete={() => markComplete(goal)}
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
            <Text style={styles.completedHeaderText}>
              Completed Goals ({completed.length})
            </Text>
            <Ionicons
              name={showCompleted ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {showCompleted && completed.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              liveValue={currentValues[goal.type] ?? null}
              onDelete={() => confirmDelete(goal.id, goal.title)}
              onComplete={undefined}
            />
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  liveValue,
  onDelete,
  onComplete,
}: {
  goal: Goal;
  liveValue: number | null;
  onDelete: () => void;
  onComplete?: () => void;
}) {
  const meta = GOAL_META[goal.type] ?? GOAL_META.custom;
  const current = liveValue ?? goal.currentValue;
  const pct = progressPct(current, goal.targetValue, goal.currentValue, meta.higherIsBetter);
  const achieved = isAchieved(current, goal.targetValue, meta.higherIsBetter);

  // Days until target date
  let daysLeft: number | null = null;
  if (goal.targetDate) {
    daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000);
  }

  const barColor = goal.isCompleted ? COLORS.success : achieved ? COLORS.success : meta.color;

  return (
    <View style={[styles.goalCard, goal.isCompleted && styles.goalCardCompleted]}>
      {/* Header row */}
      <View style={styles.goalHeader}>
        <View style={[styles.goalIcon, { backgroundColor: meta.color + '20' }]}>
          <Ionicons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          {goal.targetDate && (
            <Text style={[styles.goalDate, daysLeft != null && daysLeft < 7 && { color: COLORS.warning }]}>
              {daysLeft != null
                ? daysLeft > 0
                  ? `${daysLeft}d remaining`
                  : daysLeft === 0
                  ? 'Due today'
                  : `${Math.abs(daysLeft)}d overdue`
                : goal.targetDate}
            </Text>
          )}
        </View>
        {achieved && !goal.isCompleted && (
          <View style={styles.achievedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.achievedText}>Achieved</Text>
          </View>
        )}
        {goal.isCompleted && (
          <View style={[styles.achievedBadge, { backgroundColor: COLORS.success + '20' }]}>
            <Ionicons name="trophy" size={14} color={COLORS.success} />
            <Text style={[styles.achievedText, { color: COLORS.success }]}>Done</Text>
          </View>
        )}
      </View>

      {/* Values */}
      <View style={styles.valuesRow}>
        <View style={styles.valueItem}>
          <Text style={[styles.valueNum, { color: meta.color }]}>
            {current.toFixed(current % 1 === 0 ? 0 : 1)}{meta.unit}
          </Text>
          <Text style={styles.valueLabel}>Current</Text>
        </View>
        <View style={styles.valueArrow}>
          <Ionicons
            name={meta.higherIsBetter ? 'arrow-forward' : 'arrow-forward'}
            size={16}
            color={COLORS.textMuted}
          />
        </View>
        <View style={styles.valueItem}>
          <Text style={[styles.valueNum, { color: COLORS.text }]}>
            {goal.targetValue.toFixed(goal.targetValue % 1 === 0 ? 0 : 1)}{meta.unit}
          </Text>
          <Text style={styles.valueLabel}>Target</Text>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: barColor + '22' }]}>
          <Text style={[styles.pctText, { color: barColor }]}>{Math.round(pct)}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>

      {/* Live vs starting */}
      {liveValue != null && (
        <Text style={styles.liveHint}>
          Live from your logs · Started at {goal.currentValue.toFixed(1)}{meta.unit}
        </Text>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        {onComplete && (
          <TouchableOpacity style={styles.cardAction} onPress={onComplete}>
            <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
            <Text style={[styles.cardActionText, { color: COLORS.success }]}>Mark Complete</Text>
          </TouchableOpacity>
        )}
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
  hintText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
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
  goalCardCompleted: { opacity: 0.7 },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  goalIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
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
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  valueItem: { alignItems: 'center', minWidth: 56 },
  valueNum: { fontSize: 20, fontWeight: '800' },
  valueLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  valueArrow: { flex: 1, alignItems: 'center' },
  pctBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
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
