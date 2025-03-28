import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { setRootDirectory, scanStart, scanProgress, scanSuccess, scanFailure } from '../../store/slices/filesSlice';
import { addMetadata, buildHierarchyStart, buildHierarchySuccess } from '../../store/slices/hierarchySlice';
import { DicomFileEntry, DicomMetadata } from '../../types/dicom';
import { setActiveTab } from '../../store/slices/uiSlice';
import { DicomHierarchy } from '../../types/hierarchy';
import { addFileToCornerstone } from '../../services/cornerstone/init';
// Import with type any to bypass TypeScript errors
import cornerstoneWADOImageLoader from '@cornerstonejs/dicom-image-loader';

interface FilesState {
  rootDirectory: FileSystemDirectoryHandle | null;
  files: DicomFileEntry[];
  loading: boolean;
  scanProgress: {
    total: number;
    processed: number;
    percentage: number;
  };
}

// Helper function to check if a file is a DICOM file by checking for the DICOM preamble
const isDicomFile = async (file: File): Promise<boolean> => {
  try {
    // DICOM files start with a 128-byte preamble followed by 'DICM'
    const buffer = await file.slice(0, 132).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check for 'DICM' at offset 128
    return bytes[128] === 68 && // 'D'
           bytes[129] === 73 && // 'I'
           bytes[130] === 67 && // 'C'
           bytes[131] === 77;   // 'M'
  } catch (error) {
    console.error('Error checking DICOM preamble:', error);
    return false;
  }
};

import * as dicomParser from 'dicom-parser';

// Helper function to extract DICOM metadata from a file
const extractDicomMetadata = async (file: File, filePath: string): Promise<DicomMetadata> => {
  // Default values in case parsing fails
  const metadata: DicomMetadata = {
    patientId: 'Unknown',
    patientName: 'Unknown Patient',
    studyDate: new Date().toISOString().split('T')[0],
    studyTime: new Date().toISOString().split('T')[1].split('.')[0],
    modality: 'OT', // Other
    seriesDescription: 'Unknown Series',
    instanceNumber: 1,
    studyInstanceUID: '1.2.826.0.1.3680043.2.1143.1', // Default UID
    seriesInstanceUID: '1.2.826.0.1.3680043.2.1143.2', // Default UID
  };
  
  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse the DICOM file
    const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
    
    // Helper function to get string from a DICOM element
    const getString = (tag: string, defaultValue: string = ''): string => {
      const element = dataSet.elements[tag];
      if (!element) return defaultValue;
      return dataSet.string(tag) || defaultValue;
    };
    
    // Helper function to get a number from a DICOM element
    const getNumber = (tag: string, defaultValue: number = 0): number => {
      const value = getString(tag);
      return value ? parseInt(value, 10) : defaultValue;
    };
    
    // Extract patient information
    metadata.patientId = getString('x00100020', 'Unknown'); // Patient ID
    metadata.patientName = getString('x00100010', 'Unknown Patient'); // Patient Name
    
    // Extract study information
    metadata.studyDate = getString('x00080020', metadata.studyDate); // Study Date
    metadata.studyTime = getString('x00080030', metadata.studyTime); // Study Time
    metadata.studyInstanceUID = getString('x0020000d', metadata.studyInstanceUID); // Study Instance UID
    
    // Extract series information
    metadata.modality = getString('x00080060', 'OT'); // Modality
    metadata.seriesDescription = getString('x0008103e', 'Unknown Series'); // Series Description
    metadata.seriesInstanceUID = getString('x0020000e', metadata.seriesInstanceUID); // Series Instance UID
    
    // Extract instance information
    metadata.instanceNumber = getNumber('x00200013', 1); // Instance Number
    
    // Format the study date if it's in DICOM format (YYYYMMDD)
    if (metadata.studyDate.match(/^[0-9]{8}$/)) {
      const year = metadata.studyDate.substring(0, 4);
      const month = metadata.studyDate.substring(4, 6);
      const day = metadata.studyDate.substring(6, 8);
      metadata.studyDate = `${year}-${month}-${day}`;
    }
    
    // Format the study time if it's in DICOM format (HHMMSS.FFFFFF)
    if (metadata.studyTime.match(/^[0-9.]+$/)) {
      const timeParts = metadata.studyTime.split('.');
      const timeStr = timeParts[0];
      let formattedTime = '';
      
      if (timeStr.length >= 6) {
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);
        const second = timeStr.substring(4, 6);
        formattedTime = `${hour}:${minute}:${second}`;
      } else if (timeStr.length >= 4) {
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);
        formattedTime = `${hour}:${minute}:00`;
      } else if (timeStr.length >= 2) {
        const hour = timeStr.substring(0, 2);
        formattedTime = `${hour}:00:00`;
      }
      
      if (formattedTime) {
        metadata.studyTime = formattedTime;
      }
    }
    
    return metadata;
  } catch (error) {
    console.error('Error extracting DICOM metadata:', error);
    return metadata;
  }
};

const FileExplorer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { rootDirectory, files, loading, scanProgress: progress } = useAppSelector(state => 
    state.files as FilesState
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleSelectDirectory = async () => {
    try {
      // Request directory access
      const dirHandle = await window.showDirectoryPicker({
        id: 'dicomRoot',
        mode: 'read',
        startIn: 'documents',
      });
      
      dispatch(setRootDirectory(dirHandle));
      
      // Start scanning
      dispatch(scanStart());
      dispatch(buildHierarchyStart());
      
      // Scan the directory recursively
      const dicomFiles: DicomFileEntry[] = [];
      let totalFiles = 0;
      let processedFiles = 0;
      
      // First, count total files for progress tracking
      await countFiles(dirHandle);
      
      // Then scan for DICOM files
      await scanDirectory(dirHandle, '');
      
      // Finish scanning
      dispatch(scanSuccess(dicomFiles));
      
      // Mark hierarchy as loaded with the data that's been added via addMetadata
      dispatch(buildHierarchySuccess({ subjects: {} }));
      
      // Switch to hierarchy tab after scanning is complete
      dispatch(setActiveTab('hierarchy'));
      
      async function countFiles(dirHandle: FileSystemDirectoryHandle, path = '') {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            totalFiles++;
          } else if (entry.kind === 'directory') {
            await countFiles(entry as FileSystemDirectoryHandle, `${path}/${entry.name}`);
          }
        }
      }
      
      async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path: string) {
        // Create a map to group files by patient/study/series
        const patientMap = new Map<string, {
          patientId: string,
          patientName: string,
          studies: Map<string, {
            studyDate: string,
            studyId: string,
            series: Map<string, {
              seriesId: string,
              modality: string,
              description: string,
              files: {
                file: File,
                handle: FileSystemFileHandle,
                path: string,
                instanceNumber: number
              }[]
            }>
          }>
        }>();
        
        // First pass: collect all DICOM files
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            processedFiles++;
            
            // Update progress
            dispatch(scanProgress({ total: totalFiles, processed: processedFiles }));
            
            try {
              // Get file handle and file
              const fileHandle = entry as FileSystemFileHandle;
              const file = await fileHandle.getFile();
              const filePath = path ? `${path}/${entry.name}` : entry.name;
              
              // Check if it's a DICOM file by examining the preamble
              if (await isDicomFile(file)) {
                // Add to list of DICOM files
                dicomFiles.push({
                  name: entry.name,
                  path: filePath,
                  handle: fileHandle,
                });
                
                // Extract metadata from the file
                const metadata = await extractDicomMetadata(file, filePath);
                
                // Add the file to the Cornerstone file manager and get an imageId
                // CORRECT: directly returns a ready-to-use Cornerstone imageId
                const imageId = await addFileToCornerstone(file);
                console.log(`Loaded file with imageId: ${imageId}`); 
                // logs: Loaded file with imageId: dicomfile://171
                
                if (!imageId) {
                  console.error(`Failed to create imageId for file: ${file.name}`);
                  continue; // Skip this file
                }
                
                // Group by patient
                if (!patientMap.has(metadata.patientId)) {
                  patientMap.set(metadata.patientId, {
                    patientId: metadata.patientId,
                    patientName: metadata.patientName,
                    studies: new Map()
                  });
                }
                
                const patient = patientMap.get(metadata.patientId)!;
                
                // Group by study instance UID
                const studyKey = metadata.studyInstanceUID;
                if (!patient.studies.has(studyKey)) {
                  patient.studies.set(studyKey, {
                    studyDate: metadata.studyDate,
                    studyId: metadata.studyInstanceUID,
                    series: new Map()
                  });
                }
                
                const study = patient.studies.get(studyKey)!;
                
                // Group by series instance UID
                const seriesKey = metadata.seriesInstanceUID;
                if (!study.series.has(seriesKey)) {
                  study.series.set(seriesKey, {
                    seriesId: metadata.seriesInstanceUID,
                    modality: metadata.modality,
                    description: metadata.seriesDescription,
                    files: []
                  });
                }
                
                const series = study.series.get(seriesKey)!;
                
                // Add file to series
                series.files.push({
                  file,
                  handle: fileHandle,
                  path: filePath,
                  instanceNumber: metadata.instanceNumber
                });
                
                // Add metadata to hierarchy with the imageId
                dispatch(addMetadata({
                  metadata,
                  path: filePath,
                  studyInstanceUID: metadata.studyInstanceUID,
                  seriesInstanceUID: metadata.seriesInstanceUID,
                  imageId // Store the Cornerstone imageId for later use
                }));
              }
            } catch (error) {
              console.error('Error processing file:', error);
            }
          } else if (entry.kind === 'directory') {
            // Recursively scan subdirectories
            await scanDirectory(entry as FileSystemDirectoryHandle, path ? `${path}/${entry.name}` : entry.name);
          }
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      dispatch(scanFailure('Failed to access directory'));
    }
  };

  const handleFileClick = (path: string) => {
    if (selectedFiles.includes(path)) {
      setSelectedFiles(selectedFiles.filter(p => p !== path));
    } else {
      setSelectedFiles([...selectedFiles, path]);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1 }}>
        <Button 
          variant="contained" 
          onClick={handleSelectDirectory}
          disabled={loading}
          fullWidth
        >
          Select DICOM Directory
        </Button>
      </Box>
      
      {loading && (
        <Box sx={{ p: 1 }}>
          <Typography variant="body2">
            Scanning directory... {progress.percentage}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progress.percentage} 
            sx={{ mt: 1 }}
          />
        </Box>
      )}
      
      {!rootDirectory && !loading && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
          >
            Select a directory to view DICOM files.
          </Typography>
        </Box>
      )}
      
      {rootDirectory && !loading && files.length === 0 && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
          >
            No DICOM files found in the selected directory.
          </Typography>
        </Box>
      )}
      
      {files.length > 0 && (
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {files.map((file: DicomFileEntry) => (
            <ListItem 
              key={file.path}
              sx={{ 
                cursor: 'pointer',
                bgcolor: selectedFiles.includes(file.path) ? 'rgba(0, 123, 255, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(0, 123, 255, 0.05)'
                }
              }}
              onClick={() => handleFileClick(file.path)}
            >
              <ListItemIcon>
                <InsertDriveFileIcon />
              </ListItemIcon>
              <ListItemText 
                primary={file.name}
                secondary={file.path}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FileExplorer;