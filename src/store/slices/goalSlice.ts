import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Goal } from '../../types';

interface GoalState {
  goals: Goal[];
}

const initialState: GoalState = { goals: [] };

const goalSlice = createSlice({
  name: 'goal',
  initialState,
  reducers: {
    addGoal(state, action: PayloadAction<Goal>) {
      state.goals.push(action.payload);
    },
    updateGoal(state, action: PayloadAction<Goal>) {
      const idx = state.goals.findIndex(g => g.id === action.payload.id);
      if (idx !== -1) state.goals[idx] = action.payload;
    },
    deleteGoal(state, action: PayloadAction<string>) {
      state.goals = state.goals.filter(g => g.id !== action.payload);
    },
    completeGoal(state, action: PayloadAction<string>) {
      const g = state.goals.find(g => g.id === action.payload);
      if (g) g.isCompleted = true;
    },
  },
});

export const { addGoal, updateGoal, deleteGoal, completeGoal } = goalSlice.actions;
export default goalSlice.reducer;
