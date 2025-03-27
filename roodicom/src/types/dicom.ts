// DICOM file metadata
export interface DicomMetadata {
  patientId: string;
  patientName: string;
  studyDate: string;
  studyTime: string;
  modality: string;
  seriesDescription: string;
  instanceNumber: number;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  // Add more metadata fields as needed
}

// File system entry for DICOM files
export interface DicomFileEntry {
  name: string;
  path: string;
  handle: FileSystemFileHandle;
}

// Image data for rendering
export interface ImageData {
  imageId: string;
  metadata: DicomMetadata;
  loaded: boolean;
  loading: boolean;
  error?: string;
}