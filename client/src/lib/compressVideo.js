/**
 * Client-side video compressor using lazy-loaded ffmpeg.wasm.
 * Guarantees output is <= 500 KB (512,000 bytes) with max 8s duration and poster frame.
 */

export const MAX_VIDEO_BYTES = 512000;

let ffmpegInstance = null;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

/**
 * Compresses video file under 500 KB using WebAssembly FFmpeg.
 * @param {File|Blob} videoFile
 * @param {object} [options]
 * @param {function} [options.onProgress]
 * @returns {Promise<{blob: Blob, base64: string, posterBase64: string, durationSec: number, originalBytes: number, finalBytes: number}>}
 */
export async function compressVideoUnderCeiling(videoFile, { onProgress = () => {} } = {}) {
  const originalBytes = videoFile.size;
  if (originalBytes > 50 * 1024 * 1024) {
    throw new Error('Video exceeds maximum allowed input size (50 MB).');
  }

  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.min(100, Math.round(progress * 100)));
  });

  // Write source video to virtual FS
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  // Determine video duration using temporary HTML5 video
  const durationSec = await getVideoDuration(videoFile);
  const effectiveDuration = Math.min(8, durationSec || 5);

  // Target 450,000 bytes to account for MP4 container overhead
  const targetBytes = 450000;
  let videoBitrate = Math.max(120000, Math.floor((targetBytes * 8) / effectiveDuration));

  let finalBlob = null;
  let targetHeight = 360;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const scaleFilter = `scale=-2:${targetHeight}`;
    await ffmpeg.exec([
      '-i', inputName,
      '-t', String(effectiveDuration),
      '-vf', scaleFilter,
      '-r', '15',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', String(videoBitrate),
      '-maxrate', String(Math.floor(videoBitrate * 1.2)),
      '-bufsize', String(videoBitrate * 2),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-an',
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    if (blob.size <= MAX_VIDEO_BYTES) {
      finalBlob = blob;
      break;
    }

    // Step down for next retry
    videoBitrate = Math.floor(videoBitrate * 0.75);
    targetHeight = attempt === 1 ? 288 : 240;
  }

  if (!finalBlob || finalBlob.size > MAX_VIDEO_BYTES) {
    throw new Error('This clip is too complex to fit in 500 KB. Try a shorter or simpler clip.');
  }

  // Generate poster frame from first frame
  await ffmpeg.exec([
    '-i', outputName,
    '-ss', '00:00:00.100',
    '-vframes', '1',
    '-vf', 'scale=-2:240',
    'poster.jpg'
  ]);

  const posterData = await ffmpeg.readFile('poster.jpg');
  const posterBlob = new Blob([posterData.buffer], { type: 'image/jpeg' });
  const posterBase64 = await blobToBase64(posterBlob);
  const videoBase64 = await blobToBase64(finalBlob);

  return {
    blob: finalBlob,
    base64: videoBase64,
    posterBase64,
    durationSec: effectiveDuration,
    originalBytes,
    finalBytes: finalBlob.size
  };
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration || 5);
    };
    video.onerror = () => resolve(5);
    video.src = URL.createObjectURL(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
