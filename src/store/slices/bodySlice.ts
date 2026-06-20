import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BodyMeasurement, EnergyMetrics } from '../../types';

interface BodyState {
  measurements: BodyMeasurement[];
  energyMetrics: EnergyMetrics[];
  latestMeasurement: BodyMeasurement | null;
}

const initialState: BodyState = {
  measurements: [],
  energyMetrics: [],
  latestMeasurement: null,
};

const bodySlice = createSlice({
  name: 'body',
  initialState,
  reducers: {
    addMeasurement(state, action: PayloadAction<BodyMeasurement>) {
      state.measurements.push(action.payload);
      state.latestMeasurement = action.payload;
    },
    updateMeasurement(state, action: PayloadAction<BodyMeasurement>) {
      const idx = state.measurements.findIndex(m => m.id === action.payload.id);
      if (idx !== -1) state.measurements[idx] = action.payload;
    },
    deleteMeasurement(state, action: PayloadAction<string>) {
      state.measurements = state.measurements.filter(m => m.id !== action.payload);
    },
    addEnergyMetrics(state, action: PayloadAction<EnergyMetrics>) {
      state.energyMetrics.push(action.payload);
    },
  },
});

export const { addMeasurement, updateMeasurement, deleteMeasurement, addEnergyMetrics } =
  bodySlice.actions;

export default bodySlice.reducer;
