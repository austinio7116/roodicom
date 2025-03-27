import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import ImageIcon from '@mui/icons-material/Image';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import {
  setActiveSubject,
  setActiveVisit,
  setActiveSeries,
  setActiveSequence
} from '../../store/slices/hierarchySlice';
import { loadImage, loadStack } from '../../store/slices/viewportsSlice';
import { Subject, Visit, Series, Sequence, DicomHierarchy } from '../../types/hierarchy';

interface HierarchyState {
  hierarchy: DicomHierarchy;
  loading: boolean;
  error: string | null;
  activeSubjectId: string | null;
  activeVisitId: string | null;
  activeSeriesId: string | null;
  activeSequenceId: string | null;
}

interface ViewportsState {
  viewports: Record<string, any>;
  activeViewportId: string | null;
  syncGroup: string[];
  layout: {
    rows: number;
    columns: number;
  };
}

const HierarchyExplorer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { hierarchy, loading, activeSubjectId, activeVisitId, activeSeriesId, activeSequenceId } =
    useAppSelector(state => state.hierarchy as HierarchyState);
  const activeViewportId = useAppSelector(state =>
    (state.viewports as ViewportsState).activeViewportId
  );
  
  // State to track expanded items
  const [expandedSubjects, setExpandedSubjects] = React.useState<Record<string, boolean>>({});
  const [expandedVisits, setExpandedVisits] = React.useState<Record<string, boolean>>({});
  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>({});
  
  // Auto-expand the first subject when hierarchy is loaded
  useEffect(() => {
    if (!loading && Object.keys(hierarchy.subjects).length > 0 && Object.keys(expandedSubjects).length === 0) {
      const firstSubjectId = Object.keys(hierarchy.subjects)[0];
      setExpandedSubjects({ [firstSubjectId]: true });
      
      // If there's only one subject, also expand its first visit
      const subject = hierarchy.subjects[firstSubjectId];
      if (Object.keys(subject.visits).length > 0) {
        const firstVisitId = Object.keys(subject.visits)[0];
        setExpandedVisits({ [`${firstSubjectId}-${firstVisitId}`]: true });
        
        // If there's only one visit, also expand its first series
        const visit = subject.visits[firstVisitId];
        if (Object.keys(visit.series).length > 0) {
          const firstSeriesId = Object.keys(visit.series)[0];
          setExpandedSeries({ [`${firstSubjectId}-${firstVisitId}-${firstSeriesId}`]: true });
        }
      }
    }
  }, [loading, hierarchy, expandedSubjects]);
  
  const handleSubjectClick = (subjectId: string) => {
    dispatch(setActiveSubject(subjectId));
    setExpandedSubjects({
      ...expandedSubjects,
      [subjectId]: !expandedSubjects[subjectId]
    });
  };
  
  const handleVisitClick = (subjectId: string, visitId: string) => {
    dispatch(setActiveSubject(subjectId));
    dispatch(setActiveVisit(visitId));
    setExpandedVisits({
      ...expandedVisits,
      [`${subjectId}-${visitId}`]: !expandedVisits[`${subjectId}-${visitId}`]
    });
  };
  
  const handleSeriesClick = (subjectId: string, visitId: string, seriesId: string) => {
    dispatch(setActiveSubject(subjectId));
    dispatch(setActiveVisit(visitId));
    dispatch(setActiveSeries(seriesId));
    
    // Toggle the expanded state
    const newExpandedState = !expandedSeries[`${subjectId}-${visitId}-${seriesId}`];
    setExpandedSeries({
      ...expandedSeries,
      [`${subjectId}-${visitId}-${seriesId}`]: newExpandedState
    });
    
    // If we're collapsing the series, load the entire series as a stack
    if (!newExpandedState && activeViewportId) {
      try {
        // Get the series from the hierarchy
        const subject = hierarchy.subjects[subjectId];
        if (!subject) return;
        
        const visit = subject.visits[visitId];
        if (!visit) return;
        
        const series = visit.series[seriesId];
        if (!series) return;
        
        // Get all sequences in the series
        const sequences = Object.values(series.sequences);
        
        // Sort sequences by instance number
        sequences.sort((a, b) => (a as Sequence).instanceNumber - (b as Sequence).instanceNumber);
        
        // Extract imageIds from sequences
        const imageIds = sequences.map(seq => {
          const sequence = seq as Sequence;
          return sequence.imageId || '';
        }).filter(id => id !== '');
        
        if (imageIds.length > 0) {
          console.log(`Loading stack with ${imageIds.length} images`);
          
          // Load the stack
          dispatch(loadStack({
            viewportId: activeViewportId,
            imageIds,
            seriesId,
            visitId,
            subjectId
          }));
        }
      } catch (error) {
        console.error('Error loading series stack:', error);
      }
    }
  };
  
  const handleSequenceClick = (
    subjectId: string,
    visitId: string,
    seriesId: string,
    sequenceId: string,
    imageId: string
  ) => {
    dispatch(setActiveSubject(subjectId));
    dispatch(setActiveVisit(visitId));
    dispatch(setActiveSeries(seriesId));
    dispatch(setActiveSequence(sequenceId));
    
    if (activeViewportId && imageId) {
      dispatch(loadImage({
        viewportId: activeViewportId,
        imageId,
        sequenceId,
        seriesId,
        visitId,
        subjectId
      }));
    } else {
      console.error('Cannot load image: missing viewportId or imageId');
    }
  };
  
  const renderSubjects = () => {
    return Object.entries(hierarchy.subjects).map(([subjectId, subject]) => (
      <React.Fragment key={subjectId}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => handleSubjectClick(subjectId)}
            selected={activeSubjectId === subjectId}
          >
            <ListItemIcon>
              <PersonIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography variant="body2">
                  {subject.name} ({subjectId})
                </Typography>
              } 
            />
            {expandedSubjects[subjectId] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </ListItemButton>
        </ListItem>
        <Collapse in={expandedSubjects[subjectId]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 4 }}>
            {renderVisits(subject, subjectId)}
          </List>
        </Collapse>
      </React.Fragment>
    ));
  };
  
  const renderVisits = (subject: Subject, subjectId: string) => {
    return Object.entries(subject.visits).map(([visitId, visit]) => (
      <React.Fragment key={visitId}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => handleVisitClick(subjectId, visitId)}
            selected={activeSubjectId === subjectId && activeVisitId === visitId}
          >
            <ListItemIcon>
              <EventIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2">
                  Study: {visit.date}
                </Typography>
              }
              secondary={
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  {visitId.substring(0, 20)}...
                </Typography>
              }
            />
            {expandedVisits[`${subjectId}-${visitId}`] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </ListItemButton>
        </ListItem>
        <Collapse in={expandedVisits[`${subjectId}-${visitId}`]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 4 }}>
            {renderSeries(visit, subjectId, visitId)}
          </List>
        </Collapse>
      </React.Fragment>
    ));
  };
  
  const renderSeries = (visit: Visit, subjectId: string, visitId: string) => {
    return Object.entries(visit.series).map(([seriesId, series]) => (
      <React.Fragment key={seriesId}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => handleSeriesClick(subjectId, visitId, seriesId)}
            selected={activeSubjectId === subjectId && activeVisitId === visitId && activeSeriesId === seriesId}
          >
            <ListItemIcon>
              <ViewInArIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2">
                  {series.description} ({series.modality})
                </Typography>
              }
              secondary={
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  {seriesId.substring(0, 20)}...
                </Typography>
              }
            />
            {expandedSeries[`${subjectId}-${visitId}-${seriesId}`] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </ListItemButton>
        </ListItem>
        <Collapse in={expandedSeries[`${subjectId}-${visitId}-${seriesId}`]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 4 }}>
            {renderSequences(series, subjectId, visitId, seriesId)}
          </List>
        </Collapse>
      </React.Fragment>
    ));
  };
  
  const renderSequences = (series: Series, subjectId: string, visitId: string, seriesId: string) => {
    return Object.entries(series.sequences).map(([sequenceId, sequence]) => {
      // Make sure we have a valid imageId
      const imageId = sequence.imageId || '';
      if (!imageId) {
        console.warn(`Sequence ${sequenceId} has no imageId`);
        return null;
      }
      
      return (
        <ListItem
          key={sequenceId}
          disablePadding
        >
          <ListItemButton
            onClick={() => handleSequenceClick(
              subjectId,
              visitId,
              seriesId,
              sequenceId,
              imageId
            )}
            selected={
              activeSubjectId === subjectId &&
              activeVisitId === visitId &&
              activeSeriesId === seriesId &&
              activeSequenceId === sequenceId
            }
          >
            <ListItemIcon>
              <ImageIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2">
                  Instance: {sequence.instanceNumber}
                </Typography>
              }
            />
          </ListItemButton>
        </ListItem>
      );
    }).filter(item => item !== null);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (Object.keys(hierarchy.subjects).length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1">
          No DICOM data loaded. Use the Files tab to load DICOM files.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <List>
        {renderSubjects()}
      </List>
    </Box>
  );
};

export default HierarchyExplorer;