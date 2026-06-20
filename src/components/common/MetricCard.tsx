import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  accentColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function MetricCard({ label, value, unit, subtitle, accentColor = COLORS.primary, onPress, style }: Props) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.card, style]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  label: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  value: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  unit: { color: COLORS.textMuted, fontSize: 14, marginLeft: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
});
