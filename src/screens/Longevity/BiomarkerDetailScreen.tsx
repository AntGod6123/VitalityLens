import React, { useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import LineChart from '../../components/charts/LineChart';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { deleteLog } from '../../store/slices/biomarkerSlice';
import { COLORS } from '../../constants';
import {
  BIOMARKER_META,
  scoreBiomarker,
  ratingFromScore,
  markerInterpretation,
  RATING_COLORS,
} from '../../utils/longevityScore';
import { BiomarkerType } from '../../types';

export default function BiomarkerDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const type: BiomarkerType = route.params?.type;

  const logs = useAppSelector(s => s.biomarker.logs);
  const userProfile = useAppSelector(s => s.user.profile);
  const sex = userProfile?.sex ?? 'male';

  const typeLogs = useMemo(
    () => [...logs.filter(l => l.type === type)].sort((a, b) => a.date.localeCompare(b.date)),
    [logs, type],
  );

  const meta = BIOMARKER_META[type];

  if (!type || !meta) return null;

  if (typeLogs.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={meta.icon as any}
          title={`No ${meta.label} readings yet`}
          subtitle="Log your first reading to see trends."
        />
        <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('LogBiomarker', { type })}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.logBtnText}>Log {meta.label}</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const latest = typeLogs[typeLogs.length - 1];
  const latestScoreVal = scoreBiomarker(type, latest.value, sex);
  const latestRating = ratingFromScore(latestScoreVal);
  const ratingColor = RATING_COLORS[latestRating];
  const interp = markerInterpretation(type, latest.value, sex);

  // Chart data — score over time
  const chartData = typeLogs.map(l => ({
    x: new Date(l.date).getTime(),
    y: scoreBiomarker(type, l.value, sex),
  }));

  // Stats
  const values = typeLogs.map(l => l.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

  function confirmDelete(id: string) {
    Alert.alert('Delete Reading', 'Remove this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteLog(id)) },
    ]);
  }

  return (
    <ScreenContainer>
      {/* Header card */}
      <View style={[styles.headerCard, { borderLeftColor: ratingColor }]}>
        <View style={[styles.iconBg, { backgroundColor: ratingColor + '20' }]}>
          <Ionicons name={meta.icon as any} size={24} color={ratingColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{meta.label}</Text>
          <Text style={styles.headerDesc}>{meta.description}</Text>
        </View>
      </View>

      {/* Latest value hero */}
      <View style={styles.latestCard}>
        <View style={styles.latestLeft}>
          <Text style={[styles.latestValue, { color: ratingColor }]}>
            {latest.value}
          </Text>
          <Text style={styles.latestUnit}>{meta.unit}</Text>
        </View>
        <View style={styles.latestRight}>
          <View style={[styles.ratingBadge, { backgroundColor: ratingColor + '22' }]}>
            <Text style={[styles.ratingText, { color: ratingColor }]}>{latestRating.toUpperCase()}</Text>
          </View>
          <Text style={styles.latestScore}>Score: {Math.round(latestScoreVal)}/100</Text>
          <Text style={styles.latestDate}>{new Date(latest.date).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.interpCard}>
        <Text style={styles.interpText}>{interp}</Text>
      </View>

      {/* Trend chart */}
      {typeLogs.length > 1 && (
        <>
          <Text style={styles.sectionLabel}>Score Trend</Text>
          <View style={styles.chartCard}>
            <LineChart
              series={[{
                label: meta.label,
                color: ratingColor,
                data: chartData,
              }]}
              height={160}
              yMin={0}
              yMax={100}
            />
          </View>
        </>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatItem label="Min" value={minVal.toFixed(type === 'steps' ? 0 : 1)} unit={meta.unit} />
        <StatItem label="Avg" value={avgVal.toFixed(type === 'steps' ? 0 : 1)} unit={meta.unit} />
        <StatItem label="Max" value={maxVal.toFixed(type === 'steps' ? 0 : 1)} unit={meta.unit} />
        <StatItem label="Readings" value={String(typeLogs.length)} unit="" />
      </View>

      {/* Log new */}
      <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('LogBiomarker', { type })}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={styles.logBtnText}>Log New Reading</Text>
      </TouchableOpacity>

      {/* History */}
      <Text style={styles.sectionLabel}>History</Text>
      {[...typeLogs].reverse().map(log => {
        const s = scoreBiomarker(type, log.value, sex);
        const r = ratingFromScore(s);
        const c = RATING_COLORS[r];
        return (
          <View key={log.id} style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyDate}>{new Date(log.date).toLocaleDateString()}</Text>
              {log.notes ? <Text style={styles.historyNotes}>{log.notes}</Text> : null}
              <Text style={styles.historySource}>{log.source}</Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={[styles.historyValue, { color: c }]}>{log.value} {meta.unit}</Text>
              <View style={[styles.historyRating, { backgroundColor: c + '20' }]}>
                <Text style={[styles.historyRatingText, { color: c }]}>{r}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(log.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        );
      })}
    </ScreenContainer>
  );
}

function StatItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}{unit ? ` ${unit}` : ''}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  iconBg: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerName: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  headerDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  latestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  latestLeft: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  latestValue: { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  latestUnit: { color: COLORS.textMuted, fontSize: 16, paddingBottom: 10 },
  latestRight: { alignItems: 'flex-end', gap: 6 },
  ratingBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  latestScore: { color: COLORS.textMuted, fontSize: 12 },
  latestDate: { color: COLORS.textMuted, fontSize: 11 },
  interpCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 14 },
  interpText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 12 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  statItem: { alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  logBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  logBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  historyLeft: { flex: 1 },
  historyDate: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  historyNotes: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  historySource: { color: COLORS.textMuted, fontSize: 10, textTransform: 'capitalize', marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyValue: { fontSize: 15, fontWeight: '700' },
  historyRating: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  historyRatingText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  deleteBtn: { padding: 8 },
});
