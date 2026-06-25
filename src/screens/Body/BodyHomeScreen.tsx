import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import MetricCard from '../../components/common/MetricCard';
import SectionHeader from '../../components/common/SectionHeader';
import GaugeBar from '../../components/charts/GaugeBar';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useUnits } from '../../hooks/useUnits';
import { COLORS, FFMI_BANDS, FMI_BANDS } from '../../constants';
import {
  calculateFFMI,
  calculateFMI,
  calculateLBM,
  calculateFatMass,
  katchMcArdleBMR,
} from '../../utils/bodyComposition';
import { estimateBodyCompChange, calculateFullTDEE } from '../../utils/energyExpenditure';

export default function BodyHomeScreen() {
  const navigation = useNavigation<any>();
  const { formatWeight, formatHeight, weightUnit } = useUnits();
  const measurements = useAppSelector(s => s.body.measurements);
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);
  const nutritionLogs = useAppSelector(s => s.nutrition.logs);
  const userProfile = useAppSelector(s => s.user.profile);

  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;
  const fm = latest
    ? (latest.fatMassKg ?? (latest.bodyFatPercent ? calculateFatMass(latest.weightKg, latest.bodyFatPercent) : null))
    : null;
  const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
  const fmi = latest && fm ? calculateFMI(fm, latest.heightCm) : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;

  // Between-baseline body comp estimation
  const estimated = useMemo(() => {
    const baseline = [...measurements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .find(m => m.isBaseline && m.bodyFatPercent);
    if (!baseline || !baseline.bodyFatPercent) return null;

    const baselineTime = new Date(baseline.date).getTime();
    const daysSince = (Date.now() - baselineTime) / (24 * 3600 * 1000);
    if (daysSince < 1) return null;

    const workoutsSince = sessions.filter(s => new Date(s.date).getTime() > baselineTime);
    const aerobicKcal = workoutsSince.reduce((sum, s) => sum + (s.energyResult?.aerobicKcal ?? 0), 0);
    const anaerobicKcal = workoutsSince.reduce((sum, s) => sum + (s.energyResult?.anaerobicKcal ?? 0), 0);

    // Only show estimate when there's actual workout data to project from
    if (aerobicKcal + anaerobicKcal === 0) return null;

    // Sum calorie balance from nutrition logs since baseline
    const activityLevel = userProfile?.activityLevel ?? 'moderately_active';
    const logsSince = nutritionLogs.filter(l => new Date(l.date).getTime() > baselineTime);
    const cumulativeCalorieBalance = logsSince.reduce((total, log) => {
      const logDate = log.date;
      const workoutKcalOnDay = sessions
        .filter(s => s.date.startsWith(logDate.slice(0, 10)))
        .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
      const estimatedTDEE = bmr ? calculateFullTDEE(bmr, activityLevel, workoutKcalOnDay).tdee : 0;
      return total + (log.totalCalories - estimatedTDEE);
    }, 0);

    return estimateBodyCompChange({
      daysSinceBaseline: daysSince,
      cumulativeCalorieBalance,
      cumulativeAerobicKcal: aerobicKcal,
      cumulativeAnaerobicKcal: anaerobicKcal,
      baselineWeightKg: baseline.weightKg,
      baselineBFPercent: baseline.bodyFatPercent,
    });
  }, [measurements, sessions, nutritionLogs, userProfile, bmr]);

  return (
    <ScreenContainer>
      <View style={styles.topRow}>
        <Button
          title="+ Add Measurement"
          onPress={() => navigation.navigate('AddMeasurement')}
          style={styles.addBtn}
        />
        <TouchableOpacity
          style={styles.chartsBtn}
          onPress={() => navigation.navigate('ProgressCharts')}
        >
          <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chartsBtn}
          onPress={() => navigation.navigate('GoalTracker')}
        >
          <Ionicons name="flag-outline" size={20} color={COLORS.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chartsBtn}
          onPress={() => navigation.navigate('MuscleGrowthProjection')}
        >
          <Ionicons name="trending-up-outline" size={20} color={COLORS.warning} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chartsBtn}
          onPress={() => navigation.navigate('MedicalHome')}
        >
          <Ionicons name="medkit-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {!latest ? (
        <EmptyState
          icon="body-outline"
          title="No measurements yet"
          subtitle="Add your first body measurement to see FFMI, FMI, BMR, and TDEE."
        />
      ) : (
        <>
          <SectionHeader title="Latest Snapshot" />
          <Text style={styles.date}>
            {new Date(latest.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>

          {/* Core metrics grid */}
          <View style={styles.grid}>
            <MetricCard label="Weight" value={String(formatWeight(latest.weightKg))} unit={weightUnit} accentColor={COLORS.text} style={styles.gridItem} />
            <MetricCard label="Body Fat" value={latest.bodyFatPercent ? latest.bodyFatPercent.toFixed(1) : '—'} unit="%" accentColor={COLORS.warning} style={styles.gridItem} />
            <MetricCard label="LBM" value={lbm ? lbm.toFixed(1) : '—'} unit="kg" subtitle="Lean Body Mass" accentColor={COLORS.primary} style={styles.gridItem} />
            <MetricCard label="Fat Mass" value={fm ? fm.toFixed(1) : '—'} unit="kg" accentColor={COLORS.accent} style={styles.gridItem} />
            <MetricCard label="BMR" value={bmr ? Math.round(bmr) : '—'} unit="kcal" subtitle="Katch-McArdle" accentColor={COLORS.secondary} style={styles.gridItem} onPress={() => navigation.navigate('EnergyMetrics')} />
          </View>

          {/* Estimated body comp */}
          {estimated && (
            <TouchableOpacity style={styles.estimatedCard} onPress={() => navigation.navigate('ProgressCharts')}>
              <View style={styles.estimatedHeader}>
                <Ionicons name="analytics-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.estimatedTitle}>Estimated Since Baseline</Text>
                <Text style={styles.estimatedSub}>from workout energy</Text>
              </View>
              <View style={styles.estimatedRow}>
                <EstDelta label="Weight" value={estimated.estimatedWeightKg} unit="kg" delta={estimated.deltaFatKg + estimated.deltaLBMKg} />
                <EstDelta label="Body Fat" value={estimated.estimatedBFPercent} unit="%" delta={-Math.abs(estimated.deltaFatKg)} downIsGood />
                <EstDelta label="Fat Δ" value={estimated.deltaFatKg} unit="kg" delta={estimated.deltaFatKg} downIsGood showSign />
                <EstDelta label="LBM Δ" value={estimated.deltaLBMKg} unit="kg" delta={estimated.deltaLBMKg} showSign />
              </View>
            </TouchableOpacity>
          )}

          {/* FFMI gauge */}
          {ffmi != null && (
            <TouchableOpacity style={styles.gaugeCard} onPress={() => navigation.navigate('FFMIDetail')}>
              <Text style={styles.gaugeTitle}>FFMI — Fat-Free Mass Index</Text>
              <GaugeBar value={ffmi} min={14} max={30} bands={FFMI_BANDS as any} label="Tap for details" />
            </TouchableOpacity>
          )}

          {/* FMI gauge */}
          {fmi != null && (
            <TouchableOpacity style={styles.gaugeCard} onPress={() => navigation.navigate('FMIDetail')}>
              <Text style={styles.gaugeTitle}>FMI — Fat Mass Index</Text>
              <GaugeBar value={fmi} min={0} max={20} bands={FMI_BANDS.male as any} label="Tap for details" />
            </TouchableOpacity>
          )}

          {/* History */}
          <SectionHeader
            title={`History (${measurements.length})`}
            action={{ label: 'View All →', onPress: () => navigation.navigate('MeasurementHistory') }}
          />
          {[...measurements]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((m) => (
            <View key={m.id} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{new Date(m.date).toLocaleDateString()}</Text>
                {m.isBaseline && (
                  <View style={styles.baselineBadge}>
                    <Text style={styles.baselineBadgeText}>baseline</Text>
                  </View>
                )}
              </View>
              <Text style={styles.historyVal}>{formatWeight(m.weightKg)} {weightUnit}</Text>
              {m.bodyFatPercent ? <Text style={styles.historyVal}>{m.bodyFatPercent}% BF</Text> : null}
              {m.ffmi ? <Text style={styles.historyVal}>FFMI {m.ffmi.toFixed(1)}</Text> : null}
            </View>
          ))}
          {measurements.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => navigation.navigate('MeasurementHistory')}
            >
              <Text style={styles.viewAllText}>View all {measurements.length} measurements →</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function EstDelta({
  label, value, unit, delta, downIsGood, showSign,
}: {
  label: string; value: number; unit: string; delta: number; downIsGood?: boolean; showSign?: boolean;
}) {
  const isPositive = delta > 0;
  const isGood = downIsGood ? !isPositive : isPositive;
  const color = Math.abs(delta) < 0.05 ? COLORS.textMuted : isGood ? COLORS.success : COLORS.danger;
  const prefix = showSign && delta > 0 ? '+' : '';
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: COLORS.textMuted, fontSize: 10, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color, fontSize: 15, fontWeight: '700' }}>{prefix}{value.toFixed(1)}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  addBtn: { flex: 1 },
  chartsBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    padding: 10,
  },
  date: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridItem: { width: '48%' },
  gaugeCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  gaugeTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  estimatedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary + '40',
  },
  estimatedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  estimatedTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  estimatedSub: { color: COLORS.textMuted, fontSize: 11 },
  estimatedRow: { flexDirection: 'row' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyDate: { color: COLORS.textMuted, fontSize: 13 },
  baselineBadge: { backgroundColor: COLORS.accent + '25', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  baselineBadgeText: { color: COLORS.accent, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  viewAllRow: { alignItems: 'center', paddingVertical: 10 },
  viewAllText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  historyVal: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
});
