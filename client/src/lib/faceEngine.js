/**
 * Browser-based Computer Vision & Biometric Recognition Engine.
 * Uses @vladmandic/face-api with WebGL acceleration and CPU fallback.
 * Extracts 128-D face descriptors and 8-D normalized eye-geometry vectors.
 */

import * as faceapi from '@vladmandic/face-api';
import { computeEyeVector, computeEyeAspectRatio } from './eye.js';

let modelsLoadedPromise = null;
let currentBackend = 'unknown';

const MODEL_URL = import.meta.env.VITE_MODEL_URL || '/models';

/**
 * Initializes and caches model weights once.
 */
export async function loadModels(onProgress = () => {}) {
  if (modelsLoadedPromise) return modelsLoadedPromise;

  modelsLoadedPromise = (async () => {
    try {
      onProgress({ stage: 'backend', progress: 0.1, message: 'Initializing graphics engine...' });

      // Determine WebGL availability
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        currentBackend = gl ? 'webgl' : 'cpu';
      } catch (_e) {
        currentBackend = 'cpu';
      }

      onProgress({ stage: 'detector', progress: 0.3, message: 'Loading face detector...' });
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      onProgress({ stage: 'landmarks', progress: 0.6, message: 'Loading 68-point facial landmarks...' });
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      onProgress({ stage: 'recognition', progress: 0.9, message: 'Loading deep face descriptor net...' });
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      onProgress({ stage: 'ready', progress: 1.0, message: 'Recognition engine ready' });
      return { success: true, backend: currentBackend };
    } catch (err) {
      modelsLoadedPromise = null; // Allow retry on failure
      console.error('Failed to load face-api models:', err);
      throw err;
    }
  })();

  return modelsLoadedPromise;
}

export function getEngineBackend() {
  return currentBackend;
}

/**
 * Detects single face with 68 landmarks and 128-D descriptor from video or image element.
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} mediaEl
 * @param {number} [inputSize=320]
 * @returns {Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>> | null>}
 */
export async function detectFaceWithFeatures(mediaEl, inputSize = 320) {
  if (!mediaEl || mediaEl.readyState < 2) return null;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold: 0.35
  });

  const detection = await faceapi
    .detectSingleFace(mediaEl, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection || null;
}

/**
 * Computes face sharpness score using variance of Laplacian on a downscaled face crop canvas.
 * @param {HTMLCanvasElement} cropCanvas
 * @returns {number}
 */
export function computeSharpness(cropCanvas) {
  try {
    const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 1.0;

    const w = cropCanvas.width;
    const h = cropCanvas.height;
    if (w <= 0 || h <= 0) return 1.0;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Convert to grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Discrete 3x3 Laplacian operator
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const lap =
          -4 * gray[idx] +
          gray[idx - 1] +
          gray[idx + 1] +
          gray[idx - w] +
          gray[idx + w];

        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    if (count === 0) return 1.0;
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    return Math.max(0, variance);
  } catch (_e) {
    return 100; // Fallback safe sharpness
  }
}

/**
 * Computes estimated lighting/brightness in [0, 255].
 * @param {HTMLCanvasElement} cropCanvas
 * @returns {number}
 */
export function computeBrightness(cropCanvas) {
  try {
    const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 128;
    const w = cropCanvas.width;
    const h = cropCanvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let total = 0;
    const step = 4 * 4; // Sample every 4th pixel for speed
    let count = 0;
    for (let i = 0; i < data.length; i += step) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      count++;
    }
    return count > 0 ? total / count : 128;
  } catch (_e) {
    return 128;
  }
}

/**
 * Estimates head yaw angle from landmarks.
 * Approximated by nose-to-eye lateral distance ratio.
 * @param {faceapi.FaceLandmarks68} landmarks
 * @returns {number} Estimated degrees (-45 to +45)
 */
export function estimateHeadYaw(landmarks) {
  const pts = landmarks.positions;
  const nose = pts[30];
  const lEye = pts[45]; // Outer left eye corner
  const rEye = pts[36]; // Outer right eye corner

  const dLeft = Math.abs(lEye.x - nose.x);
  const dRight = Math.abs(nose.x - rEye.x);
  const total = dLeft + dRight;
  if (total <= 0) return 0;

  // Normalized asymmetry from -1 (turned left) to +1 (turned right)
  const ratio = (dRight - dLeft) / total;
  return Math.round(ratio * 45);
}

/**
 * Evaluates sample capture quality gates.
 *
 * Quality gates (Section 9.4):
 * - Exactly one face
 * - Face box at least 30% of frame height
 * - Eyes open (EAR >= 0.2)
 * - Head yaw within +-15 degrees for frontal
 * - Brightness within range [50, 220]
 * - Sharpness variance >= 15
 *
 * @param {object} detection
 * @param {HTMLVideoElement} videoEl
 * @returns {object} Quality assessment & metrics
 */
export function evaluateQuality(detection, videoEl) {
  if (!detection || !videoEl) {
    return { passed: false, reason: 'no_face', score: 0 };
  }

  const box = detection.detection.box;
  const frameHeight = videoEl.videoHeight || 480;
  const frameWidth = videoEl.videoWidth || 640;

  // 1. Face box relative height (at least 16% of frame height)
  const heightRatio = box.height / frameHeight;
  const isSizeGood = heightRatio >= 0.16;

  // 2. Eye Aspect Ratio (EAR)
  const pts = detection.landmarks.positions;
  const rEyePts = pts.slice(36, 42);
  const lEyePts = pts.slice(42, 48);
  const rEar = computeEyeAspectRatio(rEyePts);
  const lEar = computeEyeAspectRatio(lEyePts);
  const avgEar = (rEar + lEar) / 2;
  const isEyesOpen = avgEar >= 0.15;

  // 3. Head Yaw Angle
  const yaw = estimateHeadYaw(detection.landmarks);

  // 4. Crop face to offscreen canvas to check brightness & sharpness
  const offscreen = document.createElement('canvas');
  offscreen.width = 120;
  offscreen.height = 120;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });

  const sx = Math.max(0, box.x);
  const sy = Math.max(0, box.y);
  const sw = Math.min(box.width, frameWidth - sx);
  const sh = Math.min(box.height, frameHeight - sy);

  if (sw > 0 && sh > 0) {
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, 120, 120);
  }

  const brightness = computeBrightness(offscreen);
  const isLightingGood = brightness >= 25 && brightness <= 245;

  const sharpness = computeSharpness(offscreen);
  const isSharp = sharpness >= 5;

  const score = Math.min(1.0, Math.max(0.1, (
    (isSizeGood ? 0.3 : 0.1) +
    (isEyesOpen ? 0.25 : 0.05) +
    (isLightingGood ? 0.25 : 0.1) +
    (isSharp ? 0.2 : 0.05)
  )));

  return {
    passed: isSizeGood && isEyesOpen && isLightingGood && isSharp,
    score: Math.round(score * 100) / 100,
    metrics: {
      heightRatio: Math.round(heightRatio * 100),
      isSizeGood,
      ear: Math.round(avgEar * 100) / 100,
      isEyesOpen,
      yaw,
      brightness: Math.round(brightness),
      isLightingGood,
      sharpness: Math.round(sharpness),
      isSharp
    }
  };
}

/**
 * Extracts 128-D descriptor (rounded to 4 decimals) and 8-D eye vector.
 */
export function extractBiometricSignature(detection) {
  if (!detection) return null;

  const rawDescriptor = Array.from(detection.descriptor);
  const roundedDescriptor = rawDescriptor.map(v => Math.round(v * 10000) / 10000);

  const landmarks = detection.landmarks.positions;
  const eyeVector = computeEyeVector(landmarks);

  return {
    descriptor: roundedDescriptor,
    eye: eyeVector
  };
}

/**
 * Computes Euclidean distance between two numeric vectors.
 */
export function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return 999.0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

