import React, { useMemo, useState } from 'react';
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
import SectionHeader from '../../components/common/SectionHeader';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setMealPlan, clearMealPlan } from '../../store/slices/nutritionSlice';
import { COLORS } from '../../constants';
import { MealPlanDay, MealPlanSlot, MealPlanTemplate } from '../../types';
import { calculateLBM, proteinTargetG, katchMcArdleBMR } from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';

const DEFAULT_SLOT_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function emptySlot(name: string): MealPlanSlot {
  return { name, description: '', calories: undefined, proteinG: undefined, carbsG: undefined, fatG: undefined };
}

function emptyDay(label: string): MealPlanDay {
  return { dayLabel: label, meals: DEFAULT_SLOT_NAMES.map(emptySlot) };
}

export default function MealPlannerScreen() {
  const dispatch = useAppDispatch();
  const savedPlan = useAppSelector(s => s.nutrition.mealPlan);
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const userProfile = useAppSelector(s => s.user.profile);
  const restrictions = useAppSelector(s =>
    s.medical.documents.flatMap(d => d.extractedRestrictions ?? [])
  );
  const uniqueRestrictions = useMemo(() => [...new Set(restrictions)], [restrictions]);

  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;
  const tdeeResult = bmr ? calculateFullTDEE(bmr, userProfile?.activityLevel ?? 'moderately_active', 0) : null;
  const tdeeTarget = tdeeResult?.tdee ?? null;
  const proteinTarget = lbm ? Math.round(proteinTargetG(lbm)) : null;

  const [planName, setPlanName] = useState(savedPlan?.name ?? 'My Meal Plan');
  const [days, setDays] = useState<MealPlanDay[]>(
    savedPlan?.days ?? [emptyDay('Monday'), emptyDay('Tuesday'), emptyDay('Wednesday'), emptyDay('Thursday'), emptyDay('Friday'), emptyDay('Saturday'), emptyDay('Sunday')]
  );
  const [activeDay, setActiveDay] = useState(0);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  function updateSlot(dayIdx: number, slotIdx: number, patch: Partial<MealPlanSlot>) {
    setDays(prev => prev.map((d, di) =>
      di !== dayIdx ? d : {
        ...d,
        meals: d.meals.map((m, mi) => mi !== slotIdx ? m : { ...m, ...patch }),
      }
    ));
  }

  function addSlot(dayIdx: number) {
    setDays(prev => prev.map((d, di) =>
      di !== dayIdx ? d : { ...d, meals: [...d.meals, emptySlot('Snack')] }
    ));
  }

  function removeSlot(dayIdx: number, slotIdx: number) {
    setDays(prev => prev.map((d, di) =>
      di !== dayIdx ? d : { ...d, meals: d.meals.filter((_, mi) => mi !== slotIdx) }
    ));
  }

  function copyDayToAll(dayIdx: number) {
    const source = days[dayIdx];
    setDays(prev => prev.map((d, di) =>
      di === dayIdx ? d : { ...d, meals: source.meals.map(m => ({ ...m })) }
    ));
  }

  function savePlan() {
    const plan: MealPlanTemplate = {
      id: savedPlan?.id ?? Date.now().toString(),
      name: planName.trim() || 'My Meal Plan',
      createdAt: savedPlan?.createdAt ?? new Date().toISOString(),
      days,
    };
    dispatch(setMealPlan(plan));
    Alert.alert('Saved', 'Meal plan saved.');
  }

  function deletePlan() {
    Alert.alert('Delete Plan', 'Remove this meal plan?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(clearMealPlan()) },
    ]);
  }

  const day = days[activeDay];

  const dayTotals = useMemo(() => ({
    cal: day.meals.reduce((s, m) => s + (m.calories ?? 0), 0),
    pro: day.meals.reduce((s, m) => s + (m.proteinG ?? 0), 0),
    carb: day.meals.reduce((s, m) => s + (m.carbsG ?? 0), 0),
    fat: day.meals.reduce((s, m) => s + (m.fatG ?? 0), 0),
  }), [day]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Dietary restrictions */}
      {uniqueRestrictions.length > 0 && (
        <View style={styles.restrictionsCard}>
          <View style={styles.restrictionsHeader}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
            <Text style={styles.restrictionsTitle}>Medical Dietary Restrictions</Text>
          </View>
          <View style={styles.restrictionsList}>
            {uniqueRestrictions.map((r, i) => (
              <View key={i} style={styles.restrictionChip}>
                <Text style={styles.restrictionText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Plan name */}
      <View style={styles.nameRow}>
        <TextInput
          style={styles.nameInput}
          value={planName}
          onChangeText={setPlanName}
          placeholder="Plan name"
          placeholderTextColor={COLORS.textMuted}
        />
        {savedPlan && (
          <TouchableOpacity onPress={deletePlan} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Macro targets summary */}
      {tdeeTarget && (
        <View style={styles.targetsRow}>
          <TargetPill label="Calories" value={tdeeTarget} unit="kcal" color={COLORS.warning} />
          <TargetPill label="Protein" value={proteinTarget} unit="g" color={COLORS.primary} />
          <TargetPill label="Day total" value={dayTotals.cal > 0 ? dayTotals.cal : null} unit="kcal" color={dayTotals.cal > tdeeTarget * 1.1 ? COLORS.danger : COLORS.secondary} />
        </View>
      )}

      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs} contentContainerStyle={{ paddingHorizontal: 2 }}>
        {DAY_LABELS.map((label, i) => (
          <TouchableOpacity
            key={label}
            style={[styles.dayTab, activeDay === i && styles.dayTabActive]}
            onPress={() => { setActiveDay(i); setExpandedSlot(null); }}
          >
            <Text style={[styles.dayTabText, activeDay === i && styles.dayTabTextActive]}>
              {label.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Day header */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{day.dayLabel}</Text>
        <TouchableOpacity onPress={() => copyDayToAll(activeDay)}>
          <Text style={styles.copyAllText}>Copy to all days</Text>
        </TouchableOpacity>
      </View>

      {/* Day totals bar */}
      {dayTotals.cal > 0 && (
        <View style={styles.totalsRow}>
          <TotalChip label="Cal" value={dayTotals.cal} color={COLORS.warning} />
          <TotalChip label="P" value={dayTotals.pro} unit="g" color={COLORS.primary} />
          <TotalChip label="C" value={dayTotals.carb} unit="g" color={COLORS.secondary} />
          <TotalChip label="F" value={dayTotals.fat} unit="g" color={COLORS.accent} />
        </View>
      )}

      {/* Meal slots */}
      {day.meals.map((slot, si) => (
        <View key={si} style={styles.slotCard}>
          <TouchableOpacity
            style={styles.slotHeader}
            onPress={() => setExpandedSlot(expandedSlot === si ? null : si)}
          >
            <View style={styles.slotLeft}>
              <Text style={styles.slotName}>{slot.name}</Text>
              {slot.description ? <Text style={styles.slotDesc} numberOfLines={1}>{slot.description}</Text> : null}
            </View>
            <View style={styles.slotRight}>
              {slot.calories ? <Text style={styles.slotCal}>{slot.calories} kcal</Text> : null}
              <Ionicons
                name={expandedSlot === si ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.textMuted}
              />
            </View>
          </TouchableOpacity>

          {expandedSlot === si && (
            <View style={styles.slotForm}>
              <View style={styles.slotNameRow}>
                <TextInput
                  style={[styles.slotInput, { flex: 1 }]}
                  value={slot.name}
                  onChangeText={v => updateSlot(activeDay, si, { name: v })}
                  placeholder="Meal name"
                  placeholderTextColor={COLORS.textMuted}
                />
                {day.meals.length > 1 && (
                  <TouchableOpacity onPress={() => removeSlot(activeDay, si)} style={{ padding: 8 }}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.slotInput}
                value={slot.description ?? ''}
                onChangeText={v => updateSlot(activeDay, si, { description: v })}
                placeholder="e.g. Oats, banana, whey protein shake"
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
              <View style={styles.macroInputRow}>
                <MacroInput label="Cal" value={slot.calories} onChange={v => updateSlot(activeDay, si, { calories: v })} />
                <MacroInput label="Pro g" value={slot.proteinG} onChange={v => updateSlot(activeDay, si, { proteinG: v })} />
                <MacroInput label="Carb g" value={slot.carbsG} onChange={v => updateSlot(activeDay, si, { carbsG: v })} />
                <MacroInput label="Fat g" value={slot.fatG} onChange={v => updateSlot(activeDay, si, { fatG: v })} />
              </View>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addSlotBtn} onPress={() => addSlot(activeDay)}>
        <Ionicons name="add" size={16} color={COLORS.primary} />
        <Text style={styles.addSlotText}>Add meal slot</Text>
      </TouchableOpacity>

      <SectionHeader title="" />
      <Button title="Save Meal Plan" onPress={savePlan} size="lg" />
    </ScrollView>
  );
}

function TargetPill({ label, value, unit, color }: { label: string; value: number | null; unit: string; color: string }) {
  return (
    <View style={[styles.targetPill, { borderColor: color + '50' }]}>
      <Text style={styles.targetPillLabel}>{label}</Text>
      <Text style={[styles.targetPillValue, { color }]}>{value ?? '—'} {unit}</Text>
    </View>
  );
}

function TotalChip({ label, value, unit = 'kcal', color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <View style={[styles.totalChip, { backgroundColor: color + '22' }]}>
      <Text style={[styles.totalChipLabel, { color }]}>{label}</Text>
      <Text style={[styles.totalChipVal, { color }]}>{value}{unit === 'kcal' ? '' : unit}</Text>
    </View>
  );
}

function MacroInput({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <View style={styles.macroField}>
      <Text style={styles.macroFieldLabel}>{label}</Text>
      <TextInput
        style={styles.macroFieldInput}
        value={value != null ? String(value) : ''}
        onChangeText={t => onChange(t === '' ? undefined : Number(t) || 0)}
        placeholder="—"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 60 },

  restrictionsCard: {
    backgroundColor: COLORS.warning + '18',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  restrictionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  restrictionsTitle: { color: COLORS.warning, fontSize: 13, fontWeight: '700' },
  restrictionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  restrictionChip: { backgroundColor: COLORS.warning + '30', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  restrictionText: { color: COLORS.warning, fontSize: 12, fontWeight: '600' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  nameInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteBtn: { padding: 10 },

  targetsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  targetPill: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  targetPillLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 3 },
  targetPillValue: { fontSize: 12, fontWeight: '700' },

  dayTabs: { flexGrow: 0, marginBottom: 12 },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 6, backgroundColor: COLORS.surface },
  dayTabActive: { backgroundColor: COLORS.primary },
  dayTabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  dayTabTextActive: { color: '#fff' },

  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  copyAllText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  totalsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  totalChip: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  totalChipLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  totalChipVal: { fontSize: 13, fontWeight: '800' },

  slotCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  slotLeft: { flex: 1 },
  slotName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  slotDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  slotRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotCal: { color: COLORS.warning, fontSize: 12, fontWeight: '600' },

  slotForm: { padding: 14, paddingTop: 0, gap: 10 },
  slotNameRow: { flexDirection: 'row', alignItems: 'center' },
  slotInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  macroInputRow: { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1, alignItems: 'center' },
  macroFieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  macroFieldInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    color: COLORS.text,
    fontSize: 13,
    paddingHorizontal: 6,
    paddingVertical: 7,
    textAlign: 'center',
    width: '100%',
  },

  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary + '60',
    marginBottom: 16,
  },
  addSlotText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
