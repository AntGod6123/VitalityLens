import React from 'react';
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
import { COLORS, FFMI_BANDS, FMI_BANDS } from '../../constants';
import {
  calculateFFMI,
  calculateFMI,
  calculateLBM,
  calculateFatMass,
  calculateBMI,
  katchMcArdleBMR,
  calculateTDEE,
} from '../../utils/bodyComposition';

export default function BodyHomeScreen() {
  const navigation = useNavigation<any>();
  const measurements = useAppSelector(s => s.body.measurements);
  const latest = useAppSelector(s => s.body.latestMeasurement);

  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;
  const fm = latest
    ? (latest.fatMassKg ?? (latest.bodyFatPercent ? calculateFatMass(latest.weightKg, latest.bodyFatPercent) : null))
    : null;
  const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
  const fmi = latest && fm ? calculateFMI(fm, latest.heightCm) : null;
  const bmi = latest ? calculateBMI(latest.weightKg, latest.heightCm) : null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;

  return (
    <ScreenContainer>
      <Button
        title="+ Add Measurement"
        onPress={() => navigation.navigate('AddMeasurement')}
        style={styles.addBtn}
      />

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
            <MetricCard label="Weight" value={latest.weightKg.toFixed(1)} unit="kg" accentColor={COLORS.text} style={styles.gridItem} />
            <MetricCard label="Body Fat" value={latest.bodyFatPercent ? latest.bodyFatPercent.toFixed(1) : '—'} unit="%" accentColor={COLORS.warning} style={styles.gridItem} />
            <MetricCard label="LBM" value={lbm ? lbm.toFixed(1) : '—'} unit="kg" subtitle="Lean Body Mass" accentColor={COLORS.primary} style={styles.gridItem} />
            <MetricCard label="Fat Mass" value={fm ? fm.toFixed(1) : '—'} unit="kg" accentColor={COLORS.accent} style={styles.gridItem} />
            <MetricCard label="BMR" value={bmr ? Math.round(bmr) : '—'} unit="kcal" subtitle="Katch-McArdle" accentColor={COLORS.secondary} style={styles.gridItem} onPress={() => navigation.navigate('EnergyMetrics')} />
            <MetricCard label="BMI" value={bmi ? bmi.toFixed(1) : '—'} subtitle="Legacy reference" accentColor={COLORS.textMuted} style={styles.gridItem} />
          </View>

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
          <SectionHeader title={`History (${measurements.length})`} />
          {[...measurements].reverse().slice(0, 5).map((m, i) => (
            <View key={m.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{new Date(m.date).toLocaleDateString()}</Text>
              <Text style={styles.historyVal}>{m.weightKg} kg</Text>
              {m.bodyFatPercent ? <Text style={styles.historyVal}>{m.bodyFatPercent}% BF</Text> : null}
            </View>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: { marginBottom: 8 },
  date: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridItem: { width: '48%' },
  gaugeCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  gaugeTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  historyRow: { flexDirection: 'row', gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyDate: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  historyVal: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
});
