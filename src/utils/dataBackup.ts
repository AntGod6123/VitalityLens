import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Share } from 'react-native';
import { store, persistor } from '../store';
import { setProfile, completeOnboarding } from '../store/slices/userSlice';
import { addMeasurement } from '../store/slices/bodySlice';
import { addSession } from '../store/slices/workoutSlice';
import { addLog as addNutritionLog, addSupplement } from '../store/slices/nutritionSlice';
import { addLog as addBiomarkerLog } from '../store/slices/biomarkerSlice';
import { addPlan } from '../store/slices/planSlice';
import { addGoal } from '../store/slices/goalSlice';
import { addDocument, addInjury } from '../store/slices/medicalSlice';

const BACKUP_VERSION = 1;

export interface BackupManifest {
  version: number;
  exportedAt: string;
  appVersion: string;
  counts: Record<string, number>;
}

export interface VitalityBackup {
  manifest: BackupManifest;
  state: {
    user: ReturnType<typeof store.getState>['user'];
    body: ReturnType<typeof store.getState>['body'];
    workout: ReturnType<typeof store.getState>['workout'];
    nutrition: ReturnType<typeof store.getState>['nutrition'];
    medical: ReturnType<typeof store.getState>['medical'];
    biomarker: ReturnType<typeof store.getState>['biomarker'];
    plan: ReturnType<typeof store.getState>['plan'];
    goal: ReturnType<typeof store.getState>['goal'];
  };
}

export async function exportBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    const state = store.getState() as any;

    // Strip redux-persist internal keys
    const cleanState = {
      user: stripPersist(state.user),
      body: stripPersist(state.body),
      workout: stripPersist(state.workout),
      nutrition: stripPersist(state.nutrition),
      medical: stripPersist(state.medical),
      biomarker: stripPersist(state.biomarker),
      plan: stripPersist(state.plan),
      goal: stripPersist(state.goal),
    };

    const manifest: BackupManifest = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: '0.1.0',
      counts: {
        measurements: cleanState.body.measurements?.length ?? 0,
        workoutSessions: cleanState.workout.sessions?.length ?? 0,
        nutritionLogs: cleanState.nutrition.logs?.length ?? 0,
        biomarkerLogs: cleanState.biomarker.logs?.length ?? 0,
        plans: cleanState.plan.plans?.length ?? 0,
        goals: cleanState.goal.goals?.length ?? 0,
        injuries: cleanState.medical.injuries?.length ?? 0,
        documents: cleanState.medical.documents?.length ?? 0,
        supplements: cleanState.nutrition.supplements?.length ?? 0,
      },
    };

    const backup: VitalityBackup = { manifest, state: cleanState };
    const json = JSON.stringify(backup, null, 2);

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `vitalitylens-backup-${dateStr}.json`;
    const fileUri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

    const result = await Share.share({
      title: 'VitalityLens Backup',
      url: fileUri,         // iOS
      message: fileUri,     // Android fallback
    });

    return { success: result.action !== 'dismissedAction' };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Unknown error' };
  }
}

export async function importBackup(): Promise<{
  success: boolean;
  manifest?: BackupManifest;
  error?: string;
}> {
  try {
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (picked.canceled || !picked.assets?.[0]) {
      return { success: false, error: 'Cancelled' };
    }

    const fileUri = picked.assets[0].uri;
    const json = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    const backup: VitalityBackup = JSON.parse(json);

    if (!backup.manifest || backup.manifest.version !== BACKUP_VERSION) {
      return { success: false, error: 'Unrecognised backup format or version mismatch.' };
    }

    // Purge persisted state, then dispatch all records
    await persistor.purge();

    const s = backup.state;
    const dispatch = store.dispatch;

    // User profile
    if (s.user?.profile) {
      dispatch(setProfile(s.user.profile));
      dispatch(completeOnboarding());
    }

    // Body measurements
    for (const m of s.body?.measurements ?? []) dispatch(addMeasurement(m));

    // Workout sessions
    for (const sess of s.workout?.sessions ?? []) dispatch(addSession(sess));

    // Nutrition
    for (const log of s.nutrition?.logs ?? []) dispatch(addNutritionLog(log));
    for (const supp of s.nutrition?.supplements ?? []) dispatch(addSupplement(supp));

    // Medical
    for (const doc of s.medical?.documents ?? []) dispatch(addDocument(doc));
    for (const inj of s.medical?.injuries ?? []) dispatch(addInjury(inj));

    // Biomarkers
    for (const log of s.biomarker?.logs ?? []) dispatch(addBiomarkerLog(log));

    // Plans
    for (const plan of s.plan?.plans ?? []) dispatch(addPlan(plan));

    // Goals
    for (const goal of s.goal?.goals ?? []) dispatch(addGoal(goal));

    return { success: true, manifest: backup.manifest };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to read backup file.' };
  }
}

function stripPersist(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const { _persist, ...rest } = obj;
  return rest;
}
