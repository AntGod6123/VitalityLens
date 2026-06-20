import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MedicalDocument, InjuryRecord } from '../../types';

interface MedicalState {
  documents: MedicalDocument[];
  injuries: InjuryRecord[];
}

const initialState: MedicalState = {
  documents: [],
  injuries: [],
};

const medicalSlice = createSlice({
  name: 'medical',
  initialState,
  reducers: {
    addDocument(state, action: PayloadAction<MedicalDocument>) {
      state.documents.push(action.payload);
    },
    updateDocument(state, action: PayloadAction<MedicalDocument>) {
      const idx = state.documents.findIndex(d => d.id === action.payload.id);
      if (idx !== -1) state.documents[idx] = action.payload;
    },
    deleteDocument(state, action: PayloadAction<string>) {
      state.documents = state.documents.filter(d => d.id !== action.payload);
    },
    addInjury(state, action: PayloadAction<InjuryRecord>) {
      state.injuries.push(action.payload);
    },
    resolveInjury(state, action: PayloadAction<string>) {
      const injury = state.injuries.find(i => i.id === action.payload);
      if (injury) injury.isActive = false;
    },
    deleteInjury(state, action: PayloadAction<string>) {
      state.injuries = state.injuries.filter(i => i.id !== action.payload);
    },
  },
});

export const { addDocument, updateDocument, deleteDocument, addInjury, resolveInjury, deleteInjury } =
  medicalSlice.actions;

export default medicalSlice.reducer;
