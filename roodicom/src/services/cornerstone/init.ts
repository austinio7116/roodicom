import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import dicomParser from 'dicom-parser';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    metadataProvider: {
      [key: string]: {
        imagePositionPatient?: number[];
        imageOrientationPatient?: number[];
        pixelSpacing?: number[];
        sliceThickness?: number;
        rows?: number;
        columns?: number;
        [key: string]: any;
      };
    };
    cornerstoneInitialized?: boolean;
    cornerstoneFileManager?: any;
  }
}

export async function initializeCornerstone(): Promise<void> {
  try {
    await cornerstone3D.init();
    cornerstoneTools.init(); // Usually synchronous
    // Register tools
    const { addTool } = cornerstoneTools;

    const toolsToRegister = [
      cornerstoneTools.WindowLevelTool,
      cornerstoneTools.PanTool,
      cornerstoneTools.ZoomTool,
      cornerstoneTools.LengthTool,
      cornerstoneTools.AngleTool,
      cornerstoneTools.RectangleROITool,
      cornerstoneTools.EllipticalROITool,
      cornerstoneTools.StackScrollTool
    ];

    toolsToRegister.forEach((tool) => {
      if (tool) {
        addTool(tool);
      } else {
        console.warn('Tool is undefined and was not registered.');
      }
    });
    
    // Initialize the global metadataProvider object
    window.metadataProvider = {};
    
    // Register a global metadata provider with Cornerstone
    cornerstone3D.metaData.addProvider((type: string, imageId: string) => {
      if (window.metadataProvider && window.metadataProvider[imageId]) {
        return window.metadataProvider[imageId][type];
      }
    });
    
    console.log('Global metadata provider registered');
    
    try {
      // Use 'as any' because types seem faulty for external/configure
      const waLoader = cornerstoneDICOMImageLoader as any;

      if (waLoader.external) {
        waLoader.external.cornerstone = cornerstone3D;
        waLoader.external.dicomParser = dicomParser;
      } else { console.warn('waLoader.external not found!'); }

       if (waLoader.configure) {
           await waLoader.configure({
             useWebWorkers: false, // DISABLE workers
             decodeConfig: { convertFloatPixelDataToInt: false },
           });
       } else { console.warn('waLoader.configure not found!'); }
       // If using Option B, REMOVE or COMMENT OUT the webWorkerManager.initialize block entirely

       if (waLoader.init && typeof waLoader.init === 'function') {
        await waLoader.init(); // Call the loader's init function
      } else {
        console.warn('waLoader.init function not found! Scheme registration might fail.');
      }

      // Check if webWorkerManager exists and initialize it
      if (waLoader.webWorkerManager) {
        const config = {
          maxWebWorkers: Math.max(navigator.hardwareConcurrency || 1, 1), // Ensure at least 1
          startWebWorkersOnDemand: true, // Default
          // *** THIS IS CRITICAL ***
          // Path relative to your web server root where the worker script will be found
          //webWorkerPath: '/decodeImageFrameWorker.js',
          taskConfiguration: {
            decodeTask: {
              initializeCodecsOnStartup: false, // Load codecs when needed
              // Other task configs if needed
            },
          },
        };
        try {
          // Assuming initialize might be async
          await waLoader.webWorkerManager.initialize(config);
        } catch (initError) {
          console.error('Failed to initialize Web Worker Manager:', initError);
        }
      } else {
        console.warn('waLoader.webWorkerManager not found! Cannot initialize workers.');
      }


      // Expose fileManager globally (optional)
      const fileManager = waLoader.wadouri?.fileManager;
      if (fileManager) {
        (window as any).cornerstoneFileManager = fileManager;
        console.log('Cornerstone File Manager exposed globally')      } else { console.warn('waLoader.wadouri.fileManager not found!'); }


    } catch (error) { console.error('Error configuring WADO Image Loader:', error); }


  } catch (error) {
    console.error('Error initializing Cornerstone:', error);
    throw new Error('Failed to initialize Cornerstone');
  }
}

/**
 * Helper function to add a file to the Cornerstone file manager and get an imageId
 * This replaces the custom loader with the built-in WADO URI loader
 */
export async function addFileToCornerstone(file: File, metadata?: any): Promise<string> {
  const waLoader = cornerstoneDICOMImageLoader as any;

  if (!waLoader.wadouri || !waLoader.wadouri.fileManager) {
    console.error('WADO URI file manager not available');
    return '';
  }

  // File UID returned (contains unwanted "dicomfile:" prefix)
  const imageId = waLoader.wadouri.fileManager.add(file);

  await cornerstone3D.imageLoader.loadAndCacheImage(imageId);

  // Register metadata with Cornerstone if provided
  if (metadata && cornerstone3D.metaData) {
    try {
      // Create a metadata object in the format Cornerstone expects
      const metadataObject = {
        imagePositionPatient: metadata.imagePositionPatient,
        imageOrientationPatient: metadata.imageOrientationPatient,
        pixelSpacing: metadata.pixelSpacing,
        sliceThickness: metadata.sliceThickness,
        rows: metadata.rows, 
        columns: metadata.columns,
      };
      
      // Store the metadata in the global object that can be accessed by Cornerstone
      window.metadataProvider[imageId] = metadataObject;
      
      console.log(`Registered metadata for ${imageId}:`, {
        imagePositionPatient: metadata.imagePositionPatient ? 'Yes' : 'No',
        imageOrientationPatient: metadata.imageOrientationPatient ? 'Yes' : 'No',
        pixelSpacing: metadata.pixelSpacing ? 'Yes' : 'No',
        sliceThickness: metadata.sliceThickness ? 'Yes' : 'No'
      });
      
      // Verify the metadata is accessible
      const testPosition = cornerstone3D.metaData.get('imagePositionPatient', imageId);
      console.log(`Verification - Can access imagePositionPatient: ${testPosition ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error('Error registering metadata with Cornerstone:', error);
    }
  }

  return imageId;
}



/**
 * Clean up Cornerstone resources
 */
export function cleanupCornerstone(): void {
  
  try {
    // Clean up the file manager if needed
    const waLoader = cornerstoneDICOMImageLoader as any;
    if (waLoader.wadouri && waLoader.wadouri.fileManager && waLoader.wadouri.fileManager.purge) {
      waLoader.wadouri.fileManager.purge();
    }
  } catch (error) {
    console.error('Error cleaning up Cornerstone file manager:', error);
  }
}