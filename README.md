# ROODICOM - React DICOM Viewer

A modern, web-based DICOM viewer built with React and Cornerstone3D.

## Features

- **Folder Scanning**: Scan and recursively index local folders for DICOM files
- **Hierarchical Navigation**: Browse through Subjects → Visits → Series → Sequences
- **Multi-planar Viewing**: View axial, coronal, and sagittal planes
- **Advanced Tools**: Window/level adjustment, zoom, pan, rotate, and measurement tools
- **Customizable Layout**: Multiple viewport configurations for side-by-side comparison
- **Performance Optimized**: Efficient handling of large DICOM datasets

## Technology Stack

- **React 18+** with TypeScript
- **Redux Toolkit** for state management
- **React Query** for async data handling
- **Material UI** for responsive UI components
- **Cornerstone3D** for medical image rendering
- **dicom-parser** for DICOM file parsing
- **dcmjs** for advanced DICOM manipulation

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/roodicom.git
   cd roodicom
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Click on "Select DICOM Directory" in the Files tab to choose a folder containing DICOM files
2. Browse through the hierarchical structure in the Hierarchy tab
3. Click on a sequence to load it into the active viewport
4. Use the toolbar to adjust window/level, zoom, pan, or make measurements
5. Change the layout to compare multiple images side by side

## Project Structure

```
/src
  /api                  # API and file system interactions
  /components           # React components
    /common             # Reusable UI components
    /layout             # Layout components
    /navigation         # Navigation components
    /viewer             # Viewer components
    /tools              # Interaction tools
  /hooks                # Custom React hooks
  /store                # Redux store
    /slices             # Redux slices
    /selectors          # Redux selectors
  /types                # TypeScript type definitions
  /utils                # Utility functions
  /services             # Application services
  /constants            # Application constants
  /assets               # Static assets
  /styles               # Global styles
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Cornerstone3D](https://github.com/cornerstonejs/cornerstone3D) for the medical imaging rendering library
- [dicom-parser](https://github.com/cornerstonejs/dicomParser) for DICOM parsing
- [dcmjs](https://github.com/dcmjs-org/dcmjs) for DICOM manipulation