import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, LimbLengths, AIProvider, ActivityLevel, UnitSystem, AppTheme } from '../../types';

interface UserState {
  profile: UserProfile | null;
  onboardingComplete: boolean;
}

const initialState: UserState = {
  profile: null,
  onboardingComplete: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<UserProfile>) {
      state.profile = action.payload;
      state.onboardingComplete = action.payload.onboardingComplete;
    },
    updateProfile(state, action: PayloadAction<Partial<UserProfile>>) {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    updateLimbs(state, action: PayloadAction<LimbLengths>) {
      if (state.profile) {
        state.profile.limbs = { ...state.profile.limbs, ...action.payload };
      }
    },
    setAIProvider(state, action: PayloadAction<AIProvider>) {
      if (state.profile) {
        state.profile.aiProvider = action.payload;
      }
    },
    setAIApiKey(state, action: PayloadAction<{ provider: AIProvider; key: string }>) {
      if (state.profile) {
        state.profile.aiApiKeys = {
          ...state.profile.aiApiKeys,
          [action.payload.provider]: action.payload.key,
        };
      }
    },
    setActivityLevel(state, action: PayloadAction<ActivityLevel>) {
      if (state.profile) {
        state.profile.activityLevel = action.payload;
      }
    },
    completeOnboarding(state) {
      state.onboardingComplete = true;
      if (state.profile) {
        state.profile.onboardingComplete = true;
      }
    },
    setUnitSystem(state, action: PayloadAction<UnitSystem>) {
      if (state.profile) state.profile.unitSystem = action.payload;
    },
    setTheme(state, action: PayloadAction<AppTheme>) {
      if (state.profile) state.profile.theme = action.payload;
    },
    setSensorIntegration(state, action: PayloadAction<boolean>) {
      if (state.profile) state.profile.sensorIntegration = action.payload;
    },
    setShowInfoIcons(state, action: PayloadAction<boolean>) {
      if (state.profile) state.profile.showInfoIcons = action.payload;
    },
    clearProfile(state) {
      state.profile = null;
      state.onboardingComplete = false;
    },
  },
});

export const {
  setProfile,
  updateProfile,
  updateLimbs,
  setAIProvider,
  setAIApiKey,
  setActivityLevel,
  setUnitSystem,
  setTheme,
  setSensorIntegration,
  setShowInfoIcons,
  completeOnboarding,
  clearProfile,
} = userSlice.actions;

export default userSlice.reducer;
