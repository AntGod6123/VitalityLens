import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import InfoButton from '../../components/common/InfoButton';
import GaugeBar from '../../components/charts/GaugeBar';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useUnits } from '../../hooks/useUnits';
import { COLORS, FMI_BANDS } from '../../constants';
import { calculateFMI, calculateFatMass } from '../../utils/bodyComposition';

export default function FMIDetailScreen() {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const { weightUnit, displayWeight: displayWt } = useUnits();
  const fm = latest
    ? (latest.fatMassKg ?? (latest.bodyFatPercent ? calculateFatMass(latest.weightKg, latest.bodyFatPercent) : null))
    : null;

  const fmi = latest && fm ? calculateFMI(fm, latest.heightCm) : null;

  // Approximate sex from stored data (default male bands; future: store sex in profile)
  const bands = FMI_BANDS.male;
  const activeBand = fmi != null ? bands.find(b => fmi <= b.max) ?? bands[bands.length - 1] : null;

  const bandColors = ['#60A5FA', '#34D399', '#FBBF24', '#F97316', '#EF4444'];

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={styles.heading}>Fat Mass Index</Text>
        <InfoButton
          title="What is FMI?"
          body="FMI = Fat Mass (kg) ÷ height (m)². Unlike BMI, FMI isolates fat mass independent of muscle, giving a clearer picture of metabolic health. Used alongside FFMI it separates fat from lean tissue."
        />
      </View>
      <Text style={styles.formula}>FMI = Fat Mass (kg) ÷ height (m)²</Text>

      {fmi == null ? (
        <Text style={styles.empty}>Add a body measurement with body fat % to see your FMI.</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Row label="FMI" value={fmi.toFixed(2)} color={bandColors[bands.findIndex(b => fmi <= b.max)]} />
            <Row label="Fat Mass" value={fm ? `${displayWt(fm).toFixed(1)} ${weightUnit}` : '—'} />
            <Row label="Category" value={activeBand?.label ?? '—'} />
          </View>

          <View style={styles.gaugeCard}>
            <GaugeBar
              value={fmi}
              min={0}
              max={20}
              bands={bands.map((b, i) => ({ ...b, color: bandColors[i] }))}
              label="FMI vs healthy reference ranges"
            />
          </View>

          <Text style={styles.bandsTitle}>Reference Ranges (Male, approximate)</Text>
          {bands.filter(b => b.max !== Infinity).map((band, i) => (
            <View key={band.label} style={styles.bandRow}>
              <View style={[styles.bandDot, { backgroundColor: bandColors[i] }]} />
              <Text style={styles.bandLabel}>≤ {band.max}</Text>
              <Text style={styles.bandName}>{band.label}</Text>
              {fmi != null && fmi <= band.max && fmi > (bands[i - 1]?.max ?? 0) && (
                <Text style={[styles.youAreHere, { color: bandColors[i] }]}>← You</Text>
              )}
            </View>
          ))}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 FMI + FFMI together replace BMI. High FFMI + low FMI = muscular and lean. Low FFMI + high FMI = low muscle, high fat.
            </Text>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  formula: { color: COLORS.accent, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  sub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  empty: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginTop: 60 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { color: COLORS.textMuted, fontSize: 14 },
  rowValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  gaugeCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  bandsTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  bandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bandDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  bandLabel: { color: COLORS.textMuted, fontSize: 13, width: 36 },
  bandName: { color: COLORS.text, fontSize: 13, flex: 1, marginLeft: 12 },
  youAreHere: { fontSize: 12, fontWeight: '700' },
  infoBox: { backgroundColor: COLORS.primary + '22', borderRadius: 10, padding: 14, marginTop: 12 },
  infoText: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
});
