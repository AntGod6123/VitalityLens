/**
 * Multi-method body fat measurement screen.
 * Renders the appropriate input form based on the selected method,
 * calculates BF%, and calls back to AddMeasurementScreen with the result.
 */
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants';
import {
  navyTapeBFPercent,
  jp3BFPercent,
  jp7BFPercent,
  biaBFPercent,
  BF_METHOD_ACCURACY,
  BF_METHOD_LABELS,
} from '../../utils/bodyFatMethods';
import { BodyFatMethod } from '../../types';
import Button from '../../components/common/Button';
import ScreenContainer from '../../components/common/ScreenContainer';

export default function BodyFatMethodScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const sex: 'male' | 'female' = route.params?.sex ?? 'male';
  const ageYears: number = route.params?.ageYears ?? 30;
  const selectedMethod: BodyFatMethod = route.params?.method ?? 'tape_navy';

  const [result, setResult] = useState<number | null>(null);

  // ── Navy tape ──────────────────────────────────────────────────────────────
  const [waist, setWaist] = useState('');
  const [neck, setNeck] = useState('');
  const [hip, setHip] = useState('');
  const [height, setHeight] = useState('');

  // ── JP3 ───────────────────────────────────────────────────────────────────
  const [jp3s1, setJp3s1] = useState('');
  const [jp3s2, setJp3s2] = useState('');
  const [jp3s3, setJp3s3] = useState('');

  // ── JP7 ───────────────────────────────────────────────────────────────────
  const [chest7, setChest7] = useState('');
  const [mid7, setMid7] = useState('');
  const [tri7, setTri7] = useState('');
  const [sub7, setSub7] = useState('');
  const [abd7, setAbd7] = useState('');
  const [supra7, setSupra7] = useState('');
  const [thigh7, setThigh7] = useState('');

  // ── BIA / direct ──────────────────────────────────────────────────────────
  const [directBF, setDirectBF] = useState('');
  const [hydrationAdj, setHydrationAdj] = useState('0');

  function calculate() {
    try {
      let bf: number;
      switch (selectedMethod) {
        case 'tape_navy':
          bf = navyTapeBFPercent({
            sex,
            heightCm: parseFloat(height),
            waistCm: parseFloat(waist),
            neckCm: parseFloat(neck),
            hipCm: sex === 'female' ? parseFloat(hip) : undefined,
          });
          break;
        case 'caliper_jp3':
          bf = jp3BFPercent({
            sex,
            ageYears,
            site1_mm: parseFloat(jp3s1),
            site2_mm: parseFloat(jp3s2),
            site3_mm: parseFloat(jp3s3),
          });
          break;
        case 'caliper_jp7':
          bf = jp7BFPercent({
            sex,
            ageYears,
            chest_mm: parseFloat(chest7),
            midaxillary_mm: parseFloat(mid7),
            tricep_mm: parseFloat(tri7),
            subscapular_mm: parseFloat(sub7),
            abdomen_mm: parseFloat(abd7),
            suprailiac_mm: parseFloat(supra7),
            thigh_mm: parseFloat(thigh7),
          });
          break;
        case 'bioimpedance':
        case 'bodpod':
        case 'dexa':
        case 'visual':
          bf = biaBFPercent(parseFloat(directBF), parseFloat(hydrationAdj) || 0);
          break;
        default:
          throw new Error('Unknown method');
      }
      if (isNaN(bf) || bf < 1 || bf > 70) {
        Alert.alert('Invalid Result', 'Please check your measurements and try again.');
        return;
      }
      setResult(Math.round(bf * 10) / 10);
    } catch {
      Alert.alert('Error', 'Please fill in all required fields with valid numbers.');
    }
  }

  function confirm() {
    if (result === null) return;
    navigation.navigate('AddMeasurement', { bodyFatPercent: result, bodyFatMethod: selectedMethod });
  }

  const accuracy = BF_METHOD_ACCURACY[selectedMethod];
  const methodLabel = BF_METHOD_LABELS[selectedMethod] ?? selectedMethod;

  return (
    <ScreenContainer>
      <Text style={styles.heading}>{methodLabel}</Text>
      <View style={styles.accuracyBadge}>
        <Text style={styles.accuracyText}>Accuracy: {accuracy?.relativeError}</Text>
      </View>
      <Text style={styles.accuracyNote}>{accuracy?.notes}</Text>

      {selectedMethod === 'tape_navy' && (
        <View>
          <Text style={styles.sectionLabel}>Circumference Measurements (cm)</Text>
          <Field label="Height (cm)" value={height} onChange={setHeight} />
          <Field label="Waist at navel (cm)" value={waist} onChange={setWaist} />
          <Field label="Neck (narrowest, cm)" value={neck} onChange={setNeck} />
          {sex === 'female' && (
            <Field label="Hip at widest (cm)" value={hip} onChange={setHip} />
          )}
        </View>
      )}

      {selectedMethod === 'caliper_jp3' && (
        <View>
          <Text style={styles.sectionLabel}>
            {sex === 'male' ? 'Sites: Chest · Abdomen · Thigh (mm)' : 'Sites: Tricep · Suprailiac · Thigh (mm)'}
          </Text>
          <Field label={sex === 'male' ? 'Chest (mm)' : 'Tricep (mm)'} value={jp3s1} onChange={setJp3s1} />
          <Field label={sex === 'male' ? 'Abdomen (mm)' : 'Suprailiac (mm)'} value={jp3s2} onChange={setJp3s2} />
          <Field label="Thigh (mm)" value={jp3s3} onChange={setJp3s3} />
        </View>
      )}

      {selectedMethod === 'caliper_jp7' && (
        <View>
          <Text style={styles.sectionLabel}>7-Site Jackson-Pollock (mm)</Text>
          <Field label="Chest (mm)" value={chest7} onChange={setChest7} />
          <Field label="Midaxillary (mm)" value={mid7} onChange={setMid7} />
          <Field label="Tricep (mm)" value={tri7} onChange={setTri7} />
          <Field label="Subscapular (mm)" value={sub7} onChange={setSub7} />
          <Field label="Abdomen (mm)" value={abd7} onChange={setAbd7} />
          <Field label="Suprailiac (mm)" value={supra7} onChange={setSupra7} />
          <Field label="Thigh (mm)" value={thigh7} onChange={setThigh7} />
        </View>
      )}

      {(selectedMethod === 'bioimpedance' || selectedMethod === 'bodpod' || selectedMethod === 'dexa' || selectedMethod === 'visual') && (
        <View>
          <Text style={styles.sectionLabel}>Enter Body Fat %</Text>
          <Field label={`Body Fat % (from ${methodLabel})`} value={directBF} onChange={setDirectBF} />
          {selectedMethod === 'bioimpedance' && (
            <Field
              label="Hydration correction (±%)"
              value={hydrationAdj}
              onChange={setHydrationAdj}
              placeholder="0"
            />
          )}
        </View>
      )}

      <Button title="Calculate" onPress={calculate} style={styles.calcBtn} />

      {result !== null && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Estimated Body Fat</Text>
          <Text style={styles.resultValue}>{result}%</Text>
          <Text style={styles.resultMethodLabel}>{methodLabel}</Text>
          <Button title="Use This Result" onPress={confirm} variant="secondary" style={{ marginTop: 12 }} />
        </View>
      )}
    </ScreenContainer>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '0.0'}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  accuracyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  accuracyText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  accuracyNote: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 18 },
  sectionLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  field: { marginBottom: 12 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  calcBtn: { marginTop: 8, marginBottom: 4 },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary + '40',
  },
  resultLabel: { color: COLORS.textMuted, fontSize: 14, marginBottom: 6 },
  resultValue: { color: COLORS.secondary, fontSize: 48, fontWeight: '800' },
  resultMethodLabel: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
});
