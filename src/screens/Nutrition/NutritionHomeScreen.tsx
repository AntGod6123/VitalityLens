import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import { calculateLBM, proteinTargetG, katchMcArdleBMR } from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';

export default function NutritionHomeScreen() {
  const navigation = useNavigation<any>();
  const logs = useAppSelector(s => s.nutrition.logs);
  const supplements = useAppSelector(s => s.nutrition.supplements);
  const mealPlan = useAppSelector(s => s.nutrition.mealPlan);
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const documents = useAppSelector(s => s.medical.documents);
  const uniqueRestrictions = useMemo(
    () => [...new Set(documents.flatMap(d => d.extractedRestrictions ?? []))],
    [documents],
  );
  const userProfile = useAppSelector(s => s.user.profile);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.date.startsWith(today));

  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;
  const proteinTarget = lbm ? proteinTargetG(lbm) : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;
  const activityLevel = userProfile?.activityLevel ?? 'moderately_active';
  const tdeeResult = bmr ? calculateFullTDEE(bmr, activityLevel, 0) : null;
  const tdee = tdeeResult?.tdee ?? null;

  const carbTarget = tdee && proteinTarget ? Math.round((tdee * 0.45) / 4) : null;
  const fatTarget = tdee ? Math.round((tdee * 0.25) / 9) : null;
  const waterTarget = 2500; // ml

  return (
    <ScreenContainer>
      {/* Dietary restrictions banner */}
      {uniqueRestrictions.length > 0 && (
        <TouchableOpacity
          style={styles.restrictionsBanner}
          onPress={() => navigation.navigate('MealPlanner')}
        >
          <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
          <Text style={styles.restrictionsBannerText} numberOfLines={1}>
            Restrictions: {uniqueRestrictions.join(' · ')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}

      {/* Targets & today progress */}
      {tdee ? (
        <View style={styles.targetsCard}>
          <Text style={styles.targetsTitle}>Today's Targets</Text>
          <View style={styles.targetsRow}>
            <TargetItem label="Calories" value={`${tdee}`} unit="kcal" color={COLORS.warning} />
            <TargetItem label="Protein" value={`${proteinTarget}`} unit="g" color={COLORS.primary} />
            <TargetItem label="Carbs" value={`${carbTarget}`} unit="g" color={COLORS.secondary} />
            <TargetItem label="Fat" value={`${fatTarget}`} unit="g" color={COLORS.accent} />
          </View>
          {todayLog && (
            <View style={styles.progressSection}>
              <MacroBar label="Cal" current={todayLog.totalCalories} target={tdee} color={COLORS.warning} />
              <MacroBar label="Pro" current={todayLog.totalProteinG} target={proteinTarget ?? 150} color={COLORS.primary} />
              <MacroBar label="Carb" current={todayLog.totalCarbsG} target={carbTarget ?? 200} color={COLORS.secondary} />
              <MacroBar label="Fat" current={todayLog.totalFatG} target={fatTarget ?? 65} color={COLORS.accent} />
              {todayLog.waterMl != null && (
                <MacroBar label="Water" current={todayLog.waterMl} target={waterTarget} color={COLORS.primary} unit="ml" />
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noBioCard}>
          <Text style={styles.noBioText}>Add a body measurement with body fat % to see calorie and macro targets.</Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.actions}>
        <Button title="Log Today" onPress={() => navigation.navigate('FoodLog', { date: today })} style={styles.actionBtn} />
        <Button title="Meal Plan" onPress={() => navigation.navigate('MealPlanner')} variant={mealPlan ? 'primary' : 'secondary'} style={styles.actionBtn} />
        <Button title="Supplements" onPress={() => navigation.navigate('SupplementLog')} variant="secondary" style={styles.actionBtn} />
      </View>

      <SectionHeader
        title="Recent Logs"
        action={{ label: 'Macro Targets', onPress: () => navigation.navigate('MacroTargets') }}
      />

      {logs.length === 0 ? (
        <EmptyState icon="nutrition-outline" title="No food logs" subtitle="Tap Log Today to start tracking your meals." />
      ) : (
        [...logs]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 7)
          .map(log => (
            <TouchableOpacity
              key={log.id}
              style={styles.logCard}
              onPress={() => navigation.navigate('FoodLog', { date: log.date.split('T')[0] })}
            >
              <View style={styles.logCardTop}>
                <Text style={styles.logDate}>
                  {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.logMacroRow}>
                  <MacroChip label="Cal" value={log.totalCalories} color={COLORS.warning} />
                  <MacroChip label="P" value={`${log.totalProteinG}g`} color={COLORS.primary} />
                  <MacroChip label="C" value={`${log.totalCarbsG}g`} color={COLORS.secondary} />
                  <MacroChip label="F" value={`${log.totalFatG}g`} color={COLORS.accent} />
                </View>
              </View>
              {log.waterMl != null && (
                <View style={styles.waterRow}>
                  <Ionicons name="water-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.waterText}>{log.waterMl} ml water</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
      )}

      {/* Supplements */}
      {supplements.length > 0 && (
        <>
          <SectionHeader
            title="Active Supplements"
            action={{ label: 'Manage', onPress: () => navigation.navigate('SupplementLog') }}
          />
          {supplements.slice(0, 3).map(s => (
            <View key={s.id} style={styles.suppRow}>
              <Ionicons name="flask" size={16} color={COLORS.secondary} style={{ marginRight: 10 }} />
              <Text style={styles.suppName}>{s.name}</Text>
              <Text style={styles.suppDose}>{s.doseAmount}{s.doseUnit}</Text>
            </View>
          ))}
          {supplements.length > 3 && (
            <TouchableOpacity onPress={() => navigation.navigate('SupplementLog')}>
              <Text style={styles.moreSupps}>+{supplements.length - 3} more supplements →</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function TargetItem({ label, value, unit, color }: { label: string; value: string | null; unit: string; color: string }) {
  return (
    <View style={styles.targetItem}>
      <Text style={[styles.targetValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.targetUnit}>{unit}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

function MacroBar({
  label,
  current,
  target,
  color,
  unit = '',
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  const over = current > target;
  return (
    <View style={styles.macroBarWrapper}>
      <View style={styles.macroBarLabelRow}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={[styles.macroBarValue, over && { color: COLORS.danger }]}>
          {current}{unit} / {target}{unit}
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: over ? COLORS.danger : color }]} />
      </View>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + '22' }]}>
      <Text style={[styles.chipText, { color }]}>{label}: {value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  restrictionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '18',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  restrictionsBannerText: { flex: 1, color: COLORS.warning, fontSize: 12, fontWeight: '600' },
  targetsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  targetsTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  targetsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  targetItem: { alignItems: 'center' },
  targetValue: { fontSize: 18, fontWeight: '800' },
  targetUnit: { color: COLORS.textMuted, fontSize: 11 },
  targetLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  progressSection: { gap: 10 },
  macroBarWrapper: { gap: 4 },
  macroBarLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroBarLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  macroBarValue: { color: COLORS.textMuted, fontSize: 11 },
  macroTrack: { height: 7, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  macroFill: { height: 7, borderRadius: 4 },
  noBioCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  noBioText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn: { flex: 1 },
  logCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  logCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logDate: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  logMacroRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  chip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '600' },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  waterText: { color: COLORS.textMuted, fontSize: 12 },
  suppRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suppName: { color: COLORS.text, fontSize: 14, flex: 1 },
  suppDose: { color: COLORS.textMuted, fontSize: 13 },
  moreSupps: { color: COLORS.primary, fontSize: 13, marginTop: 8, paddingBottom: 4 },
});
