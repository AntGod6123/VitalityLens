import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants';
import { EXERCISE_DB } from '../../constants/exercises';
import { useAppSelector } from '../../hooks/useAppSelector';

export default function ExerciseDetailScreen() {
  const route = useRoute<any>();
  const ex = EXERCISE_DB.find(e => e.id === route.params?.exerciseId);
  const restrictedIds = useAppSelector(s =>
    s.medical.injuries.filter(i => i.isActive).flatMap(i => i.restrictedExerciseIds ?? [])
  );

  if (!ex) return null;
  const isRestricted = restrictedIds.includes(ex.id);

  return (
    <ScreenContainer>
      <Text style={styles.name}>{ex.name}</Text>

      {isRestricted && (
        <View style={styles.warning}>
          <Ionicons name="warning" size={18} color={COLORS.danger} />
          <Text style={styles.warningText}>Restricted due to active injury</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Muscles</Text>
        <View style={styles.tags}>
          {ex.muscleGroups.map(m => (
            <View key={m} style={styles.tag}>
              <Text style={styles.tagText}>{m}</Text>
            </View>
          ))}
        </View>
      </View>

      {ex.instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructions}>{ex.instructions}</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  name: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.danger + '22', borderRadius: 8, padding: 12, marginBottom: 16 },
  warningText: { color: COLORS.danger, fontWeight: '600' },
  section: { marginTop: 20 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: COLORS.primary + '33', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  instructions: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
});
