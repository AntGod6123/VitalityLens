import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { resolveInjury, deleteInjury } from '../../store/slices/medicalSlice';
import { COLORS } from '../../constants';

export default function InjuryDashboardScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const injuries = useAppSelector(s => s.medical.injuries);
  const active = injuries.filter(i => i.isActive);
  const resolved = injuries.filter(i => !i.isActive);

  function markResolved(id: string) {
    Alert.alert('Mark Resolved', 'Mark this injury as resolved? Restricted exercises will be re-enabled.', [
      { text: 'Cancel' },
      { text: 'Resolve', onPress: () => dispatch(resolveInjury(id)) },
    ]);
  }

  return (
    <ScreenContainer>
      <Button title="+ Log Injury" onPress={() => navigation.navigate('AddInjury')} />

      {injuries.length === 0 ? (
        <EmptyState icon="bandage-outline" title="No injuries logged" subtitle="Log injuries to automatically filter restricted exercises from your workout builder." />
      ) : (
        <>
          {active.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Active ({active.length})</Text>
              {active.map(inj => (
                <View key={inj.id} style={[styles.card, styles.cardActive]}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.bodyPart}>{inj.bodyPart}</Text>
                      <View style={styles.metaRow}>
                        <SeverityBadge severity={inj.severity} />
                        <Text style={styles.dateText}>{new Date(inj.date).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Delete', 'Delete this injury record?', [
                        { text: 'Cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteInjury(inj.id)) },
                      ]);
                    }}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.description}>{inj.description}</Text>

                  {(inj.restrictedMuscleGroups?.length ?? 0) > 0 && (
                    <View style={styles.restrictions}>
                      <Text style={styles.restrictLabel}>Restricted muscles:</Text>
                      <View style={styles.tags}>
                        {inj.restrictedMuscleGroups?.map(m => (
                          <View key={m} style={styles.tag}>
                            <Text style={styles.tagText}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {inj.expectedRecoveryDate && (
                    <Text style={styles.recovery}>Est. recovery: {new Date(inj.expectedRecoveryDate).toLocaleDateString()}</Text>
                  )}

                  <Button title="Mark Resolved" onPress={() => markResolved(inj.id)} variant="secondary" size="sm" style={{ marginTop: 12 }} />
                </View>
              ))}
            </>
          )}

          {resolved.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Resolved ({resolved.length})</Text>
              {resolved.map(inj => (
                <View key={inj.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.bodyPartResolved}>{inj.bodyPart}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.descriptionResolved}>{inj.description}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = { mild: COLORS.warning, moderate: COLORS.accent, severe: COLORS.danger };
  const color = colors[severity] ?? COLORS.textMuted;
  return (
    <View style={{ backgroundColor: color + '33', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{severity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 12 },
  cardActive: { borderWidth: 1, borderColor: COLORS.danger + '44' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  bodyPart: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  bodyPartResolved: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  dateText: { color: COLORS.textMuted, fontSize: 12 },
  description: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  descriptionResolved: { color: COLORS.textMuted, fontSize: 13 },
  restrictions: { marginTop: 10 },
  restrictLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: COLORS.danger + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: COLORS.danger, fontSize: 12, textTransform: 'capitalize' },
  recovery: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
});
