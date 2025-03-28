import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { store } from './store';
import Layout from './components/layout/Layout';
import { useAppSelector } from './hooks/redux';
import { initializeCornerstone, cleanupCornerstone } from './services/cornerstone/init';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent: React.FC = () => {
  const darkMode = useAppSelector((state) => state.ui.darkMode);

  // Initialize Cornerstone
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Starting Cornerstone initialization...');
        await initializeCornerstone();
        console.log('Cornerstone core initialized successfully');
        
        // Add a global debug function
        (window as any).debugCornerstone = () => {
          console.log('Cornerstone debug info:');
          
          // Try to access rendering engines if available
          try {
            const engines = (window as any).cornerstone3D?.getRenderingEngines?.() ||
                           (window as any).cornerstone?.getRenderingEngines?.() ||
                           'Not available';
            console.log('- Rendering engines:', engines);
          } catch (error) {
            console.log('- Unable to access rendering engines:', error);
          }
          
          // Check if the file manager is available
          const waLoader = (window as any).cornerstoneWADOImageLoader;
          if (waLoader && waLoader.wadouri && waLoader.wadouri.fileManager) {
            console.log('- WADO URI File Manager:', waLoader.wadouri.fileManager);
          } else {
            console.log('- WADO URI File Manager not available');
          }
        };
        
        console.log('Cornerstone initialization complete');
        console.log('Debug function available: window.debugCornerstone()');
      } catch (error) {
        console.error('Failed to initialize Cornerstone:', error);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up Cornerstone resources...');
      cleanupCornerstone();
      console.log('Cornerstone cleanup complete');
    };
  }, []);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#29b7c0',
          },
          secondary: {
            main: '#f68633',
          },
        },
      }),
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout />
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
