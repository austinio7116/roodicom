import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Slider } from '@mui/material'; // Grouped Slider import
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { ToolGroupManager } from '@cornerstonejs/tools';
import { Enums as csCoreEnums } from '@cornerstonejs/core'; // Alias for Core Enums
import { Enums as csToolsEnums } from '@cornerstonejs/tools'; // Alias for Tools Enums
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import {
  setActiveViewport,
  imageLoaded as imageLoadedAction,
  imageError as imageErrorAction,
} from '../../store/slices/viewportsSlice';

// Removed duplicate Slider import from original code

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

  // --- Initialization Effect ---
  useEffect(() => {
    if (!viewportRef.current) return;

    // Prevent default context menu (right-click menu)
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    // Add event listener to prevent context menu
    viewportRef.current.addEventListener('contextmenu', preventContextMenu);

    const initializeViewport = async () => {
      try {
        const element = viewportRef.current;
        if (!element) return;

        // Initialize Cornerstone if not already done
        if (!(window as any).cornerstoneInitialized) {
          await cornerstone3D.init();
          await cornerstoneTools.init();
          (window as any).cornerstoneInitialized = true;
        }

        // Create Rendering Engine
        // Check if engine already exists (e.g., due to fast refresh/re-render)
        let renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (!renderingEngine) {
          renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);
        } else {
            // If engine exists, ensure element is enabled (might have been disabled)
            try {
                renderingEngine.getViewport(cornerstoneViewportId);
            } catch {
                 // Viewport doesn't exist on this engine, enable element
                 const viewportInput = {
                   viewportId: cornerstoneViewportId,
                   element,
                   type: csCoreEnums.ViewportType.STACK,
                 };
                 renderingEngine.enableElement(viewportInput);
            }
        }


        // Enable the element if not already enabled by the engine check
        if (!renderingEngine.getViewport(cornerstoneViewportId)) {
             const viewportInput = {
               viewportId: cornerstoneViewportId,
               element,
               type: csCoreEnums.ViewportType.STACK,
             };
            renderingEngine.enableElement(viewportInput);
        }


        // Create or Get ToolGroup
        let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
        if (!toolGroup) {
          toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
          if (!toolGroup) {
              throw new Error(`Failed to create ToolGroup: ${toolGroupId}`)
          }
          toolGroup.addViewport(cornerstoneViewportId, renderingEngineId);

          const toolsToAdd = [
            'StackScroll', 'WindowLevel', 'Zoom', 'Pan',
            'Length', 'Angle', 'RectangleROI', 'EllipticalROI',
          ];

          toolsToAdd.forEach(toolName => {
             // Need to add the tool class itself, not just the name string
             // Assuming the tool classes are available via cornerstoneTools
             // e.g., cornerstoneTools.StackScrollTool, cornerstoneTools.WindowLevelTool etc.
             // The exact way to add tools might depend on specific version setup.
             // This example assumes cornerstoneTools.addTool(ToolClass) was called previously or implicitly available.
             // If using named tools requires explicit registration first, that should happen during cornerstoneTools.init() or similar setup phase.
             try {
                toolGroup.addTool(toolName);
             } catch (addError) {
                 console.warn(`Could not add tool ${toolName} to group ${toolGroupId}. Maybe it was already added?`, addError)
             }
          });

          toolGroup.setToolPassive('StackScroll'); // Allow StackScroll via wheel even if another tool is active
          // Set StackScroll active for MouseWheel interaction
          // Disable the default StackScroll tool for wheel - we'll use our own handler
          // We'll still keep it in the toolGroup for other uses
          toolGroup.setToolPassive('StackScroll');

          // Set WindowLevel active for Primary Mouse Button interaction (ONLY ONCE)
          // The default active tool might be set later based on Redux state
          // toolGroup.setToolActive('WindowLevel', {
          //   bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
          // });
          // Removed duplicate activation

        } else {
            // Ensure viewport is added if toolgroup already existed
            if (!toolGroup.getViewportIds().includes(cornerstoneViewportId)) {
                toolGroup.addViewport(cornerstoneViewportId, renderingEngineId);
            }
        }

        // Optional: Store engine globally (use with caution)
        // (window as any).renderingEngine = renderingEngine;

      } catch (error) {
        console.error('Error initializing viewport:', error);
        // Optionally dispatch an error state here
      }
    };

    initializeViewport();

    // Cleanup
    return () => {
      // Remove context menu event listener
      if (viewportRef.current) {
        viewportRef.current.removeEventListener('contextmenu', preventContextMenu);
      }
      
      try {
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (renderingEngine) {
          // Remove viewport from toolgroup
          const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
          if (toolGroup) {
            toolGroup.removeViewports(renderingEngineId, cornerstoneViewportId);
            // Consider destroying the toolgroup if it's no longer needed by other viewports
            // if (toolGroup.getViewportIds().length === 0) {
            //   ToolGroupManager.destroyToolGroup(toolGroupId);
            // }
          }
          // Disable the element first
          renderingEngine.disableElement(cornerstoneViewportId);
          // Only destroy engine if this is the last element/component using it
          // A more robust approach might involve reference counting or context management
          if (renderingEngine.getViewports().length === 0) {
             renderingEngine.destroy();
          }

        }
      } catch (error) {
        console.error('Error cleaning up viewport:', error);
      }
    };
  }, [viewportId, cornerstoneViewportId, renderingEngineId, toolGroupId]); // Stable dependencies

// --- Updated Active Tool Effect ---
useEffect(() => {
  const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

  // Only proceed if the tool group exists AND this viewport is the active one
  if (!toolGroup || !isActive) {
    // If not active, potentially set all tools to passive or a default state
    // depending on desired behavior for inactive viewports.
    // For now, just return to avoid changing tool modes in inactive viewports.
    return;
  }

  console.log(`[${viewportId}] Active Tool Effect Triggered. Active Tool: ${activeTool}, IsActive: ${isActive}`);

  // Define tools usually activated by Primary mouse button
  const primaryBindingTools = [
    'WindowLevel', 'Zoom', 'Pan', 'Length', 'Angle', 'RectangleROI', 'EllipticalROI'
    // Add any other tools intended for primary mouse interaction here
  ];

  // --- Step 1: Set ALL relevant tools passive initially ---
  // This clears previous bindings/modes before setting new ones for the active viewport.
  // Include StackScroll in this list to ensure its mode is reset correctly each time.
  const toolsToReset = [...primaryBindingTools, 'StackScroll'];
  console.log(`[${viewportId}] Resetting modes for tools:`, toolsToReset);
  toolsToReset.forEach(toolName => {
    if (toolGroup.hasTool(toolName)) {
      try {
        toolGroup.setToolPassive(toolName);
      } catch (resetError) {
        // It might be acceptable for this to fail if the tool is already passive, but log it.
        console.warn(`[${viewportId}] Could not set tool ${toolName} to passive during reset:`, resetError);
      }
    }
  });

  // --- Step 2: Activate the PRIMARY tool (and Wheel if StackScroll) ---

  if (activeTool && primaryBindingTools.includes(activeTool) && toolGroup.hasTool(activeTool)) {
    // --- Step 2a: Activate standard primary tools (WL, Pan, Zoom, Measurements, etc.) ---
    console.log(`[${viewportId}] Activating primary tool: ${activeTool}`);
    try {
      toolGroup.setToolActive(activeTool, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
        mode: csToolsEnums.ToolModes.Active, // Explicitly set Active mode
        // overwrite: true // Generally implied for setToolActive, but can be explicit if needed
      });
    } catch (error) {
      console.error(`[${viewportId}] Failed to activate primary tool ${activeTool}:`, error);
    }

  } else if (activeTool === 'StackScroll') {
    // --- Step 2b: Activate StackScroll for Primary AND Wheel ---
    if (toolGroup.hasTool('StackScroll')) {
        console.log(`[${viewportId}] Activating StackScroll for Primary Mouse and Wheel.`);
        try {
            toolGroup.setToolActive('StackScroll', {
                bindings: [ // Provide both bindings explicitly
                    { mouseButton: csToolsEnums.MouseBindings.Primary },
                    // Cast might be needed depending on strictness/version
                    { type: 'MouseWheel' } as unknown as cornerstoneTools.Types.IToolBinding
                ],
                mode: csToolsEnums.ToolModes.Active, // Set mode to Active
                // overwrite: true // Ensure these bindings take precedence
            });
        } catch (error) {
            console.error(`[${viewportId}] Failed to activate StackScroll for Primary and Wheel:`, error);
        }
    } else {
        console.warn(`[${viewportId}] StackScroll tool not found when selected.`);
    }

  } else {
    // --- Step 2c: Fallback primary tool (e.g., WindowLevel if no specific tool is active) ---
    const fallbackPrimaryTool = 'WindowLevel'; // Or choose another default like 'Pan'
    if (toolGroup.hasTool(fallbackPrimaryTool)) {
        console.log(`[${viewportId}] No specific tool active or tool not found. Activating fallback: ${fallbackPrimaryTool}`);
        try {
            toolGroup.setToolActive(fallbackPrimaryTool, {
                bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
                mode: csToolsEnums.ToolModes.Active,
                // overwrite: true
            });
        } catch (error) {
            console.error(`[${viewportId}] Failed to activate fallback primary tool ${fallbackPrimaryTool}:`, error);
        }
    } else {
        console.warn(`[${viewportId}] Fallback primary tool ${fallbackPrimaryTool} not found.`);
    }
  }

  // --- Step 3: Set default middle click to Zoom and right click to Pan ---
  // Add default bindings for middle click (Zoom) and right click (Pan)
  if (toolGroup.hasTool('Zoom')) {
    console.log(`[${viewportId}] Setting Zoom tool for middle click (Auxiliary button)`);
    try {
      toolGroup.setToolActive('Zoom', {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }], // Middle click
        mode: csToolsEnums.ToolModes.Active,
      });
    } catch (error) {
      console.error(`[${viewportId}] Failed to set Zoom for middle click:`, error);
    }
  }

  if (toolGroup.hasTool('Pan')) {
    console.log(`[${viewportId}] Setting Pan tool for right click (Secondary button)`);
    try {
      toolGroup.setToolActive('Pan', {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }], // Right click
        mode: csToolsEnums.ToolModes.Active,
      });
    } catch (error) {
      console.error(`[${viewportId}] Failed to set Pan for right click:`, error);
    }
  }

  // --- Step 4: Ensure Wheel Scroll using PASSIVE mode if StackScroll is NOT the primary tool ---
  // This allows wheel scrolling *in the background* while another tool is active via the primary mouse button.
  if (activeTool !== 'StackScroll' && toolGroup.hasTool('StackScroll')) {
      console.log(`[${viewportId}] Primary tool is ${activeTool || 'fallback'}. Setting StackScroll to Passive for MouseWheel.`);
      try {
          // Activate ONLY for wheel using PASSIVE mode.
          toolGroup.setToolActive('StackScroll', {
              bindings: [{ type: 'MouseWheel' } as unknown as cornerstoneTools.Types.IToolBinding],
              // *** USE PASSIVE MODE HERE ***
              mode: csToolsEnums.ToolModes.Passive,
          });
      } catch (error) {
          console.error(`[${viewportId}] Failed to set StackScroll Passive for MouseWheel:`, error);
      }
  } else if (activeTool !== 'StackScroll' && !toolGroup.hasTool('StackScroll')) {
      // Log if StackScroll tool isn't found and wheel won't work
      console.warn(`[${viewportId}] StackScroll tool not found. Wheel scroll disabled when other tools are active.`);
  }
  // If activeTool IS 'StackScroll', Step 2b already handled its wheel binding (along with the primary mouse).

  // Optional: Log final state for debugging
  // const stackScrollInstance = toolGroup.getToolInstance('StackScroll');
  // if (stackScrollInstance) {
  //   console.log(`[${viewportId}] Final StackScroll state: mode=${stackScrollInstance.mode}, bindings=`, stackScrollInstance.bindings);
  // }
  // const primaryToolInstance = activeTool && toolGroup.getToolInstance(activeTool);
  // if (primaryToolInstance) {
  //   console.log(`[${viewportId}] Final ${activeTool} state: mode=${primaryToolInstance.mode}, bindings=`, primaryToolInstance.bindings);
  // }


}, [activeTool, isActive, toolGroupId, viewport?.imageId, viewport?.imageIds, viewportId]); // Dependencies: Rerun when the active tool, viewport active state, or IDs change.


  // --- Image Loading Effect ---
  useEffect(() => {
    // Guard clauses
    if (!viewportRef.current || !viewport) {
      setLocalImageLoaded(false);
      return;
    }
    if (!viewport.imageId && (!viewport.imageIds || viewport.imageIds.length === 0)) {
       // If no imageId(s) are provided in the viewport state, do nothing here.
       // Optionally clear the viewport if needed.
       setLocalImageLoaded(false);
       return;
    }


    const loadImage = async () => {
        setLocalImageLoaded(false); // Reset loaded state
        setLocalImageError(null);   // Reset error state

        try {
            const imageIdToLoad = viewport.imageId;
            const imageIdsToLoad = viewport.imageIds;

            let renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
            if (!renderingEngine) {
                // This case should ideally be prevented by the initialization effect,
                // but handle defensively.
                console.error('Image Loading Error: Rendering Engine not found!');
                throw new Error('Rendering Engine not initialized');
            }

            const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as cornerstone3D.Types.IStackViewport;
            if (!stackViewport) {
                console.error('Image Loading Error: Stack Viewport not found!');
                throw new Error('Stack Viewport not available');
            }

            if (imageIdsToLoad && imageIdsToLoad.length > 0) {
                await stackViewport.setStack(imageIdsToLoad, 0); // Start at index 0
                // Note: cornerstoneTools might automatically handle voi/lut based on metadata
                stackViewport.resetCamera(); // Optionally reset camera
                // stackViewport.render(); // setStack usually triggers render, but explicit call ensures it
                renderingEngine.renderViewports([cornerstoneViewportId]); // Render this specific viewport

                setCurrentImageIndex(0); // Reset index state
                setLocalImageLoaded(true);
                dispatch(imageLoadedAction({ viewportId }));
                console.log('Image stack loaded successfully.');

            } else if (imageIdToLoad) {
                // Use setStack with a single image ID array
                await stackViewport.setStack([imageIdToLoad], 0);
                stackViewport.resetCamera(); // Optionally reset camera
                // stackViewport.render();
                renderingEngine.renderViewports([cornerstoneViewportId]);

                setCurrentImageIndex(0); // Index is 0 for single image stack
                setLocalImageLoaded(true);
                dispatch(imageLoadedAction({ viewportId }));
            } else {
                 console.log("No imageId or imageIds provided to load.")
                 // Optionally clear the viewport if needed
                 // stackViewport.reset(); // or similar method
            }

        } catch (error) {
            console.error(`Error loading image(s) for viewport ${viewportId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load image(s)';
            setLocalImageError(errorMessage);
            dispatch(imageErrorAction({ viewportId, error: errorMessage }));
        }
    };

    loadImage();

  }, [viewport?.imageId, viewport?.imageIds, viewportId, dispatch, cornerstoneViewportId, renderingEngineId]); // Dependencies for image loading


// --- Custom Wheel Event Handler ---
useEffect(() => {
  // Only run if the image is loaded and we expect multiple images
  if (!localImageLoaded || !viewport?.imageIds || viewport.imageIds.length <= 1 || !viewportRef.current) {
    return; // No handler needed if not loaded, no images, or no viewport element
  }

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault(); // Prevent default browser behavior
    event.stopPropagation(); // Stop event propagation

    try {
      const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
      if (!renderingEngine) return;

      const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as cornerstone3D.Types.IStackViewport;
      if (!stackViewport || typeof stackViewport.getCurrentImageIdIndex !== 'function') return;

      const currentIndex = stackViewport.getCurrentImageIdIndex();
      if (currentIndex === undefined) return;

      // Determine direction - negative deltaY means scroll up, positive means scroll down
      // We want to invert the default behavior, so scroll up = next image (increment index)
      const direction = event.deltaY < 0 ? -1 : 1;
      
      // Calculate new index with bounds checking
      const maxIndex = viewport.imageIds.length - 1;
      const newIndex = Math.max(0, Math.min(maxIndex, currentIndex + direction));
      
      // Only update if the index changed
      if (newIndex !== currentIndex) {
        stackViewport.setImageIdIndex(newIndex);
        setCurrentImageIndex(newIndex);
      }
    } catch (error) {
      console.error('Error handling wheel event:', error);
    }
  };

  // Add wheel event listener
  viewportRef.current.addEventListener('wheel', handleWheel, { passive: false });

  // Cleanup
  return () => {
    if (viewportRef.current) {
      viewportRef.current.removeEventListener('wheel', handleWheel);
    }
  };
}, [renderingEngineId, cornerstoneViewportId, localImageLoaded, viewport?.imageIds, currentImageIndex, viewportId]);

// --- Slider Sync Listener Effect ---
useEffect(() => {
  // Only run if the image is loaded and we expect multiple images
  if (!localImageLoaded || !viewport?.imageIds || viewport.imageIds.length <= 1) {
    return; // No listener needed if not loaded or only one image
  }

  let element: HTMLDivElement | null = null; // Keep track of the element for cleanup
  let capturedRenderingEngine: cornerstone3D.RenderingEngine | null = null; // Variable to hold the engine instance

  try {
    // Get the rendering engine instance reliably at the start of the effect
    const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
    if (!renderingEngine) {
      console.warn('❌ Slider Sync Listener: Rendering engine not found when setting up listener.');
      return; // Engine not available
    }
    capturedRenderingEngine = renderingEngine; // Store the engine instance for use in the handler

    const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as cornerstone3D.Types.IStackViewport;
    if (!stackViewport) {
      console.warn('❌ Slider Sync Listener: No stack viewport found when setting up listener.');
      return; // Viewport not available
    }

    element = stackViewport.element; // Get the element
    if (!element) {
      console.warn('❌ Slider Sync Listener: No element found on viewport when setting up listener.');
      return; // Element not available
    }

    const handleImageRendered = (evt: cornerstone3D.Types.EventTypes.ImageRenderedEvent) => {
      // Still check if the event is for the correct viewportId
      if (evt.detail.viewportId !== cornerstoneViewportId) {
          return;
      }

      // Ensure we have the captured rendering engine instance
      if (!capturedRenderingEngine) {
          console.warn(`[${cornerstoneViewportId}] Rendering engine instance lost in IMAGE_RENDERED handler.`);
          return;
      }

      try {
           // Get the viewport instance using the captured engine and the known ID
           // This is more reliable than evt.detail.viewport
           const vp = capturedRenderingEngine.getViewport(cornerstoneViewportId) as cornerstone3D.Types.IStackViewport;

           // Perform checks *after* getting the viewport via the engine
           if (!vp || typeof vp.getCurrentImageIdIndex !== 'function') {
               console.warn(`[${cornerstoneViewportId}] Viewport invalid or getCurrentImageIdIndex missing via engine in IMAGE_RENDERED handler.`);
               return;
           }

           const newImageIdIndex = vp.getCurrentImageIdIndex();

           // Only update React state if the index actually changed
           // Compare with the 'currentImageIndex' state variable from the outer scope
           if (newImageIdIndex !== undefined && newImageIdIndex !== currentImageIndex) {
               // console.log(`📸 Image Rendered: Index changed from ${currentImageIndex} to ${newImageIdIndex}. Updating slider state.`);
               setCurrentImageIndex(newImageIdIndex);
           }
      } catch (vpError) {
          // Catch errors during viewport retrieval or method call
          console.error(`[${cornerstoneViewportId}] Error getting viewport/index in IMAGE_RENDERED handler:`, vpError);
      }
    };

    // Use the IMAGE_RENDERED event from csCoreEnums
    // Cast the event name to string to avoid TypeScript errors
    element.addEventListener(csCoreEnums.Events.IMAGE_RENDERED as unknown as string, handleImageRendered as EventListener);

    // Cleanup function
    return () => {
      if (element) {
        element.removeEventListener(csCoreEnums.Events.IMAGE_RENDERED as unknown as string, handleImageRendered as EventListener);
      }
    };
  } catch (err) {
    console.error('❌ Error setting up image rendered listener:', err);
  }
  // Dependencies include currentImageIndex to ensure the comparison inside the handler uses the latest state value
}, [renderingEngineId, cornerstoneViewportId, localImageLoaded, viewport?.imageIds?.length, currentImageIndex]);

  // --- Click Handler ---
  const handleClick = () => {
    if (!isActive) {
        dispatch(setActiveViewport(viewportId));
        
        // When switching to this viewport, ensure the current image index is up to date
        try {
            const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
            if (renderingEngine) {
                const stackViewport = renderingEngine.getViewport(cornerstoneViewportId) as cornerstone3D.Types.IStackViewport;
                if (stackViewport && typeof stackViewport.getCurrentImageIdIndex === 'function') {
                    const currentIndex = stackViewport.getCurrentImageIdIndex();
                    if (currentIndex !== undefined && currentIndex !== currentImageIndex) {
                        console.log(`Updating image index from ${currentImageIndex} to ${currentIndex} when activating viewport ${viewportId}`);
                        setCurrentImageIndex(currentIndex);
                    }
                }
            }
        } catch (error) {
            console.error(`Error updating image index when activating viewport ${viewportId}:`, error);
        }
    }
  };

  // --- Image Info Getter ---
  const getImageInfo = React.useCallback(() => { // Memoize if hierarchy/viewport don't change often
    if (!viewport || !hierarchy?.hierarchy?.subjects) return null; // Added check for hierarchy structure

    // Determine if it's a stack or single image based on loaded state
    const isStack = viewport.imageIds && viewport.imageIds.length > 0;
    const subjectId = viewport.subjectId;
    const visitId = viewport.visitId;
    const seriesId = viewport.seriesId;
    const sequenceId = viewport.sequenceId; // Only relevant for single image?

    try {
      const subject = hierarchy.hierarchy.subjects[subjectId];
      if (!subject) return null;
      const visit = subject.visits[visitId];
      if (!visit) return null;
      const series = visit.series[seriesId];
      if (!series) return null;

      if (isStack) {
        // Calculate imageCount based on the actual loaded imageIds length
        const imageCount = viewport.imageIds.length;
        return {
          patientName: subject.name,
          patientId: subject.id,
          studyDate: visit.date,
          seriesDescription: series.description,
          modality: series.modality,
          imageCount,
          currentIndex: currentImageIndex + 1, // Display as 1-based index
        };
      } else if (viewport.imageId && sequenceId) { // Check sequenceId exists for single image case
         const sequence = series.sequences?.[sequenceId]; // sequenceId might not always be present or correct
         return {
           patientName: subject.name,
           patientId: subject.id,
           studyDate: visit.date,
           seriesDescription: series.description,
           modality: series.modality,
           // Use instance number from sequence if available, otherwise maybe default or hide
           instanceNumber: sequence?.instanceNumber ?? 'N/A',
         };
      }
      return null; // No valid info could be determined

    } catch (error){
        // console.error("Error getting image info:", error); // Log error during development
        return null; // Gracefully return null if hierarchy traversal fails
    }
  }, [viewport, hierarchy, currentImageIndex]); // Dependencies for memoization

  // --- Render Loading/Error/Empty State ---
  const renderViewportContent = () => {
    // Check based on viewport state from Redux first
    if (!viewport?.imageId && (!viewport?.imageIds || viewport.imageIds.length === 0)) {
        // Check if it's loading something else or just empty
        if (viewport?.loading) {
             return <CircularProgress color="primary" />;
        }
        return <Typography variant="caption" sx={{ color: 'grey.500' }}>No image selected</Typography>;
    }

    // Now check local loading/error state managed during the load process
    if (viewport.loading && !localImageLoaded && !localImageError) { // Show spinner only if loading hasn't completed/errored locally yet
      return <CircularProgress color="primary" />;
    }

    if (localImageError) { // Prioritize local error state
      return <Typography variant="caption" color="error">Error: {localImageError}</Typography>;
    }
    if (viewport.error && !localImageLoaded) { // Show Redux error if local didn't catch it and not loaded
        return <Typography variant="caption" color="error">Error: {viewport.error}</Typography>;
    }


    // If loaded or no error/loading state applies, render nothing here (image canvas is behind)
    return null;
  };

  // --- Slider Handler ---
  const handleSliderChange = async (_event: Event, newValue: number | number[]) => {
    const index = Array.isArray(newValue) ? newValue[0] : newValue;

    // Prevent unnecessary updates if index hasn't changed
    if (index === currentImageIndex) return;

    try {
      const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
      const stackViewport = renderingEngine?.getViewport(cornerstoneViewportId) as cornerstone3D.Types.IStackViewport | undefined;

      if (stackViewport && typeof stackViewport.setImageIdIndex === 'function') { // Check method exists
        // Update cornerstone viewport
        await stackViewport.setImageIdIndex(index);
        // Update local state AFTER cornerstone succeeds (or optimistically before await)
        setCurrentImageIndex(index);
        // No need to render here, setImageIdIndex should trigger cornerstone render event
      } else {
          console.warn("Slider change: Stack viewport or setImageIdIndex function not found.")
      }
    } catch (err) {
      console.error('Error setting image index from slider:', err);
    }
  };

  useEffect(() => {
    if (!localImageLoaded) return;
    const element = viewportRef.current;
    const handleResize = () => {
      try {
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        renderingEngine.resize(true, true);

        // 4. Reset the camera for THIS specific viewport.
        //    We can safely get the viewport again now.
        const viewport = renderingEngine.getViewport(cornerstoneViewportId);
        if (viewport) { // Double-check just in case, though should exist based on above
            //viewport.resetCamera(false, false);
        }
      } catch (e) {
        console.warn(`Viewport ${cornerstoneViewportId} failed to resize on window change`, e);
      }
    };
  
    // Debounce the resize handler to avoid excessive calls during rapid resizing
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedHandleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 1); // 100ms debounce (adjust as needed)
    };

    // Use ResizeObserver for reliable element resize detection
    const observer = new ResizeObserver(debouncedHandleResize);
    observer.observe(element);

    // Initial resize call to set the correct layout when the component mounts/image loads
    handleResize();

    // Cleanup: remove the observer when the component unmounts or dependencies change
    return () => {
      clearTimeout(resizeTimeout); // Clear any pending timeout
      observer.unobserve(element); // Stop observing the element
      observer.disconnect(); // Disconnect the observer instance
    };
  }, [localImageLoaded, renderingEngineId, cornerstoneViewportId]);
  


  // --- Render Component ---
  const imageInfo = getImageInfo(); // Get image info once per render

  return (
    <Paper
      elevation={isActive ? 8 : 2}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: isActive ? '2px solid #29b7c0' : '2px solid grey', // Use grey for inactive border
        transition: 'border 0.2s ease-in-out',
        backgroundColor: '#000', // Background for the Paper itself
      }}
      onClick={handleClick}
    >
      {/* Cornerstone Element */}
      <Box
        ref={viewportRef}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000', // Ensure div background is black
          color: '#fff', // For text overlays like loading/error
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-viewport-id={viewportId} // For debugging/selection
      >
        {/* Render Loading/Error/Empty states */}
        {renderViewportContent()}
      </Box>

      {/* Overlays - Conditionally render based on loaded state AND imageInfo */}
      {localImageLoaded && imageInfo && (
        <>
          {/* Top Left Overlay */}
          <Box
            sx={{
              position: 'absolute', top: 2, left: 4, pointerEvents: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.6)', color: '#fff',
              fontSize: '11px', padding: '1px 4px', borderRadius: 1,
              whiteSpace: 'nowrap', maxWidth: 'calc(100% - 8px)', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {imageInfo.seriesDescription} ({imageInfo.modality})
          </Box>

          {/* Bottom Left Overlay */}
          <Box
            sx={{
              position: 'absolute', bottom: 2, left: 4, pointerEvents: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.6)', color: '#fff',
              fontSize: '11px', padding: '1px 4px', borderRadius: 1,
              whiteSpace: 'nowrap', maxWidth: 'calc(100% - 8px)', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            Pt: {imageInfo.patientName}
            {/* Show Image index only if stack */}
            {imageInfo.imageCount && imageInfo.imageCount > 1
              ? ` | Im: ${imageInfo.currentIndex}/${imageInfo.imageCount}`
              : imageInfo.instanceNumber // Show Instance if not stack (or if imageCount <= 1)
                ? ` | Inst: ${imageInfo.instanceNumber}`
                : ''}
          </Box>
        </>
      )}

      {/* Vertical Slider - Conditionally render for stacks */}
      {localImageLoaded && viewport.imageIds && viewport.imageIds.length > 1 && (
        <Box
          sx={{
            position: 'absolute', top: '10%', /* Adjust vertical position */
            right: 0, /* Position on the right */
            height: '80%', /* Adjust height */
            display: 'flex', alignItems: 'center',
            px: 0.5, /* Padding horizontal */
            zIndex: 10, // Ensure it's above the canvas
            // pointerEvents: 'none', // Let clicks pass through the container Box
          }}
        >
          <Box
             sx={{
               height: '100%',
               pointerEvents: 'auto', // Enable pointer events for the slider itself
               backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent background
               borderRadius: 1,
               px: 0.5, py: 1, display: 'flex', alignItems: 'center',
             }}
          >
              <Slider
                key={`slider-${viewportId}-${viewport.imageIds?.length ?? 0}`} // Helps React re-render if stack length changes
                orientation="vertical"
                size="small"
                min={0}
                max={viewport.imageIds.length - 1}
                value={currentImageIndex}
                onChange={handleSliderChange}
                aria-label="Image Slice"
                valueLabelDisplay="auto" // Show label on hover/drag
                 valueLabelFormat={(value) => `${value + 1}`} // Display 1-based index in label
                sx={{
                  color: '#fff',
                  '& .MuiSlider-thumb': { width: 12, height: 12, backgroundColor: '#fff' }, // Make thumb white
                  '& .MuiSlider-rail': { opacity: 0.4 },
                  '& .MuiSlider-track': { border: 'none' },
                  // Ensure clicks on the track work as expected
                  '& .MuiSlider-track, & .MuiSlider-rail': {
                      pointerEvents: 'auto',
                  }
                }}
              />
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default SimpleStackViewport;