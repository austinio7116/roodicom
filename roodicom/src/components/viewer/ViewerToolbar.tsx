import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  SelectChangeEvent
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import PanToolIcon from '@mui/icons-material/PanTool';
import ContrastIcon from '@mui/icons-material/Contrast';
import StraightRulerIcon from '@mui/icons-material/Straighten';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import CircleIcon from '@mui/icons-material/RadioButtonUnchecked';
import GridViewIcon from '@mui/icons-material/GridView';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import InvertColorsIcon from '@mui/icons-material/InvertColors';
import RestoreIcon from '@mui/icons-material/Restore';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import InfoIcon from '@mui/icons-material/Info';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { setActiveTool, ToolName } from '../../store/slices/toolsSlice';
import { setLayout } from '../../store/slices/viewportsSlice';

// Define orientation type
export type OrientationType = 'AXIAL' | 'SAGITTAL' | 'CORONAL';

// Define props for the new handlers
interface ViewerToolbarProps {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onInvert: () => void;
  onReset: () => void;
  onMPROrientationChange: (orientation: OrientationType) => void;
  currentOrientation?: OrientationType; // Add current orientation prop
  onShowDicomMetadata: () => void; // Add handler for DICOM metadata viewer
  // Include other props if needed, e.g. if layout/activeTool aren't solely from Redux
}

// Update component signature to accept props
const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
  onRotateLeft,
  onRotateRight,
  onInvert,
  onReset,
  onMPROrientationChange,
  currentOrientation = 'AXIAL', // Default to AXIAL if not provided
  onShowDicomMetadata
}) => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector((state) => state.tools.activeTool);
  const layout = useAppSelector((state) => state.viewports.layout);

  const handleToolChange = (tool: ToolName) => {
    dispatch(setActiveTool(tool));
  };

  // Type the event correctly for MUI Select v5+
  const handleLayoutChange = (event: SelectChangeEvent<string>) => {
    const newLayout = event.target.value as string; // e.g., "1x1", "2x3", "4x4"
    let rows = 1;
    let columns = 1;

    if (typeof newLayout === 'string' && newLayout.includes('x')) {
      const parts = newLayout.split('x');
      if (parts.length === 2) {
        const parsedRows = parseInt(parts[0], 10);
        const parsedColumns = parseInt(parts[1], 10);
        if (!isNaN(parsedRows) && parsedRows > 0 && !isNaN(parsedColumns) && parsedColumns > 0) {
          rows = parsedRows;
          columns = parsedColumns;
        } else {
          console.warn(`Invalid number format in layout string: "${newLayout}". Using default ${rows}x${columns}.`);
        }
      } else {
        console.warn(`Invalid layout format: "${newLayout}". Expected format 'RowsxColumns'. Using default ${rows}x${columns}.`);
      }
    } else {
       console.warn(`Invalid or unexpected layout input: "${newLayout}". Using default ${rows}x${columns}.`);
    }

    // Ensure the payload matches what setLayout expects
    dispatch(setLayout({ rows, columns }));
  };
  
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense">
        <Tooltip title="Window/Level">
          <IconButton 
            color={activeTool === 'WindowLevel' ? 'primary' : 'default'} 
            onClick={() => handleToolChange('WindowLevel')}
          >
            <ContrastIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Stack Scroll">
        <IconButton
          color={activeTool === 'StackScroll' ? 'primary' : 'default'}
          onClick={() => handleToolChange('StackScroll')}
        >
          <SwapVertIcon />
        </IconButton>
      </Tooltip>
        
        <Tooltip title="Pan">
          <IconButton 
            color={activeTool === 'Pan' ? 'primary' : 'default'} 
            onClick={() => handleToolChange('Pan')}
          >
            <PanToolIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Zoom">
          <IconButton 
            color={activeTool === 'Zoom' ? 'primary' : 'default'} 
            onClick={() => handleToolChange('Zoom')}
          >
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <Tooltip title="Length Measurement">
          <IconButton 
            color={activeTool === 'Length' ? 'primary' : 'default'} 
            onClick={() => handleToolChange('Length')}
          >
            <StraightRulerIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Angle Measurement">
          <IconButton 
            color={activeTool === 'Angle' ? 'primary' : 'default'} 
            onClick={() => handleToolChange('Angle')}
          >
            <SquareFootIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Rectangle ROI">
          <IconButton 
            color={activeTool === 'RectangleROI' ? 'primary' : 'default'} 
            onClick={() => handleToolChange('RectangleROI')}
          >
            <GridViewIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Elliptical ROI">
          <IconButton 
            color={activeTool === 'EllipticalROI' ? 'primary' : 'default'} 
            onClick={() => handleToolChange('EllipticalROI')}
          >
            <CircleIcon />
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        {/* --- Action Buttons --- */}
        <Tooltip title="Rotate Left">
          {/* Add onClick handler */}
          <IconButton onClick={onRotateLeft}>
            <RotateLeftIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Rotate Right">
          {/* Add onClick handler */}
          <IconButton onClick={onRotateRight}>
            <RotateRightIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Invert">
          {/* Add onClick handler */}
          <IconButton onClick={onInvert}>
            <InvertColorsIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset">
          {/* Add onClick handler */}
          <IconButton onClick={onReset}>
            <RestoreIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="DICOM Metadata">
          <IconButton onClick={onShowDicomMetadata}>
            <InfoIcon />
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        {/* MPR Orientation Dropdown */}
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120, mx: 1 }}>
          <InputLabel id="mpr-orientation-label">MPR</InputLabel>
          <Select
            labelId="mpr-orientation-label"
            id="mpr-orientation-select"
            value={currentOrientation}
            onChange={(e: SelectChangeEvent<string>) =>
              onMPROrientationChange(e.target.value as OrientationType)
            }
            label="MPR"
            startAdornment={
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
                <ViewInArIcon fontSize="small" />
              </Box>
            }
          >
            <MenuItem value="AXIAL">Axial</MenuItem>
            <MenuItem value="SAGITTAL">Sagittal</MenuItem>
            <MenuItem value="CORONAL">Coronal</MenuItem>
          </Select>
        </FormControl>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="layout-select-label">Layout</InputLabel>
          <Select
            labelId="layout-select-label"
            id="layout-select"
            value={`${layout.rows}x${layout.columns}`}
            onChange={handleLayoutChange}
            label="Layout"
          >
            <MenuItem value="1x1">1x1</MenuItem>
            <MenuItem value="1x2">1x2</MenuItem>
            <MenuItem value="1x3">1x3</MenuItem>
            <MenuItem value="2x1">2x1</MenuItem>
            <MenuItem value="2x2">2x2</MenuItem>
            <MenuItem value="2x3">2x3</MenuItem>
            <MenuItem value="3x3">3x3</MenuItem>
            <MenuItem value="3x4">3x4</MenuItem>
          </Select>
        </FormControl>
      </Toolbar>
    </AppBar>
  );
};

export default ViewerToolbar;