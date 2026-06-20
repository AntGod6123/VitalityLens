import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, LimbLengths, AIProvider, ActivityLevel } from '../../types';

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
  completeOnboarding,
  clearProfile,
} = userSlice.actions;

export default userSlice.reducer;
