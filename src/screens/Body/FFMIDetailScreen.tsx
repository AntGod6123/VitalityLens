import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import InfoButton from '../../components/common/InfoButton';
import GaugeBar from '../../components/charts/GaugeBar';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useUnits } from '../../hooks/useUnits';
import { COLORS, FFMI_BANDS } from '../../constants';
import { calculateFFMI, calculateNormalisedFFMI, calculateLBM, naturalLBMCeiling } from '../../utils/bodyComposition';

export default function FFMIDetailScreen() {
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const { weightUnit, displayWeight: displayWt, displayHeight, heightUnit } = useUnits();
  const lbm = latest
    ? (latest.leanBodyMassKg ?? (latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : null))
    : null;

  const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
  const ffmiN = latest && lbm ? calculateNormalisedFFMI(lbm, latest.heightCm) : null;
  const ceiling = latest ? naturalLBMCeiling(latest.heightCm) : null;
  const ceilingFFMI = ceiling && latest ? calculateFFMI(ceiling, latest.heightCm) : null;

  const activeBand = ffmi != null ? FFMI_BANDS.find(b => ffmi <= b.max) ?? FFMI_BANDS[FFMI_BANDS.length - 1] : null;

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={styles.heading}>Fat-Free Mass Index</Text>
        <InfoButton
          title="What is FFMI?"
          body="FFMI = Lean Body Mass (kg) ÷ height (m)². Normalised FFMI adjusts for height using: +6.1 × (1.8 − height_m). The natural ceiling without performance-enhancing drugs is ~25 (Kouri et al., 1995)."
        />
      </View>
      <Text style={styles.formula}>FFMI = LBM (kg) ÷ height (m)²</Text>

      {ffmi == null ? (
        <Text style={styles.empty}>Add a body measurement with body fat % to see your FFMI.</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Row label="FFMI" value={ffmi.toFixed(2)} color={activeBand?.color ?? COLORS.text} />
            <Row label="Normalised FFMI" value={ffmiN?.toFixed(2) ?? '—'} />
            <Row label="LBM" value={lbm ? `${displayWt(lbm).toFixed(1)} ${weightUnit}` : '—'} />
            <Row label="Height" value={latest ? `${displayHeight(latest.heightCm).toFixed(1)} ${heightUnit}` : '—'} />
            <Row label="Natural Ceiling LBM" value={ceiling ? `${displayWt(ceiling).toFixed(0)} ${weightUnit}` : '—'} />
            <Row label="Ceiling FFMI" value={ceilingFFMI ? ceilingFFMI.toFixed(1) : '—'} />
          </View>

          <View style={styles.gaugeCard}>
            <GaugeBar value={ffmi} min={14} max={30} bands={FFMI_BANDS as any} label="Your FFMI vs reference bands" />
          </View>

          <Text style={styles.bandsTitle}>Reference Bands (Kouri et al.)</Text>
          {FFMI_BANDS.filter(b => b.max !== Infinity).map(band => (
            <View key={band.label} style={styles.bandRow}>
              <View style={[styles.bandDot, { backgroundColor: band.color }]} />
              <Text style={styles.bandLabel}>≤ {band.max}</Text>
              <Text style={styles.bandName}>{band.label}</Text>
              {ffmi != null && ffmi <= band.max && (ffmi > (FFMI_BANDS[FFMI_BANDS.indexOf(band) - 1]?.max ?? 0)) && (
                <Text style={[styles.youAreHere, { color: band.color }]}>← You</Text>
              )}
            </View>
          ))}
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
  formula: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
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
});
