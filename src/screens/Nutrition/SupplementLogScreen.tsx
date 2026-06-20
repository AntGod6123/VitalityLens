import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { addSupplement, removeSupplement } from '../../store/slices/nutritionSlice';
import { COLORS } from '../../constants';
import { SupplementEntry } from '../../types';

const COMMON_SUPPLEMENTS = ['Creatine', 'Whey Protein', 'Vitamin D3', 'Omega-3', 'Magnesium', 'Zinc', 'Caffeine', 'Beta-Alanine', 'Citrulline', 'Ashwagandha'];

export default function SupplementLogScreen() {
  const dispatch = useAppDispatch();
  const supplements = useAppSelector(s => s.nutrition.supplements);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('g');
  const [time, setTime] = useState('');
  const [brand, setBrand] = useState('');

  function save() {
    if (!name.trim()) { Alert.alert('Required', 'Enter supplement name.'); return; }
    const entry: SupplementEntry = {
      id: Date.now().toString(),
      name: name.trim(),
      doseAmount: parseFloat(dose) || 0,
      doseUnit: unit,
      timeTaken: time || 'Anytime',
      brand: brand.trim() || undefined,
    };
    dispatch(addSupplement(entry));
    setAdding(false);
    setName(''); setDose(''); setTime(''); setBrand('');
  }

  return (
    <ScreenContainer>
      <Button title={adding ? 'Cancel' : '+ Add Supplement'} onPress={() => setAdding(!adding)} variant={adding ? 'ghost' : 'primary'} />

      {adding && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New Supplement</Text>
          {/* Quick pick */}
          <View style={styles.quickPick}>
            {COMMON_SUPPLEMENTS.map(s => (
              <TouchableOpacity key={s} style={styles.quickChip} onPress={() => setName(s)}>
                <Text style={styles.quickChipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={COLORS.textMuted} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} value={dose} onChangeText={setDose} placeholder="Dose" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
            <View style={styles.unitRow}>
              {['mg', 'g', 'ml', 'IU', 'mcg'].map(u => (
                <TouchableOpacity key={u} style={[styles.unitChip, unit === u && styles.unitChipActive]} onPress={() => setUnit(u)}>
                  <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="Time taken (e.g. Pre-workout)" placeholderTextColor={COLORS.textMuted} />
          <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Brand (optional)" placeholderTextColor={COLORS.textMuted} />
          <Button title="Add Supplement" onPress={save} style={{ marginTop: 8 }} />
        </View>
      )}

      {supplements.length === 0 && !adding ? (
        <EmptyState icon="flask-outline" title="No supplements logged" subtitle="Track your supplements to monitor your daily stack." />
      ) : (
        supplements.map(s => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.suppName}>{s.name}</Text>
              {s.brand && <Text style={styles.suppBrand}>{s.brand}</Text>}
              <View style={styles.suppMeta}>
                <View style={styles.doseBadge}>
                  <Text style={styles.doseText}>{s.doseAmount}{s.doseUnit}</Text>
                </View>
                <Text style={styles.suppTime}>{s.timeTaken}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => {
              Alert.alert('Remove', `Remove ${s.name}?`, [
                { text: 'Cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeSupplement(s.id)) },
              ]);
            }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 12, gap: 10 },
  formTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  quickPick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  quickChip: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  quickChipText: { color: COLORS.textMuted, fontSize: 12 },
  input: { backgroundColor: COLORS.surfaceLight, borderRadius: 8, color: COLORS.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unitRow: { flexDirection: 'row', gap: 6 },
  unitChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.surfaceLight },
  unitChipActive: { backgroundColor: COLORS.primary },
  unitText: { color: COLORS.textMuted, fontSize: 12 },
  unitTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  suppName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  suppBrand: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  suppMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  doseBadge: { backgroundColor: COLORS.primary + '33', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  doseText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  suppTime: { color: COLORS.textMuted, fontSize: 12 },
});
