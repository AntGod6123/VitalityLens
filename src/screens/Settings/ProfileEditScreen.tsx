import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateProfile, updateLimbs, clearProfile } from '../../store/slices/userSlice';
import { COLORS, ACTIVITY_LEVELS } from '../../constants';
import { ActivityLevel, LimbLengths } from '../../types';

export default function ProfileEditScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(s => s.user.profile);

  const [name, setName] = useState(profile?.name ?? '');
  const [dob, setDob] = useState(profile?.dateOfBirth ?? '');
  const [dobDisplay, setDobDisplay] = useState(profile?.dateOfBirth ?? '');
  const [sex, setSex] = useState<'male' | 'female'>(profile?.sex ?? 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activityLevel ?? 'moderately_active',
  );

  // Limbs
  const [thighL, setThighL] = useState(String(profile?.limbs?.thighLengthCm ?? ''));
  const [lowerLeg, setLowerLeg] = useState(String(profile?.limbs?.lowerLegLengthCm ?? ''));
  const [upperArm, setUpperArm] = useState(String(profile?.limbs?.upperArmLengthCm ?? ''));
  const [forearm, setForearm] = useState(String(profile?.limbs?.forearmLengthCm ?? ''));
  const [torso, setTorso] = useState(String(profile?.limbs?.torsoLengthCm ?? ''));
  const [foot, setFoot] = useState(String(profile?.limbs?.footLengthCm ?? ''));

  function formatDob(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = digits.slice(0, 4) + '-' + digits.slice(4);
    if (digits.length > 6) formatted = formatted.slice(0, 7) + '-' + digits.slice(6);
    setDobDisplay(formatted);
    if (digits.length === 8) {
      setDob(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`);
    } else {
      setDob('');
    }
  }

  function save() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    if (dob.length !== 10) {
      Alert.alert('Date required', 'Please enter a valid date of birth (YYYY-MM-DD).');
      return;
    }

    dispatch(updateProfile({ name: name.trim(), dateOfBirth: dob, sex, activityLevel }));

    const limbs: LimbLengths = {
      thighLengthCm: parseFloat(thighL) || undefined,
      lowerLegLengthCm: parseFloat(lowerLeg) || undefined,
      upperArmLengthCm: parseFloat(upperArm) || undefined,
      forearmLengthCm: parseFloat(forearm) || undefined,
      torsoLengthCm: parseFloat(torso) || undefined,
      footLengthCm: parseFloat(foot) || undefined,
    };
    dispatch(updateLimbs(limbs));

    navigation.goBack();
  }

  function confirmReset() {
    Alert.alert(
      'Reset Profile',
      'This will clear all profile data and restart onboarding. Your workout, body, and nutrition logs will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => dispatch(clearProfile()),
        },
      ],
    );
  }

  return (
    <ScreenContainer>
      {/* Basic info */}
      <Text style={styles.sectionTitle}>Basic Information</Text>

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.fieldLabel}>Date of Birth</Text>
      <TextInput
        style={styles.input}
        value={dobDisplay}
        onChangeText={formatDob}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="number-pad"
        maxLength={10}
      />

      <Text style={styles.fieldLabel}>Biological Sex</Text>
      <View style={styles.sexRow}>
        {(['male', 'female'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sexChip, sex === s && styles.sexChipActive]}
            onPress={() => setSex(s)}
          >
            <Ionicons
              name={s === 'male' ? 'male-outline' : 'female-outline'}
              size={18}
              color={sex === s ? '#fff' : COLORS.textMuted}
            />
            <Text style={[styles.sexChipText, sex === s && styles.sexChipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Activity Level</Text>
      {ACTIVITY_LEVELS.map(al => (
        <TouchableOpacity
          key={al.value}
          style={[styles.actCard, activityLevel === al.value && styles.actCardActive]}
          onPress={() => setActivityLevel(al.value as ActivityLevel)}
        >
          <View style={styles.actRadio}>
            {activityLevel === al.value && <View style={styles.actRadioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actLabel, activityLevel === al.value && styles.actLabelActive]}>
              {al.label}
            </Text>
            <Text style={styles.actDesc}>{al.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Limb lengths */}
      <Text style={styles.sectionTitle}>Limb Lengths (cm)</Text>
      <Text style={styles.limbHint}>
        Used for precise W=Fd workout energy. Measure joint-to-joint.
      </Text>
      <View style={styles.limbGrid}>
        <LimbField label="Thigh" sublabel="hip → knee" value={thighL} onChange={setThighL} />
        <LimbField label="Lower Leg" sublabel="knee → ankle" value={lowerLeg} onChange={setLowerLeg} />
        <LimbField label="Upper Arm" sublabel="shoulder → elbow" value={upperArm} onChange={setUpperArm} />
        <LimbField label="Forearm" sublabel="elbow → wrist" value={forearm} onChange={setForearm} />
        <LimbField label="Torso" sublabel="shoulder → hip" value={torso} onChange={setTorso} />
        <LimbField label="Foot" sublabel="heel → toe" value={foot} onChange={setFoot} />
      </View>

      <Button title="Save Changes" onPress={save} size="lg" style={styles.saveBtn} />

      {/* Danger zone */}
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDesc}>
          Reset your profile and restart onboarding. Logs and history are not affected.
        </Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={confirmReset}>
          <Ionicons name="refresh-outline" size={16} color={COLORS.danger} />
          <Text style={styles.dangerBtnText}>Reset Profile & Restart Onboarding</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function LimbField({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.limbField}>
      <Text style={styles.limbLabel}>{label}</Text>
      <Text style={styles.limbSublabel}>{sublabel}</Text>
      <View style={styles.limbInputRow}>
        <TextInput
          style={styles.limbInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.limbUnit}>cm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 14,
  },
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
  sexRow: { flexDirection: 'row', gap: 10 },
  sexChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
  },
  sexChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sexChipText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  sexChipTextActive: { color: '#fff' },
  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  actCardActive: { borderColor: COLORS.primary },
  actRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  actLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  actLabelActive: { color: COLORS.text },
  actDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  limbHint: { color: COLORS.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 18 },
  limbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  limbField: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  limbLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  limbSublabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 8 },
  limbInputRow: { flexDirection: 'row', alignItems: 'center' },
  limbInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
  },
  limbUnit: { color: COLORS.textMuted, fontSize: 12, marginLeft: 6 },
  saveBtn: { marginTop: 24, marginBottom: 8 },
  dangerCard: {
    backgroundColor: COLORS.danger + '12',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
    marginTop: 16,
    marginBottom: 24,
  },
  dangerTitle: { color: COLORS.danger, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  dangerDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dangerBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
});
