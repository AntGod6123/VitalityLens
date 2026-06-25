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

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const latest = useAppSelector(s => s.body.latestMeasurement);
  const sessions = useAppSelector(s => s.workout.sessions);

  const userProfile = useAppSelector(s => s.user.profile);
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
      <SectionHeader title="Body Composition" action={{ label: 'Goals →', onPress: () => navigation.navigate('Body', { screen: 'GoalTracker' }) }} />
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

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  tagline: { color: COLORS.textMuted, fontSize: 14, marginTop: 2 },
  settingsBtn: { padding: 6, position: 'relative' },
  aiBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
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
});
