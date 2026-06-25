import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import { EXERCISE_DB } from '../../constants/exercises';
import { useAppSelector } from '../../hooks/useAppSelector';
import { MuscleGroup } from '../../types';
import BodyMapSVG, { BodyView } from '../../components/workout/BodyMapSVG';

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'quads', 'hamstrings', 'glutes', 'calves', 'lats', 'traps', 'forearms',
];

type TabView = 'map' | 'list';

export default function ExerciseLibraryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const onSelect = route.params?.onSelect;

  const restrictedIds = useAppSelector(s =>
    s.medical.injuries.filter(i => i.isActive).flatMap(i => i.restrictedExerciseIds ?? [])
  );

  const [tab, setTab] = useState<TabView>('map');
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [query, setQuery] = useState('');

  // Count exercises per muscle
  const exerciseCounts = useMemo(() => {
    const counts: Partial<Record<MuscleGroup, number>> = {};
    for (const ex of EXERCISE_DB) {
      for (const m of ex.muscleGroups) {
        counts[m] = (counts[m] ?? 0) + 1;
      }
    }
    return counts;
  }, []);

  // Filter exercises for current muscle / search
  const filtered = useMemo(() => {
    return EXERCISE_DB.filter(ex => {
      const matchMuscle = !selectedMuscle || ex.muscleGroups.includes(selectedMuscle);
      const matchQuery = !query || ex.name.toLowerCase().includes(query.toLowerCase());
      return matchMuscle && matchQuery;
    });
  }, [selectedMuscle, query]);

  function handleSelectExercise(ex: typeof EXERCISE_DB[0]) {
    if (onSelect) {
      onSelect(ex);
      navigation.goBack();
    } else {
      navigation.navigate('ExerciseDetail', { exerciseId: ex.id });
    }
  }

  return (
    <View style={styles.root}>
      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'map' && styles.tabActive]}
          onPress={() => setTab('map')}
        >
          <Ionicons name="body-outline" size={16} color={tab === 'map' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'map' && styles.tabTextActive]}>Body Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'list' && styles.tabActive]}
          onPress={() => setTab('list')}
        >
          <Ionicons name="list-outline" size={16} color={tab === 'list' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>Browse All</Text>
        </TouchableOpacity>
      </View>

      {tab === 'map' ? (
        <ScrollView contentContainerStyle={styles.mapContainer} showsVerticalScrollIndicator={false}>
          {/* Front / Back toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewBtn, bodyView === 'front' && styles.viewBtnActive]}
              onPress={() => setBodyView('front')}
            >
              <Text style={[styles.viewBtnText, bodyView === 'front' && styles.viewBtnTextActive]}>Front</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, bodyView === 'back' && styles.viewBtnActive]}
              onPress={() => setBodyView('back')}
            >
              <Text style={[styles.viewBtnText, bodyView === 'back' && styles.viewBtnTextActive]}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Body map SVG */}
          <View style={styles.mapWrapper}>
            <BodyMapSVG
              selected={selectedMuscle}
              onSelect={setSelectedMuscle}
              exerciseCounts={exerciseCounts}
              view={bodyView}
            />
          </View>

          {/* Selection hint / summary */}
          {selectedMuscle ? (
            <View style={styles.muscleHeader}>
              <Text style={styles.muscleTitle}>
                {selectedMuscle.charAt(0).toUpperCase() + selectedMuscle.slice(1)}
              </Text>
              <Text style={styles.muscleCount}>
                {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedMuscle(null)} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.hint}>Tap a muscle to see exercises</Text>
          )}

          {/* Exercise list for selected muscle */}
          {selectedMuscle && filtered.map(ex => {
            const restricted = restrictedIds.includes(ex.id);
            return (
              <TouchableOpacity
                key={ex.id}
                style={[styles.exCard, restricted && styles.exCardRestricted]}
                onPress={() => handleSelectExercise(ex)}
              >
                <View style={styles.exInfo}>
                  <Text style={[styles.exName, restricted && styles.exNameRestricted]}>{ex.name}</Text>
                  <Text style={styles.exMuscles}>{ex.muscleGroups.join(' · ')}</Text>
                </View>
                <View style={styles.exRight}>
                  {restricted && (
                    <View style={styles.restrictedBadge}>
                      <Ionicons name="warning" size={12} color={COLORS.danger} />
                      <Text style={styles.restrictedText}>Restricted</Text>
                    </View>
                  )}
                  <Ionicons
                    name={onSelect ? 'add-circle-outline' : 'chevron-forward'}
                    size={20}
                    color={restricted ? COLORS.danger : COLORS.primary}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        /* ─── List / Browse view ─── */
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises…"
              placeholderTextColor={COLORS.textMuted}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 10 }}>
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Muscle chip filter */}
          <FlatList
            data={ALL_MUSCLES}
            horizontal
            keyExtractor={m => m}
            showsHorizontalScrollIndicator={false}
            style={styles.musclePicker}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chip, selectedMuscle === item && styles.chipActive]}
                onPress={() => setSelectedMuscle(selectedMuscle === item ? null : item)}
              >
                <Text style={[styles.chipText, selectedMuscle === item && styles.chipTextActive]}>
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
            ListEmptyComponent={
              <Text style={styles.empty}>No exercises found.</Text>
            }
            renderItem={({ item: ex }) => {
              const restricted = restrictedIds.includes(ex.id);
              return (
                <TouchableOpacity
                  style={[styles.exCard, restricted && styles.exCardRestricted]}
                  onPress={() => handleSelectExercise(ex)}
                >
                  <View style={styles.exInfo}>
                    <Text style={[styles.exName, restricted && styles.exNameRestricted]}>{ex.name}</Text>
                    <Text style={styles.exMuscles}>{ex.muscleGroups.join(' · ')}</Text>
                  </View>
                  <View style={styles.exRight}>
                    {restricted && (
                      <View style={styles.restrictedBadge}>
                        <Ionicons name="warning" size={12} color={COLORS.danger} />
                        <Text style={styles.restrictedText}>Restricted</Text>
                      </View>
                    )}
                    <Ionicons
                      name={onSelect ? 'add-circle-outline' : 'chevron-forward'}
                      size={20}
                      color={restricted ? COLORS.danger : COLORS.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  tabs: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // Map view
  mapContainer: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
    gap: 3,
    alignSelf: 'center',
    width: 160,
  },
  viewBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 6 },
  viewBtnActive: { backgroundColor: COLORS.surfaceLight },
  viewBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  viewBtnTextActive: { color: COLORS.text },

  mapWrapper: {
    width: 200,
    height: 380,
    alignSelf: 'center',
    marginBottom: 12,
  },

  hint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 16 },

  muscleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  muscleTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', flex: 1 },
  muscleCount: { color: COLORS.textMuted, fontSize: 13, marginRight: 8 },
  clearBtn: { padding: 2 },

  // List view
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginLeft: 12 },
  search: { flex: 1, color: COLORS.text, fontSize: 15, paddingHorizontal: 10, paddingVertical: 12 },
  musclePicker: { flexGrow: 0, marginBottom: 4 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surface, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 8 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingTop: 32 },

  // Shared exercise card
  exCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exCardRestricted: { borderWidth: 1, borderColor: COLORS.danger + '66' },
  exInfo: { flex: 1 },
  exName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  exNameRestricted: { color: COLORS.textMuted },
  exMuscles: { color: COLORS.textMuted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  exRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restrictedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.danger + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  restrictedText: { color: COLORS.danger, fontSize: 11, fontWeight: '600' },
});
