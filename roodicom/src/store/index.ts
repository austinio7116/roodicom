import { configureStore } from '@reduxjs/toolkit';
import filesReducer from './slices/filesSlice';
import hierarchyReducer from './slices/hierarchySlice';
import uiReducer from './slices/uiSlice';
import viewportsReducer from './slices/viewportsSlice';
import toolsReducer from './slices/toolsSlice';

export const store = configureStore({
  reducer: {
    files: filesReducer,
    hierarchy: hierarchyReducer,
    ui: uiReducer,
    viewports: viewportsReducer,
    tools: toolsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // For handling File objects
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;