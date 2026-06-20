import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import MetricCard from '../../components/common/MetricCard';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS, ACTIVITY_LEVELS } from '../../constants';
import {
  katchMcArdleBMR,
  calculateTDEE,
  calculateLBM,
  cuttingCalories,
  bulkingCalories,
  proteinTargetG,
} from '../../utils/bodyComposition';

export default function MacroTargetsScreen() {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const [goal, setGoal] = useState<'cut' | 'maintain' | 'bulk'>('maintain');

  const lbm = latest ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null)) : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;
  const tdee = bmr ? calculateTDEE(bmr, 'moderately_active') : null;

  const calories = tdee
    ? goal === 'cut' ? cuttingCalories(tdee)
    : goal === 'bulk' ? bulkingCalories(tdee)
    : tdee
    : null;

  const protein = lbm ? proteinTargetG(lbm) : null;
  const fat = calories ? Math.round((calories * 0.25) / 9) : null;
  const carbs = calories && protein && fat ? Math.round((calories - protein * 4 - fat * 9) / 4) : null;

  return (
    <ScreenContainer>
      <Text style={styles.heading}>Macro Targets</Text>
      <Text style={styles.sub}>Targets are auto-calculated from your body composition and activity level.</Text>

      {/* Goal selector */}
      <View style={styles.goalRow}>
        {(['cut', 'maintain', 'bulk'] as const).map(g => (
          <GoalButton key={g} label={g} active={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>

      {!calories ? (
        <Text style={styles.empty}>Add a body measurement with body fat % to unlock macro targets.</Text>
      ) : (
        <>
          <View style={styles.grid}>
            <MetricCard label="Calories" value={Math.round(calories)} unit="kcal" accentColor={COLORS.warning} style={styles.gridItem} />
            <MetricCard label="Protein" value={`${protein}`} unit="g" subtitle="2.2g × LBM" accentColor={COLORS.primary} style={styles.gridItem} />
            <MetricCard label="Carbs" value={`${carbs}`} unit="g" subtitle="Remaining cals" accentColor={COLORS.secondary} style={styles.gridItem} />
            <MetricCard label="Fat" value={`${fat}`} unit="g" subtitle="25% of cals" accentColor={COLORS.accent} style={styles.gridItem} />
          </View>

          {/* Macro pie breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Calorie Breakdown</Text>
            {[
              { label: 'Protein', grams: protein ?? 0, cal: (protein ?? 0) * 4, color: COLORS.primary },
              { label: 'Carbs', grams: carbs ?? 0, cal: (carbs ?? 0) * 4, color: COLORS.secondary },
              { label: 'Fat', grams: fat ?? 0, cal: (fat ?? 0) * 9, color: COLORS.accent },
            ].map(m => (
              <View key={m.label} style={styles.macroBreakRow}>
                <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                <Text style={styles.macroLabel}>{m.label}</Text>
                <Text style={styles.macroGrams}>{m.grams}g</Text>
                <View style={styles.macroTrack}>
                  <View style={[styles.macroFill, { width: `${(m.cal / calories!) * 100}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={styles.macroPct}>{Math.round((m.cal / calories!) * 100)}%</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function GoalButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const labels: Record<string, string> = { cut: 'Cut (−20%)', maintain: 'Maintain', bulk: 'Bulk (+10%)' };
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={[styles.goalBtn, active && styles.goalBtnActive]}
        onPress={onPress}
      >
        {labels[label]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  sub: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20 },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  goalBtn: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', backgroundColor: COLORS.surface, borderRadius: 8, padding: 10, textAlign: 'center' },
  goalBtnActive: { backgroundColor: COLORS.primary, color: '#fff' },
  empty: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginTop: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridItem: { width: '48%' },
  breakdownCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  breakdownTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 16 },
  macroBreakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  macroDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  macroLabel: { color: COLORS.text, fontSize: 13, width: 52 },
  macroGrams: { color: COLORS.textMuted, fontSize: 13, width: 40 },
  macroTrack: { flex: 1, height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  macroFill: { height: 8, borderRadius: 4 },
  macroPct: { color: COLORS.textMuted, fontSize: 12, width: 32, textAlign: 'right' },
});
