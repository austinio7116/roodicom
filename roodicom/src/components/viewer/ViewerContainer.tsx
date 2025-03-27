import React, { useEffect } from 'react';
import { Box, Paper, Grid } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import SimpleStackViewport from './SimpleStackViewport';
import ViewerToolbar from './ViewerToolbar';
import { setLayout } from '../../store/slices/viewportsSlice';

interface ViewportsState {
  viewports: Record<string, any>;
  activeViewportId: string | null;
  syncGroup: string[];
  layout: {
    rows: number;
    columns: number;
  };
}

const ViewerContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { rows, columns } = useAppSelector(state => 
    (state.viewports as ViewportsState).layout
  );
  const viewports = useAppSelector(state => 
    (state.viewports as ViewportsState).viewports
  );
  const viewportIds = Object.keys(viewports);
  
  // Ensure we have enough viewports for the layout
  useEffect(() => {
    const totalViewports = rows * columns;
    if (viewportIds.length < totalViewports) {
      // If we don't have enough viewports, update the layout to match what we have
      const newRows = Math.ceil(Math.sqrt(viewportIds.length));
      const newColumns = Math.ceil(viewportIds.length / newRows);
      
      if (newRows !== rows || newColumns !== columns) {
        dispatch(setLayout({ rows: newRows, columns: newColumns }));
      }
    }
  }, [rows, columns, viewportIds.length, dispatch]);

  return (
    <Box sx={{ height: 'calc(100% - 64px)', display: 'flex', flexDirection: 'column' }}>
      <ViewerToolbar />
      <Paper 
        elevation={3} 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          overflow: 'hidden',
          mt: 1
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%', height: '100%', p: 1 }}>
          {Array.from({ length: rows * columns }).map((_, index) => {
            const viewportId = viewportIds[index] || `viewport-${index + 1}`;
            return (
              <Box 
                key={viewportId} 
                sx={{ 
                  width: `${100 / columns}%`,
                  height: `${100 / rows}%`,
                  padding: '4px',
                  boxSizing: 'border-box'
                }}
              >
                <SimpleStackViewport viewportId={viewportId} />
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default ViewerContainer;