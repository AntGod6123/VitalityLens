import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
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

const DEFAULT_REST_SECONDS = 90;

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
  const type: WorkoutType = existingSession?.type ?? route.params?.prefillType ?? 'strength';
  const [exercises, setExercises] = useState<ExerciseSet[]>(
    existingSession?.exercises ?? prefillExercises ?? []
  );
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  // Rest timer
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotal, setRestTotal] = useState(DEFAULT_REST_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restActive = restSeconds > 0;

  const isReadOnly = !!existingSession;

  const energyResult = useMemo(() => {
    if (exercises.length === 0 || !userProfile) return null;
    const limbs = userProfile.limbs ?? {};
    const enriched = exercises.map(ex => {
      const dbEntry = EXERCISE_DB.find(e => e.id === ex.exerciseId);
      return { ...ex, _romType: dbEntry?.romType ?? 'fixed_30cm' };
    });
    return calculateSessionEnergy('preview', enriched as any, limbs, type);
  }, [exercises, type, userProfile]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startRestTimer(duration = DEFAULT_REST_SECONDS) {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTotal(duration);
    setRestSeconds(duration);
    timerRef.current = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          Vibration.vibrate([0, 400, 200, 400]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function skipRestTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestSeconds(0);
  }

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
          sets: [{ setNumber: 1, warmup: true }, { setNumber: 2 }],
        }]);
      },
    });
  }

  function removeExercise(exIdx: number) {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [...ex.sets, {
          setNumber: ex.sets.length + 1,
          reps: last?.reps,
          weightKg: last?.weightKg,
        }],
      };
    }));
  }

  function updateSetField(exIdx: number, setIdx: number, field: keyof SetEntry, value: any) {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value }),
      }
    ));
  }

  function adjustReps(exIdx: number, setIdx: number, delta: number) {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : {
          ...s,
          reps: Math.max(0, (s.reps ?? s.targetReps ?? 0) + delta),
        }),
      }
    ));
  }

  function adjustWeight(exIdx: number, setIdx: number, delta: number) {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : {
          ...s,
          weightKg: Math.max(0, Math.round(((s.weightKg ?? s.targetWeightKg ?? 0) + delta) * 4) / 4),
        }),
      }
    ));
  }

  function completeSet(exIdx: number, setIdx: number) {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    const nowComplete = !set.completed;
    updateSetField(exIdx, setIdx, 'completed', nowComplete);
    if (nowComplete) startRestTimer();
  }

  function toggleWarmup(exIdx: number, setIdx: number) {
    const current = exercises[exIdx].sets[setIdx].warmup;
    updateSetField(exIdx, setIdx, 'warmup', !current);
  }

  function toggleCollapse(exIdx: number) {
    setCollapsed(prev => ({ ...prev, [exIdx]: !prev[exIdx] }));
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
      durationMinutes: 0,
      exercises,
      caloriesBurned: energy ? Math.round(energy.totalKcal) : undefined,
      energyResult: energy,
    };
    dispatch(addSession(session));
    navigation.goBack();
  }

  const completedSetsCount = exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed).length, 0);

  const totalSetsCount = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Energy banner */}
        {energyResult && energyResult.totalKcal > 0 && (
          <View style={styles.energyBanner}>
            <Stat label="kcal" value={Math.round(energyResult.totalKcal)} />
            <Stat label="aerobic" value={Math.round(energyResult.aerobicKcal)} />
            <Stat label="anaerobic" value={Math.round(energyResult.anaerobicKcal)} />
            <Stat label={`sets ${completedSetsCount}/${totalSetsCount}`} value="" />
          </View>
        )}

        {/* Session name */}
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Session name…"
          placeholderTextColor={COLORS.textMuted}
          editable={!isReadOnly}
        />

        {/* Exercises */}
        {exercises.map((ex, exIdx) => {
          const isCollapsed = collapsed[exIdx];
          const nextSetIdx = ex.sets.findIndex(s => !s.completed);
          return (
            <View key={exIdx} style={styles.exCard}>
              {/* Exercise header */}
              <TouchableOpacity
                style={styles.exHeader}
                onPress={() => toggleCollapse(exIdx)}
                activeOpacity={0.7}
              >
                <Text style={styles.exName} numberOfLines={1}>{ex.exerciseName}</Text>
                <View style={styles.exHeaderRight}>
                  {!isReadOnly && (
                    <TouchableOpacity onPress={() => removeExercise(exIdx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                  <Ionicons
                    name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </View>
              </TouchableOpacity>

              {!isCollapsed && (
                <>
                  {ex.sets.map((set, setIdx) => {
                    const isCurrent = setIdx === nextSetIdx;
                    const isDone = !!set.completed;
                    return (
                      <SetRow
                        key={setIdx}
                        set={set}
                        setIdx={setIdx}
                        isCurrent={isCurrent}
                        isDone={isDone}
                        isReadOnly={isReadOnly}
                        onAdjustReps={delta => adjustReps(exIdx, setIdx, delta)}
                        onAdjustWeight={delta => adjustWeight(exIdx, setIdx, delta)}
                        onComplete={() => completeSet(exIdx, setIdx)}
                        onToggleWarmup={() => toggleWarmup(exIdx, setIdx)}
                        onWeightChange={v => updateSetField(exIdx, setIdx, 'weightKg', v === '' ? undefined : Number(v))}
                        onRepsChange={v => updateSetField(exIdx, setIdx, 'reps', v === '' ? undefined : Number(v))}
                      />
                    );
                  })}
                  {!isReadOnly && (
                    <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
                      <Ionicons name="add" size={14} color={COLORS.primary} />
                      <Text style={styles.addSetText}>Add Set</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          );
        })}

        {!isReadOnly && (
          <TouchableOpacity style={styles.addExBtn} onPress={addExercise}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addExText}>Add Exercise</Text>
          </TouchableOpacity>
        )}

        {!isReadOnly && exercises.length > 0 && (
          <Button title="Finish Workout" onPress={save} size="lg" style={styles.saveBtn} />
        )}
      </ScrollView>

      {/* Rest timer overlay */}
      {restActive && (
        <View style={styles.restOverlay}>
          <View style={styles.restCard}>
            <Text style={styles.restLabel}>Rest</Text>
            <Text style={styles.restCount}>{restSeconds}s</Text>
            <View style={styles.restBar}>
              <View style={[styles.restBarFill, { width: `${(restSeconds / restTotal) * 100}%` as any }]} />
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={skipRestTimer}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

interface SetRowProps {
  set: SetEntry;
  setIdx: number;
  isCurrent: boolean;
  isDone: boolean;
  isReadOnly: boolean;
  onAdjustReps: (delta: number) => void;
  onAdjustWeight: (delta: number) => void;
  onComplete: () => void;
  onToggleWarmup: () => void;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
}

function SetRow({
  set, setIdx, isCurrent, isDone, isReadOnly,
  onAdjustReps, onAdjustWeight, onComplete, onToggleWarmup,
  onWeightChange, onRepsChange,
}: SetRowProps) {
  const targetReps = set.targetReps ?? 0;
  const displayReps = set.reps ?? targetReps;
  const displayWeight = set.weightKg ?? set.targetWeightKg ?? 0;

  return (
    <View style={[styles.setRow, isCurrent && styles.setRowCurrent, isDone && styles.setRowDone]}>
      {/* Set number + warmup badge */}
      <TouchableOpacity
        style={[styles.setNumBadge, set.warmup && styles.setNumBadgeWarmup]}
        onPress={!isReadOnly ? onToggleWarmup : undefined}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={[styles.setNum, set.warmup && styles.setNumWarmup]}>
          {set.warmup ? 'W' : setIdx + 1}
        </Text>
      </TouchableOpacity>

      {/* Weight control */}
      <View style={styles.adjGroup}>
        {!isReadOnly && (
          <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjustWeight(-2.5)}>
            <Ionicons name="remove" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.adjInput}
          value={displayWeight > 0 ? displayWeight.toString() : ''}
          onChangeText={onWeightChange}
          keyboardType="decimal-pad"
          placeholder="kg"
          placeholderTextColor={COLORS.textMuted}
          editable={!isReadOnly}
        />
        {!isReadOnly && (
          <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjustWeight(2.5)}>
            <Ionicons name="add" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Reps control */}
      <View style={styles.adjGroup}>
        {!isReadOnly && (
          <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjustReps(-1)}>
            <Ionicons name="remove" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.adjInput}
          value={displayReps > 0 ? displayReps.toString() : ''}
          onChangeText={onRepsChange}
          keyboardType="numeric"
          placeholder="reps"
          placeholderTextColor={COLORS.textMuted}
          editable={!isReadOnly}
        />
        {!isReadOnly && (
          <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjustReps(1)}>
            <Ionicons name="add" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Complete button */}
      {!isReadOnly && (
        <TouchableOpacity
          style={[styles.completeBtn, isDone && styles.completeBtnDone]}
          onPress={onComplete}
        >
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={isDone ? COLORS.success : isCurrent ? COLORS.primary : COLORS.textMuted}
          />
        </TouchableOpacity>
      )}
      {isReadOnly && (
        <View style={styles.completeBtn}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={isDone ? COLORS.success : COLORS.textMuted}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  energyBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },

  nameInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },

  exCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exName: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  exHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '60',
  },
  setRowCurrent: { backgroundColor: COLORS.primary + '0D' },
  setRowDone: { opacity: 0.55 },

  setNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumBadgeWarmup: { backgroundColor: COLORS.accent + '30' },
  setNum: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  setNumWarmup: { color: COLORS.accent },

  adjGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  adjBtn: {
    padding: 8,
  },
  adjInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
  },

  completeBtn: { paddingHorizontal: 4 },
  completeBtnDone: {},

  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  addSetText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },

  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    padding: 16,
    marginBottom: 12,
  },
  addExText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },

  saveBtn: { marginTop: 8 },

  // Rest timer
  restOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  restCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  restLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  restCount: { color: COLORS.secondary, fontSize: 48, fontWeight: '900', lineHeight: 56 },
  restBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  restBarFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 2 },
  skipBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  skipText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
