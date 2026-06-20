import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import MetricCard from '../../components/common/MetricCard';
import SectionHeader from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import {
  katchMcArdleBMR,
  calculateTDEE,
  calculateFFMI,
  calculateFMI,
  calculateLBM,
  calculateFatMass,
} from '../../utils/bodyComposition';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);
  const injuries = useAppSelector(s => s.medical.injuries.filter(i => i.isActive));

  const ffmi = latest && latest.leanBodyMassKg ? calculateFFMI(latest.leanBodyMassKg, latest.heightCm) : null;
  const fmi = latest && latest.fatMassKg ? calculateFMI(latest.fatMassKg, latest.heightCm) : null;
  const lbm = latest && latest.bodyFatPercent ? calculateLBM(latest.weightKg, latest.bodyFatPercent) : latest?.leanBodyMassKg ?? null;
  const bmr = lbm ? katchMcArdleBMR(lbm) : null;
  const tdee = bmr ? calculateTDEE(bmr, 'moderately_active') : null;

  const recentSessions = sessions.slice(-3).reverse();

  return (
    <ScreenContainer>
      {/* Welcome banner */}
      <View style={styles.banner}>
        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.tagline}>Track. Visualise. Grow.</Text>
      </View>

      {/* Quick action */}
      <Button
        title="+ Log Workout"
        onPress={() => navigation.navigate('Workout', { screen: 'WorkoutLog' })}
        size="lg"
        style={styles.cta}
      />

      {/* Key metrics */}
      <SectionHeader title="Body Composition" action={{ label: 'View All', onPress: () => navigation.navigate('Body') }} />
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
            value={tdee ? Math.round(tdee) : '—'}
            unit="kcal"
            subtitle="Daily energy need"
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
  banner: { marginBottom: 4 },
  greeting: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  tagline: { color: COLORS.textMuted, fontSize: 14, marginTop: 2 },
  cta: { marginTop: 16, marginBottom: 4 },
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
});
