import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';
import { exportBackup, importBackup, BackupManifest } from '../../utils/dataBackup';

export default function DataManagementScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastManifest, setLastManifest] = useState<BackupManifest | null>(null);

  const body = useAppSelector(s => s.body);
  const workout = useAppSelector(s => s.workout);
  const nutrition = useAppSelector(s => s.nutrition);
  const biomarker = useAppSelector(s => s.biomarker);
  const plan = useAppSelector(s => s.plan);
  const goal = useAppSelector(s => s.goal);
  const medical = useAppSelector(s => s.medical);

  const stats = [
    { label: 'Body Measurements', count: body.measurements.length, icon: 'body-outline', color: COLORS.primary },
    { label: 'Workout Sessions', count: workout.sessions.length, icon: 'barbell-outline', color: COLORS.secondary },
    { label: 'Nutrition Logs', count: nutrition.logs.length, icon: 'nutrition-outline', color: COLORS.warning },
    { label: 'Biomarker Readings', count: biomarker.logs.length, icon: 'heart-outline', color: '#8B5CF6' },
    { label: 'Workout Plans', count: plan.plans.length, icon: 'clipboard-outline', color: COLORS.accent },
    { label: 'Goals', count: goal.goals.length, icon: 'flag-outline', color: COLORS.secondary },
    { label: 'Medical Documents', count: medical.documents.length, icon: 'document-outline', color: COLORS.danger },
    { label: 'Supplements', count: nutrition.supplements.length, icon: 'flask-outline', color: COLORS.primary },
  ];

  const totalRecords = stats.reduce((s, i) => s + i.count, 0);

  async function handleExport() {
    setExporting(true);
    const result = await exportBackup();
    setExporting(false);

    if (!result.success && result.error && result.error !== 'Cancelled') {
      Alert.alert('Export Failed', result.error);
    }
  }

  async function handleImport() {
    Alert.alert(
      'Restore Backup',
      'This will replace ALL current data with the backup. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            const result = await importBackup();
            setImporting(false);

            if (result.success && result.manifest) {
              setLastManifest(result.manifest);
              Alert.alert(
                'Restore Complete',
                `Successfully restored backup from ${new Date(result.manifest.exportedAt).toLocaleDateString()}.\n\n` +
                Object.entries(result.manifest.counts)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${v} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
                  .join('\n'),
              );
            } else if (result.error && result.error !== 'Cancelled') {
              Alert.alert('Restore Failed', result.error);
            }
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer>
      {/* Current data summary */}
      <Text style={styles.sectionTitle}>Your Data</Text>
      <Text style={styles.sectionDesc}>
        {totalRecords} total records stored locally on this device.
      </Text>

      <View style={styles.statsGrid}>
        {stats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
              <Ionicons name={s.icon as any} size={16} color={s.color} />
            </View>
            <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Export */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Export Backup</Text>
      <Text style={styles.sectionDesc}>
        Save all your data as a JSON file. Share it via Files, email, or cloud storage. Your AI API keys are excluded for security.
      </Text>

      <View style={styles.actionCard}>
        <View style={styles.actionIconWrap}>
          <Ionicons name="cloud-upload-outline" size={28} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Export All Data</Text>
          <Text style={styles.actionDesc}>Creates a .json backup file and opens the share sheet</Text>
        </View>
      </View>
      <Button
        title={exporting ? 'Preparing…' : 'Export Backup'}
        onPress={handleExport}
        size="lg"
        disabled={exporting}
        style={{ marginBottom: 24 }}
      />

      {/* Import */}
      <Text style={[styles.sectionTitle]}>Restore Backup</Text>
      <Text style={styles.sectionDesc}>
        Pick a previously exported .json file to restore your data. All current data will be replaced.
      </Text>

      <View style={[styles.actionCard, { borderColor: COLORS.warning + '60' }]}>
        <View style={[styles.actionIconWrap, { backgroundColor: COLORS.warning + '18' }]}>
          <Ionicons name="cloud-download-outline" size={28} color={COLORS.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Restore from Backup</Text>
          <Text style={styles.actionDesc}>Pick a VitalityLens .json file — replaces all current data</Text>
        </View>
      </View>
      <Button
        title={importing ? 'Restoring…' : 'Choose Backup File'}
        onPress={handleImport}
        variant="secondary"
        size="lg"
        disabled={importing}
        style={{ marginBottom: 24 }}
      />

      {/* Last restored manifest */}
      {lastManifest && (
        <View style={styles.manifestCard}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.manifestTitle}>Last Restored</Text>
            <Text style={styles.manifestDate}>
              Backup from {new Date(lastManifest.exportedAt).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* Privacy note */}
      <View style={styles.privacyCard}>
        <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
        <Text style={styles.privacyText}>
          All data is stored only on your device. Backups contain everything except API keys. No data is sent to any server.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  sectionDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statCount: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, lineHeight: 15 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  actionDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  manifestCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.success + '12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  manifestTitle: { color: COLORS.success, fontSize: 13, fontWeight: '700' },
  manifestDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    marginBottom: 32,
  },
  privacyText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
});
