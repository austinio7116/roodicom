import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import dicomParser from 'dicom-parser';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

export async function initializeCornerstone(): Promise<void> {
  try {
    await cornerstone3D.init();
    cornerstoneTools.init(); // Usually synchronous

    try {
      // Use 'as any' because types seem faulty for external/configure
      const waLoader = cornerstoneDICOMImageLoader as any;

      if (waLoader.external) {
        waLoader.external.cornerstone = cornerstone3D;
        waLoader.external.dicomParser = dicomParser;
        console.log('External dependencies set for WADO loader');
      } else { console.warn('waLoader.external not found!'); }

       if (waLoader.configure) {
           await waLoader.configure({
             useWebWorkers: false, // DISABLE workers
             decodeConfig: { convertFloatPixelDataToInt: false },
           });
           console.log('WADO loader configured NOT to use web workers');
       } else { console.warn('waLoader.configure not found!'); }
       // If using Option B, REMOVE or COMMENT OUT the webWorkerManager.initialize block entirely

       if (waLoader.init && typeof waLoader.init === 'function') {
        await waLoader.init(); // Call the loader's init function
        console.log('cornerstoneDICOMImageLoader initialized.');
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
          console.log('Web Worker Manager initialized with config:', config);
        } catch (initError) {
          console.error('Failed to initialize Web Worker Manager:', initError);
        }
      } else {
        console.warn('waLoader.webWorkerManager not found! Cannot initialize workers.');
      }


      // --- >>> CRITICAL: REMOVED Manual Loader Registration <<< ---
      console.log('Skipping manual image loader registration.');


      // Expose fileManager globally (optional)
      const fileManager = waLoader.wadouri?.fileManager;
      if (fileManager) {
        (window as any).cornerstoneFileManager = fileManager;
        console.log('Cornerstone File Manager exposed globally');
      } else { console.warn('waLoader.wadouri.fileManager not found!'); }

      console.log('Cornerstone WADO Image Loader setup complete.');

    } catch (error) { console.error('Error configuring WADO Image Loader:', error); }

    console.log('Cornerstone initialization completed successfully');

  } catch (error) {
    console.error('Error initializing Cornerstone:', error);
    throw new Error('Failed to initialize Cornerstone');
  }
}

/**
 * Helper function to add a file to the Cornerstone file manager and get an imageId
 * This replaces the custom loader with the built-in WADO URI loader
 */
export async function addFileToCornerstone(file: File): Promise<string> {
  const waLoader = cornerstoneDICOMImageLoader as any;

  if (!waLoader.wadouri || !waLoader.wadouri.fileManager) {
    console.error('WADO URI file manager not available');
    return '';
  }

  // File UID returned (contains unwanted "dicomfile:" prefix)
  const imageId = waLoader.wadouri.fileManager.add(file);
  console.log(`File registered with raw UID: ${imageId}`);


  return imageId;
}



/**
 * Clean up Cornerstone resources
 */
export function cleanupCornerstone(): void {
  console.log('Cornerstone cleanup');
  
  try {
    // Clean up the file manager if needed
    const waLoader = cornerstoneDICOMImageLoader as any;
    if (waLoader.wadouri && waLoader.wadouri.fileManager && waLoader.wadouri.fileManager.purge) {
      waLoader.wadouri.fileManager.purge();
      console.log('Purged Cornerstone file manager');
    }
  } catch (error) {
    console.error('Error cleaning up Cornerstone file manager:', error);
  }
}