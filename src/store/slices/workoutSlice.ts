import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WorkoutSession, Exercise } from '../../types';

interface WorkoutState {
  sessions: WorkoutSession[];
  exercises: Exercise[];
  activeSession: WorkoutSession | null;
}

const initialState: WorkoutState = {
  sessions: [],
  exercises: [],
  activeSession: null,
};

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    startSession(state, action: PayloadAction<WorkoutSession>) {
      state.activeSession = action.payload;
    },
    finishSession(state) {
      if (state.activeSession) {
        state.sessions.push(state.activeSession);
        state.activeSession = null;
      }
    },
    cancelSession(state) {
      state.activeSession = null;
    },
    addSession(state, action: PayloadAction<WorkoutSession>) {
      state.sessions.push(action.payload);
    },
    deleteSession(state, action: PayloadAction<string>) {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
    },
    setExercises(state, action: PayloadAction<Exercise[]>) {
      state.exercises = action.payload;
    },
    restrictExercise(state, action: PayloadAction<{ exerciseId: string; restricted: boolean }>) {
      const ex = state.exercises.find(e => e.id === action.payload.exerciseId);
      if (ex) ex.isRestricted = action.payload.restricted;
    },
  },
});

export const {
  startSession,
  finishSession,
  cancelSession,
  addSession,
  deleteSession,
  setExercises,
  restrictExercise,
} = workoutSlice.actions;

export default workoutSlice.reducer;
