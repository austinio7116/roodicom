import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import * as dicomParser from 'dicom-parser';
// Import the constants from the new file
import { dicomGroupNames, dicomTagNames } from '../common/dicomConstants';

// Define the props for the component
interface DicomMetadataViewerProps {
  open: boolean;
  onClose: () => void;
  imageId: string | null;
}

// Define the structure for DICOM metadata
interface DicomTag {
  tag: string;
  name: string;
  vr: string;
  value: string;
}

// Group metadata by DICOM group
interface DicomGroup {
  groupNumber: string;
  groupName: string;
  tags: DicomTag[];
}



const DicomMetadataViewer: React.FC<DicomMetadataViewerProps> = ({ open, onClose, imageId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metadataGroups, setMetadataGroups] = useState<DicomGroup[]>([]);

  useEffect(() => {
    console.log('DicomMetadataViewer useEffect triggered:', { open, imageId });
    if (open && imageId) {
      loadDicomMetadata(imageId);
    } else if (open && !imageId) {
      console.warn('DicomMetadataViewer opened but no imageId provided');
      setLoading(false);
      setError('No image selected or image ID not available');
    }
  }, [open, imageId]);

  // Function to process a DICOM dataset and extract metadata
  const processDataset = (dataSet: any) => {
    // Extract metadata and group by DICOM group
    const groups: Record<string, DicomGroup> = {};
    
    // Process all elements in the dataset
    for (const tag in dataSet.elements) {
      // Skip the pixel data tag as it's large and not useful to display
      if (tag === 'x7fe00010') continue;
      
      const element = dataSet.elements[tag];
      
      // Get the group number (first 4 characters of the tag)
      const groupNumber = tag.substring(1, 5);
      
      // Get or create the group
      if (!groups[groupNumber]) {
        groups[groupNumber] = {
          groupNumber,
          groupName: dicomGroupNames[groupNumber] || `Group ${groupNumber}`,
          tags: []
        };
      }
      
      // Get the tag name
      const tagName = dicomTagNames[tag.substring(1)] || `Unknown Tag (${tag})`;
      
      // Get the tag value
      let value = '';
      if (element.vr === 'SQ') {
        value = 'Sequence';
      } else if (element.length > 100) {
        value = `[Binary data, length: ${element.length} bytes]`;
      } else {
        try {
          value = dataSet.string(tag) || '';
          
          // Format special values
          if (tag === 'x00200032' || tag === 'x00200037' || tag === 'x00280030') {
            // Format position, orientation, and spacing as arrays
            value = value.split('\\').join(', ');
          }
        } catch (e) {
          value = `[Error reading value: ${e}]`;
        }
      }
      
      // Add the tag to the group
      groups[groupNumber].tags.push({
        tag,
        name: tagName,
        vr: element.vr || 'Unknown',
        value
      });
    }
    
    // Convert the groups object to an array and sort by group number
    const groupsArray = Object.values(groups).sort((a, b) => 
      a.groupNumber.localeCompare(b.groupNumber)
    );
    
    setMetadataGroups(groupsArray);
    setLoading(false);
  };

  const loadDicomMetadata = async (imageId: string) => {
    console.log('loadDicomMetadata function called with imageId:', imageId);
    setLoading(true);
    setError(null);

    try {
      console.log('Loading DICOM metadata for imageId:', imageId);
      
      // Extract the file ID from the imageId (format could be dicomfile://123 or dicomfile:123)
      let fileId;
      if (imageId.startsWith('dicomfile://')) {
        fileId = imageId.replace('dicomfile://', '');
      } else if (imageId.startsWith('dicomfile:')) {
        fileId = imageId.replace('dicomfile:', '');
      } else {
        console.warn('Unexpected imageId format:', imageId);
        throw new Error(`Unexpected imageId format: ${imageId}. Expected format: dicomfile://id or dicomfile:id`);
      }
      console.log('Extracted fileId:', fileId);
      
      // Get the file from the Cornerstone file manager
      const fileManager = (window as any).cornerstoneFileManager;
      console.log('File manager available:', !!fileManager);
      console.log('File manager type:', fileManager ? typeof fileManager : 'undefined');
      
      if (!fileManager) {
        throw new Error('Cornerstone file manager not available. Make sure Cornerstone is properly initialized.');
      }
      
      // Log available files in the file manager
      const fileKeys = fileManager.files ? Object.keys(fileManager.files) : [];
      console.log('Files in file manager:', fileKeys);
      console.log('Looking for file with ID:', fileId);
      
      // Try to get the file
      const file = fileManager.get ? fileManager.get(fileId) : null;
      console.log('File found via get method:', !!file);
      
      if (!file) {
        console.log('File not found via get method, trying alternative methods...');
        // Try alternative methods to get the file
        const alternativeFile = fileManager.files ? fileManager.files[fileId] : null;
        console.log('Alternative file found via files object:', !!alternativeFile);
        
        if (alternativeFile) {
          console.log('Using alternative file access method');
          // Use the alternative file
          try {
            const arrayBuffer = await alternativeFile.arrayBuffer();
            console.log('Got array buffer from alternative file, length:', arrayBuffer.byteLength);
            
            // Parse the DICOM file
            const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
            console.log('Parsed DICOM dataset, elements:', Object.keys(dataSet.elements).length);
            
            // Process the dataset and set the metadata groups
            processDataset(dataSet);
            return;
          } catch (bufferError) {
            console.error('Error processing alternative file:', bufferError);
            const errorMessage = bufferError instanceof Error
              ? bufferError.message
              : 'Unknown error processing file';
            throw new Error(`Error processing file: ${errorMessage}`);
          }
        }
        
        // If we have files but not the one we're looking for, log the available IDs
        if (fileKeys.length > 0) {
          console.log('Available file IDs:', fileKeys);
          throw new Error(`File not found for ID: ${fileId}. Available IDs: ${fileKeys.join(', ')}`);
        } else {
          throw new Error(`File not found for ID: ${fileId}. No files available in file manager.`);
        }
      }
      
      // Read the file as an ArrayBuffer
      console.log('Reading file as ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('Got array buffer from file, length:', arrayBuffer.byteLength);
      
      // Parse the DICOM file
      console.log('Parsing DICOM data...');
      const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
      console.log('Parsed DICOM dataset, elements:', Object.keys(dataSet.elements).length);
      
      // Process the dataset and set the metadata groups
      console.log('Processing dataset...');
      processDataset(dataSet);
      console.log('Dataset processed successfully');
    } catch (error) {
      console.error('Error loading DICOM metadata:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="dicom-metadata-dialog-title"
    >
      <DialogTitle id="dicom-metadata-dialog-title">
        DICOM Metadata
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" variant="body1">
            Error: {error}
          </Typography>
        ) : (
          <Box>
            {metadataGroups.map((group) => (
              <Accordion key={group.groupNumber} defaultExpanded={group.groupNumber === '0010'}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`group-${group.groupNumber}-content`}
                  id={`group-${group.groupNumber}-header`}
                >
                  <Typography variant="subtitle1">
                    {group.groupName} (Group {group.groupNumber})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tag</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>VR</TableCell>
                          <TableCell>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.tags.map((tag) => (
                          <TableRow key={tag.tag}>
                            <TableCell>{tag.tag}</TableCell>
                            <TableCell>{tag.name}</TableCell>
                            <TableCell>{tag.vr}</TableCell>
                            <TableCell>{tag.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DicomMetadataViewer;