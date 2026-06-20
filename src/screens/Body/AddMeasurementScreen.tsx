import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import TextInput from '../../components/common/TextInput';
import Button from '../../components/common/Button';
import { useAppDispatch } from '../../hooks/useAppSelector';
import { addMeasurement } from '../../store/slices/bodySlice';
import { BodyMeasurement } from '../../types';
import { COLORS } from '../../constants';
import {
  calculateLBM,
  calculateFatMass,
  calculateFFMI,
  calculateNormalisedFFMI,
  calculateFMI,
  calculateBMI,
  katchMcArdleBMR,
  calculateTDEE,
} from '../../utils/bodyComposition';

export default function AddMeasurementScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [neck, setNeck] = useState('');
  const [arm, setArm] = useState('');
  const [thigh, setThigh] = useState('');

  function preview() {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const bf = parseFloat(bodyFat);
    if (!w || !h) return null;
    const lbm = bf ? calculateLBM(w, bf) : null;
    const fm = bf ? calculateFatMass(w, bf) : null;
    const ffmi = lbm ? calculateFFMI(lbm, h) : null;
    const ffmiN = lbm ? calculateNormalisedFFMI(lbm, h) : null;
    const fmi = fm ? calculateFMI(fm, h) : null;
    const bmi = calculateBMI(w, h);
    const bmr = lbm ? katchMcArdleBMR(lbm) : null;
    return { lbm, fm, ffmi, ffmiN, fmi, bmi, bmr };
  }

  function save() {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || w <= 0) { Alert.alert('Invalid', 'Enter a valid weight.'); return; }
    if (!h || h <= 0) { Alert.alert('Invalid', 'Enter a valid height.'); return; }

    const bf = parseFloat(bodyFat) || undefined;
    const lbm = bf ? calculateLBM(w, bf) : undefined;
    const fm = bf ? calculateFatMass(w, bf) : undefined;
    const ffmi = lbm ? calculateFFMI(lbm, h) : undefined;
    const fmi = fm ? calculateFMI(fm, h) : undefined;
    const bmi = calculateBMI(w, h);

    const measurement: BodyMeasurement = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weightKg: w,
      heightCm: h,
      bodyFatPercent: bf,
      leanBodyMassKg: lbm,
      fatMassKg: fm,
      ffmi,
      fmi,
      bmi,
      waistCm: parseFloat(waist) || undefined,
      hipCm: parseFloat(hip) || undefined,
      neckCm: parseFloat(neck) || undefined,
      armCm: parseFloat(arm) || undefined,
      thighCm: parseFloat(thigh) || undefined,
    };

    dispatch(addMeasurement(measurement));
    navigation.goBack();
  }

  const calc = preview();

  return (
    <ScreenContainer>
      <Text style={styles.section}>Required</Text>
      <TextInput label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="80.5" suffix="kg" />
      <TextInput label="Height" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="178" suffix="cm" />

      <Text style={styles.section}>Body Composition (recommended)</Text>
      <TextInput label="Body Fat %" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" placeholder="15.0" suffix="%" />

      <Text style={styles.section}>Circumference Measurements (optional)</Text>
      <View style={styles.row}>
        <View style={styles.half}><TextInput label="Waist" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" suffix="cm" /></View>
        <View style={styles.half}><TextInput label="Hip" value={hip} onChangeText={setHip} keyboardType="decimal-pad" suffix="cm" /></View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}><TextInput label="Neck" value={neck} onChangeText={setNeck} keyboardType="decimal-pad" suffix="cm" /></View>
        <View style={styles.half}><TextInput label="Arm" value={arm} onChangeText={setArm} keyboardType="decimal-pad" suffix="cm" /></View>
      </View>
      <TextInput label="Thigh" value={thigh} onChangeText={setThigh} keyboardType="decimal-pad" suffix="cm" />

      {/* Live preview */}
      {calc && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Calculated Preview</Text>
          <PreviewRow label="LBM" value={calc.lbm ? `${calc.lbm.toFixed(1)} kg` : '—'} />
          <PreviewRow label="Fat Mass" value={calc.fm ? `${calc.fm.toFixed(1)} kg` : '—'} />
          <PreviewRow label="BMI" value={calc.bmi.toFixed(1)} note="(legacy)" />
          <PreviewRow label="FFMI" value={calc.ffmi ? calc.ffmi.toFixed(2) : '—'} />
          <PreviewRow label="FFMI (norm.)" value={calc.ffmiN ? calc.ffmiN.toFixed(2) : '—'} />
          <PreviewRow label="FMI" value={calc.fmi ? calc.fmi.toFixed(2) : '—'} />
          <PreviewRow label="BMR (K-M)" value={calc.bmr ? `${Math.round(calc.bmr)} kcal` : '—'} />
        </View>
      )}

      <Button title="Save Measurement" onPress={save} size="lg" style={styles.saveBtn} />
    </ScreenContainer>
  );
}

function PreviewRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}{note ? <Text style={styles.previewNote}> {note}</Text> : null}</Text>
      <Text style={styles.previewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  preview: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 8 },
  previewTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  previewLabel: { color: COLORS.textMuted, fontSize: 14 },
  previewNote: { color: COLORS.textMuted, fontSize: 12 },
  previewValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  saveBtn: { marginTop: 20, marginBottom: 24 },
});
