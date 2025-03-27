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
  Box
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
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { setActiveTool, ToolName } from '../../store/slices/toolsSlice';
import { setLayout } from '../../store/slices/viewportsSlice';

const ViewerToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector((state) => state.tools.activeTool);
  const layout = useAppSelector((state) => state.viewports.layout);
  
  const handleToolChange = (tool: ToolName) => {
    dispatch(setActiveTool(tool));
  };
  
  const handleLayoutChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newLayout = event.target.value as string;
    let rows = 1;
    let columns = 1;
    
    switch (newLayout) {
      case '1x1':
        rows = 1;
        columns = 1;
        break;
      case '1x2':
        rows = 1;
        columns = 2;
        break;
      case '2x1':
        rows = 2;
        columns = 1;
        break;
      case '2x2':
        rows = 2;
        columns = 2;
        break;
      case '3x3':
        rows = 3;
        columns = 3;
        break;
      default:
        break;
    }
    
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
        
        <Tooltip title="Rotate Left">
          <IconButton>
            <RotateLeftIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Rotate Right">
          <IconButton>
            <RotateRightIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Invert">
          <IconButton>
            <InvertColorsIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Reset">
          <IconButton>
            <RestoreIcon />
          </IconButton>
        </Tooltip>
        
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
            <MenuItem value="2x1">2x1</MenuItem>
            <MenuItem value="2x2">2x2</MenuItem>
            <MenuItem value="3x3">3x3</MenuItem>
          </Select>
        </FormControl>
      </Toolbar>
    </AppBar>
  );
};

export default ViewerToolbar;