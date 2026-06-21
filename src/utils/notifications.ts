import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReminderConfig {
  workoutEnabled: boolean;
  workoutHour: number;     // 0-23
  workoutMinute: number;
  nutritionEnabled: boolean;
  nutritionHour: number;
  nutritionMinute: number;
  biomarkerEnabled: boolean;
  biomarkerHour: number;
  biomarkerMinute: number;
  biomarkerDaysOfWeek: number[];  // 1=Sun … 7=Sat; empty = daily
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  workoutEnabled: true,
  workoutHour: 7,
  workoutMinute: 0,
  nutritionEnabled: true,
  nutritionHour: 20,
  nutritionMinute: 0,
  biomarkerEnabled: false,
  biomarkerHour: 9,
  biomarkerMinute: 0,
  biomarkerDaysOfWeek: [2],  // Monday
};

// Notification identifiers — used to cancel and re-schedule on update
const IDS = {
  workout: 'vl-workout-reminder',
  nutrition: 'vl-nutrition-reminder',
  biomarker: 'vl-biomarker-reminder',
};

// ─── Permission ──────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

// ─── Schedule helpers ────────────────────────────────────────────────────────

async function cancelById(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

async function scheduleDailyReminder(
  id: string,
  hour: number,
  minute: number,
  title: string,
  body: string,
) {
  await cancelById(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true },
    trigger: { hour, minute, repeats: true } as any,
  });
}

async function scheduleWeeklyReminder(
  id: string,
  hour: number,
  minute: number,
  weekday: number,  // 1=Sun … 7=Sat
  title: string,
  body: string,
) {
  await cancelById(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true },
    trigger: { weekday, hour, minute, repeats: true } as any,
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function applyReminderConfig(config: ReminderConfig): Promise<void> {
  if (Platform.OS === 'web') return;

  // Workout reminder
  if (config.workoutEnabled) {
    await scheduleDailyReminder(
      IDS.workout,
      config.workoutHour,
      config.workoutMinute,
      '💪 Time to train',
      "Your workout is scheduled — let's get it done.",
    );
  } else {
    await cancelById(IDS.workout);
  }

  // Nutrition log reminder
  if (config.nutritionEnabled) {
    await scheduleDailyReminder(
      IDS.nutrition,
      config.nutritionHour,
      config.nutritionMinute,
      '🥗 Log your meals',
      "Don't forget to log today's food before the day ends.",
    );
  } else {
    await cancelById(IDS.nutrition);
  }

  // Biomarker reminder — weekly on selected days or daily
  if (config.biomarkerEnabled) {
    const days = config.biomarkerDaysOfWeek.length > 0
      ? config.biomarkerDaysOfWeek
      : [1, 2, 3, 4, 5, 6, 7]; // daily fallback

    // Cancel existing first, then schedule one per selected day
    await cancelById(IDS.biomarker);
    for (const day of days) {
      const uniqueId = `${IDS.biomarker}-${day}`;
      await scheduleWeeklyReminder(
        uniqueId,
        config.biomarkerHour,
        config.biomarkerMinute,
        day,
        '❤️ Log your vitals',
        'Track your HRV, resting HR, or sleep to stay on top of your longevity score.',
      );
    }
  } else {
    // Cancel all day variants
    for (const day of [1, 2, 3, 4, 5, 6, 7]) {
      await cancelById(`${IDS.biomarker}-${day}`);
    }
    await cancelById(IDS.biomarker);
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminders() {
  return Notifications.getAllScheduledNotificationsAsync();
}

export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}
