import React, { useEffect, useState } from 'react';
import { Box, Paper /* Removed Grid as it wasn't used */ } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import SimpleStackViewport from './SimpleStackViewport';
import ViewerToolbar, { OrientationType } from './ViewerToolbar'; // Import OrientationType
import DicomMetadataViewer from './DicomMetadataViewer'; // Import the DICOM metadata viewer
import { setLayout } from '../../store/slices/viewportsSlice'; // Ensure this path is correct

// Import Cornerstone Core and necessary types
import * as cornerstone3D from '@cornerstonejs/core';
import { IStackViewport, IVolumeViewport } from '@cornerstonejs/core/types'; // Add IVolumeViewport
import { Enums } from '@cornerstonejs/core'; // Import Enums for orientation constants

// It's generally better to have RootState defined centrally
// but using the local interface for now as provided in the original code.
// Consider defining this in your store configuration.
interface ViewportsState {
  viewports: Record<string, any>; // Replace 'any' with your actual viewport state type if possible
  activeViewportId: string | null;
  syncGroup: string[]; // Assuming this exists in your state
  layout: {
    rows: number;
    columns: number;
  };
}

const ViewerContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  // State to track current orientation for each viewport
  const [viewportOrientations, setViewportOrientations] = useState<Record<string, OrientationType>>({});
  // State for DICOM metadata viewer
  const [dicomMetadataOpen, setDicomMetadataOpen] = useState<boolean>(false);

  // Use RootState for type safety with useAppSelector if configured
  // Otherwise, casting like below is necessary
  const { rows, columns } = useAppSelector(state =>
    (state.viewports as ViewportsState).layout // Cast needed if RootState isn't fully typed for useSelector
  );
  const viewports = useAppSelector(state =>
    (state.viewports as ViewportsState).viewports // Cast
  );
  const activeViewportId = useAppSelector(state =>
      (state.viewports as ViewportsState).activeViewportId // Cast & get active ID
  );

  const viewportIds = Object.keys(viewports);

  // --- Layout Adjustment Logic (existing) ---
  useEffect(() => {
    const totalRequired = rows * columns;
    const availableCount = viewportIds.length;

    // Only adjust if the layout demands more viewports than available
    if (availableCount > 0 && totalRequired > availableCount) {
       console.warn(`Layout requires ${totalRequired} viewports, but only ${availableCount} are defined. Adjusting layout.`);
       // Calculate a layout that fits the available viewports
       // This aims for a roughly square layout
       const newRows = Math.max(1, Math.ceil(Math.sqrt(availableCount)));
       const newColumns = Math.max(1, Math.ceil(availableCount / newRows));

       // Dispatch only if layout actually needs changing
       if (newRows !== rows || newColumns !== columns) {
         dispatch(setLayout({ rows: newRows, columns: newColumns }));
       }
    } else if (totalRequired === 0 && availableCount > 0) {
        // Handle case where layout is 0x0 but viewports exist (e.g. initial state)
        const newRows = Math.max(1, Math.ceil(Math.sqrt(availableCount)));
        const newColumns = Math.max(1, Math.ceil(availableCount / newRows));
        dispatch(setLayout({ rows: newRows, columns: newColumns }));
    }
  }, [rows, columns, viewportIds.length, dispatch]); // Rerun when layout or viewport count changes


  // --- Helper function to get the active Cornerstone viewport instance ---
  const getActiveCornerstoneViewport = (): { renderingEngine: cornerstone3D.RenderingEngine; viewport: IStackViewport; csViewportId: string } | null => {
    if (!activeViewportId) {
      console.warn('No active viewport selected.');
      return null;
    }

    // Construct the IDs based on your convention in SimpleStackViewport
    const renderingEngineId = `engine-${activeViewportId}`;
    const cornerstoneViewportId = `cs-vp-${activeViewportId}`;

    try {
      // Ensure Cornerstone is initialized and engine exists
      if (!cornerstone3D.getRenderingEngine(renderingEngineId)) {
           console.warn(`Rendering engine "${renderingEngineId}" not found. Has Cornerstone been initialized?`);
           return null;
      }
      const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
      if (!renderingEngine) {
           // This check might be redundant due to the one above, but safe to keep.
           console.warn(`Rendering engine "${renderingEngineId}" could not be retrieved.`);
           return null;
      }

      // Get the viewport and explicitly cast it for StackViewport properties/methods
      const viewport = renderingEngine.getViewport(cornerstoneViewportId) as IStackViewport;
      if (!viewport) {
        console.warn(`Cornerstone viewport "${cornerstoneViewportId}" not found in engine "${renderingEngineId}".`);
        return null;
      }

       // Check for essential methods to ensure it's a valid stack viewport instance
       // These checks help catch issues if the viewport isn't what we expect
       if (typeof viewport.setProperties !== 'function' || typeof viewport.resetCamera !== 'function' || typeof viewport.getProperties !== 'function' ) {
          console.error(`Active viewport "${cornerstoneViewportId}" does not seem to be a valid IStackViewport (missing methods).`);
          return null;
       }


      return { renderingEngine, viewport, csViewportId: cornerstoneViewportId };
    } catch (error) {
      console.error(`Error accessing active viewport (${activeViewportId} / ${cornerstoneViewportId}):`, error);
      return null;
    }
  };

  // --- Handler Functions for Toolbar Actions ---

  const handleRotate = (direction: 'left' | 'right') => {
    const activeInfo = getActiveCornerstoneViewport();
    if (!activeInfo) {
      console.warn('No active viewport available for rotation');
      return;
    }
    
    const { renderingEngine, viewport, csViewportId } = activeInfo;

    try {
      // Get current rotation from ViewPresentation
      let currentRotation = 0;
      try {
        // This is the correct way to get rotation in Cornerstone3D
        const viewPresentation = viewport.getViewPresentation();
        if (viewPresentation && typeof viewPresentation.rotation === 'number') {
          currentRotation = viewPresentation.rotation;
          console.log('Current rotation from ViewPresentation:', currentRotation);
        }
      } catch (err) {
        console.warn('Could not get ViewPresentation, using default rotation of 0');
      }
      
      // Calculate new rotation angle
      const amount = direction === 'left' ? -90 : 90;
      let newRotation = (currentRotation + amount) % 360;
      if (newRotation < 0) {
        newRotation += 360; // Ensure rotation is always 0 <= angle < 360
      }

      console.log(`Rotating from ${currentRotation}° to ${newRotation}°`);
      
      // Set the rotation using setViewPresentation (from the example code)
      try {
        viewport.setViewPresentation({
          rotation: newRotation
        });
        console.log('Set rotation via setViewPresentation');
      } catch (err) {
        console.warn('setViewPresentation failed:', err);
      }
      
      // Render the viewport
      viewport.render();
      console.log('Rotation complete');
    } catch(error) {
      console.error(`Error rotating viewport ${csViewportId}:`, error);
    }
  };

  const handleInvert = () => {
    const activeInfo = getActiveCornerstoneViewport();
    if (!activeInfo) {
      console.warn('No active viewport available for inversion');
      return;
    }
    
    const { renderingEngine, viewport, csViewportId } = activeInfo;

    try {
      // Get current properties
      const currentProperties = viewport.getProperties();
      console.log('Current viewport properties:', currentProperties);
      
      // Get current invert state (default to false if not found)
      const invert = currentProperties.invert || false;
      console.log('Current invert state:', invert);
      
      // Simply toggle the invert property (from the example code)
      viewport.setProperties({
        invert: !invert
      });
      console.log('Set invert to:', !invert);
      
      // Render the viewport
      viewport.render();
      console.log('Inversion complete');
    } catch (error) {
      console.error(`Error inverting viewport ${csViewportId}:`, error);
    }
  };
const handleReset = () => {
  const activeInfo = getActiveCornerstoneViewport();
  if (!activeInfo) {
    console.warn('No active viewport available for reset');
    return;
  }
  
  const { renderingEngine, viewport, csViewportId } = activeInfo;

  try {
    console.log('Resetting viewport:', csViewportId);
    
    // Reset camera (zoom, pan, position)
    viewport.resetCamera();
    console.log('Camera reset complete');

    // Reset properties (VOI, rotation, flip) to defaults from metadata
    viewport.resetProperties();
    console.log('Properties reset complete');

    // Render the viewport (using render() method from example code)
    viewport.render();
    
    console.log('Reset complete');
  } catch (error) {
    console.error(`Error resetting viewport ${csViewportId}:`, error);
  }
};

// Handler for MPR orientation change
const handleMPROrientationChange = async (orientation: OrientationType) => {
  const activeInfo = getActiveCornerstoneViewport();
  if (!activeInfo) {
    console.warn('No active viewport available for MPR orientation change');
    return;
  }
  
  const { renderingEngine, viewport, csViewportId } = activeInfo;

  try {
    console.log(`Changing MPR orientation to: ${orientation}`);
    
    // Update the orientation state for this viewport
    if (activeViewportId) {
      setViewportOrientations(prev => ({
        ...prev,
        [activeViewportId]: orientation
      }));
    }
    
    // Get the element from the current viewport
    const element = viewport.element;
    
    // Get the current image IDs from the stack viewport
    const imageIds = viewport.getImageIds();
    
    if (!imageIds || imageIds.length === 0) {
      console.warn('No image IDs available for MPR conversion');
      return;
    }
    
    // Create a unique volume ID for this viewport
    const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
    const volumeName = `volume-${activeViewportId || 'default'}`;
    const volumeId = `${volumeLoaderScheme}:${volumeName}`;
    
    // Log the metadata for the first image to see what's available
    const firstImageId = imageIds[0];
    console.log(`Checking metadata for ${firstImageId}`);
    
    // Get the metadata provider
    const metadataProvider = cornerstone3D.metaData;
    
    // Check what metadata is available
    const imagePositionPatient = metadataProvider.get('imagePositionPatient', firstImageId);
    const imageOrientationPatient = metadataProvider.get('imageOrientationPatient', firstImageId);
    const pixelSpacing = metadataProvider.get('pixelSpacing', firstImageId);
    const sliceThickness = metadataProvider.get('sliceThickness', firstImageId);
    
    console.log('Available metadata:', {
      imagePositionPatient,
      imageOrientationPatient,
      pixelSpacing,
      sliceThickness
    });
    
    // Check if we have enough metadata for MPR
    if (!imagePositionPatient || !imageOrientationPatient) {
      console.warn('Missing required metadata for MPR. Using stack viewport instead.');
      
      // Update the orientation state but stay with stack viewport
      console.log(`Setting orientation state to ${orientation} (simulated)`);
      return;
    }
    
    // Disable the current viewport
    renderingEngine.disableElement(csViewportId);
    
    // Create a new viewport with the desired orientation
    const viewportInput = {
      viewportId: csViewportId,
      type: Enums.ViewportType.ORTHOGRAPHIC,
      element,
      defaultOptions: {
        orientation: Enums.OrientationAxis[orientation],
        background: [0.2, 0, 0.2] as [number, number, number]
      }
    };
    
    // Enable the new viewport
    renderingEngine.enableElement(viewportInput);
    
    // Get the new viewport (now an orthographic/volume viewport)
    const newViewport = renderingEngine.getViewport(csViewportId) as cornerstone3D.Types.IVolumeViewport;
    
    try {
      // Create and cache the volume from the image IDs
      console.log(`Creating volume from ${imageIds.length} images with ID: ${volumeId}`);
      
      // Create the volume
      const volume = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeId, {
        imageIds
      });
      
      // Load the volume
      await volume.load();
      
      // Set the volume on the viewport
      await newViewport.setVolumes([
        {
          volumeId
        }
      ]);
      
      // Render the viewport
      newViewport.render();
      
      console.log(`MPR orientation changed to ${orientation}`);
    } catch (volumeError) {
      console.error(`Error creating volume: ${volumeError}`);
      
      // If volume creation fails, fall back to stack viewport
      renderingEngine.disableElement(csViewportId);
      
      // Re-create the original stack viewport
      const stackViewportInput = {
        viewportId: csViewportId,
        type: Enums.ViewportType.STACK,
        element
      };
      
      renderingEngine.enableElement(stackViewportInput);
      
      // Get the stack viewport
      const stackViewport = renderingEngine.getViewport(csViewportId) as cornerstone3D.Types.IStackViewport;
      
      // Set the original stack of images
      stackViewport.setStack(imageIds);
      
      // Render the viewport
      stackViewport.render();
      
      console.log(`Fallback to stack viewport due to volume creation failure`);
    }
  } catch (error) {
    console.error(`Error changing MPR orientation to ${orientation}:`, error);
  }
};

  // Handler for showing DICOM metadata
  const handleShowDicomMetadata = () => {
    setDicomMetadataOpen(true);
  };

  // Log metadata viewer state when opened
  useEffect(() => {
    if (dicomMetadataOpen) {
      const activeViewport = activeViewportId ? viewports[activeViewportId] : null;
      const singleImageId = activeViewport?.imageId;
      const imageIdsArray = activeViewport?.imageIds;
      const firstImageIdFromArray = imageIdsArray && imageIdsArray.length > 0 ? imageIdsArray[0] : null;
      
      console.log('Opening metadata viewer with:', {
        activeViewportId,
        singleImageId,
        imageIdsArray,
        firstImageIdFromArray,
        effectiveImageId: singleImageId || firstImageIdFromArray,
        viewport: activeViewport
      });
    }
  }, [dicomMetadataOpen, activeViewportId, viewports]);

  // --- Component Rendering ---
  return (
    // Using height: 100vh or similar might be needed depending on parent container
    <Box sx={{ height: 'calc(100vh - 64px)', /* Adjust '64px' if toolbar height differs */ display: 'flex', flexDirection: 'column' }}>
      {/* Pass the handler functions as props to the toolbar */}
      <ViewerToolbar
        onRotateLeft={() => handleRotate('left')}
        onRotateRight={() => handleRotate('right')}
        onInvert={handleInvert}
        onReset={handleReset}
        onMPROrientationChange={handleMPROrientationChange}
        currentOrientation={activeViewportId ? viewportOrientations[activeViewportId] || 'AXIAL' : 'AXIAL'}
        onShowDicomMetadata={handleShowDicomMetadata}
       />
      <Paper
        elevation={3}
        sx={{
          flexGrow: 1,
          display: 'flex', // Use flex here to make inner Box fill space
          overflow: 'hidden',
          mt: 1, // Margin top
          p: 0.5, // Padding around the grid container
          boxSizing: 'border-box'
        }}
      >
        {/* Grid Container */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%', height: '100%' }}>
          {/* Generate grid cells based on layout */}
          {/* Only render cells for which a viewport ID exists */}
          {viewportIds.slice(0, rows * columns).map((viewportId, index) => {
             // If viewportIds runs out but layout expects more, this prevents rendering empty cells without IDs
             if (!viewportId) return null;

             return (
              <Box
                key={viewportId}
                sx={{
                  width: `${100 / columns}%`,
                  height: `${100 / rows}%`,
                  padding: '4px', // Padding inside each cell
                  boxSizing: 'border-box'
                }}
              >
                {/* Render the viewport component */}
                <SimpleStackViewport viewportId={viewportId} />
              </Box>
            );
          })}
        </Box>
      </Paper>
      
      {/* DICOM Metadata Viewer */}
      <DicomMetadataViewer
        open={dicomMetadataOpen}
        onClose={() => setDicomMetadataOpen(false)}
        imageId={activeViewportId ? (
          // Try to get the imageId from the active viewport
          viewports[activeViewportId]?.imageId ||
          // If no single imageId, try to get the first imageId from the imageIds array
          (viewports[activeViewportId]?.imageIds && viewports[activeViewportId]?.imageIds.length > 0
            ? viewports[activeViewportId]?.imageIds[0]
            : null)
        ) : null}
      />
    </Box>
  );
};

export default ViewerContainer;