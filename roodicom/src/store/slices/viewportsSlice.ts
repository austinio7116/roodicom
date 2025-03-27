import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Viewport {
  viewportId: string;
  imageId: string | null;
  imageIds: string[] | null;
  sequenceId: string | null;
  seriesId: string | null;
  visitId: string | null;
  subjectId: string | null;
  windowWidth: number;
  windowCenter: number;
  scale: number;
  rotation: number;
  positionX: number;
  positionY: number;
  invert: boolean;
  colormap: string | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

interface ViewportsState {
  viewports: Record<string, Viewport>;
  activeViewportId: string | null;
  syncGroup: string[];
  layout: {
    rows: number;
    columns: number;
  };
}

const createDefaultViewport = (viewportId: string): Viewport => ({
  viewportId,
  imageId: null,
  imageIds: null,
  sequenceId: null,
  seriesId: null,
  visitId: null,
  subjectId: null,
  windowWidth: 400,
  windowCenter: 40,
  scale: 1,
  rotation: 0,
  positionX: 0,
  positionY: 0,
  invert: false,
  colormap: null,
  loaded: false,
  loading: false,
  error: null,
});

const initialState: ViewportsState = {
  viewports: {
    'viewport-1': createDefaultViewport('viewport-1'),
  },
  activeViewportId: 'viewport-1',
  syncGroup: [],
  layout: {
    rows: 1,
    columns: 1,
  },
};

const viewportsSlice = createSlice({
  name: 'viewports',
  initialState,
  reducers: {
    setLayout: (state, action: PayloadAction<{ rows: number; columns: number }>) => {
      const { rows, columns } = action.payload;
      state.layout = { rows, columns };
      
      // Create or remove viewports based on the new layout
      const totalViewports = rows * columns;
      const currentViewports = Object.keys(state.viewports).length;
      
      if (totalViewports > currentViewports) {
        // Add new viewports
        for (let i = currentViewports + 1; i <= totalViewports; i++) {
          const viewportId = `viewport-${i}`;
          state.viewports[viewportId] = createDefaultViewport(viewportId);
        }
      } else if (totalViewports < currentViewports) {
        // Remove excess viewports
        const viewportIds = Object.keys(state.viewports).sort();
        for (let i = totalViewports; i < currentViewports; i++) {
          const viewportId = viewportIds[i];
          delete state.viewports[viewportId];
        }
        
        // Make sure activeViewportId is still valid
        if (state.activeViewportId && !state.viewports[state.activeViewportId]) {
          state.activeViewportId = viewportIds[0];
        }
      }
    },
    setActiveViewport: (state, action: PayloadAction<string>) => {
      state.activeViewportId = action.payload;
    },
    loadImage: (state, action: PayloadAction<{ viewportId: string; imageId: string; sequenceId: string; seriesId: string; visitId: string; subjectId: string }>) => {
      const { viewportId, imageId, sequenceId, seriesId, visitId, subjectId } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.imageId = imageId;
        viewport.imageIds = null; // Clear any existing stack
        viewport.sequenceId = sequenceId;
        viewport.seriesId = seriesId;
        viewport.visitId = visitId;
        viewport.subjectId = subjectId;
        viewport.loading = true;
        viewport.loaded = false;
        viewport.error = null;
      }
    },
    loadStack: (state, action: PayloadAction<{
      viewportId: string;
      imageIds: string[];
      seriesId: string;
      visitId: string;
      subjectId: string
    }>) => {
      const { viewportId, imageIds, seriesId, visitId, subjectId } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.imageId = null; // Clear any existing single image
        viewport.imageIds = imageIds;
        viewport.sequenceId = null; // No specific sequence for a stack
        viewport.seriesId = seriesId;
        viewport.visitId = visitId;
        viewport.subjectId = subjectId;
        viewport.loading = true;
        viewport.loaded = false;
        viewport.error = null;
      }
    },
    imageLoaded: (state, action: PayloadAction<{ viewportId: string }>) => {
      const { viewportId } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.loading = false;
        viewport.loaded = true;
      }
    },
    imageError: (state, action: PayloadAction<{ viewportId: string; error: string }>) => {
      const { viewportId, error } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.loading = false;
        viewport.loaded = false;
        viewport.error = error;
      }
    },
    setWindowLevel: (state, action: PayloadAction<{ viewportId: string; windowWidth: number; windowCenter: number }>) => {
      const { viewportId, windowWidth, windowCenter } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.windowWidth = windowWidth;
        viewport.windowCenter = windowCenter;
      }
    },
    setZoom: (state, action: PayloadAction<{ viewportId: string; scale: number }>) => {
      const { viewportId, scale } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.scale = scale;
      }
    },
    setPan: (state, action: PayloadAction<{ viewportId: string; positionX: number; positionY: number }>) => {
      const { viewportId, positionX, positionY } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.positionX = positionX;
        viewport.positionY = positionY;
      }
    },
    setRotation: (state, action: PayloadAction<{ viewportId: string; rotation: number }>) => {
      const { viewportId, rotation } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.rotation = rotation;
      }
    },
    toggleInvert: (state, action: PayloadAction<{ viewportId: string }>) => {
      const { viewportId } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.invert = !viewport.invert;
      }
    },
    setColormap: (state, action: PayloadAction<{ viewportId: string; colormap: string | null }>) => {
      const { viewportId, colormap } = action.payload;
      const viewport = state.viewports[viewportId];
      
      if (viewport) {
        viewport.colormap = colormap;
      }
    },
    addToSyncGroup: (state, action: PayloadAction<string>) => {
      const viewportId = action.payload;
      if (!state.syncGroup.includes(viewportId)) {
        state.syncGroup.push(viewportId);
      }
    },
    removeFromSyncGroup: (state, action: PayloadAction<string>) => {
      state.syncGroup = state.syncGroup.filter(id => id !== action.payload);
    },
    clearSyncGroup: (state) => {
      state.syncGroup = [];
    },
    resetViewport: (state, action: PayloadAction<string>) => {
      const viewportId = action.payload;
      if (state.viewports[viewportId]) {
        state.viewports[viewportId] = createDefaultViewport(viewportId);
      }
    },
    resetAllViewports: (state) => {
      Object.keys(state.viewports).forEach(viewportId => {
        state.viewports[viewportId] = createDefaultViewport(viewportId);
      });
    },
  },
});

export const {
  setLayout,
  setActiveViewport,
  loadImage,
  loadStack,
  imageLoaded,
  imageError,
  setWindowLevel,
  setZoom,
  setPan,
  setRotation,
  toggleInvert,
  setColormap,
  addToSyncGroup,
  removeFromSyncGroup,
  clearSyncGroup,
  resetViewport,
  resetAllViewports,
} = viewportsSlice.actions;

export default viewportsSlice.reducer;