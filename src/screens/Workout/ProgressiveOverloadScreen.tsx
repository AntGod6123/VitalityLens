import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import {
  computeOverloadTargets,
  COMPLETION_THRESHOLD,
  ExerciseOverloadResult,
} from '../../utils/progressiveOverload';

type Filter = 'all' | 'ready' | 'incomplete';

export default function ProgressiveOverloadScreen() {
  const sessions = useAppSelector(s => s.workout.sessions);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const targets = useMemo(() => computeOverloadTargets(sessions), [sessions]);

  const filtered = useMemo(() => {
    if (filter === 'ready') return targets.filter(t => t.thresholdMet);
    if (filter === 'incomplete') return targets.filter(t => !t.thresholdMet);
    return targets;
  }, [targets, filter]);

  const readyCount = targets.filter(t => t.thresholdMet).length;

  if (targets.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="trending-up-outline"
          title="No data yet"
          subtitle="Log workouts with programmed targets to see progressive overload recommendations."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Summary banner */}
      <View style={styles.banner}>
        <View style={styles.bannerStat}>
          <Text style={styles.bannerVal}>{readyCount}</Text>
          <Text style={styles.bannerLabel}>ready to increase</Text>
        </View>
        <View style={styles.bannerDivider} />
        <View style={styles.bannerStat}>
          <Text style={styles.bannerVal}>{targets.length - readyCount}</Text>
          <Text style={styles.bannerLabel}>not yet at threshold</Text>
        </View>
        <View style={styles.bannerDivider} />
        <View style={styles.bannerStat}>
          <Text style={[styles.bannerVal, { color: COLORS.primary }]}>
            {Math.round(COMPLETION_THRESHOLD * 100)}%
          </Text>
          <Text style={styles.bannerLabel}>threshold</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'ready', 'incomplete'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'ready' ? '↑ Increase' : '⟳ Keep'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map(item => (
        <ExerciseCard
          key={item.exerciseId}
          item={item}
          isExpanded={expanded === item.exerciseId}
          onToggle={() => setExpanded(expanded === item.exerciseId ? null : item.exerciseId)}
        />
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Weight increases when ≥{Math.round(COMPLETION_THRESHOLD * 100)}% of programmed reps are completed across all sets.
        </Text>
      </View>
    </ScreenContainer>
  );
}

function ExerciseCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: ExerciseOverloadResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const pct = Math.round(item.completionRate * 100);
  const barColor = item.thresholdMet ? COLORS.success : item.completionRate >= 0.8 ? COLORS.warning : COLORS.danger;

  return (
    <TouchableOpacity
      style={[styles.card, item.thresholdMet && styles.cardReady]}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{item.exerciseName}</Text>
          <Text style={styles.lastSession}>
            {new Date(item.lastSessionDate).toLocaleDateString()} · {item.lastSessionName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {item.thresholdMet ? (
            <View style={styles.readyBadge}>
              <Ionicons name="arrow-up-circle" size={14} color={COLORS.success} />
              <Text style={styles.readyText}>+{item.incrementKg} kg</Text>
            </View>
          ) : (
            <View style={styles.holdBadge}>
              <Text style={styles.holdText}>{pct}%</Text>
            </View>
          )}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.textMuted}
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>

      {/* Completion bar */}
      <View style={styles.completionRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
          {/* 93% threshold marker */}
          <View style={styles.thresholdMarker} />
        </View>
        <Text style={[styles.pctLabel, { color: barColor }]}>{pct}%</Text>
      </View>
      <Text style={styles.completionSub}>
        {item.totalActualReps} / {item.totalTargetReps > 0 ? item.totalTargetReps : '?'} reps completed
        {item.totalTargetReps === 0 ? ' (no target set)' : ''}
      </Text>

      {/* Weight row */}
      <View style={styles.weightRow}>
        <WeightStat label="Last" value={item.lastWeightKg} />
        <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
        <WeightStat
          label="Next"
          value={item.nextWeightKg}
          highlight={item.thresholdMet}
        />
        <View style={styles.weightSpacer} />
        <WeightStat label="All-time best" value={item.allTimeBestKg} />
        {item.avgRpe !== null && <WeightStat label="Avg RPE" value={item.avgRpe} decimals={1} />}
      </View>

      {/* Completion history sparkline */}
      {item.completionHistory.length > 1 && (
        <View style={styles.sparkRow}>
          <Text style={styles.sparkLabel}>Completion history</Text>
          <View style={styles.sparkBars}>
            {item.completionHistory.map((r, i) => {
              const h = Math.max(4, Math.round(r * 28));
              const c = r >= COMPLETION_THRESHOLD ? COLORS.success : r >= 0.8 ? COLORS.warning : COLORS.danger;
              return (
                <View key={i} style={styles.sparkBarWrap}>
                  <View style={[styles.sparkBar, { height: h, backgroundColor: c }]} />
                </View>
              );
            })}
          </View>
          <Text style={styles.sparkLatest}>{Math.round(item.completionHistory[item.completionHistory.length - 1] * 100)}%</Text>
        </View>
      )}

      {/* Expanded per-set breakdown */}
      {isExpanded && (
        <View style={styles.setBreakdown}>
          <Text style={styles.setBreakdownTitle}>Last session — set breakdown</Text>
          <View style={styles.setHeaderRow}>
            <Text style={[styles.setCol, { flex: 0.5 }]}>#</Text>
            <Text style={styles.setCol}>Target</Text>
            <Text style={styles.setCol}>Actual</Text>
            <Text style={styles.setCol}>Weight</Text>
            <Text style={styles.setCol}>Done</Text>
          </View>
          {item.sets.map(s => {
            const setOk = s.completionPct >= COMPLETION_THRESHOLD;
            return (
              <View key={s.setNumber} style={styles.setRow}>
                <Text style={[styles.setNum, { flex: 0.5 }]}>{s.setNumber}</Text>
                <Text style={styles.setCol}>{s.targetReps} reps</Text>
                <Text style={[styles.setCol, { color: setOk ? COLORS.success : COLORS.warning }]}>
                  {s.actualReps} reps
                </Text>
                <Text style={styles.setCol}>{s.actualWeight > 0 ? `${s.actualWeight} kg` : '—'}</Text>
                <Ionicons
                  name={setOk ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={setOk ? COLORS.success : COLORS.textMuted}
                  style={{ flex: 1 }}
                />
              </View>
            );
          })}
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionInfoText}>
              Sessions logged: {item.sessionCount}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function WeightStat({
  label,
  value,
  highlight,
  decimals = 0,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  decimals?: number;
}) {
  return (
    <View style={styles.wStat}>
      <Text style={[styles.wVal, highlight && { color: COLORS.success }]}>
        {value > 0 ? `${value.toFixed(decimals)} kg` : '—'}
      </Text>
      <Text style={styles.wLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bannerStat: { alignItems: 'center' },
  bannerVal: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  bannerLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  bannerDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardReady: { borderColor: COLORS.success + '60' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  exName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  lastSession: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  readyText: { color: COLORS.success, fontSize: 13, fontWeight: '700' },
  holdBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  holdText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: { height: 8, borderRadius: 4 },
  thresholdMarker: {
    position: 'absolute',
    left: `${Math.round(COMPLETION_THRESHOLD * 100)}%` as any,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.text + '60',
  },
  pctLabel: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
  completionSub: { color: COLORS.textMuted, fontSize: 11, marginBottom: 12 },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
  },
  weightSpacer: { flex: 1 },
  wStat: { alignItems: 'center', minWidth: 56 },
  wVal: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  wLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  sparkLabel: { color: COLORS.textMuted, fontSize: 10, width: 64 },
  sparkBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, flex: 1 },
  sparkBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 28 },
  sparkBar: { width: '100%', borderRadius: 2, minHeight: 4 },
  sparkLatest: { color: COLORS.textMuted, fontSize: 10, width: 28, textAlign: 'right' },
  setBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  setBreakdownTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  setHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  setCol: { flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60' },
  setNum: { color: COLORS.textMuted, fontSize: 13 },
  sessionInfo: { marginTop: 10 },
  sessionInfoText: { color: COLORS.textMuted, fontSize: 11 },
  footer: { paddingVertical: 20, alignItems: 'center' },
  footerText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
