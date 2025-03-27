import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ToolName = 
  | 'WindowLevel' 
  | 'Zoom' 
  | 'Pan' 
  | 'Length' 
  | 'Angle' 
  | 'RectangleROI' 
  | 'EllipticalROI' 
  | 'Crosshairs';

export interface Measurement {
  id: string;
  toolName: ToolName;
  viewportId: string;
  imageId: string;
  data: any; // Specific to the tool type
  timestamp: number;
  visible: boolean;
}

interface ToolsState {
  activeTool: ToolName;
  toolHistory: ToolName[];
  measurements: Record<string, Measurement>;
  presets: {
    windowLevel: {
      id: string;
      name: string;
      windowWidth: number;
      windowCenter: number;
      modality?: string;
    }[];
  };
}

const initialState: ToolsState = {
  activeTool: 'WindowLevel',
  toolHistory: ['WindowLevel'],
  measurements: {},
  presets: {
    windowLevel: [
      {
        id: 'brain',
        name: 'Brain',
        windowWidth: 80,
        windowCenter: 40,
        modality: 'MR',
      },
      {
        id: 'brain_bone',
        name: 'Brain Bone',
        windowWidth: 2500,
        windowCenter: 480,
        modality: 'MR',
      },
      {
        id: 'brain_soft',
        name: 'Brain Soft Tissue',
        windowWidth: 375,
        windowCenter: 40,
        modality: 'MR',
      },
      {
        id: 't1',
        name: 'T1',
        windowWidth: 1200,
        windowCenter: 600,
        modality: 'MR',
      },
      {
        id: 't2',
        name: 'T2',
        windowWidth: 1600,
        windowCenter: 600,
        modality: 'MR',
      },
      {
        id: 'flair',
        name: 'FLAIR',
        windowWidth: 1600,
        windowCenter: 600,
        modality: 'MR',
      },
    ],
  },
};

const toolsSlice = createSlice({
  name: 'tools',
  initialState,
  reducers: {
    setActiveTool: (state, action: PayloadAction<ToolName>) => {
      state.activeTool = action.payload;
      
      // Add to history if not already the last item
      if (state.toolHistory[state.toolHistory.length - 1] !== action.payload) {
        state.toolHistory.push(action.payload);
        
        // Keep history limited to last 10 tools
        if (state.toolHistory.length > 10) {
          state.toolHistory.shift();
        }
      }
    },
    addMeasurement: (state, action: PayloadAction<Measurement>) => {
      state.measurements[action.payload.id] = action.payload;
    },
    updateMeasurement: (state, action: PayloadAction<{ id: string; data: any }>) => {
      const { id, data } = action.payload;
      if (state.measurements[id]) {
        state.measurements[id].data = data;
      }
    },
    removeMeasurement: (state, action: PayloadAction<string>) => {
      delete state.measurements[action.payload];
    },
    toggleMeasurementVisibility: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.measurements[id]) {
        state.measurements[id].visible = !state.measurements[id].visible;
      }
    },
    clearMeasurements: (state, action: PayloadAction<{ viewportId?: string; imageId?: string }>) => {
      const { viewportId, imageId } = action.payload;
      
      if (viewportId && imageId) {
        // Clear measurements for specific viewport and image
        Object.keys(state.measurements).forEach(id => {
          const measurement = state.measurements[id];
          if (measurement.viewportId === viewportId && measurement.imageId === imageId) {
            delete state.measurements[id];
          }
        });
      } else if (viewportId) {
        // Clear measurements for specific viewport
        Object.keys(state.measurements).forEach(id => {
          const measurement = state.measurements[id];
          if (measurement.viewportId === viewportId) {
            delete state.measurements[id];
          }
        });
      } else {
        // Clear all measurements
        state.measurements = {};
      }
    },
    addWindowLevelPreset: (state, action: PayloadAction<{
      id: string;
      name: string;
      windowWidth: number;
      windowCenter: number;
      modality?: string;
    }>) => {
      state.presets.windowLevel.push(action.payload);
    },
    removeWindowLevelPreset: (state, action: PayloadAction<string>) => {
      state.presets.windowLevel = state.presets.windowLevel.filter(
        preset => preset.id !== action.payload
      );
    },
  },
});

export const {
  setActiveTool,
  addMeasurement,
  updateMeasurement,
  removeMeasurement,
  toggleMeasurementVisibility,
  clearMeasurements,
  addWindowLevelPreset,
  removeWindowLevelPreset,
} = toolsSlice.actions;

export default toolsSlice.reducer;