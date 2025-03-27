import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DicomFileEntry } from '../../types/dicom';

interface FilesState {
  rootDirectory: FileSystemDirectoryHandle | null;
  files: DicomFileEntry[];
  loading: boolean;
  error: string | null;
  scanProgress: {
    total: number;
    processed: number;
    percentage: number;
  };
}

const initialState: FilesState = {
  rootDirectory: null,
  files: [],
  loading: false,
  error: null,
  scanProgress: {
    total: 0,
    processed: 0,
    percentage: 0,
  },
};

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    setRootDirectory: (state, action: PayloadAction<FileSystemDirectoryHandle>) => {
      state.rootDirectory = action.payload;
    },
    scanStart: (state) => {
      state.loading = true;
      state.error = null;
      state.scanProgress = {
        total: 0,
        processed: 0,
        percentage: 0,
      };
    },
    scanProgress: (state, action: PayloadAction<{ total: number; processed: number }>) => {
      const { total, processed } = action.payload;
      state.scanProgress = {
        total,
        processed,
        percentage: total > 0 ? Math.round((processed / total) * 100) : 0,
      };
    },
    scanSuccess: (state, action: PayloadAction<DicomFileEntry[]>) => {
      state.files = action.payload;
      state.loading = false;
      state.scanProgress.percentage = 100;
    },
    scanFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearFiles: (state) => {
      state.files = [];
      state.scanProgress = {
        total: 0,
        processed: 0,
        percentage: 0,
      };
    },
  },
});

export const {
  setRootDirectory,
  scanStart,
  scanProgress,
  scanSuccess,
  scanFailure,
  clearFiles,
} = filesSlice.actions;

export default filesSlice.reducer;