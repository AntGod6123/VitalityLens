import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import MetricCard from '../../components/common/MetricCard';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS, ACTIVITY_LEVELS } from '../../constants';
import {
  katchMcArdleBMR,
  mifflinStJeorBMR,
  calculateTDEE,
  calculateLBM,
  cuttingCalories,
  bulkingCalories,
  proteinTargetG,
} from '../../utils/bodyComposition';

export default function EnergyMetricsScreen() {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const [activity, setActivity] = useState('moderately_active');

  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;

  const bmrKM = lbm ? katchMcArdleBMR(lbm) : null;
  const tdee = bmrKM ? calculateTDEE(bmrKM, activity) : null;
  const cutting = tdee ? cuttingCalories(tdee) : null;
  const bulking = tdee ? bulkingCalories(tdee) : null;
  const protein = lbm ? proteinTargetG(lbm) : null;

  return (
    <ScreenContainer>
      <Text style={styles.heading}>Energy & Metabolism</Text>
      <Text style={styles.sub}>
        BMR calculated using the Katch-McArdle formula (requires body fat %). TDEE adjusts for activity.
      </Text>

      {!latest || !lbm ? (
        <Text style={styles.empty}>Add a body measurement with body fat % to unlock energy metrics.</Text>
      ) : (
        <>
          {/* Activity selector */}
          <Text style={styles.sectionTitle}>Activity Level</Text>
          {ACTIVITY_LEVELS.map(level => (
            <TouchableOpacity
              key={level.value}
              style={[styles.activityCard, activity === level.value && styles.activityCardActive]}
              onPress={() => setActivity(level.value)}
            >
              <View>
                <Text style={[styles.activityLabel, activity === level.value && styles.activityLabelActive]}>
                  {level.label}
                </Text>
                <Text style={styles.activityDesc}>{level.description}</Text>
              </View>
              {activity === level.value && (
                <Text style={styles.multiplier}>×{[1.2, 1.375, 1.55, 1.725, 1.9][ACTIVITY_LEVELS.findIndex(l => l.value === level.value)]}</Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Results */}
          <Text style={styles.sectionTitle}>Your Numbers</Text>
          <View style={styles.grid}>
            <MetricCard label="BMR" value={Math.round(bmrKM!)} unit="kcal" subtitle="Katch-McArdle" accentColor={COLORS.primary} style={styles.gridItem} />
            <MetricCard label="TDEE" value={Math.round(tdee!)} unit="kcal" subtitle="Maintenance" accentColor={COLORS.secondary} style={styles.gridItem} />
            <MetricCard label="Cut" value={Math.round(cutting!)} unit="kcal" subtitle="−20% deficit" accentColor={COLORS.accent} style={styles.gridItem} />
            <MetricCard label="Bulk" value={Math.round(bulking!)} unit="kcal" subtitle="+10% surplus" accentColor={COLORS.warning} style={styles.gridItem} />
          </View>

          <View style={styles.proteinCard}>
            <Text style={styles.proteinLabel}>Daily Protein Target</Text>
            <Text style={styles.proteinValue}>{protein} g</Text>
            <Text style={styles.proteinNote}>2.2 g × {lbm.toFixed(1)} kg LBM — optimal for muscle protein synthesis</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>About Katch-McArdle</Text>
            <Text style={styles.infoText}>
              Unlike Mifflin-St Jeor, Katch-McArdle uses lean body mass instead of total weight, making it more accurate for people who know their body fat percentage. Formula: BMR = 370 + (21.6 × LBM in kg).
            </Text>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  sub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  empty: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginTop: 60 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  activityCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  activityCardActive: { borderColor: COLORS.primary },
  activityLabel: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  activityLabelActive: { color: COLORS.text },
  activityDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  multiplier: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridItem: { width: '48%' },
  proteinCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  proteinLabel: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  proteinValue: { color: COLORS.secondary, fontSize: 36, fontWeight: '800', marginVertical: 4 },
  proteinNote: { color: COLORS.textMuted, fontSize: 12 },
  infoBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 16, marginTop: 4 },
  infoTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
});
