import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import CustomTextInput from '../../components/common/TextInput';
import Button from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { addMeasurement } from '../../store/slices/bodySlice';
import { updateLimbs } from '../../store/slices/userSlice';
import { BodyMeasurement, BodyFatMethod, LimbLengths } from '../../types';
import { COLORS } from '../../constants';
import { BF_METHOD_LABELS } from '../../utils/bodyFatMethods';
import {
  calculateLBM,
  calculateFatMass,
  calculateFFMI,
  calculateNormalisedFFMI,
  calculateFMI,
  calculateBMI,
  katchMcArdleBMR,
} from '../../utils/bodyComposition';

const BF_METHODS: BodyFatMethod[] = ['tape_navy', 'caliper_jp3', 'caliper_jp7', 'bioimpedance', 'bodpod', 'dexa', 'visual'];

export default function AddMeasurementScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userProfile = useAppSelector(s => s.user.profile);
  const sex = userProfile?.sex ?? 'male';
  const ageYears = userProfile?.dateOfBirth
    ? Math.floor((Date.now() - new Date(userProfile.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30;

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState(route.params?.bodyFatPercent?.toString() ?? '');
  const [bfMethod, setBfMethod] = useState<BodyFatMethod>(route.params?.bodyFatMethod ?? 'tape_navy');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [neck, setNeck] = useState('');
  const [arm, setArm] = useState('');
  const [thigh, setThigh] = useState('');
  const [isBaseline, setIsBaseline] = useState(false);
  const [showLimbs, setShowLimbs] = useState(false);

  // Limb lengths
  const existingLimbs = userProfile?.limbs ?? {};
  const [thighL, setThighL] = useState(existingLimbs.thighLengthCm?.toString() ?? '');
  const [lowerLeg, setLowerLeg] = useState(existingLimbs.lowerLegLengthCm?.toString() ?? '');
  const [upperArm, setUpperArm] = useState(existingLimbs.upperArmLengthCm?.toString() ?? '');
  const [forearm, setForearm] = useState(existingLimbs.forearmLengthCm?.toString() ?? '');
  const [torso, setTorso] = useState(existingLimbs.torsoLengthCm?.toString() ?? '');
  const [foot, setFoot] = useState(existingLimbs.footLengthCm?.toString() ?? '');

  // Update body fat if navigated back from BodyFatMethodScreen
  useEffect(() => {
    if (route.params?.bodyFatPercent !== undefined) {
      setBodyFat(route.params.bodyFatPercent.toString());
    }
    if (route.params?.bodyFatMethod) {
      setBfMethod(route.params.bodyFatMethod as BodyFatMethod);
    }
  }, [route.params?.bodyFatPercent, route.params?.bodyFatMethod]);

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

  function saveLimbs() {
    const limbs: LimbLengths = {
      thighLengthCm: parseFloat(thighL) || undefined,
      lowerLegLengthCm: parseFloat(lowerLeg) || undefined,
      upperArmLengthCm: parseFloat(upperArm) || undefined,
      forearmLengthCm: parseFloat(forearm) || undefined,
      torsoLengthCm: parseFloat(torso) || undefined,
      footLengthCm: parseFloat(foot) || undefined,
    };
    dispatch(updateLimbs(limbs));
    Alert.alert('Saved', 'Limb lengths updated. These are used for workout energy calculations.');
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
      bodyFatMethod: bf ? bfMethod : undefined,
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
      isBaseline,
    };

    dispatch(addMeasurement(measurement));
    navigation.goBack();
  }

  const calc = preview();

  return (
    <ScreenContainer>
      <Text style={styles.section}>Required</Text>
      <CustomTextInput label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="80.5" suffix="kg" />
      <CustomTextInput label="Height" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="178" suffix="cm" />

      <Text style={styles.section}>Body Fat</Text>
      {/* Method selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodPicker}>
        {BF_METHODS.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.methodChip, bfMethod === m && styles.methodChipActive]}
            onPress={() => setBfMethod(m)}
          >
            <Text style={[styles.methodChipText, bfMethod === m && styles.methodChipTextActive]}>
              {BF_METHOD_LABELS[m]?.replace(' (', '\n(') ?? m}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bfRow}>
        <View style={{ flex: 1 }}>
          <CustomTextInput
            label="Body Fat %"
            value={bodyFat}
            onChangeText={setBodyFat}
            keyboardType="decimal-pad"
            placeholder="15.0"
            suffix="%"
          />
        </View>
        <TouchableOpacity
          style={styles.measureBtn}
          onPress={() => navigation.navigate('BodyFatMethod', { method: bfMethod, sex, ageYears })}
        >
          <Text style={styles.measureBtnText}>Measure</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.baselineToggle, isBaseline && styles.baselineToggleActive]}
        onPress={() => setIsBaseline(v => !v)}
      >
        <Text style={[styles.baselineText, isBaseline && styles.baselineTextActive]}>
          {isBaseline ? '★ Set as baseline anchor' : '☆ Mark as baseline anchor'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.section}>Circumference Measurements (optional)</Text>
      <View style={styles.row}>
        <View style={styles.half}><CustomTextInput label="Waist" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" suffix="cm" /></View>
        <View style={styles.half}><CustomTextInput label="Hip" value={hip} onChangeText={setHip} keyboardType="decimal-pad" suffix="cm" /></View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}><CustomTextInput label="Neck" value={neck} onChangeText={setNeck} keyboardType="decimal-pad" suffix="cm" /></View>
        <View style={styles.half}><CustomTextInput label="Arm" value={arm} onChangeText={setArm} keyboardType="decimal-pad" suffix="cm" /></View>
      </View>
      <CustomTextInput label="Thigh circumference" value={thigh} onChangeText={setThigh} keyboardType="decimal-pad" suffix="cm" />

      {/* Limb lengths */}
      <TouchableOpacity style={styles.limbsToggle} onPress={() => setShowLimbs(v => !v)}>
        <Text style={styles.limbsToggleText}>
          {showLimbs ? '▲ Hide' : '▼ Update'} Limb Lengths (for energy calc)
        </Text>
      </TouchableOpacity>

      {showLimbs && (
        <View style={styles.limbsContainer}>
          <Text style={styles.limbsNote}>
            These measurements determine range of motion for W=Fd workout energy calculations.
            Measure joint-to-joint in cm.
          </Text>
          <View style={styles.row}>
            <View style={styles.half}><CustomTextInput label="Thigh (hip→knee)" value={thighL} onChangeText={setThighL} keyboardType="decimal-pad" suffix="cm" /></View>
            <View style={styles.half}><CustomTextInput label="Lower leg (knee→ankle)" value={lowerLeg} onChangeText={setLowerLeg} keyboardType="decimal-pad" suffix="cm" /></View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}><CustomTextInput label="Upper arm (shoulder→elbow)" value={upperArm} onChangeText={setUpperArm} keyboardType="decimal-pad" suffix="cm" /></View>
            <View style={styles.half}><CustomTextInput label="Forearm (elbow→wrist)" value={forearm} onChangeText={setForearm} keyboardType="decimal-pad" suffix="cm" /></View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}><CustomTextInput label="Torso (shoulder→hip)" value={torso} onChangeText={setTorso} keyboardType="decimal-pad" suffix="cm" /></View>
            <View style={styles.half}><CustomTextInput label="Foot length" value={foot} onChangeText={setFoot} keyboardType="decimal-pad" suffix="cm" /></View>
          </View>
          <Button title="Save Limb Lengths" onPress={saveLimbs} variant="secondary" style={{ marginTop: 4 }} />
        </View>
      )}

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
  section: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 12,
  },
  methodPicker: { marginBottom: 12 },
  methodChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
    alignItems: 'center',
  },
  methodChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  methodChipText: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 14 },
  methodChipTextActive: { color: COLORS.primary },
  bfRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  measureBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  measureBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  baselineToggle: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 4,
    alignItems: 'center',
  },
  baselineToggleActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '15' },
  baselineText: { color: COLORS.textMuted, fontSize: 14 },
  baselineTextActive: { color: COLORS.accent, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  limbsToggle: { padding: 12, alignItems: 'center', marginVertical: 8 },
  limbsToggleText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  limbsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  limbsNote: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  preview: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 8 },
  previewTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewLabel: { color: COLORS.textMuted, fontSize: 14 },
  previewNote: { color: COLORS.textMuted, fontSize: 12 },
  previewValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  saveBtn: { marginTop: 20, marginBottom: 24 },
});
