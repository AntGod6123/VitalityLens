import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BiomarkerLog, BiomarkerType } from '../../types';

interface BiomarkerState {
  logs: BiomarkerLog[];
}

const initialState: BiomarkerState = {
  logs: [],
};

const biomarkerSlice = createSlice({
  name: 'biomarker',
  initialState,
  reducers: {
    addLog(state, action: PayloadAction<BiomarkerLog>) {
      state.logs.push(action.payload);
    },
    updateLog(state, action: PayloadAction<BiomarkerLog>) {
      const idx = state.logs.findIndex(l => l.id === action.payload.id);
      if (idx !== -1) state.logs[idx] = action.payload;
    },
    deleteLog(state, action: PayloadAction<string>) {
      state.logs = state.logs.filter(l => l.id !== action.payload);
    },
    deleteAllOfType(state, action: PayloadAction<BiomarkerType>) {
      state.logs = state.logs.filter(l => l.type !== action.payload);
    },
  },
});

export const { addLog, updateLog, deleteLog, deleteAllOfType } = biomarkerSlice.actions;
export default biomarkerSlice.reducer;
