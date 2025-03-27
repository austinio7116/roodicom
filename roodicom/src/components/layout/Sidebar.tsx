import React from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tabs, Tab, Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { setActiveTab, SidebarTab } from '../../store/slices/uiSlice';
import FileExplorer from '../navigation/FileExplorer';
import HierarchyExplorer from '../navigation/HierarchyExplorer';
import Settings from '../navigation/Settings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: SidebarTab;
  value: SidebarTab;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sidebar-tabpanel-${index}`}
      aria-labelledby={`sidebar-tab-${index}`}
      style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 1, height: '100%' }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: SidebarTab) => {
  return {
    id: `sidebar-tab-${index}`,
    'aria-controls': `sidebar-tabpanel-${index}`,
  };
};

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  const handleTabChange = (event: React.SyntheticEvent, newValue: SidebarTab) => {
    dispatch(setActiveTab(newValue));
  };

  if (!sidebarOpen) {
    return (
      <List>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            sx={{
              minHeight: 48,
              justifyContent: 'center',
              px: 2.5,
            }}
            selected={activeTab === 'files'}
            onClick={() => dispatch(setActiveTab('files'))}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 'auto',
                justifyContent: 'center',
              }}
            >
              <FolderIcon />
            </ListItemIcon>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            sx={{
              minHeight: 48,
              justifyContent: 'center',
              px: 2.5,
            }}
            selected={activeTab === 'hierarchy'}
            onClick={() => dispatch(setActiveTab('hierarchy'))}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 'auto',
                justifyContent: 'center',
              }}
            >
              <AccountTreeIcon />
            </ListItemIcon>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            sx={{
              minHeight: 48,
              justifyContent: 'center',
              px: 2.5,
            }}
            selected={activeTab === 'settings'}
            onClick={() => dispatch(setActiveTab('settings'))}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 'auto',
                justifyContent: 'center',
              }}
            >
              <SettingsIcon />
            </ListItemIcon>
          </ListItemButton>
        </ListItem>
      </List>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="sidebar tabs"
        variant="fullWidth"
      >
        <Tab icon={<FolderIcon />} label="Files" value="files" {...a11yProps('files')} />
        <Tab icon={<AccountTreeIcon />} label="Hierarchy" value="hierarchy" {...a11yProps('hierarchy')} />
        <Tab icon={<SettingsIcon />} label="Settings" value="settings" {...a11yProps('settings')} />
      </Tabs>
      <TabPanel value={activeTab} index="files">
        <FileExplorer />
      </TabPanel>
      <TabPanel value={activeTab} index="hierarchy">
        <HierarchyExplorer />
      </TabPanel>
      <TabPanel value={activeTab} index="settings">
        <Settings />
      </TabPanel>
    </Box>
  );
};

export default Sidebar;