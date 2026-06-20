import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import { EXERCISE_DB } from '../../constants/exercises';
import { useAppSelector } from '../../hooks/useAppSelector';
import { MuscleGroup } from '../../types';

const ALL_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'lats', 'traps'];

export default function ExerciseLibraryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const onSelect = route.params?.onSelect;
  const restrictedIds = useAppSelector(s =>
    s.medical.injuries.filter(i => i.isActive).flatMap(i => i.restrictedExerciseIds ?? [])
  );

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const filtered = EXERCISE_DB.filter(ex => {
    const matchQuery = ex.name.toLowerCase().includes(query.toLowerCase());
    const matchMuscle = !muscle || ex.muscleGroups.includes(muscle);
    return matchQuery && matchMuscle;
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Muscle filter */}
      <FlatList
        data={ALL_MUSCLES}
        horizontal
        keyExtractor={m => m}
        showsHorizontalScrollIndicator={false}
        style={styles.musclePicker}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, muscle === item && styles.chipActive]}
            onPress={() => setMuscle(muscle === item ? null : item)}
          >
            <Text style={[styles.chipText, muscle === item && styles.chipTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={ex => ex.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: ex }) => {
          const restricted = restrictedIds.includes(ex.id);
          return (
            <TouchableOpacity
              style={[styles.exCard, restricted && styles.exCardRestricted]}
              onPress={() => {
                if (onSelect) {
                  onSelect(ex);
                  navigation.goBack();
                } else {
                  navigation.navigate('ExerciseDetail', { exerciseId: ex.id });
                }
              }}
            >
              <View style={styles.exInfo}>
                <Text style={[styles.exName, restricted && styles.exNameRestricted]}>{ex.name}</Text>
                <Text style={styles.exMuscles}>{ex.muscleGroups.join(', ')}</Text>
              </View>
              <View style={styles.exRight}>
                {restricted && (
                  <View style={styles.restrictedBadge}>
                    <Ionicons name="warning" size={12} color={COLORS.danger} />
                    <Text style={styles.restrictedText}>Restricted</Text>
                  </View>
                )}
                <Ionicons name={onSelect ? 'add-circle-outline' : 'chevron-forward'} size={20} color={restricted ? COLORS.danger : COLORS.primary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, margin: 16, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginLeft: 12 },
  search: { flex: 1, color: COLORS.text, fontSize: 15, paddingHorizontal: 10, paddingVertical: 12 },
  musclePicker: { paddingLeft: 16, marginBottom: 8, flexGrow: 0 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surface, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 8 },
  exCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exCardRestricted: { borderWidth: 1, borderColor: COLORS.danger + '66' },
  exInfo: { flex: 1 },
  exName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  exNameRestricted: { color: COLORS.textMuted },
  exMuscles: { color: COLORS.textMuted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  exRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restrictedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.danger + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  restrictedText: { color: COLORS.danger, fontSize: 11, fontWeight: '600' },
});
