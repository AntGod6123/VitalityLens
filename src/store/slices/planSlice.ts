import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WorkoutPlan } from '../../types';

interface PlanState {
  plans: WorkoutPlan[];
}

const initialState: PlanState = { plans: [] };

const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {
    addPlan(state, action: PayloadAction<WorkoutPlan>) {
      state.plans.push(action.payload);
    },
    updatePlan(state, action: PayloadAction<WorkoutPlan>) {
      const idx = state.plans.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) state.plans[idx] = action.payload;
    },
    deletePlan(state, action: PayloadAction<string>) {
      state.plans = state.plans.filter(p => p.id !== action.payload);
    },
    activatePlan(state, action: PayloadAction<{ id: string; startDate: string }>) {
      state.plans.forEach(p => { p.isActive = false; });
      const plan = state.plans.find(p => p.id === action.payload.id);
      if (plan) {
        plan.isActive = true;
        plan.startDate = action.payload.startDate;
      }
    },
    deactivatePlan(state, action: PayloadAction<string>) {
      const plan = state.plans.find(p => p.id === action.payload);
      if (plan) plan.isActive = false;
    },
    updateExerciseWeight(
      state,
      action: PayloadAction<{ planId: string; dayIndex: number; exerciseId: string; weightKg: number }>,
    ) {
      const { planId, dayIndex, exerciseId, weightKg } = action.payload;
      const plan = state.plans.find(p => p.id === planId);
      if (!plan) return;
      const day = plan.days[dayIndex];
      if (!day) return;
      const ex = day.exercises.find(e => e.exerciseId === exerciseId);
      if (ex) ex.weightKg = weightKg;
    },
  },
});

export const { addPlan, updatePlan, deletePlan, activatePlan, deactivatePlan, updateExerciseWeight } = planSlice.actions;
export default planSlice.reducer;
