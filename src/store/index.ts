import { configureStore } from '@reduxjs/toolkit';
import bodyReducer from './slices/bodySlice';
import workoutReducer from './slices/workoutSlice';
import nutritionReducer from './slices/nutritionSlice';
import medicalReducer from './slices/medicalSlice';

export const store = configureStore({
  reducer: {
    body: bodyReducer,
    workout: workoutReducer,
    nutrition: nutritionReducer,
    medical: medicalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
