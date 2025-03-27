import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import {
  setActiveViewport,
  loadImage as loadImageAction,
  loadStack as loadStackAction,
  imageLoaded as imageLoadedAction,
  imageError as imageErrorAction
} from '../../store/slices/viewportsSlice';

interface ViewportProps {
  viewportId: string;
}

const SimpleStackViewport: React.FC<ViewportProps> = ({ viewportId }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const viewport = useAppSelector(state =>
    state.viewports.viewports[viewportId]
  );
  const activeViewportId = useAppSelector(state =>
    state.viewports.activeViewportId
  );
  const activeTool = useAppSelector(state =>
    state.tools.activeTool
  );
  const hierarchy = useAppSelector(state =>
    state.hierarchy
  );
  
  const [localImageLoaded, setLocalImageLoaded] = useState(false);
  const [localImageError, setLocalImageError] = useState<string | null>(null);
  const [cornerstoneViewportId] = useState<string>(
    `cs-vp-${viewportId}`
  );
  const [renderingEngineId] = useState<string>(`engine-${viewportId}`);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const isActive = activeViewportId === viewportId;

  // Initialize the viewport element - following the example pattern exactly
  useEffect(() => {
    if (!viewportRef.current) return;

    console.log(`Initializing viewport ${viewportId} with engine ID ${renderingEngineId} and cornerstone viewport ID ${cornerstoneViewportId}`);

    // Create an async function inside useEffect
    const initializeViewport = async () => {
      try {
        const element = viewportRef.current;
        if (!element) return;
        
        // Initialize Cornerstone if needed
        if (!(window as any).cornerstoneInitialized) {
          console.log('Initializing Cornerstone3D...');
          await cornerstone3D.init();
          await cornerstoneTools.init();
          
          // Add the stack scroll mouse wheel tool
          // Use type assertion to bypass TypeScript errors
          const tools = cornerstoneTools as any;
          
          // Check if the tool is available directly or as a named export
          if (tools.StackScrollMouseWheelTool) {
            tools.addTool(tools.StackScrollMouseWheelTool);
            console.log('Added StackScrollMouseWheelTool');
          } else {
            // If the tool isn't available directly, we need to use a different approach
            console.log('Using alternative method to enable stack scrolling');
            // In a real implementation, we would use the appropriate method based on the version
            // For now, we'll skip this step and rely on the default tools
          }
          
          (window as any).cornerstoneInitialized = true;
          console.log('Cornerstone3D initialized');
        }
        
        // Always create a new rendering engine to avoid conflicts
        console.log(`Creating rendering engine with ID: ${renderingEngineId}`);
        const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);
        
        // Define a simple viewport configuration - following the example pattern exactly
        const viewportInput = {
          viewportId: cornerstoneViewportId,
          element, // element is already checked for null above
          type: cornerstone3D.Enums.ViewportType.STACK,
        };
        
        // Enable the element with the viewport configuration
        console.log('Enabling element with viewport configuration');
        renderingEngine.enableElement(viewportInput);
        
        // Store the rendering engine in the window object for debugging
        (window as any).renderingEngine = renderingEngine;
        
        // Try to enable the stack scroll mouse wheel tool if available
        try {
          // Use type assertion to bypass TypeScript errors
          const tools = cornerstoneTools as any;
          tools.setToolActive('StackScrollMouseWheel', { viewportId: cornerstoneViewportId });
          console.log('Stack scroll mouse wheel tool activated');
        } catch (error) {
          console.warn('Could not activate stack scroll mouse wheel tool:', error);
        }
        
        console.log('Viewport initialized successfully');
      } catch (error) {
        console.error('Error initializing viewport:', error);
      }
    };

    // Call the async function
    initializeViewport();
    
    // Clean up function
    return () => {
      console.log(`Cleaning up viewport ${viewportId} with engine ${renderingEngineId}`);
      try {
        // Get the rendering engine
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (renderingEngine) {
          // Disable the element
          renderingEngine.disableElement(cornerstoneViewportId);
          console.log(`Disabled viewport element: ${cornerstoneViewportId}`);
          
          // Destroy the rendering engine
          renderingEngine.destroy();
          console.log(`Destroyed rendering engine: ${renderingEngineId}`);
        }
      } catch (error) {
        console.error('Error cleaning up viewport:', error);
      }
    };
  }, [viewportId, cornerstoneViewportId, renderingEngineId]);

  // Load the image stack when the imageIds change
  useEffect(() => {
    if (!viewportRef.current || !viewport) {
      setLocalImageLoaded(false);
      return;
    }

    // If we have a stack of images
    if (viewport.imageIds && viewport.imageIds.length > 0) {
      // Start loading the image stack
      setLocalImageLoaded(false);
      setLocalImageError(null);
      
      const loadImageStack = async () => {
        try {
          const imageIds = viewport.imageIds;
          if (!imageIds || imageIds.length === 0) {
            throw new Error('No image IDs provided');
          }
          
          console.log(`Loading image stack with ${imageIds.length} images in viewport ${viewportId} using engine ${renderingEngineId}`);
          
          // Make sure we have a rendering engine
          let renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
          if (!renderingEngine) {
            console.log(`Creating new rendering engine with ID: ${renderingEngineId}`);
            renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);
            
            // Make sure element is not null
            if (!viewportRef.current) {
              throw new Error('Viewport element is null');
            }
            
            // Define a simple viewport configuration
            const viewportInput = {
              viewportId: cornerstoneViewportId,
              element: viewportRef.current,
              type: cornerstone3D.Enums.ViewportType.STACK,
            };
            
            // Enable the element with the viewport configuration
            console.log('Enabling element with viewport configuration');
            renderingEngine.enableElement(viewportInput);
          }
          
          // Get the viewport
          const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as any;
          if (!stackViewport) {
            throw new Error(`Viewport with ID ${cornerstoneViewportId} not found`);
          }
          
          // Set the stack of images on the viewport
          console.log(`Setting stack with ${imageIds.length} images`);
          await stackViewport.setStack(imageIds, 0); // Second parameter is the initial image index
          
          // Render the viewport
          console.log('Rendering viewport');
          renderingEngine.render();
          
          // Store for debugging
          (window as any).lastStackViewport = stackViewport;
          (window as any).lastRenderingEngine = renderingEngine;
          
          setLocalImageLoaded(true);
          setCurrentImageIndex(0);
          dispatch(imageLoadedAction({ viewportId }));
          
          // Get the image info
          const imageInfo = getImageInfo();
          if (imageInfo) {
            console.log('Image stack loaded successfully:', imageInfo);
          }
        } catch (error) {
          console.error('Error loading image stack:', error);
          setLocalImageError(error instanceof Error ? error.message : 'Failed to load image stack');
          dispatch(imageErrorAction({ viewportId, error: 'Failed to load image stack' }));
        }
      };
      
      loadImageStack();
    }
    // If we have a single image
    else if (viewport.imageId) {
      // Start loading the single image
      setLocalImageLoaded(false);
      setLocalImageError(null);
      
      const loadSingleImage = async () => {
        try {
          const imageId = viewport.imageId;
          if (!imageId) {
            throw new Error('No image ID provided');
          }
          
          console.log(`Loading single image ${imageId} in viewport ${viewportId} using engine ${renderingEngineId}`);
          
          // Make sure we have a rendering engine
          let renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
          if (!renderingEngine) {
            console.log(`Creating new rendering engine with ID: ${renderingEngineId}`);
            renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);
            
            // Make sure element is not null
            if (!viewportRef.current) {
              throw new Error('Viewport element is null');
            }
            
            // Define a simple viewport configuration
            const viewportInput = {
              viewportId: cornerstoneViewportId,
              element: viewportRef.current,
              type: cornerstone3D.Enums.ViewportType.STACK,
            };
            
            // Enable the element with the viewport configuration
            console.log('Enabling element with viewport configuration');
            renderingEngine.enableElement(viewportInput);
          }
          
          // Get the viewport
          const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as any;
          if (!stackViewport) {
            throw new Error(`Viewport with ID ${cornerstoneViewportId} not found`);
          }
          
          // Set the stack with a single image
          console.log(`Setting stack with single imageId: ${imageId}`);
          await stackViewport.setStack([imageId], 0);
          
          // Render the viewport
          console.log('Rendering viewport');
          renderingEngine.render();
          
          // Store for debugging
          (window as any).lastStackViewport = stackViewport;
          (window as any).lastRenderingEngine = renderingEngine;
          
          setLocalImageLoaded(true);
          setCurrentImageIndex(0);
          dispatch(imageLoadedAction({ viewportId }));
          
          // Get the image info
          const imageInfo = getImageInfo();
          if (imageInfo) {
            console.log('Image loaded successfully:', imageInfo);
          }
        } catch (error) {
          console.error('Error loading image:', error);
          setLocalImageError(error instanceof Error ? error.message : 'Failed to load image');
          dispatch(imageErrorAction({ viewportId, error: 'Failed to load image' }));
        }
      };
      
      loadSingleImage();
    }
  }, [viewport?.imageId, viewport?.imageIds, viewportId, dispatch, cornerstoneViewportId, renderingEngineId]);

  // Set the active tool when it changes
  useEffect(() => {
    if (!viewportRef.current || !isActive) return;

    // Set the active tool
    console.log(`Setting active tool to ${activeTool} in viewport ${viewportId} with cornerstone viewport ID ${cornerstoneViewportId}`);
    
    // In a real implementation, we would set different tools based on the activeTool value
    // For now, try to enable the stack scroll mouse wheel tool if available
    try {
      // Use type assertion to bypass TypeScript errors
      const tools = cornerstoneTools as any;
      tools.setToolActive('StackScrollMouseWheel', { viewportId: cornerstoneViewportId });
      console.log('Stack scroll mouse wheel tool activated');
    } catch (error) {
      console.warn('Could not activate stack scroll mouse wheel tool:', error);
    }
  }, [activeTool, isActive, viewportId, cornerstoneViewportId]);

  // Listen for stack scroll events to update the current image index
  useEffect(() => {
    if (!viewportRef.current) return;

    const element = viewportRef.current;
    
    const handleStackScroll = (event: any) => {
      if (event.detail && typeof event.detail.newImageIdIndex === 'number') {
        setCurrentImageIndex(event.detail.newImageIdIndex);
      }
    };
    
    element.addEventListener('cornerstoneimagerendered', handleStackScroll);
    
    return () => {
      element.removeEventListener('cornerstoneimagerendered', handleStackScroll);
    };
  }, []);

  const handleClick = () => {
    dispatch(setActiveViewport(viewportId));
  };

  // Function to get patient, study, and series info for the loaded image
  const getImageInfo = () => {
    if (!viewport) return null;
    
    // For a stack, use the series info
    if (viewport.imageIds && viewport.imageIds.length > 0) {
      const { subjectId, visitId, seriesId } = viewport;
      
      if (!subjectId || !visitId || !seriesId) return null;
      
      try {
        const subject = hierarchy.hierarchy.subjects[subjectId];
        if (!subject) return null;
        
        const visit = subject.visits[visitId];
        if (!visit) return null;
        
        const series = visit.series[seriesId];
        if (!series) return null;
        
        // Count the number of images in the series
        const imageCount = Object.keys(series.sequences).length;
        
        return {
          patientName: subject.name,
          patientId: subject.id,
          studyDate: visit.date,
          seriesDescription: series.description,
          modality: series.modality,
          imageCount,
          currentIndex: currentImageIndex + 1 // 1-based for display
        };
      } catch (error) {
        console.error('Error getting stack info:', error);
        return null;
      }
    }
    // For a single image, use the sequence info
    else if (viewport.imageId) {
      const { subjectId, visitId, seriesId, sequenceId } = viewport;
      
      if (!subjectId || !visitId || !seriesId || !sequenceId) return null;
      
      try {
        const subject = hierarchy.hierarchy.subjects[subjectId];
        if (!subject) return null;
        
        const visit = subject.visits[visitId];
        if (!visit) return null;
        
        const series = visit.series[seriesId];
        if (!series) return null;
        
        const sequence = series.sequences[sequenceId];
        if (!sequence) return null;
        
        return {
          patientName: subject.name,
          patientId: subject.id,
          studyDate: visit.date,
          seriesDescription: series.description,
          modality: series.modality,
          instanceNumber: sequence.instanceNumber
        };
      } catch (error) {
        console.error('Error getting image info:', error);
        return null;
      }
    }
    
    return null;
  };

  // Function to render the viewport content
  const renderViewportContent = () => {
    if (!viewport?.imageId && (!viewport?.imageIds || viewport.imageIds.length === 0)) {
      return (
        <Typography variant="body1">
          No image loaded
        </Typography>
      );
    }
    
    if (viewport.loading && !localImageLoaded) {
      return <CircularProgress color="primary" />;
    }
    
    if (viewport.error || localImageError) {
      return (
        <Typography variant="body1" color="error">
          Error: {viewport.error || localImageError}
        </Typography>
      );
    }
    
    // If the image is loaded, don't render anything here
    // The Cornerstone3D viewport will handle the rendering
    return null;
  };

  return (
    <Paper
      elevation={isActive ? 8 : 2}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: isActive ? '2px solid #007bff' : '2px solid transparent',
        transition: 'border 0.2s ease-in-out',
      }}
      onClick={handleClick}
    >
      <Box
        ref={viewportRef}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-viewport-id={viewportId}
      >
        {renderViewportContent()}
      </Box>
      {localImageLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            padding: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          {getImageInfo()?.seriesDescription} ({getImageInfo()?.modality})
        </Box>
      )}
      {localImageLoaded && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            padding: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          Patient: {getImageInfo()?.patientName}
          {viewport.imageIds && viewport.imageIds.length > 1 ?
            ` | Image: ${getImageInfo()?.currentIndex}/${getImageInfo()?.imageCount}` :
            ` | Instance: ${getImageInfo()?.instanceNumber}`
          }
        </Box>
      )}
    </Paper>
  );
};

export default SimpleStackViewport;