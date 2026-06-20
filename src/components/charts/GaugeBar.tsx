import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants';

interface Band {
  max: number;
  label: string;
  color: string;
}

interface Props {
  value: number;
  min: number;
  max: number;
  bands: readonly Band[];
  label: string;
}

export default function GaugeBar({ value, min, max, bands, label }: Props) {
  const clampedValue = Math.min(Math.max(value, min), max);
  const pct = ((clampedValue - min) / (max - min)) * 100;

  const activeBand = bands.find(b => value <= b.max) ?? bands[bands.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {bands.map((band, i) => {
          const prevMax = i === 0 ? min : bands[i - 1].max;
          const bandPct = ((Math.min(band.max, max) - prevMax) / (max - min)) * 100;
          return (
            <View key={band.label} style={[styles.segment, { flex: Math.min(bandPct, 100), backgroundColor: band.color + '44' }]} />
          );
        })}
        <View style={[styles.needle, { left: `${pct}%` as any }]} />
      </View>
      <View style={styles.row}>
        <Text style={styles.minLabel}>{min}</Text>
        <View style={[styles.badge, { backgroundColor: activeBand.color + '33' }]}>
          <Text style={[styles.badgeText, { color: activeBand.color }]}>
            {value.toFixed(1)} — {activeBand.label}
          </Text>
        </View>
        <Text style={styles.minLabel}>{max}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  track: { height: 16, borderRadius: 8, flexDirection: 'row', overflow: 'visible', position: 'relative', backgroundColor: COLORS.surfaceLight },
  segment: { height: 16 },
  needle: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: COLORS.text,
    marginLeft: -2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  minLabel: { color: COLORS.textMuted, fontSize: 11 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  label: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
