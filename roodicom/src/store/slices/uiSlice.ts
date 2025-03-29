import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SidebarTab = 'files' | 'hierarchy' | 'settings';
export type ViewMode = 'single' | 'compare' | 'grid';
export type ViewLayout = '1x1' | '1x2' | '1x3'  | '2x1' | '2x2' | '2x3' | '3x3'| '3x4';

interface UiState {
  sidebarOpen: boolean;
  activeTab: SidebarTab;
  viewMode: ViewMode;
  viewLayout: ViewLayout;
  darkMode: boolean;
  loading: boolean;
  notification: {
    show: boolean;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  };
}

const initialState: UiState = {
  sidebarOpen: true,
  activeTab: 'files',
  viewMode: 'single',
  viewLayout: '1x1',
  darkMode: true,
  loading: false,
  notification: {
    show: false,
    message: '',
    type: 'info',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<SidebarTab>) => {
      state.activeTab = action.payload;
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    setViewLayout: (state, action: PayloadAction<ViewLayout>) => {
      state.viewLayout = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    showNotification: (state, action: PayloadAction<{ message: string; type: 'info' | 'success' | 'warning' | 'error' }>) => {
      state.notification = {
        show: true,
        message: action.payload.message,
        type: action.payload.type,
      };
    },
    hideNotification: (state) => {
      state.notification.show = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setActiveTab,
  setViewMode,
  setViewLayout,
  toggleDarkMode,
  setDarkMode,
  setLoading,
  showNotification,
  hideNotification,
} = uiSlice.actions;

export default uiSlice.reducer;