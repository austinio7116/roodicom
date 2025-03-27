import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { ToolGroupManager } from '@cornerstonejs/tools';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import {
  setActiveViewport,
  imageLoaded as imageLoadedAction,
  imageError as imageErrorAction,
} from '../../store/slices/viewportsSlice';
import { Slider } from '@mui/material';
import { Enums } from '@cornerstonejs/core';

interface ViewportProps {
  viewportId: string;
}

const SimpleStackViewport: React.FC<ViewportProps> = ({ viewportId }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const viewport = useAppSelector((state) => state.viewports.viewports[viewportId]);
  const activeViewportId = useAppSelector((state) => state.viewports.activeViewportId);
  const activeTool = useAppSelector((state) => state.tools.activeTool);
  const hierarchy = useAppSelector((state) => state.hierarchy);

  const [localImageLoaded, setLocalImageLoaded] = useState(false);
  const [localImageError, setLocalImageError] = useState<string | null>(null);
  const [cornerstoneViewportId] = useState<string>(`cs-vp-${viewportId}`);
  const [renderingEngineId] = useState<string>(`engine-${viewportId}`);
  const [toolGroupId] = useState<string>(`toolGroup-${viewportId}`);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const isActive = activeViewportId === viewportId;

  useEffect(() => {
    if (!viewportRef.current) return;

    const initializeViewport = async () => {
      try {
        const element = viewportRef.current;
        if (!element) return;

        if (!(window as any).cornerstoneInitialized) {
          await cornerstone3D.init();
          await cornerstoneTools.init();
          (window as any).cornerstoneInitialized = true;
        }

        const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);

        const viewportInput = {
          viewportId: cornerstoneViewportId,
          element,
          type: cornerstone3D.Enums.ViewportType.STACK,
        };

        renderingEngine.enableElement(viewportInput);

        let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
        if (!toolGroup) {
          toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
          toolGroup!.addViewport(cornerstoneViewportId, renderingEngineId);

          const toolsToAdd = [
            'StackScroll',
            'WindowLevel',
            'Zoom',
            'Pan',
            'Length',
            'Angle',
            'RectangleROI',
            'EllipticalROI',
          ];

          for (const toolName of toolsToAdd) {
            toolGroup!.addTool(toolName);
          }
          toolGroup!.setToolPassive('StackScroll'); // allow it to run passively

          toolGroup!.setToolActive('StackScroll', {
            bindings: [
              { type: 'MouseWheel' } as unknown as cornerstoneTools.Types.IToolBinding
            ],
          });
          

          toolGroup!.setToolActive('WindowLevel', {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
          });


          toolGroup!.setToolActive('WindowLevel', {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
          });
        }

        (window as any).renderingEngine = renderingEngine;
      } catch (error) {
        console.error('Error initializing viewport:', error);
      }
    };

    initializeViewport();

    return () => {
      try {
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (renderingEngine) {
          renderingEngine.disableElement(cornerstoneViewportId);
          renderingEngine.destroy();
        }
      } catch (error) {
        console.error('Error cleaning up viewport:', error);
      }
    };
  }, [viewportId, cornerstoneViewportId, renderingEngineId, toolGroupId]);

  useEffect(() => {
    if (!isActive) return;

    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) return;

    const toolNames = [
      'WindowLevel',
      'StackScroll',
      'Zoom',
      'Pan',
      'Length',
      'Angle',
      'RectangleROI',
      'EllipticalROI',
    ];

    for (const tool of toolNames) {
      toolGroup.setToolPassive(tool);
    }

    try {
      toolGroup.setToolActive(activeTool, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      });
      toolGroup.setToolPassive('StackScroll'); // Always passive to allow wheel scroll
    } catch (error) {
      console.warn(`Could not activate tool: ${activeTool}`, error);
    }
  }, [activeTool, isActive, toolGroupId]);

  useEffect(() => {
    if (!viewportRef.current || !viewport) {
      setLocalImageLoaded(false);
      return;
    }

    const loadImageStack = async () => {
      try {
        const imageIds = viewport.imageIds;
        if (!imageIds || imageIds.length === 0) throw new Error('No image IDs provided');

        let renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (!renderingEngine) {
          renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);
          if (!viewportRef.current) throw new Error('Viewport element is null');

          renderingEngine.enableElement({
            viewportId: cornerstoneViewportId,
            element: viewportRef.current,
            type: cornerstone3D.Enums.ViewportType.STACK,
          });
        }

        const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as any;
        await stackViewport.setStack(imageIds, 0);
        renderingEngine.render();

        (window as any).lastStackViewport = stackViewport;
        (window as any).lastRenderingEngine = renderingEngine;

        setLocalImageLoaded(true);
        console.log("setting 0")
        setCurrentImageIndex(0);
        dispatch(imageLoadedAction({ viewportId }));

        const info = getImageInfo();
        if (info) console.log('Image stack loaded successfully:', info);
      } catch (error) {
        console.error('Error loading image stack:', error);
        setLocalImageError(error instanceof Error ? error.message : 'Failed to load image stack');
        dispatch(imageErrorAction({ viewportId, error: 'Failed to load image stack' }));
      }
    };

    const loadSingleImage = async () => {
      try {
        const imageId = viewport.imageId;
        if (!imageId) throw new Error('No image ID provided');

        let renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (!renderingEngine) {
          renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);
          if (!viewportRef.current) throw new Error('Viewport element is null');

          renderingEngine.enableElement({
            viewportId: cornerstoneViewportId,
            element: viewportRef.current,
            type: cornerstone3D.Enums.ViewportType.STACK,
          });
        }

        const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as any;
        console.log("setting stack 0")
        await stackViewport.setStack([imageId], 0);
        renderingEngine.render();

        (window as any).lastStackViewport = stackViewport;
        (window as any).lastRenderingEngine = renderingEngine;

        setLocalImageLoaded(true);
        console.log("setting stack intdex 0")
        setCurrentImageIndex(0);
        dispatch(imageLoadedAction({ viewportId }));

        const info = getImageInfo();
        if (info) console.log('Image loaded successfully:', info);
      } catch (error) {
        console.error('Error loading image:', error);
        setLocalImageError(error instanceof Error ? error.message : 'Failed to load image');
        dispatch(imageErrorAction({ viewportId, error: 'Failed to load image' }));
      }
    };

    setLocalImageLoaded(false);
    setLocalImageError(null);

    if (viewport.imageIds?.length) loadImageStack();
    else if (viewport.imageId) loadSingleImage();
  }, [viewport?.imageId, viewport?.imageIds, viewportId, dispatch, cornerstoneViewportId, renderingEngineId]);

  useEffect(() => {
    try {
      const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
      const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as any;
  
      if (!stackViewport) {
        console.warn('❌ No stack viewport found');
        return;
      }
  
      const element = stackViewport.element;
      if (!element) {
        console.warn('❌ No element found on viewport');
        return;
      }
  
      console.log('✅ Found stack viewport and element:', stackViewport, element);
  
      const handleScroll = (event: any) => {
        console.log('📸 Scroll event fired:', event.detail);
        if (event.detail?.newImageIdIndex != null) {
          setCurrentImageIndex(event.detail.newImageIdIndex);
        }
      };
  
      element.addEventListener('cornerstoneimagerendered', handleScroll);
  
      return () => {
        element.removeEventListener('cornerstoneimagerendered', handleScroll);
      };
    } catch (err) {
      console.error('❌ Error setting up scroll listener:', err);
    }
  }, [renderingEngineId, cornerstoneViewportId]);
  

  const handleClick = () => {
    dispatch(setActiveViewport(viewportId));
  };

  const getImageInfo = () => {
    if (!viewport) return null;

    if (viewport.imageIds?.length > 0) {
      const { subjectId, visitId, seriesId } = viewport;
      try {
        const subject = hierarchy.hierarchy.subjects[subjectId];
        const visit = subject.visits[visitId];
        const series = visit.series[seriesId];
        const imageCount = Object.keys(series.sequences).length;

        return {
          patientName: subject.name,
          patientId: subject.id,
          studyDate: visit.date,
          seriesDescription: series.description,
          modality: series.modality,
          imageCount,
          currentIndex: currentImageIndex + 1,
        };
      } catch {
        return null;
      }
    } else if (viewport.imageId) {
      const { subjectId, visitId, seriesId, sequenceId } = viewport;
      try {
        const subject = hierarchy.hierarchy.subjects[subjectId];
        const visit = subject.visits[visitId];
        const series = visit.series[seriesId];
        const sequence = series.sequences[sequenceId];

        return {
          patientName: subject.name,
          patientId: subject.id,
          studyDate: visit.date,
          seriesDescription: series.description,
          modality: series.modality,
          instanceNumber: sequence.instanceNumber,
        };
      } catch {
        return null;
      }
    }

    return null;
  };

  const renderViewportContent = () => {
    if (!viewport?.imageId && (!viewport?.imageIds || viewport.imageIds.length === 0)) {
      return <Typography variant="body1">No image loaded</Typography>;
    }

    if (viewport.loading && !localImageLoaded) {
      return <CircularProgress color="primary" />;
    }

    if (viewport.error || localImageError) {
      return <Typography variant="body1" color="error">Error: {viewport.error || localImageError}</Typography>;
    }

    return null;
  };

  const handleSliderChange = async (_event: Event, newValue: number | number[]) => {
    const index = Array.isArray(newValue) ? newValue[0] : newValue;
  
    try {
      const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
      const stackViewport = renderingEngine?.getViewport(cornerstoneViewportId) as any;
      if (stackViewport && typeof stackViewport.setImageIndex === 'function') {
        await stackViewport.setImageIndex(index);
        setCurrentImageIndex(index);
      }
    } catch (err) {
      console.error('Error setting image index from slider:', err);
    }
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
        <>
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
            {viewport.imageIds && viewport.imageIds.length > 1
              ? ` | Image: ${getImageInfo()?.currentIndex}/${getImageInfo()?.imageCount}`
              : ` | Instance: ${getImageInfo()?.instanceNumber}`}
          </Box>
        </>
      )}
      {localImageLoaded && viewport.imageIds && viewport.imageIds.length > 1 && (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      px: 1,
      zIndex: 10,
      pointerEvents: 'none', // allow clicks to pass through unless inside slider
    }}
  >
    <Box
      sx={{
        height: '80%',
        pointerEvents: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 1,
        px: 0.5,
        py: 2,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Slider
        key={`slider-${viewportId}-${viewport.imageIds?.length ?? 0}`}
        orientation="vertical"
        size="small"
        min={0}
        max={viewport.imageIds.length - 1}
        value={currentImageIndex}
        onChange={handleSliderChange}
        aria-label="Image Slice"
        sx={{
          color: '#fff',
          '& .MuiSlider-thumb': {
            width: 10,
            height: 10,
          },
        }}
      />
    </Box>
  </Box>
)}

    </Paper>
  );
};

export default SimpleStackViewport;
