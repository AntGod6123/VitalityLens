import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { setAIProvider, setAIApiKey, setActivityLevel, clearProfile } from '../../store/slices/userSlice';
import { COLORS, ACTIVITY_LEVELS } from '../../constants';
import { AIProvider, ActivityLevel } from '../../types';
import Button from '../../components/common/Button';
import ScreenContainer from '../../components/common/ScreenContainer';

const PROVIDERS: { value: AIProvider; label: string; description: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)', description: 'Recommended — best medical document analysis' },
  { value: 'openai', label: 'OpenAI (GPT-4o)', description: 'Alternative provider with broad capability' },
  { value: 'none', label: 'None (offline)', description: 'AI features disabled' },
];

export default function AISettingsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(s => s.user.profile);
  const currentProvider = profile?.aiProvider ?? 'none';
  const currentActivityLevel = profile?.activityLevel ?? 'sedentary';

  const [claudeKey, setClaudeKey] = useState(profile?.aiApiKeys?.claude ?? '');
  const [openaiKey, setOpenaiKey] = useState(profile?.aiApiKeys?.openai ?? '');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  function saveKeys() {
    if (claudeKey.trim()) dispatch(setAIApiKey({ provider: 'claude', key: claudeKey.trim() }));
    if (openaiKey.trim()) dispatch(setAIApiKey({ provider: 'openai', key: openaiKey.trim() }));
    Alert.alert('Saved', 'API keys updated.');
  }

  return (
    <ScreenContainer>
      <Text style={styles.sectionTitle}>AI Provider</Text>
      <Text style={styles.sectionDesc}>
        Your API key is stored locally on device only. It is never sent to our servers.
      </Text>

      {PROVIDERS.map(p => (
        <TouchableOpacity
          key={p.value}
          style={[styles.providerCard, currentProvider === p.value && styles.providerCardActive]}
          onPress={() => dispatch(setAIProvider(p.value))}
        >
          <View style={styles.providerRow}>
            <View style={styles.providerRadio}>
              {currentProvider === p.value && <View style={styles.providerRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.providerLabel, currentProvider === p.value && styles.providerLabelActive]}>
                {p.label}
              </Text>
              <Text style={styles.providerDesc}>{p.description}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {/* API Keys */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>API Keys</Text>

      <View style={styles.keyField}>
        <Text style={styles.keyLabel}>Anthropic (Claude) API Key</Text>
        <View style={styles.keyRow}>
          <TextInput
            style={[styles.keyInput, { flex: 1 }]}
            value={claudeKey}
            onChangeText={setClaudeKey}
            placeholder="sk-ant-..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showClaudeKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowClaudeKey(v => !v)} style={styles.eyeBtn}>
            <Ionicons name={showClaudeKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.keyField}>
        <Text style={styles.keyLabel}>OpenAI API Key</Text>
        <View style={styles.keyRow}>
          <TextInput
            style={[styles.keyInput, { flex: 1 }]}
            value={openaiKey}
            onChangeText={setOpenaiKey}
            placeholder="sk-..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showOpenaiKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowOpenaiKey(v => !v)} style={styles.eyeBtn}>
            <Ionicons name={showOpenaiKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <Button title="Save API Keys" onPress={saveKeys} style={styles.saveBtn} />

      {/* Activity Level */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Activity Level</Text>
      <Text style={styles.sectionDesc}>Used for TDEE NEAT calculation (non-workout movement).</Text>

      {ACTIVITY_LEVELS.map(al => (
        <TouchableOpacity
          key={al.value}
          style={[styles.providerCard, currentActivityLevel === al.value && styles.providerCardActive]}
          onPress={() => dispatch(setActivityLevel(al.value as ActivityLevel))}
        >
          <View style={styles.providerRow}>
            <View style={styles.providerRadio}>
              {currentActivityLevel === al.value && <View style={styles.providerRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.providerLabel, currentActivityLevel === al.value && styles.providerLabelActive]}>
                {al.label}
              </Text>
              <Text style={styles.providerDesc}>{al.description}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {/* Profile info */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Profile</Text>
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('ProfileEdit')}
        activeOpacity={0.8}
      >
        <View style={styles.profileCardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.name ?? '—'}</Text>
            <Text style={styles.profileMeta}>
              {profile?.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) : ''}
              {profile?.dateOfBirth ? ` · Born ${profile.dateOfBirth}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
      {/* Data & Backup */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Data & Backup</Text>
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('DataManagement')}
        activeOpacity={0.8}
      >
        <View style={styles.profileCardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Export / Restore Data</Text>
            <Text style={styles.profileMeta}>Back up all your logs and settings to a JSON file</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resetBtn}
        onPress={() =>
          Alert.alert(
            'Reset Profile',
            'This will clear your profile and restart onboarding. Your workout and body data will remain.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => dispatch(clearProfile()),
              },
            ],
          )
        }
      >
        <Ionicons name="refresh-outline" size={16} color={COLORS.danger} />
        <Text style={styles.resetText}>Reset Profile &amp; Re-run Onboarding</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  sectionDesc: { color: COLORS.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 18 },
  providerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerCardActive: { borderColor: COLORS.primary },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  providerLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  providerLabelActive: { color: COLORS.primary },
  providerDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  keyField: { marginBottom: 14 },
  keyLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  keyRow: { flexDirection: 'row', alignItems: 'center' },
  keyInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'monospace',
  },
  eyeBtn: { padding: 10, marginLeft: 4 },
  saveBtn: { marginTop: 4, marginBottom: 4 },
  profileCardRow: { flexDirection: 'row', alignItems: 'center' },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  profileMeta: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 32,
  },
  resetText: { color: COLORS.danger, fontSize: 14 },
});
