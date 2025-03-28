import React, { useEffect, useRef } from 'react';
import * as cornerstone from '@cornerstonejs/core';

interface Props {
  imageId?: string;
}

const SeriesThumbnail: React.FC<Props> = ({ imageId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const render = async () => {
      if (!imageId || !canvasRef.current) return;

      try {
        const image = await cornerstone.imageLoader.loadImage(imageId);
        const pixelData = image.getPixelData();
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const width = image.width;
        const height = image.height;

        const windowCenter = image.windowCenter ?? 128;
        const windowWidth = image.windowWidth ?? 256;

        const minPixelValue = windowCenter - windowWidth / 2;
        const maxPixelValue = windowCenter + windowWidth / 2;

        const imageData = context.createImageData(width, height);

        for (let i = 0; i < width * height; i++) {
          const value = pixelData[i];

          // Linear VOI LUT
          const normalized = (value - minPixelValue) / (maxPixelValue - minPixelValue);
          const clamped = Math.max(0, Math.min(1, normalized));
          const grayscale = Math.round(clamped * 255);

          const index = i * 4;
          imageData.data[index] = grayscale;
          imageData.data[index + 1] = grayscale;
          imageData.data[index + 2] = grayscale;
          imageData.data[index + 3] = 255;
        }

        canvas.width = width;
        canvas.height = height;
        context.putImageData(imageData, 0, 0);
      } catch (err) {
        console.error('Thumbnail rendering error:', err);
      }
    };

    render();
  }, [imageId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: 40,
        height: 40,
        backgroundColor: '#000',
        objectFit: 'contain',
      }}
    />
  );
};

export default SeriesThumbnail;
