import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import DatePickerModal from '../../components/common/DatePickerModal';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useUnits } from '../../hooks/useUnits';
import { activatePlan } from '../../store/slices/planSlice';
import { COLORS } from '../../constants';
import { PlannedDay, PlannedExercise } from '../../types';
import { computeOverloadTargets } from '../../utils/progressiveOverload';

const GOAL_COLORS: Record<string, string> = {
  strength: COLORS.primary,
  hypertrophy: COLORS.secondary,
  endurance: COLORS.accent,
  weight_loss: COLORS.warning,
};

export default function PlanDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const planId: string = route.params?.planId;

  const plan = useAppSelector(s => s.plan.plans.find(p => p.id === planId));
  const sessions = useAppSelector(s => s.workout.sessions);
  const { weightUnit, displayWeight: displayWt } = useUnits();

  const overloadTargets = useMemo(() => computeOverloadTargets(sessions), [sessions]);
  const overloadMap = useMemo(
    () => new Map(overloadTargets.map(t => [t.exerciseId, t])),
    [overloadTargets],
  );

  const [startDate, setStartDate] = useState(
    plan?.startDate ? new Date(plan.startDate) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (!plan) return null;

  const goalColor = GOAL_COLORS[plan.goal] ?? COLORS.primary;

  // Determine which plan day is "today" based on startDate + cycle length
  let todayDayIndex: number | null = null;
  if (plan.isActive && plan.startDate) {
    const start = new Date(plan.startDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / 86400000);
    todayDayIndex = daysSinceStart % plan.days.length;
  }

  function handleActivate() {
    dispatch(activatePlan({ id: plan!.id, startDate: startDate.toISOString() }));
  }

  function startTodaySession() {
    if (todayDayIndex === null) return;
    const day = plan!.days[todayDayIndex];
    if (!day || day.isRest) return;

    // Build prefill exercises with overload weights applied
    const prefillExercises = day.exercises.map(pe => {
      const overload = overloadMap.get(pe.exerciseId);
      const suggestedWeight = overload?.thresholdMet
        ? overload.nextWeightKg
        : overload?.lastWeightKg ?? pe.weightKg ?? 0;
      return {
        exerciseId: pe.exerciseId,
        exerciseName: pe.exerciseName,
        muscleGroups: pe.muscleGroups,
        programmedSets: pe.sets,
        programmedReps: Math.round((pe.repsMin + pe.repsMax) / 2),
        programmedWeightKg: suggestedWeight,
        sets: Array.from({ length: pe.sets }, (_, i) => ({
          setNumber: i + 1,
          targetReps: Math.round((pe.repsMin + pe.repsMax) / 2),
          targetWeightKg: suggestedWeight,
        })),
      };
    });

    navigation.navigate('WorkoutLog', {
      prefillName: `${plan!.name} — ${day.label}`,
      prefillType: day.type,
      prefillExercises,
    });
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderLeftColor: goalColor }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: goalColor + '22' }]}>
              <Text style={[styles.badgeText, { color: goalColor }]}>{plan.goal.replace('_', ' ')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: COLORS.border }]}>
              <Text style={[styles.badgeText, { color: COLORS.textMuted }]}>{plan.split.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.metaSmall}>{plan.days.length}-day cycle</Text>
          </View>
          {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}
        </View>
      </View>

      {/* Start date picker */}
      {!plan.isActive && (
        <DatePickerModal
          value={startDate}
          onChange={setStartDate}
          label="Start date"
        />
      )}

      {/* Activate / Today CTA */}
      <View style={styles.ctaRow}>
        {!plan.isActive && (
          <Button
            title="Activate Plan"
            onPress={handleActivate}
            variant="primary"
            size="lg"
            style={{ flex: 1 }}
          />
        )}
        {plan.isActive && todayDayIndex !== null && !plan.days[todayDayIndex]?.isRest && (
          <TouchableOpacity style={[styles.todayBtn, { flex: 1 }]} onPress={startTodaySession}>
            <Ionicons name="flash" size={16} color="#fff" />
            <Text style={styles.todayBtnText}>Start Today's Workout</Text>
          </TouchableOpacity>
        )}
      </View>

      {plan.isActive && todayDayIndex !== null && (
        <View style={styles.todayBanner}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
          <Text style={styles.todayBannerText}>
            Today is {plan.days[todayDayIndex]?.label ?? `Day ${todayDayIndex + 1}`}
            {plan.days[todayDayIndex]?.isRest ? ' — Rest Day' : ''}
          </Text>
        </View>
      )}

      {/* Day cards */}
      {plan.days.map((day, idx) => (
        <DayCard
          key={idx}
          day={day}
          dayNumber={idx + 1}
          isToday={idx === todayDayIndex}
          overloadMap={overloadMap}
          displayWt={displayWt}
          weightUnit={weightUnit}
        />
      ))}
    </ScreenContainer>
  );
}

function DayCard({
  day,
  dayNumber,
  isToday,
  overloadMap,
  displayWt,
  weightUnit,
}: {
  day: PlannedDay;
  dayNumber: number;
  isToday: boolean;
  overloadMap: Map<string, { nextWeightKg: number; lastWeightKg: number; thresholdMet: boolean }>;
  displayWt: (kg: number) => number;
  weightUnit: string;
}) {
  return (
    <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
      <View style={styles.dayHeader}>
        <View style={[styles.dayNum, isToday && styles.dayNumToday]}>
          <Text style={[styles.dayNumText, isToday && styles.dayNumTextToday]}>{dayNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          {isToday && <Text style={styles.todayTag}>TODAY</Text>}
        </View>
        {day.isRest && (
          <View style={styles.restBadge}>
            <Text style={styles.restText}>REST</Text>
          </View>
        )}
      </View>

      {!day.isRest && day.exercises.map(ex => (
        <ExerciseRow key={ex.exerciseId} ex={ex} overloadMap={overloadMap} displayWt={displayWt} weightUnit={weightUnit} />
      ))}
    </View>
  );
}

function ExerciseRow({
  ex,
  overloadMap,
  displayWt,
  weightUnit,
}: {
  ex: PlannedExercise;
  overloadMap: Map<string, { nextWeightKg: number; lastWeightKg: number; thresholdMet: boolean }>;
  displayWt: (kg: number) => number;
  weightUnit: string;
}) {
  const overload = overloadMap.get(ex.exerciseId);
  const suggestedWeight = overload?.thresholdMet
    ? overload.nextWeightKg
    : overload?.lastWeightKg ?? ex.weightKg;

  return (
    <View style={styles.exRow}>
      <View style={styles.exDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.exName}>{ex.exerciseName}</Text>
        <Text style={styles.exMeta}>
          {ex.sets} × {ex.repsMin}–{ex.repsMax} reps
          {ex.rpe ? ` · RPE ${ex.rpe}` : ''}
        </Text>
      </View>
      {suggestedWeight != null && suggestedWeight > 0 && (
        <View style={[styles.weightBadge, overload?.thresholdMet && styles.weightBadgeUp]}>
          {overload?.thresholdMet && <Ionicons name="arrow-up" size={10} color={COLORS.secondary} />}
          <Text style={[styles.weightText, overload?.thresholdMet && styles.weightTextUp]}>
            {displayWt(suggestedWeight).toFixed(1)} {weightUnit}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  planName: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  metaSmall: { color: COLORS.textMuted, fontSize: 12 },
  desc: { color: COLORS.textMuted, fontSize: 13, marginTop: 8, lineHeight: 18 },
  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  todayBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  todayBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '18',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  todayBannerText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  dayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayCardToday: { borderColor: COLORS.primary + '80' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dayNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumToday: { backgroundColor: COLORS.primary },
  dayNumText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '700' },
  dayNumTextToday: { color: '#fff' },
  dayLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  todayTag: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  restBadge: { backgroundColor: COLORS.border, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  restText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.border },
  exDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary + '80' },
  exName: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  exMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  weightBadge: { backgroundColor: COLORS.border, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  weightBadgeUp: { backgroundColor: COLORS.secondary + '20' },
  weightText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  weightTextUp: { color: COLORS.secondary },
});
