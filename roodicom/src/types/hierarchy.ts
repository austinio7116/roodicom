import { DicomMetadata } from './dicom';

// Sequence represents a single DICOM image
export interface Sequence {
  id: string;
  instanceNumber: number;
  metadata: DicomMetadata;
  imageId?: string; // Will be populated when loaded
}

// Series represents a collection of sequences (e.g., T1, T2, FLAIR)
export interface Series {
  id: string;
  description: string;
  modality: string;
  sequences: Record<string, Sequence>;
}

// Visit represents a patient visit/study with multiple series
export interface Visit {
  id: string;
  date: string;
  series: Record<string, Series>;
}

// Subject represents a patient with multiple visits
export interface Subject {
  id: string;
  name: string;
  visits: Record<string, Visit>;
}

// The complete DICOM hierarchy
export interface DicomHierarchy {
  subjects: Record<string, Subject>;
}