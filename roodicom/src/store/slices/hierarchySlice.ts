import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DicomHierarchy, Subject, Visit, Series, Sequence } from '../../types/hierarchy';
import { DicomMetadata } from '../../types/dicom';

interface HierarchyState {
  hierarchy: DicomHierarchy;
  loading: boolean;
  error: string | null;
  activeSubjectId: string | null;
  activeVisitId: string | null;
  activeSeriesId: string | null;
  activeSequenceId: string | null;
}

interface AddMetadataPayload {
  metadata: DicomMetadata;
  path: string;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  imageId?: string; // Add support for storing the Cornerstone imageId
}

const initialState: HierarchyState = {
  hierarchy: {
    subjects: {},
  },
  loading: false,
  error: null,
  activeSubjectId: null,
  activeVisitId: null,
  activeSeriesId: null,
  activeSequenceId: null,
};

const hierarchySlice = createSlice({
  name: 'hierarchy',
  initialState,
  reducers: {
    buildHierarchyStart: (state) => {
      state.loading = true;
      state.error = null;
      // Clear existing hierarchy
      state.hierarchy = { subjects: {} };
      state.activeSubjectId = null;
      state.activeVisitId = null;
      state.activeSeriesId = null;
      state.activeSequenceId = null;
    },
    buildHierarchySuccess: (state, action: PayloadAction<DicomHierarchy>) => {
      // If the payload has subjects, use them
      if (Object.keys(action.payload.subjects).length > 0) {
        state.hierarchy = action.payload;
      }
      // Otherwise, keep the existing hierarchy (which may have been built up with addMetadata)
      
      state.loading = false;
    },
    buildHierarchyFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addMetadata: (state, action: PayloadAction<AddMetadataPayload>) => {
      const { metadata, path, imageId } = action.payload;
      const {
        patientId,
        patientName,
        studyDate,
        modality,
        seriesDescription,
        instanceNumber,
        studyInstanceUID,
        seriesInstanceUID
      } = metadata;
      
      // Create subject if it doesn't exist
      if (!state.hierarchy.subjects[patientId]) {
        state.hierarchy.subjects[patientId] = {
          id: patientId,
          name: patientName,
          visits: {},
        };
      }
      
      const subject = state.hierarchy.subjects[patientId];
      
      // Always use studyInstanceUID for the visit ID
      const visitId = studyInstanceUID;
      
      // Create visit if it doesn't exist
      if (!subject.visits[visitId]) {
        subject.visits[visitId] = {
          id: visitId,
          date: studyDate,
          series: {},
        };
      }
      
      const visit = subject.visits[visitId];
      
      // Always use seriesInstanceUID for the series ID
      const seriesId = seriesInstanceUID;
      
      // Create series if it doesn't exist
      if (!visit.series[seriesId]) {
        visit.series[seriesId] = {
          id: seriesId,
          description: seriesDescription,
          modality: modality,
          sequences: {},
        };
      }
      
      const series = visit.series[seriesId];
      
      // Add sequence
      const sequenceId = instanceNumber.toString();
      series.sequences[sequenceId] = {
        id: sequenceId,
        instanceNumber: instanceNumber,
        metadata: metadata,
        // Use the provided imageId from the Cornerstone file manager if available
        imageId: imageId || '',
      };
    },
    setActiveSubject: (state, action: PayloadAction<string>) => {
      state.activeSubjectId = action.payload;
    },
    setActiveVisit: (state, action: PayloadAction<string>) => {
      state.activeVisitId = action.payload;
    },
    setActiveSeries: (state, action: PayloadAction<string>) => {
      state.activeSeriesId = action.payload;
    },
    setActiveSequence: (state, action: PayloadAction<string>) => {
      state.activeSequenceId = action.payload;
    },
    clearHierarchy: (state) => {
      state.hierarchy = { subjects: {} };
      state.activeSubjectId = null;
      state.activeVisitId = null;
      state.activeSeriesId = null;
      state.activeSequenceId = null;
    },
  },
});

export const {
  buildHierarchyStart,
  buildHierarchySuccess,
  buildHierarchyFailure,
  addMetadata,
  setActiveSubject,
  setActiveVisit,
  setActiveSeries,
  setActiveSequence,
  clearHierarchy,
} = hierarchySlice.actions;

export default hierarchySlice.reducer;