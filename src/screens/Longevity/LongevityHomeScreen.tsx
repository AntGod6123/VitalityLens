import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import {
  computeLongevityScore,
  BIOMARKER_META,
  RATING_COLORS,
  estimateBiologicalAge,
  MarkerSummary,
} from '../../utils/longevityScore';
import { getLongevityAnalysis } from '../../services/aiService';
import { BiomarkerType, LongevityAnalysisOutput } from '../../types';
import {
  calculateFFMI,
  calculateFMI,
  calculateLBM,
  calculateFatMass,
} from '../../utils/bodyComposition';

const ALL_TYPES: BiomarkerType[] = [
  'vo2max', 'resting_hr', 'hrv', 'grip_strength',
  'sleep_hours', 'sleep_quality', 'systolic_bp', 'diastolic_bp', 'steps',
];

export default function LongevityHomeScreen() {
  const navigation = useNavigation<any>();
  const logs = useAppSelector(s => s.biomarker.logs);
  const userProfile = useAppSelector(s => s.user.profile);
  const latest = useAppSelector(s => s.body.latestMeasurement);

  const [aiResult, setAiResult] = useState<LongevityAnalysisOutput | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const sex = userProfile?.sex ?? 'male';
  const dob = userProfile?.dateOfBirth;
  const chronoAge = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
    : undefined;

  const lbm = latest && latest.bodyFatPercent
    ? calculateLBM(latest.weightKg, latest.bodyFatPercent)
    : latest?.leanBodyMassKg ?? null;
  const fm = latest && latest.bodyFatPercent
    ? calculateFatMass(latest.weightKg, latest.bodyFatPercent)
    : latest?.fatMassKg ?? null;
  const ffmi = latest && lbm ? calculateFFMI(lbm, latest.heightCm) : null;
  const fmi  = latest && fm  ? calculateFMI(fm, latest.heightCm)   : null;

  const scoreResult = useMemo(
    () => computeLongevityScore(logs, sex),
    [logs, sex],
  );

  const bioAge = chronoAge && scoreResult.trackedCount >= 3
    ? estimateBiologicalAge(chronoAge, scoreResult.composite)
    : null;

  const trackedTypes = new Set(scoreResult.markers.map(m => m.type));
  const untrackedTypes = ALL_TYPES.filter(t => !trackedTypes.has(t));

  const aiProvider = userProfile?.aiProvider ?? 'none';
  const apiKey = userProfile?.aiApiKeys?.[aiProvider] ?? '';
  const hasAI = aiProvider !== 'none' && !!apiKey;

  async function fetchAIAnalysis() {
    if (!hasAI || scoreResult.trackedCount === 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await getLongevityAnalysis(
        { provider: aiProvider, apiKey },
        {
          chronologicalAge: chronoAge,
          sex,
          ffmi: ffmi ?? undefined,
          fmi: fmi ?? undefined,
          markers: scoreResult.markers.map(m => ({
            label: BIOMARKER_META[m.type].label,
            value: m.latestValue,
            unit: BIOMARKER_META[m.type].unit,
            rating: m.rating,
          })),
          compositeScore: scoreResult.composite,
        },
      );
      if (res.success) setAiResult(res.data);
      else setAiError(res.error ?? 'Unknown error');
    } catch (e: any) {
      setAiError(e.message ?? 'Request failed');
    } finally {
      setAiLoading(false);
    }
  }

  const scoreColor =
    scoreResult.composite >= 80 ? COLORS.success
    : scoreResult.composite >= 60 ? COLORS.primary
    : scoreResult.composite >= 40 ? COLORS.warning
    : COLORS.danger;

  return (
    <ScreenContainer>
      {/* Composite score hero */}
      <View style={styles.heroCard}>
        <View style={styles.scoreRing}>
          <View style={[styles.scoreRingInner, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>
              {scoreResult.trackedCount > 0 ? scoreResult.composite : '—'}
            </Text>
            <Text style={styles.scoreLabel}>/100</Text>
          </View>
        </View>
        <View style={styles.heroRight}>
          <Text style={styles.heroTitle}>Longevity Score</Text>
          {scoreResult.trackedCount > 0 ? (
            <>
              <View style={[styles.ratingBadge, { backgroundColor: scoreColor + '22' }]}>
                <Text style={[styles.ratingText, { color: scoreColor }]}>
                  {scoreResult.rating.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.heroSub}>{scoreResult.trackedCount} of {ALL_TYPES.length} markers tracked</Text>
              {bioAge !== null && chronoAge !== undefined && (
                <Text style={styles.bioAge}>
                  Bio age: <Text style={{ color: bioAge < chronoAge ? COLORS.success : COLORS.danger, fontWeight: '800' }}>{bioAge}</Text>
                  {' '}(chrono: {chronoAge})
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.heroSub}>Log your first biomarker to see your score.</Text>
          )}
        </View>
      </View>

      {/* Log button */}
      <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('LogBiomarker')}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={styles.logBtnText}>Log Biomarker</Text>
      </TouchableOpacity>

      {/* Tracked markers */}
      {scoreResult.markers.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Tracked Markers</Text>
          {scoreResult.markers.map(m => (
            <MarkerCard
              key={m.type}
              marker={m}
              onPress={() => navigation.navigate('BiomarkerDetail', { type: m.type })}
            />
          ))}
        </>
      )}

      {/* Untracked markers */}
      {untrackedTypes.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Not Yet Tracked</Text>
          <View style={styles.untrackedGrid}>
            {untrackedTypes.map(t => (
              <TouchableOpacity
                key={t}
                style={styles.untrackedChip}
                onPress={() => navigation.navigate('LogBiomarker', { type: t })}
              >
                <Ionicons name={BIOMARKER_META[t].icon as any} size={16} color={COLORS.textMuted} />
                <Text style={styles.untrackedText}>{BIOMARKER_META[t].label}</Text>
                <Ionicons name="add" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* AI analysis */}
      {scoreResult.trackedCount >= 2 && (
        <>
          <Text style={styles.sectionLabel}>AI Longevity Analysis</Text>
          {!hasAI ? (
            <View style={styles.noAICard}>
              <Ionicons name="cloud-offline-outline" size={24} color={COLORS.textMuted} />
              <Text style={styles.noAIText}>Configure an AI provider in Settings for personalised longevity coaching.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.aiBtn, aiLoading && { opacity: 0.6 }]}
              onPress={fetchAIAnalysis}
              disabled={aiLoading}
            >
              {aiLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.aiBtnText}>{aiResult ? 'Refresh Analysis' : 'Get AI Analysis'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {aiError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{aiError}</Text>
            </View>
          )}

          {aiResult && (
            <AIResultCard result={aiResult} />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function MarkerCard({ marker, onPress }: { marker: MarkerSummary; onPress: () => void }) {
  const meta = BIOMARKER_META[marker.type];
  const ratingColor = RATING_COLORS[marker.rating];
  const trendIcon = marker.trend === 'up' ? 'trending-up' : marker.trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = meta.higherIsBetter
    ? (marker.trend === 'up' ? COLORS.success : marker.trend === 'down' ? COLORS.danger : COLORS.textMuted)
    : (marker.trend === 'down' ? COLORS.success : marker.trend === 'up' ? COLORS.danger : COLORS.textMuted);

  return (
    <TouchableOpacity style={[styles.markerCard, { borderLeftColor: ratingColor }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.markerLeft}>
        <View style={[styles.markerIcon, { backgroundColor: ratingColor + '20' }]}>
          <Ionicons name={meta.icon as any} size={18} color={ratingColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.markerName}>{meta.label}</Text>
          <Text style={styles.markerDate}>{new Date(marker.latestDate).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.markerRight}>
        {/* Sparkline */}
        {marker.history.length > 1 && (
          <View style={styles.sparkRow}>
            {marker.history.map((h, i) => {
              const h2 = Math.max(4, Math.round((h.score / 100) * 24));
              const c = h.score >= 75 ? COLORS.success : h.score >= 55 ? COLORS.primary : h.score >= 35 ? COLORS.warning : COLORS.danger;
              return (
                <View key={i} style={styles.sparkBarWrap}>
                  <View style={[styles.sparkBar, { height: h2, backgroundColor: c }]} />
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.markerValueRow}>
          <Text style={[styles.markerValue, { color: ratingColor }]}>
            {marker.latestValue}{meta.unit === 'steps' ? '' : ` ${meta.unit}`}
          </Text>
          <Ionicons name={trendIcon as any} size={14} color={trendColor} />
        </View>
        <View style={[styles.ratingPill, { backgroundColor: ratingColor + '20' }]}>
          <Text style={[styles.ratingPillText, { color: ratingColor }]}>{marker.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AIResultCard({ result }: { result: LongevityAnalysisOutput }) {
  return (
    <View style={styles.aiResultCard}>
      <Text style={styles.aiAssessment}>{result.overallAssessment}</Text>
      {result.biologicalAgeEstimate !== undefined && (
        <View style={styles.bioAgeAI}>
          <Text style={styles.bioAgeAILabel}>AI Biological Age Estimate</Text>
          <Text style={[styles.bioAgeAIVal, { color: COLORS.secondary }]}>{result.biologicalAgeEstimate}</Text>
        </View>
      )}
      {result.topStrengths.length > 0 && (
        <View style={styles.aiSection}>
          <Text style={[styles.aiSectionTitle, { color: COLORS.success }]}>Strengths</Text>
          {result.topStrengths.map((s, i) => (
            <View key={i} style={styles.aiBullet}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.aiBulletText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
      {result.topRisks.length > 0 && (
        <View style={styles.aiSection}>
          <Text style={[styles.aiSectionTitle, { color: COLORS.danger }]}>Risks</Text>
          {result.topRisks.map((r, i) => (
            <View key={i} style={styles.aiBullet}>
              <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
              <Text style={styles.aiBulletText}>{r}</Text>
            </View>
          ))}
        </View>
      )}
      {result.priorityActions.length > 0 && (
        <View style={styles.aiSection}>
          <Text style={[styles.aiSectionTitle, { color: COLORS.primary }]}>Priority Actions</Text>
          {result.priorityActions.map((a, i) => (
            <View key={i} style={styles.actionRow}>
              <Text style={styles.actionBiomarker}>{a.biomarker}</Text>
              <Text style={styles.actionText}>{a.action}</Text>
              <Text style={styles.actionTimeframe}>{a.timeframe}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreRing: { alignItems: 'center', justifyContent: 'center' },
  scoreRingInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 30, fontWeight: '900', lineHeight: 34 },
  scoreLabel: { color: COLORS.textMuted, fontSize: 11 },
  heroRight: { flex: 1 },
  heroTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  ratingBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  ratingText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  heroSub: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16 },
  bioAge: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  logBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  logBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  markerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  markerIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  markerName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  markerDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  markerRight: { alignItems: 'flex-end', gap: 4 },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 24 },
  sparkBarWrap: { width: 6, alignItems: 'center', justifyContent: 'flex-end', height: 24 },
  sparkBar: { width: 5, borderRadius: 2, minHeight: 4 },
  markerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markerValue: { fontSize: 15, fontWeight: '800' },
  ratingPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  untrackedGrid: { gap: 8, marginBottom: 16 },
  untrackedChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  untrackedText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  noAICard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8, marginBottom: 12 },
  noAIText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  aiBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  errorBox: { backgroundColor: COLORS.danger + '20', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  aiResultCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  aiAssessment: { color: COLORS.text, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  bioAgeAI: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: COLORS.secondary + '15', borderRadius: 10, padding: 12 },
  bioAgeAILabel: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  bioAgeAIVal: { fontSize: 26, fontWeight: '900' },
  aiSection: { marginBottom: 12 },
  aiSectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  aiBullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  aiBulletText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  actionRow: { backgroundColor: COLORS.surfaceLight, borderRadius: 8, padding: 10, marginBottom: 6 },
  actionBiomarker: { color: COLORS.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  actionText: { color: COLORS.text, fontSize: 13, lineHeight: 17, marginBottom: 3 },
  actionTimeframe: { color: COLORS.textMuted, fontSize: 11 },
});
