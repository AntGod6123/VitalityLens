import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NutritionLog, SupplementEntry } from '../../types';

interface NutritionState {
  logs: NutritionLog[];
  supplements: SupplementEntry[];
}

const initialState: NutritionState = {
  logs: [],
  supplements: [],
};

const nutritionSlice = createSlice({
  name: 'nutrition',
  initialState,
  reducers: {
    addLog(state, action: PayloadAction<NutritionLog>) {
      state.logs.push(action.payload);
    },
    updateLog(state, action: PayloadAction<NutritionLog>) {
      const idx = state.logs.findIndex(l => l.id === action.payload.id);
      if (idx !== -1) state.logs[idx] = action.payload;
    },
    deleteLog(state, action: PayloadAction<string>) {
      state.logs = state.logs.filter(l => l.id !== action.payload);
    },
    addSupplement(state, action: PayloadAction<SupplementEntry>) {
      state.supplements.push(action.payload);
    },
    removeSupplement(state, action: PayloadAction<string>) {
      state.supplements = state.supplements.filter(s => s.id !== action.payload);
    },
  },
});

export const { addLog, updateLog, deleteLog, addSupplement, removeSupplement } =
  nutritionSlice.actions;

export default nutritionSlice.reducer;
