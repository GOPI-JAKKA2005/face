/**
 * Client-side image compressor with strict 500 KB ceiling guarantee.
 * Strips EXIF metadata, respects orientation, and executes iterative reduction loop.
 */

import imageCompression from 'browser-image-compression';

export const MAX_MEDIA_BYTES = 512000; // 500 KB ceiling

/**
 * Compresses an image file under 500 KB.
 * @param {File|Blob} imageFile
 * @param {object} [options]
 * @param {boolean} [options.squareCrop=false]
 * @returns {Promise<{blob: Blob, dataUrl: string, width: number, height: number, originalBytes: number, finalBytes: number, ratio: number}>}
 */
export async function compressImageUnderCeiling(imageFile, { squareCrop = false } = {}) {
  const originalBytes = imageFile.size;

  let maxWidthOrHeight = 1280;
  let initialQuality = 0.85;
  let currentFile = imageFile;

  // If square crop requested (e.g. for profile photo at 400x400)
  if (squareCrop) {
    currentFile = await cropImageToSquare(imageFile, 400);
    maxWidthOrHeight = 400;
  }

  let compressedBlob = null;
  let attempts = 0;
  const maxAttempts = 6;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const options = {
        maxSizeMB: 0.48, // 491 KB
        maxWidthOrHeight,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality,
        alwaysKeepResolution: false
      };

      compressedBlob = await imageCompression(currentFile, options);

      if (compressedBlob.size <= MAX_MEDIA_BYTES) {
        break;
      }

      // Step down resolution and quality
      maxWidthOrHeight = Math.max(480, Math.floor(maxWidthOrHeight * 0.85));
      initialQuality = Math.max(0.40, initialQuality - 0.08);

      if (maxWidthOrHeight <= 480 && initialQuality <= 0.40 && compressedBlob.size > MAX_MEDIA_BYTES) {
        const error = new Error('Image exceeds 500 KB ceiling after maximum compression.');
        error.code = 'COMPRESSION_FAILED';
        throw error;
      }
    } catch (err) {
      if (err.code === 'COMPRESSION_FAILED') throw err;
      if (attempts >= maxAttempts) {
        const error = new Error('Failed to compress image within 500 KB.');
        error.code = 'COMPRESSION_FAILED';
        throw error;
      }
    }
  }

  if (!compressedBlob || compressedBlob.size > MAX_MEDIA_BYTES) {
    const error = new Error('Image could not be compressed under the 500 KB limit.');
    error.code = 'COMPRESSION_FAILED';
    throw error;
  }

  const dataUrl = await imageCompression.getDataUrlFromFile(compressedBlob);
  const { width, height } = await getImageDimensions(dataUrl);

  return {
    blob: compressedBlob,
    dataUrl,
    width,
    height,
    originalBytes,
    finalBytes: compressedBlob.size,
    ratio: Math.round((compressedBlob.size / originalBytes) * 100) / 100
  };
}

/**
 * Reads natural image dimensions from data URL.
 */
function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 400, height: 400 });
    img.src = dataUrl;
  });
}

/**
 * Center crops image to a square.
 */
function cropImageToSquare(file, targetSize = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas square crop failed'));
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}
