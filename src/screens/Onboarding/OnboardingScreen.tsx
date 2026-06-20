import React, { useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../../hooks/useAppSelector';
import { setProfile, completeOnboarding } from '../../store/slices/userSlice';
import { UserProfile, ActivityLevel, AIProvider, LimbLengths } from '../../types';
import { COLORS, ACTIVITY_LEVELS } from '../../constants';
import Button from '../../components/common/Button';

const { width: SCREEN_W } = Dimensions.get('window');

const STEPS = ['Welcome', 'Profile', 'Limbs', 'AI'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  // Profile fields
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');  // YYYY-MM-DD
  const [dobDisplay, setDobDisplay] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');

  // Limb lengths (optional)
  const [thighL, setThighL] = useState('');
  const [lowerLeg, setLowerLeg] = useState('');
  const [upperArm, setUpperArm] = useState('');
  const [forearm, setForearm] = useState('');
  const [torso, setTorso] = useState('');
  const [foot, setFoot] = useState('');

  // AI
  const [aiProvider, setAiProvider] = useState<AIProvider>('none');
  const [claudeKey, setClaudeKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  function scrollTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    setStep(index);
  }

  function next() { scrollTo(Math.min(step + 1, STEPS.length - 1)); }
  function back() { scrollTo(Math.max(step - 1, 0)); }

  function formatDob(text: string) {
    // Auto-insert dashes: YYYY-MM-DD
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = digits.slice(0, 4) + '-' + digits.slice(4);
    if (digits.length > 6) formatted = formatted.slice(0, 7) + '-' + digits.slice(6);
    setDobDisplay(formatted);
    if (digits.length === 8) {
      setDob(`${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`);
    } else {
      setDob('');
    }
  }

  function canProceedStep1() {
    return name.trim().length > 0 && dob.length === 10;
  }

  function finish() {
    const limbs: LimbLengths = {
      thighLengthCm: parseFloat(thighL) || undefined,
      lowerLegLengthCm: parseFloat(lowerLeg) || undefined,
      upperArmLengthCm: parseFloat(upperArm) || undefined,
      forearmLengthCm: parseFloat(forearm) || undefined,
      torsoLengthCm: parseFloat(torso) || undefined,
      footLengthCm: parseFloat(foot) || undefined,
    };

    const hasLimbs = Object.values(limbs).some(v => v !== undefined);

    const profile: UserProfile = {
      id: Date.now().toString(),
      name: name.trim(),
      dateOfBirth: dob,
      sex,
      activityLevel,
      aiProvider,
      aiApiKeys: {
        ...(claudeKey.trim() ? { claude: claudeKey.trim() } : {}),
        ...(openaiKey.trim() ? { openai: openaiKey.trim() } : {}),
      },
      limbs: hasLimbs ? limbs : undefined,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    };

    dispatch(setProfile(profile));
    dispatch(completeOnboarding());
  }

  return (
    <View style={styles.root}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {/* ── Step 0: Welcome ──────────────────────────────────── */}
        <View style={styles.page}>
          <View style={styles.iconCircle}>
            <Ionicons name="fitness" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Welcome to{'\n'}VitalityLens</Text>
          <Text style={styles.subtitle}>
            Track your body composition, workout energy, and longevity — all calculated from your own measurements.
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: 'barbell-outline', text: 'W=Fd workout energy from your body dimensions' },
              { icon: 'body-outline', text: 'FFMI + FMI — muscle and fat indices beyond BMI' },
              { icon: 'document-text-outline', text: 'AI-powered medical document analysis' },
              { icon: 'trending-up-outline', text: 'Muscle growth projections and overload targets' },
            ].map(f => (
              <View key={f.icon} style={styles.featureRow}>
                <Ionicons name={f.icon as any} size={20} color={COLORS.primary} style={styles.featureIcon} />
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <Button title="Get Started" onPress={next} size="lg" style={styles.btn} />
        </View>

        {/* ── Step 1: Profile ──────────────────────────────────── */}
        <View style={styles.page}>
          <Text style={styles.stepLabel}>Step 1 of 3</Text>
          <Text style={styles.title}>About You</Text>
          <Text style={styles.subtitle}>Used for BMR, body fat calculations, and AI coaching.</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.fieldLabel}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={dobDisplay}
            onChangeText={formatDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.fieldLabel}>Biological Sex</Text>
          <View style={styles.sexRow}>
            {(['male', 'female'] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.sexChip, sex === s && styles.sexChipActive]}
                onPress={() => setSex(s)}
              >
                <Ionicons
                  name={s === 'male' ? 'male-outline' : 'female-outline'}
                  size={18}
                  color={sex === s ? '#fff' : COLORS.textMuted}
                />
                <Text style={[styles.sexChipText, sex === s && styles.sexChipTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Typical Activity Level</Text>
          {ACTIVITY_LEVELS.map(al => (
            <TouchableOpacity
              key={al.value}
              style={[styles.actCard, activityLevel === al.value && styles.actCardActive]}
              onPress={() => setActivityLevel(al.value as ActivityLevel)}
            >
              <View style={styles.actRadio}>
                {activityLevel === al.value && <View style={styles.actRadioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actLabel, activityLevel === al.value && styles.actLabelActive]}>
                  {al.label}
                </Text>
                <Text style={styles.actDesc}>{al.description}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.navRow}>
            <Button title="Back" onPress={back} variant="ghost" style={styles.navBtn} />
            <Button
              title="Next"
              onPress={next}
              style={styles.navBtn}
              disabled={!canProceedStep1()}
            />
          </View>
        </View>

        {/* ── Step 2: Limb Lengths ─────────────────────────────── */}
        <View style={styles.page}>
          <Text style={styles.stepLabel}>Step 2 of 3</Text>
          <Text style={styles.title}>Limb Lengths</Text>
          <Text style={styles.subtitle}>
            Optional but recommended. These let the app calculate your exact range of motion for workout energy (W=Fd). Measure joint-to-joint in cm.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              You can skip this and add measurements later in Body → Add Measurement. Default anatomical values will be used until then.
            </Text>
          </View>

          <View style={styles.limbGrid}>
            <LimbField label="Thigh" sublabel="hip crease → knee" value={thighL} onChange={setThighL} />
            <LimbField label="Lower Leg" sublabel="knee → ankle" value={lowerLeg} onChange={setLowerLeg} />
            <LimbField label="Upper Arm" sublabel="shoulder → elbow" value={upperArm} onChange={setUpperArm} />
            <LimbField label="Forearm" sublabel="elbow → wrist" value={forearm} onChange={setForearm} />
            <LimbField label="Torso" sublabel="shoulder → hip" value={torso} onChange={setTorso} />
            <LimbField label="Foot" sublabel="heel → toe" value={foot} onChange={setFoot} />
          </View>

          <View style={styles.navRow}>
            <Button title="Back" onPress={back} variant="ghost" style={styles.navBtn} />
            <Button title="Next" onPress={next} style={styles.navBtn} />
          </View>
        </View>

        {/* ── Step 3: AI Setup ─────────────────────────────────── */}
        <View style={styles.page}>
          <Text style={styles.stepLabel}>Step 3 of 3</Text>
          <Text style={styles.title}>AI Features</Text>
          <Text style={styles.subtitle}>
            Connect an AI provider to unlock medical document analysis, injury-safe exercise filtering, and personalised coaching. You can skip this and add it later in Settings.
          </Text>

          {([
            { value: 'claude' as AIProvider, label: 'Claude (Anthropic)', placeholder: 'sk-ant-...', recommended: true },
            { value: 'openai' as AIProvider, label: 'OpenAI GPT-4o', placeholder: 'sk-...', recommended: false },
          ] as const).map(p => (
            <TouchableOpacity
              key={p.value}
              style={[styles.provCard, aiProvider === p.value && styles.provCardActive]}
              onPress={() => setAiProvider(p.value)}
            >
              <View style={styles.provRow}>
                <View style={styles.actRadio}>
                  {aiProvider === p.value && <View style={styles.actRadioInner} />}
                </View>
                <Text style={[styles.actLabel, aiProvider === p.value && styles.actLabelActive]}>
                  {p.label}
                </Text>
                {p.recommended && (
                  <View style={styles.recBadge}>
                    <Text style={styles.recText}>Recommended</Text>
                  </View>
                )}
              </View>

              {aiProvider === p.value && (
                <View style={styles.keyRow}>
                  <TextInput
                    style={[styles.input, { marginTop: 10, marginBottom: 0 }]}
                    value={p.value === 'claude' ? claudeKey : openaiKey}
                    onChangeText={p.value === 'claude' ? setClaudeKey : setOpenaiKey}
                    placeholder={p.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowKey(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showKey ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.navRow}>
            <Button title="Back" onPress={back} variant="ghost" style={styles.navBtn} />
            <Button title="Finish Setup" onPress={finish} size="lg" style={[styles.navBtn, { flex: 1.5 }]} />
          </View>

          <TouchableOpacity onPress={finish} style={styles.skipLink}>
            <Text style={styles.skipText}>Skip — I'll add AI later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function LimbField({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.limbField}>
      <Text style={styles.limbLabel}>{label}</Text>
      <Text style={styles.limbSublabel}>{sublabel}</Text>
      <View style={styles.limbInputRow}>
        <TextInput
          style={styles.limbInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.limbUnit}>cm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  page: {
    width: SCREEN_W,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    lineHeight: 34,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  stepLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  featureList: { marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  featureIcon: { marginRight: 12, marginTop: 1 },
  featureText: { color: COLORS.text, fontSize: 14, flex: 1, lineHeight: 20 },
  btn: { marginTop: 8 },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  sexRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  sexChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
  },
  sexChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sexChipText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  sexChipTextActive: { color: '#fff' },
  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  actCardActive: { borderColor: COLORS.primary },
  actRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  actLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  actLabelActive: { color: COLORS.text },
  actDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  navBtn: { flex: 1 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoText: { color: COLORS.textMuted, fontSize: 13, flex: 1, lineHeight: 18 },
  limbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  limbField: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  limbLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  limbSublabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 8 },
  limbInputRow: { flexDirection: 'row', alignItems: 'center' },
  limbInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
  },
  limbUnit: { color: COLORS.textMuted, fontSize: 12, marginLeft: 6 },
  provCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  provCardActive: { borderColor: COLORS.primary },
  provRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.secondary + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recText: { color: COLORS.secondary, fontSize: 11, fontWeight: '600' },
  keyRow: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: 22,
    padding: 4,
  },
  skipLink: { alignItems: 'center', paddingTop: 16 },
  skipText: { color: COLORS.textMuted, fontSize: 14 },
});
