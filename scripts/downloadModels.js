/**
 * Model sync script for @vladmandic/face-api.
 * Copies model weight manifests and binaries into public/models/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetDir = path.resolve(__dirname, '../public/models');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const REQUIRED_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin'
];

const LOCAL_PACKAGE_MODEL_DIR = path.resolve(__dirname, '../node_modules/@vladmandic/face-api/model');

async function syncModels() {
  console.log('=== Syncing Face-API Models into public/models ===');

  let copied = 0;
  if (fs.existsSync(LOCAL_PACKAGE_MODEL_DIR)) {
    console.log(`Found local models in ${LOCAL_PACKAGE_MODEL_DIR}. Copying...`);
    for (const file of REQUIRED_FILES) {
      const src = path.join(LOCAL_PACKAGE_MODEL_DIR, file);
      const dest = path.join(targetDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied ${file} (${fs.statSync(dest).size} bytes)`);
        copied++;
      } else {
        console.warn(`⚠️ File not found in local package: ${file}`);
      }
    }
  }

  if (copied === REQUIRED_FILES.length) {
    console.log(`\n✅ Successfully synced all ${copied} face-api model files to public/models/!`);
  } else {
    console.log(`\n⚠️ Synced ${copied} of ${REQUIRED_FILES.length} files.`);
  }
}

syncModels().catch(err => {
  console.error('Model sync error:', err);
  process.exit(1);
});
