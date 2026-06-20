import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import MetricCard from '../../components/common/MetricCard';
import SectionHeader from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import {
  katchMcArdleBMR,
  calculateFFMI,
  calculateFMI,
  calculateLBM,
} from '../../utils/bodyComposition';
import { calculateFullTDEE } from '../../utils/energyExpenditure';
import { computeLongevityScore, RATING_COLORS } from '../../utils/longevityScore';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);
  const injuries = useAppSelector(s => s.medical.injuries.filter(i => i.isActive));

  const userProfile = useAppSelector(s => s.user.profile);
  const biomarkerLogs = useAppSelector(s => s.biomarker.logs);
  const aiProvider = userProfile?.aiProvider ?? 'none';

  const ffmi = latest && latest.leanBodyMassKg ? calculateFFMI(latest.leanBodyMassKg, latest.heightCm) : null;
  const fmi = latest && latest.fatMassKg ? calculateFMI(latest.fatMassKg, latest.heightCm) : null;
  const lbm = latest && latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : latest?.leanBodyMassKg ?? null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;

  const today = new Date().toDateString();
  const todayWorkoutKcal = sessions
    .filter(s => new Date(s.date).toDateString() === today)
    .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  const tdeeBreakdown = bmr ? calculateFullTDEE(bmr, userProfile?.activityLevel ?? 'moderately_active', todayWorkoutKcal) : null;

  const recentSessions = sessions.slice(-3).reverse();
  const longevityResult = computeLongevityScore(biomarkerLogs, userProfile?.sex ?? 'male');

  return (
    <ScreenContainer>
      {/* Welcome banner */}
      <View style={styles.bannerRow}>
        <View>
          <Text style={styles.greeting}>
            {userProfile?.name ? `Hey, ${userProfile.name.split(' ')[0]}` : 'Welcome back'}
          </Text>
          <Text style={styles.tagline}>Track. Visualise. Grow.</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AISettings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
          {aiProvider !== 'none' && <View style={styles.aiBadge} />}
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.ctaRow}>
        <Button
          title="+ Log Workout"
          onPress={() => navigation.navigate('Workout', { screen: 'WorkoutLog' })}
          size="lg"
          style={{ flex: 1 }}
        />
        {aiProvider !== 'none' && (
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => navigation.navigate('QoLRecommendations')}
          >
            <Ionicons name="sparkles" size={18} color={COLORS.secondary} />
            <Text style={styles.aiBtnText}>AI</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Key metrics */}
      <SectionHeader title="Body Composition" action={{ label: 'Charts →', onPress: () => navigation.navigate('Body', { screen: 'ProgressCharts' }) }} />
      {latest ? (
        <View style={styles.grid}>
          <MetricCard
            label="Weight"
            value={latest.weightKg.toFixed(1)}
            unit="kg"
            accentColor={COLORS.secondary}
            style={styles.gridItem}
          />
          <MetricCard
            label="FFMI"
            value={ffmi ? ffmi.toFixed(1) : '—'}
            subtitle="Fat-Free Mass Index"
            accentColor={COLORS.primary}
            style={styles.gridItem}
            onPress={() => navigation.navigate('Body', { screen: 'FFMIDetail' })}
          />
          <MetricCard
            label="FMI"
            value={fmi ? fmi.toFixed(1) : '—'}
            subtitle="Fat Mass Index"
            accentColor={COLORS.accent}
            style={styles.gridItem}
            onPress={() => navigation.navigate('Body', { screen: 'FMIDetail' })}
          />
          <MetricCard
            label="TDEE"
            value={tdeeBreakdown ? tdeeBreakdown.tdee : '—'}
            unit="kcal"
            subtitle="BMR+NEAT+workout"
            accentColor={COLORS.warning}
            style={styles.gridItem}
            onPress={() => navigation.navigate('Body', { screen: 'EnergyMetrics' })}
          />
        </View>
      ) : (
        <View style={styles.noBioCard}>
          <Text style={styles.noBioText}>Add your first body measurement to see metrics.</Text>
          <Button
            title="Add Measurement"
            onPress={() => navigation.navigate('Body', { screen: 'AddMeasurement' })}
            variant="secondary"
            size="sm"
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
          />
        </View>
      )}

      {/* Active injuries */}
      {injuries.length > 0 && (
        <>
          <SectionHeader
            title={`Active Injuries (${injuries.length})`}
            action={{ label: 'Manage', onPress: () => navigation.navigate('Medical', { screen: 'InjuryDashboard' }) }}
          />
          {injuries.map(inj => (
            <View key={inj.id} style={styles.injuryRow}>
              <View style={styles.injuryDot} />
              <Text style={styles.injuryText}>{inj.bodyPart} — <Text style={styles.injurySeverity}>{inj.severity}</Text></Text>
            </View>
          ))}
        </>
      )}

      {/* Longevity score widget */}
      <SectionHeader
        title="Longevity"
        action={{ label: 'Details →', onPress: () => navigation.navigate('Longevity') }}
      />
      <TouchableOpacity
        style={styles.longevityCard}
        onPress={() => navigation.navigate('Longevity')}
        activeOpacity={0.85}
      >
        {longevityResult.trackedCount === 0 ? (
          <View style={styles.longevityEmpty}>
            <Ionicons name="heart-outline" size={22} color={COLORS.textMuted} />
            <Text style={styles.longevityEmptyText}>Log biomarkers to see your longevity score.</Text>
          </View>
        ) : (
          <>
            <View style={styles.longevityLeft}>
              {(() => {
                const scoreColor = RATING_COLORS[longevityResult.rating];
                return (
                  <>
                    <Text style={[styles.longevityScore, { color: scoreColor }]}>{longevityResult.composite}</Text>
                    <Text style={styles.longevityScoreLabel}>/100</Text>
                    <View style={[styles.longevityRating, { backgroundColor: scoreColor + '22' }]}>
                      <Text style={[styles.longevityRatingText, { color: scoreColor }]}>{longevityResult.rating}</Text>
                    </View>
                  </>
                );
              })()}
            </View>
            <View style={styles.longevityMarkers}>
              {longevityResult.markers.slice(0, 4).map(m => (
                <View key={m.type} style={styles.longevityMarkerRow}>
                  <View style={[styles.longevityDot, { backgroundColor: RATING_COLORS[m.rating] }]} />
                  <Text style={styles.longevityMarkerVal}>{m.latestValue}</Text>
                  <Text style={styles.longevityMarkerRating}>{m.rating}</Text>
                </View>
              ))}
              {longevityResult.markers.length > 4 && (
                <Text style={styles.longevityMore}>+{longevityResult.markers.length - 4} more</Text>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Recent workouts */}
      <SectionHeader
        title="Recent Workouts"
        action={{ label: 'All', onPress: () => navigation.navigate('Workout') }}
      />
      {recentSessions.length === 0 ? (
        <Text style={styles.empty}>No sessions logged yet. Start your first workout!</Text>
      ) : (
        recentSessions.map(session => (
          <View key={session.id} style={styles.sessionCard}>
            <View>
              <Text style={styles.sessionName}>{session.name}</Text>
              <Text style={styles.sessionMeta}>
                {new Date(session.date).toLocaleDateString()} · {session.durationMinutes} min · {session.exercises.length} exercises
              </Text>
            </View>
            <View style={[styles.sessionBadge, { backgroundColor: typeColor(session.type) + '33' }]}>
              <Text style={[styles.sessionBadgeText, { color: typeColor(session.type) }]}>
                {session.type}
              </Text>
            </View>
            {session.caloriesBurned ? (
              <Text style={styles.sessionKcal}>{session.caloriesBurned} kcal</Text>
            ) : null}
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

function typeColor(type: string) {
  const map: Record<string, string> = {
    strength: COLORS.primary,
    cardio: COLORS.secondary,
    hiit: COLORS.danger,
    flexibility: COLORS.accent,
    sport: COLORS.warning,
    other: COLORS.textMuted,
  };
  return map[type] ?? COLORS.textMuted;
}

const styles = StyleSheet.create({
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  tagline: { color: COLORS.textMuted, fontSize: 14, marginTop: 2 },
  settingsBtn: { padding: 6, position: 'relative' },
  aiBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  sessionKcal: { color: COLORS.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
  ctaRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginTop: 16, marginBottom: 4 },
  aiBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary + '60',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  aiBtnText: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%' },
  noBioCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  noBioText: { color: COLORS.textMuted, fontSize: 14 },
  injuryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  injuryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, marginRight: 10 },
  injuryText: { color: COLORS.text, fontSize: 14 },
  injurySeverity: { color: COLORS.danger },
  sessionCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  sessionMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  sessionBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  sessionBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  longevityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  longevityEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  longevityEmptyText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  longevityLeft: { alignItems: 'center', minWidth: 72, marginRight: 16 },
  longevityScore: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  longevityScoreLabel: { color: COLORS.textMuted, fontSize: 12 },
  longevityRating: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  longevityRatingText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  longevityMarkers: { flex: 1, gap: 6 },
  longevityMarkerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  longevityDot: { width: 7, height: 7, borderRadius: 4 },
  longevityMarkerVal: { color: COLORS.text, fontSize: 12, fontWeight: '600', width: 40 },
  longevityMarkerRating: { color: COLORS.textMuted, fontSize: 11, textTransform: 'capitalize' },
  longevityMore: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});
