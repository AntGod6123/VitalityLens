import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import { calculateLBM, proteinTargetG, calculateTDEE, katchMcArdleBMR } from '../../utils/bodyComposition';

export default function NutritionHomeScreen() {
  const navigation = useNavigation<any>();
  const logs = useAppSelector(s => s.nutrition.logs);
  const supplements = useAppSelector(s => s.nutrition.supplements);
  const latest = useAppSelector(s => s.body.latestMeasurement);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.date.startsWith(today));

  const lbm = latest ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null)) : null;
  const proteinTarget = lbm ? proteinTargetG(lbm) : null;
  const tdee = lbm ? calculateTDEE(katchMcArdleBMR(lbm), 'moderately_active') : null;

  return (
    <ScreenContainer>
      {/* Targets */}
      {tdee && (
        <View style={styles.targetsCard}>
          <Text style={styles.targetsTitle}>Today's Targets</Text>
          <View style={styles.targetsRow}>
            <TargetItem label="Calories" value={`${tdee}`} unit="kcal" color={COLORS.warning} />
            <TargetItem label="Protein" value={`${proteinTarget}`} unit="g" color={COLORS.primary} />
          </View>
          {todayLog && (
            <View style={styles.progressRow}>
              <MacroBar label="Cal" current={todayLog.totalCalories} target={tdee} color={COLORS.warning} />
              <MacroBar label="Pro" current={todayLog.totalProteinG} target={proteinTarget ?? 150} color={COLORS.primary} />
              <MacroBar label="Carb" current={todayLog.totalCarbsG} target={Math.round(tdee * 0.45 / 4)} color={COLORS.secondary} />
              <MacroBar label="Fat" current={todayLog.totalFatG} target={Math.round(tdee * 0.25 / 9)} color={COLORS.accent} />
            </View>
          )}
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.actions}>
        <Button title="Log Food" onPress={() => navigation.navigate('FoodLog', { date: today })} style={styles.actionBtn} />
        <Button title="Supplements" onPress={() => navigation.navigate('SupplementLog')} variant="secondary" style={styles.actionBtn} />
        <Button title="AI Analysis" onPress={() => navigation.navigate('NutritionAnalysis')} variant="secondary" style={styles.actionBtn} />
      </View>

      <SectionHeader
        title="Recent Logs"
        action={{ label: 'Macro Targets', onPress: () => navigation.navigate('MacroTargets') }}
      />

      {logs.length === 0 ? (
        <EmptyState icon="nutrition-outline" title="No food logs" subtitle="Start logging meals to track your nutrition." />
      ) : (
        [...logs].reverse().slice(0, 5).map(log => (
          <TouchableOpacity
            key={log.id}
            style={styles.logCard}
            onPress={() => navigation.navigate('FoodLog', { date: log.date })}
          >
            <Text style={styles.logDate}>{new Date(log.date).toLocaleDateString()}</Text>
            <View style={styles.macroRow}>
              <MacroChip label="Cal" value={log.totalCalories} color={COLORS.warning} />
              <MacroChip label="Pro" value={`${log.totalProteinG}g`} color={COLORS.primary} />
              <MacroChip label="Carb" value={`${log.totalCarbsG}g`} color={COLORS.secondary} />
              <MacroChip label="Fat" value={`${log.totalFatG}g`} color={COLORS.accent} />
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Supplements */}
      {supplements.length > 0 && (
        <>
          <SectionHeader title="Active Supplements" action={{ label: 'Manage', onPress: () => navigation.navigate('SupplementLog') }} />
          {supplements.slice(0, 3).map(s => (
            <View key={s.id} style={styles.suppRow}>
              <Ionicons name="flask" size={16} color={COLORS.secondary} style={{ marginRight: 10 }} />
              <Text style={styles.suppName}>{s.name}</Text>
              <Text style={styles.suppDose}>{s.doseAmount}{s.doseUnit}</Text>
            </View>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

function TargetItem({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.targetItem}>
      <Text style={styles.targetValue}><Text style={{ color }}>{value}</Text> {unit}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <View style={styles.macroBarWrapper}>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroBarLabel}>{label} {current}/{target}</Text>
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
  targetsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  targetsTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  targetsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  targetItem: {},
  targetValue: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  targetLabel: { color: COLORS.textMuted, fontSize: 12 },
  progressRow: { gap: 8 },
  macroBarWrapper: {},
  macroTrack: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  macroFill: { height: 6, borderRadius: 3 },
  macroBarLabel: { color: COLORS.textMuted, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: { flex: 1 },
  logCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  logDate: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  macroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '600' },
  suppRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suppName: { color: COLORS.text, fontSize: 14, flex: 1 },
  suppDose: { color: COLORS.textMuted, fontSize: 13 },
});
