import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { deleteMeasurement, updateMeasurement } from '../../store/slices/bodySlice';
import { BodyMeasurement } from '../../types';
import { COLORS } from '../../constants';
import {
  calculateLBM,
  calculateFatMass,
  calculateFFMI,
  calculateFMI,
  calculateBMI,
} from '../../utils/bodyComposition';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function field(label: string, value: string | number | undefined | null, unit = '') {
  if (value == null || value === '') return null;
  return { label, value: `${value}${unit}` };
}

function derivedStats(m: BodyMeasurement) {
  const lbm = m.leanBodyMassKg ?? (m.bodyFatPercent ? calculateLBM(m.weightKg, m.bodyFatPercent) : null);
  const fm = m.fatMassKg ?? (m.bodyFatPercent ? calculateFatMass(m.weightKg, m.bodyFatPercent) : null);
  const ffmi = lbm ? calculateFFMI(lbm, m.heightCm) : null;
  const fmi = fm ? calculateFMI(fm, m.heightCm) : null;
  const bmi = calculateBMI(m.weightKg, m.heightCm);
  return { lbm, fm, ffmi, fmi, bmi };
}

// ─── Edit modal ──────────────────────────────────────────────────────────────

function EditModal({
  measurement,
  onSave,
  onClose,
}: {
  measurement: BodyMeasurement;
  onSave: (updated: BodyMeasurement) => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(measurement.weightKg.toString());
  const [bodyFat, setBodyFat] = useState(measurement.bodyFatPercent?.toString() ?? '');
  const [waist, setWaist] = useState(measurement.waistCm?.toString() ?? '');
  const [hip, setHip] = useState(measurement.hipCm?.toString() ?? '');
  const [neck, setNeck] = useState(measurement.neckCm?.toString() ?? '');
  const [arm, setArm] = useState(measurement.armCm?.toString() ?? '');
  const [thigh, setThigh] = useState(measurement.thighCm?.toString() ?? '');
  const [calf, setCalf] = useState(measurement.calfCm?.toString() ?? '');
  const [chest, setChest] = useState(measurement.chestCm?.toString() ?? '');
  const [isBaseline, setIsBaseline] = useState(measurement.isBaseline ?? false);

  function handleSave() {
    const wkg = parseFloat(weight);
    if (!weight || isNaN(wkg) || wkg < 20 || wkg > 300) {
      Alert.alert('Invalid weight', 'Enter a valid weight in kg (20–300).');
      return;
    }
    const bf = bodyFat ? parseFloat(bodyFat) : undefined;
    const lbm = bf != null ? calculateLBM(wkg, bf) : measurement.leanBodyMassKg;
    const fm = bf != null ? calculateFatMass(wkg, bf) : measurement.fatMassKg;
    const ffmiVal = lbm ? calculateFFMI(lbm, measurement.heightCm) : measurement.ffmi;
    const fmiVal = fm ? calculateFMI(fm, measurement.heightCm) : measurement.fmi;

    onSave({
      ...measurement,
      weightKg: wkg,
      bodyFatPercent: bf,
      leanBodyMassKg: lbm,
      fatMassKg: fm,
      ffmi: ffmiVal ?? undefined,
      fmi: fmiVal ?? undefined,
      waistCm: waist ? parseFloat(waist) : undefined,
      hipCm: hip ? parseFloat(hip) : undefined,
      neckCm: neck ? parseFloat(neck) : undefined,
      armCm: arm ? parseFloat(arm) : undefined,
      thighCm: thigh ? parseFloat(thigh) : undefined,
      calfCm: calf ? parseFloat(calf) : undefined,
      chestCm: chest ? parseFloat(chest) : undefined,
      isBaseline,
    });
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={modal.container}>
        <View style={modal.header}>
          <Text style={modal.title}>Edit Measurement</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={modal.date}>{fmtDate(measurement.date)}</Text>

          <Label text="Weight (kg) *" />
          <Field value={weight} onChangeText={setWeight} placeholder="e.g. 80.5" keyboardType="decimal-pad" />

          <Label text="Body Fat %" />
          <Field value={bodyFat} onChangeText={setBodyFat} placeholder="e.g. 18.0" keyboardType="decimal-pad" />

          <Text style={modal.section}>Circumferences (cm)</Text>
          <View style={modal.grid}>
            {[
              ['Waist', waist, setWaist],
              ['Hip', hip, setHip],
              ['Neck', neck, setNeck],
              ['Arm', arm, setArm],
              ['Thigh', thigh, setThigh],
              ['Calf', calf, setCalf],
              ['Chest', chest, setChest],
            ].map(([lbl, val, setter]) => (
              <View key={lbl as string} style={modal.gridItem}>
                <Label text={lbl as string} />
                <Field
                  value={val as string}
                  onChangeText={setter as (v: string) => void}
                  placeholder="—"
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          <TouchableOpacity style={modal.checkRow} onPress={() => setIsBaseline(v => !v)}>
            <View style={[modal.checkbox, isBaseline && modal.checkboxOn]}>
              {isBaseline && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={modal.checkLabel}>Mark as baseline measurement</Text>
          </TouchableOpacity>

          <Button title="Save Changes" onPress={handleSave} style={{ marginTop: 24 }} />
          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={modal.label}>{text}</Text>;
}

function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'decimal-pad' | 'default';
}) {
  return (
    <TextInput
      style={modal.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType={keyboardType ?? 'default'}
    />
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MeasurementHistoryScreen() {
  const dispatch = useAppDispatch();
  const measurements = useAppSelector(s => s.body.measurements);
  const [editing, setEditing] = useState<BodyMeasurement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  function handleDelete(m: BodyMeasurement) {
    Alert.alert(
      'Delete Measurement',
      `Remove the entry from ${fmtDate(m.date)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteMeasurement(m.id)),
        },
      ],
    );
  }

  function handleSave(updated: BodyMeasurement) {
    dispatch(updateMeasurement(updated));
    setEditing(null);
  }

  if (sorted.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState icon="scale-outline" title="No measurements yet" subtitle="Add your first one from the Body tab." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.count}>{sorted.length} measurement{sorted.length !== 1 ? 's' : ''}</Text>

      {sorted.map((m, idx) => {
        const { lbm, fm, ffmi, fmi, bmi } = derivedStats(m);
        const expanded = expandedId === m.id;
        const isLatest = idx === 0;

        const detailFields = [
          field('LBM', lbm ? lbm.toFixed(1) : null, ' kg'),
          field('Fat mass', fm ? fm.toFixed(1) : null, ' kg'),
          field('FFMI', ffmi ? ffmi.toFixed(2) : null),
          field('FMI', fmi ? fmi.toFixed(2) : null),
          field('BMI', bmi ? bmi.toFixed(1) : null),
          field('Waist', m.waistCm, ' cm'),
          field('Hip', m.hipCm, ' cm'),
          field('Neck', m.neckCm, ' cm'),
          field('Arm', m.armCm, ' cm'),
          field('Thigh', m.thighCm, ' cm'),
          field('Calf', m.calfCm, ' cm'),
          field('Chest', m.chestCm, ' cm'),
          field('BF method', m.bodyFatMethod?.replace(/_/g, ' ')),
        ].filter(Boolean) as { label: string; value: string }[];

        return (
          <View key={m.id} style={[styles.card, isLatest && styles.cardLatest]}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setExpandedId(expanded ? null : m.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>{fmtDate(m.date)}</Text>
                  {isLatest && <View style={styles.latestBadge}><Text style={styles.latestBadgeText}>latest</Text></View>}
                  {m.isBaseline && <View style={styles.baselineBadge}><Text style={styles.baselineBadgeText}>baseline</Text></View>}
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statMain}>{m.weightKg} kg</Text>
                  {m.bodyFatPercent != null && (
                    <Text style={styles.statSub}>{m.bodyFatPercent}% BF</Text>
                  )}
                  {ffmi != null && (
                    <Text style={styles.statSub}>FFMI {ffmi.toFixed(1)}</Text>
                  )}
                </View>
              </View>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            {expanded && (
              <View style={styles.expandedBody}>
                {detailFields.length > 0 && (
                  <View style={styles.detailGrid}>
                    {detailFields.map(f => (
                      <View key={f.label} style={styles.detailCell}>
                        <Text style={styles.detailLabel}>{f.label}</Text>
                        <Text style={styles.detailValue}>{f.value}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(m)}>
                    <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(m)}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {editing && (
        <EditModal
          measurement={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  count: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardLatest: {
    borderColor: COLORS.primary + '60',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardLeft: { flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dateText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  latestBadge: {
    backgroundColor: COLORS.primary + '22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  latestBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  baselineBadge: {
    backgroundColor: COLORS.secondary + '22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  baselineBadgeText: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statMain: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  statSub: { color: COLORS.textMuted, fontSize: 13 },
  expandedBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 14,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  detailCell: {
    width: '30%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 8,
  },
  detailLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 2, textTransform: 'uppercase' },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '18',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.danger + '18',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  date: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20 },
  section: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47%' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.primary },
  checkLabel: { color: COLORS.text, fontSize: 14 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
});
