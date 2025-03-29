import React, { useState, useEffect, useMemo } from 'react'; // Import useMemo
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
  CircularProgress,
  TextField // Import TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search'; // Optional: for input adornment
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
  const [searchTerm, setSearchTerm] = useState<string>(''); // State for search input

  // Reset search term when dialog opens or imageId changes
  useEffect(() => {
    if (open) {
      setSearchTerm(''); // Clear search on open/reload
      if (imageId) {
        loadDicomMetadata(imageId);
      } else {
        console.warn('DicomMetadataViewer opened but no imageId provided');
        setLoading(false);
        setError('No image selected or image ID not available');
        setMetadataGroups([]); // Clear previous data
      }
    } else {
        // Optionally clear data when closing to free memory if needed
        // setMetadataGroups([]);
        // setLoading(true);
        // setError(null);
    }
  }, [open, imageId]); // Rerun effect when open or imageId changes


  // Function to handle search input changes
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Function to process a DICOM dataset and extract metadata (Unchanged)
  const processDataset = (dataSet: any) => {
    const groups: Record<string, DicomGroup> = {};
    for (const tag in dataSet.elements) {
      if (tag === 'x7fe00010') continue;
      const element = dataSet.elements[tag];
      const groupNumber = tag.substring(1, 5);
      if (!groups[groupNumber]) {
        groups[groupNumber] = {
          groupNumber,
          groupName: dicomGroupNames[groupNumber] || `Group ${groupNumber}`,
          tags: []
        };
      }
      const tagName = dicomTagNames[tag.substring(1)] || `Unknown Tag (${tag})`;
      let value = '';
      if (element.vr === 'SQ') {
        value = 'Sequence (See Raw Data)'; // Modified for clarity
      } else if (element.length > 256) { // Increased threshold slightly
         value = `[Binary data or Long Text, length: ${element.length} bytes]`;
      } else {
        try {
          value = dataSet.string(tag) || '';
          if (tag === 'x00200032' || tag === 'x00200037' || tag === 'x00280030') {
            value = value.split('\\').join(', ');
          }
        } catch (e) {
          value = `[Error reading value: ${e instanceof Error ? e.message : String(e)}]`;
        }
      }
      groups[groupNumber].tags.push({
        tag,
        name: tagName,
        vr: element.vr || '??', // Use '??' for unknown VR
        value
      });
    }
    const groupsArray = Object.values(groups).sort((a, b) =>
      a.groupNumber.localeCompare(b.groupNumber)
    );
    setMetadataGroups(groupsArray);
    setLoading(false);
  };


  // Function to load DICOM metadata (Unchanged, but added clear state on failure)
  const loadDicomMetadata = async (imageId: string) => {
    console.log('loadDicomMetadata function called with imageId:', imageId);
    setLoading(true);
    setError(null);
    setMetadataGroups([]); // Clear previous data before loading

    try {
      console.log('Loading DICOM metadata for imageId:', imageId);
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

      const fileManager = (window as any).cornerstoneFileManager;
      if (!fileManager) {
        throw new Error('Cornerstone file manager not available.');
      }

      const file = fileManager.get ? fileManager.get(fileId) : null;
      if (!file && fileManager.files && fileManager.files[fileId]) {
           console.log('Using alternative file access method');
           const alternativeFile = fileManager.files[fileId];
           const arrayBuffer = await alternativeFile.arrayBuffer();
           const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
           processDataset(dataSet);
           return; // Exit early after processing alternative file
       } else if (!file) {
            const fileKeys = fileManager.files ? Object.keys(fileManager.files) : [];
            const availableIds = fileKeys.length > 0 ? `Available IDs: ${fileKeys.join(', ')}` : 'No files available in file manager.';
            throw new Error(`File not found for ID: ${fileId}. ${availableIds}`);
       }

      console.log('Reading file as ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('Parsing DICOM data...');
      const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
      console.log('Processing dataset...');
      processDataset(dataSet);
      console.log('Dataset processed successfully');
    } catch (error) {
      console.error('Error loading DICOM metadata:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
      setMetadataGroups([]); // Ensure data is cleared on error
    }
  };

  // Memoized filtered metadata groups based on search term
  const filteredMetadataGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return metadataGroups; // No search term, return all original groups
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // 1. Filter tags within each group
    // 2. Filter out groups that have no matching tags left
    return metadataGroups
      .map(group => {
        const filteredTags = group.tags.filter(tag =>
          tag.tag.toLowerCase().includes(lowerCaseSearchTerm) ||
          tag.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          tag.vr.toLowerCase().includes(lowerCaseSearchTerm) ||
          (typeof tag.value === 'string' && tag.value.toLowerCase().includes(lowerCaseSearchTerm)) // Check value is string
        );

        // Return a new group object with potentially filtered tags
        return {
          ...group,
          tags: filteredTags
        };
      })
      // Keep only groups that still have tags after filtering
      .filter(group => group.tags.length > 0);

  }, [metadataGroups, searchTerm]); // Recalculate when data or search term changes

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="dicom-metadata-dialog-title"
      sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }} // Ensure dialog doesn't exceed viewport height
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
        {/* Search Box */}
        <Box sx={{ mb: 2, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, pt: 1 }}>
           {/* Add pt to prevent overlap with divider */}
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search metadata (Tag, Name, VR, Value)..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <SearchIcon color="action" sx={{ mr: 1 }} />
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" variant="body1" sx={{ p: 2 }}>
            Error loading metadata: {error}
          </Typography>
        ) : filteredMetadataGroups.length === 0 && searchTerm ? (
            <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                No metadata found matching "{searchTerm}".
            </Typography>
        ) : filteredMetadataGroups.length === 0 && !searchTerm ? (
             <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                 No metadata loaded or available.
             </Typography>
        ) : (
          <Box>
            {/* Render using filtered groups */}
            {filteredMetadataGroups.map((group) => (
              // Conditionally expand based on search term or default to Patient Info
              <Accordion
                  key={group.groupNumber}
                  // Expand if searching, otherwise default expand patient info
                  defaultExpanded={!searchTerm && group.groupNumber === '0010'}
                  // Use TransitionProps to disable animation for smoother filtering experience
                  TransitionProps={{ unmountOnExit: true }} // Unmount when closed
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`group-${group.groupNumber}-content`}
                  id={`group-${group.groupNumber}-header`}
                >
                  <Typography variant="subtitle1">
                    {group.groupName} (Group {group.groupNumber})
                    {/* Optionally show tag count */}
                    <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                        ({group.tags.length} {group.tags.length === 1 ? 'tag' : 'tags'})
                    </Typography>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}> {/* Remove padding for full-width table */}
                  <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}> {/* Remove border */}
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                           <TableCell sx={{ width: '15%' }}>Tag</TableCell>
                           <TableCell sx={{ width: '35%' }}>Name</TableCell>
                           <TableCell sx={{ width: '10%' }}>VR</TableCell>
                           <TableCell sx={{ width: '40%' }}>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.tags.map((tag) => (
                          <TableRow key={tag.tag} hover>
                             <TableCell sx={{ fontFamily: 'monospace' }}>{tag.tag}</TableCell>
                             <TableCell>{tag.name}</TableCell>
                             <TableCell sx={{ fontFamily: 'monospace' }}>{tag.vr}</TableCell>
                             <TableCell sx={{ wordBreak: 'break-word' }}>{tag.value}</TableCell>
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