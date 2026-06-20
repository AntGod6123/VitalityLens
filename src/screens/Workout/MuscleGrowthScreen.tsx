import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import { naturalLBMCeiling, calculateLBM } from '../../utils/bodyComposition';

interface MuscleGroupEstimate {
  group: string;
  currentPct: number;
  color: string;
}

// Rough muscle group distribution of total LBM
const MUSCLE_DISTRIBUTION: { group: string; pct: number; color: string }[] = [
  { group: 'Quads', pct: 0.14, color: '#3B82F6' },
  { group: 'Glutes', pct: 0.12, color: '#8B5CF6' },
  { group: 'Hamstrings', pct: 0.10, color: '#6366F1' },
  { group: 'Back / Lats', pct: 0.18, color: '#10B981' },
  { group: 'Chest', pct: 0.08, color: '#F59E0B' },
  { group: 'Shoulders', pct: 0.07, color: '#EF4444' },
  { group: 'Calves', pct: 0.06, color: '#EC4899' },
  { group: 'Arms', pct: 0.06, color: '#F97316' },
  { group: 'Core', pct: 0.05, color: '#14B8A6' },
  { group: 'Other', pct: 0.14, color: '#94A3B8' },
];

export default function MuscleGrowthScreen() {
  const latest = useAppSelector(s => s.body.latestMeasurement);

  if (!latest) {
    return (
      <ScreenContainer>
        <Text style={styles.empty}>Add a body measurement to see your muscle growth projections.</Text>
      </ScreenContainer>
    );
  }

  const lbm = latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null);
  const naturalCeiling = naturalLBMCeiling(latest.heightCm);
  const pctOfPotential = lbm ? Math.min((lbm / naturalCeiling) * 100, 100) : null;

  // Monthly gain rate slows as you approach ceiling (newbie ~1kg/mo → advanced ~0.1kg/mo)
  const gainRate = pctOfPotential
    ? Math.max(0.1, 1.0 * (1 - pctOfPotential / 100) + 0.1)
    : 0.5;
  const monthsToGoal = lbm ? Math.round((naturalCeiling - lbm) / gainRate) : null;

  return (
    <ScreenContainer>
      <Text style={styles.heading}>Natural Muscle Potential</Text>
      <Text style={styles.sub}>
        Based on the Berkhan/Martin model (height − 100 = peak LBM at ~5% body fat)
      </Text>

      {/* Potential bar */}
      <View style={styles.potentialCard}>
        <View style={styles.potRow}>
          <Text style={styles.potLabel}>Current LBM</Text>
          <Text style={styles.potValue}>{lbm ? lbm.toFixed(1) : '—'} kg</Text>
        </View>
        <View style={styles.potRow}>
          <Text style={styles.potLabel}>Natural Ceiling</Text>
          <Text style={styles.potValue}>{naturalCeiling.toFixed(1)} kg</Text>
        </View>
        <View style={styles.potRow}>
          <Text style={styles.potLabel}>% of Potential</Text>
          <Text style={[styles.potValue, { color: COLORS.secondary }]}>
            {pctOfPotential ? pctOfPotential.toFixed(1) : '—'}%
          </Text>
        </View>

        {/* Progress bar */}
        {pctOfPotential != null && (
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pctOfPotential}%` }]} />
          </View>
        )}

        <View style={styles.potRow}>
          <Text style={styles.potLabel}>Est. gain rate</Text>
          <Text style={styles.potValue}>~{gainRate.toFixed(2)} kg/month</Text>
        </View>
        <View style={styles.potRow}>
          <Text style={styles.potLabel}>Months to ceiling</Text>
          <Text style={styles.potValue}>{monthsToGoal ?? '—'} months</Text>
        </View>
      </View>

      {/* Per-muscle breakdown */}
      {lbm && (
        <>
          <Text style={styles.sectionTitle}>Estimated Muscle Distribution</Text>
          <Text style={styles.sectionSub}>Approximate based on total LBM — DEXA scan gives precise values</Text>
          {MUSCLE_DISTRIBUTION.map(m => {
            const estimated = lbm * m.pct;
            const ceiling = naturalCeiling * m.pct;
            const pct = Math.min((estimated / ceiling) * 100, 100);
            return (
              <View key={m.group} style={styles.muscleRow}>
                <View style={styles.muscleInfo}>
                  <Text style={styles.muscleName}>{m.group}</Text>
                  <Text style={styles.muscleValue}>{estimated.toFixed(1)} / {ceiling.toFixed(1)} kg</Text>
                </View>
                <View style={styles.musclebar}>
                  <View style={[styles.musclebarFill, { width: `${pct}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={[styles.musclePct, { color: m.color }]}>{pct.toFixed(0)}%</Text>
              </View>
            );
          })}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  sub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  potentialCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 24 },
  potRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  potLabel: { color: COLORS.textMuted, fontSize: 14 },
  potValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  barTrack: { height: 10, backgroundColor: COLORS.surfaceLight, borderRadius: 5, marginBottom: 12, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: COLORS.secondary, borderRadius: 5 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 16 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  muscleInfo: { width: 110 },
  muscleName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  muscleValue: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  musclebar: { flex: 1, height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  musclebarFill: { height: 8, borderRadius: 4 },
  musclePct: { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  empty: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginTop: 60 },
});
