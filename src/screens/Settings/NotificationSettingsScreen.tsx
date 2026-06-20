import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants';
import {
  ReminderConfig,
  DEFAULT_REMINDER_CONFIG,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  applyReminderConfig,
  cancelAllReminders,
  formatTime,
} from '../../utils/notifications';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// expo-notifications weekday: 1=Sun, 2=Mon, … 7=Sat
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

export default function NotificationSettingsScreen() {
  const [permStatus, setPermStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [config, setConfig] = useState<ReminderConfig>(DEFAULT_REMINDER_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getNotificationPermissionStatus().then(setPermStatus);
  }, []);

  async function handleRequestPermission() {
    const granted = await requestNotificationPermission();
    setPermStatus(granted ? 'granted' : 'denied');
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Open Settings and allow notifications for VitalityLens to enable reminders.',
      );
    }
  }

  async function handleSave() {
    if (permStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermStatus(granted ? 'granted' : 'denied');
      if (!granted) return;
    }
    setSaving(true);
    await applyReminderConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDisableAll() {
    Alert.alert('Disable All Reminders', 'Cancel all scheduled notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable All',
        style: 'destructive',
        onPress: async () => {
          await cancelAllReminders();
          setConfig(c => ({
            ...c,
            workoutEnabled: false,
            nutritionEnabled: false,
            biomarkerEnabled: false,
          }));
        },
      },
    ]);
  }

  function patch(partial: Partial<ReminderConfig>) {
    setConfig(c => ({ ...c, ...partial }));
    setSaved(false);
  }

  function toggleDay(day: number) {
    const days = config.biomarkerDaysOfWeek.includes(day)
      ? config.biomarkerDaysOfWeek.filter(d => d !== day)
      : [...config.biomarkerDaysOfWeek, day];
    patch({ biomarkerDaysOfWeek: days });
  }

  return (
    <ScreenContainer>
      {/* Permission banner */}
      {permStatus !== 'granted' && (
        <TouchableOpacity style={styles.permBanner} onPress={handleRequestPermission}>
          <Ionicons name="notifications-off-outline" size={18} color={COLORS.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.permBannerTitle}>Notifications are {permStatus === 'denied' ? 'blocked' : 'not enabled'}</Text>
            <Text style={styles.permBannerDesc}>
              {permStatus === 'denied'
                ? 'Open your device Settings to allow notifications for this app.'
                : 'Tap to grant permission so reminders can be delivered.'}
            </Text>
          </View>
          {permStatus !== 'denied' && (
            <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
          )}
        </TouchableOpacity>
      )}

      {permStatus === 'granted' && (
        <View style={styles.permOk}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.permOkText}>Notifications are enabled</Text>
        </View>
      )}

      {/* ── Workout reminder ── */}
      <ReminderSection
        icon="barbell-outline"
        iconColor={COLORS.primary}
        title="Workout Reminder"
        subtitle="Daily nudge to train"
        enabled={config.workoutEnabled}
        onToggle={v => patch({ workoutEnabled: v })}
      >
        {config.workoutEnabled && (
          <TimePicker
            hour={config.workoutHour}
            minute={config.workoutMinute}
            onHourChange={h => patch({ workoutHour: h })}
            onMinuteChange={m => patch({ workoutMinute: m })}
          />
        )}
      </ReminderSection>

      {/* ── Nutrition reminder ── */}
      <ReminderSection
        icon="nutrition-outline"
        iconColor={COLORS.warning}
        title="Nutrition Log Reminder"
        subtitle="Evening prompt to log meals"
        enabled={config.nutritionEnabled}
        onToggle={v => patch({ nutritionEnabled: v })}
      >
        {config.nutritionEnabled && (
          <TimePicker
            hour={config.nutritionHour}
            minute={config.nutritionMinute}
            onHourChange={h => patch({ nutritionHour: h })}
            onMinuteChange={m => patch({ nutritionMinute: m })}
          />
        )}
      </ReminderSection>

      {/* ── Biomarker reminder ── */}
      <ReminderSection
        icon="heart-outline"
        iconColor="#8B5CF6"
        title="Vitals Reminder"
        subtitle="Log HRV, sleep, resting HR"
        enabled={config.biomarkerEnabled}
        onToggle={v => patch({ biomarkerEnabled: v })}
      >
        {config.biomarkerEnabled && (
          <>
            <TimePicker
              hour={config.biomarkerHour}
              minute={config.biomarkerMinute}
              onHourChange={h => patch({ biomarkerHour: h })}
              onMinuteChange={m => patch({ biomarkerMinute: m })}
            />
            <Text style={styles.dayLabel}>Days of the week</Text>
            <View style={styles.dayRow}>
              {DAY_VALUES.map((val, i) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.dayChip,
                    config.biomarkerDaysOfWeek.includes(val) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleDay(val)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      config.biomarkerDaysOfWeek.includes(val) && styles.dayChipTextActive,
                    ]}
                  >
                    {DAY_LABELS[i]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {config.biomarkerDaysOfWeek.length === 0 && (
              <Text style={styles.noDaysWarn}>Select at least one day</Text>
            )}
          </>
        )}
      </ReminderSection>

      {/* Save */}
      <Button
        title={saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Reminders'}
        onPress={handleSave}
        size="lg"
        style={{ ...styles.saveBtn, ...(saved ? { backgroundColor: COLORS.success } : {}) }}
        disabled={saving}
      />

      <TouchableOpacity style={styles.disableAll} onPress={handleDisableAll}>
        <Ionicons name="notifications-off-outline" size={15} color={COLORS.danger} />
        <Text style={styles.disableAllText}>Disable All Reminders</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Reminders are delivered even when the app is closed. They repeat on the schedule you set until changed or disabled.
      </Text>
    </ScreenContainer>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReminderSection({
  icon,
  iconColor,
  title,
  subtitle,
  enabled,
  onToggle,
  children,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.section, enabled && styles.sectionActive]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.border, true: iconColor + '80' }}
          thumbColor={enabled ? iconColor : COLORS.textMuted}
        />
      </View>
      {children}
    </View>
  );
}

function TimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
  return (
    <View style={styles.timePicker}>
      <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
      <Text style={styles.timeDisplay}>{formatTime(hour, minute)}</Text>
      <View style={styles.timeControls}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeColLabel}>Hour</Text>
          <View style={styles.timeStepRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onHourChange((hour - 1 + 24) % 24)}
            >
              <Ionicons name="chevron-back" size={14} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.timeVal}>{hour.toString().padStart(2, '0')}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onHourChange((hour + 1) % 24)}
            >
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.timeSep}>:</Text>
        <View style={styles.timeColumn}>
          <Text style={styles.timeColLabel}>Minute</Text>
          <View style={styles.timeStepRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const idx = MINUTES.indexOf(minute);
                onMinuteChange(MINUTES[(idx - 1 + MINUTES.length) % MINUTES.length]);
              }}
            >
              <Ionicons name="chevron-back" size={14} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.timeVal}>{minute.toString().padStart(2, '0')}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const idx = MINUTES.indexOf(minute);
                onMinuteChange(MINUTES[(idx + 1) % MINUTES.length]);
              }}
            >
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  permBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.warning + '18',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  permBannerTitle: { color: COLORS.warning, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  permBannerDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  permOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  permOkText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionActive: { borderColor: COLORS.primary + '50' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 0 },
  sectionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timeDisplay: { color: COLORS.primary, fontSize: 16, fontWeight: '700', minWidth: 70 },
  timeControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  timeColumn: { alignItems: 'center', gap: 4 },
  timeColLabel: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase' },
  timeStepRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    padding: 6,
  },
  timeVal: { color: COLORS.text, fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  timeSep: { color: COLORS.textMuted, fontSize: 18, fontWeight: '700', marginTop: 14 },
  dayLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  dayChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  dayChipTextActive: { color: COLORS.primary },
  noDaysWarn: { color: COLORS.warning, fontSize: 12, marginTop: 6 },
  saveBtn: { marginTop: 8, marginBottom: 4 },
  disableAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
  },
  disableAllText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
  note: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 32,
  },
});
