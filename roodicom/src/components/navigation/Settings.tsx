import React from 'react';
import { 
  Box, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Divider, 
  List, 
  ListItem, 
  ListItemText,
  ListSubheader,
  Slider,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { toggleDarkMode, setViewLayout, ViewLayout } from '../../store/slices/uiSlice';
import { addWindowLevelPreset, removeWindowLevelPreset } from '../../store/slices/toolsSlice';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.ui.darkMode);
  const viewLayout = useAppSelector((state) => state.ui.viewLayout);
  const windowLevelPresets = useAppSelector((state) => state.tools.presets.windowLevel);
  
  const [newPresetName, setNewPresetName] = React.useState('');
  const [newPresetWindowWidth, setNewPresetWindowWidth] = React.useState(400);
  const [newPresetWindowCenter, setNewPresetWindowCenter] = React.useState(40);
  const [newPresetModality, setNewPresetModality] = React.useState('MR');
  
  const handleDarkModeToggle = () => {
    dispatch(toggleDarkMode());
  };
  
  const handleViewLayoutChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    dispatch(setViewLayout(event.target.value as ViewLayout));
  };
  
  const handleAddPreset = () => {
    if (newPresetName.trim() === '') return;
    
    dispatch(addWindowLevelPreset({
      id: `custom_${Date.now()}`,
      name: newPresetName,
      windowWidth: newPresetWindowWidth,
      windowCenter: newPresetWindowCenter,
      modality: newPresetModality,
    }));
    
    // Reset form
    setNewPresetName('');
    setNewPresetWindowWidth(400);
    setNewPresetWindowCenter(40);
  };
  
  const handleRemovePreset = (presetId: string) => {
    dispatch(removeWindowLevelPreset(presetId));
  };
  
  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 1 }}>
      <Typography variant="h6" gutterBottom>
        Application Settings
      </Typography>
      
      <List>
        <ListItem>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={handleDarkModeToggle}
                color="primary"
              />
            }
            label="Dark Mode"
          />
        </ListItem>
        
        <ListItem>
          <FormControl fullWidth>
            <InputLabel id="view-layout-label">Default View Layout</InputLabel>
            <Select
              labelId="view-layout-label"
              id="view-layout"
              value={viewLayout}
              label="Default View Layout"
              onChange={handleViewLayoutChange}
            >
              <MenuItem value="1x1">1x1</MenuItem>
              <MenuItem value="1x2">1x2</MenuItem>
              <MenuItem value="2x1">2x1</MenuItem>
              <MenuItem value="2x2">2x2</MenuItem>
              <MenuItem value="3x3">3x3</MenuItem>
            </Select>
          </FormControl>
        </ListItem>
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="h6" gutterBottom>
        Window/Level Presets
      </Typography>
      
      <List
        subheader={
          <ListSubheader component="div">
            Current Presets
          </ListSubheader>
        }
      >
        {windowLevelPresets.map((preset) => (
          <ListItem key={preset.id}>
            <ListItemText
              primary={preset.name}
              secondary={`WW: ${preset.windowWidth}, WC: ${preset.windowCenter}${preset.modality ? `, Modality: ${preset.modality}` : ''}`}
            />
            {!preset.id.startsWith('default_') && (
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={() => handleRemovePreset(preset.id)}
              >
                Remove
              </Button>
            )}
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
        <Typography variant="subtitle1" gutterBottom>
          Add New Preset
        </Typography>
        
        <TextField
          label="Preset Name"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          fullWidth
          margin="normal"
        />
        
        <Typography gutterBottom>
          Window Width: {newPresetWindowWidth}
        </Typography>
        <Slider
          value={newPresetWindowWidth}
          onChange={(_, value) => setNewPresetWindowWidth(value as number)}
          min={1}
          max={4000}
          step={1}
        />
        
        <Typography gutterBottom>
          Window Center: {newPresetWindowCenter}
        </Typography>
        <Slider
          value={newPresetWindowCenter}
          onChange={(_, value) => setNewPresetWindowCenter(value as number)}
          min={-1000}
          max={1000}
          step={1}
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="modality-label">Modality</InputLabel>
          <Select
            labelId="modality-label"
            id="modality"
            value={newPresetModality}
            label="Modality"
            onChange={(e) => setNewPresetModality(e.target.value)}
          >
            <MenuItem value="MR">MR</MenuItem>
            <MenuItem value="CT">CT</MenuItem>
            <MenuItem value="XR">XR</MenuItem>
            <MenuItem value="US">US</MenuItem>
            <MenuItem value="">Any</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleAddPreset}
          fullWidth
          sx={{ mt: 2 }}
        >
          Add Preset
        </Button>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        ROODICOM Viewer v1.0.0
      </Typography>
    </Box>
  );
};

export default Settings;