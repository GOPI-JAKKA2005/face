/**
 * /api/media/upload-image
 * Proxies compressed client images to ImgBB and records metadata in Firestore.
 * Strictly verifies the 500 KB (512,000 bytes) payload ceiling.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { getServerEnv } from '../_lib/env.js';

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['POST'])) return;

  try {
    await verifyAdmin(req);
  } catch (err) {
    return sendError(res, err.status || 401, err.code || 'unauthorized', err.message);
  }

  const { title = 'Profile Image', dataBase64, studentId = null } = req.body || {};

  if (!dataBase64) {
    return sendError(res, 400, 'bad_request', 'Missing image base64 data');
  }

  // Calculate decoded byte length from base64
  const cleanBase64 = dataBase64.replace(/^data:image\/\w+;base64,/, '');
  const decodedBytes = Math.floor((cleanBase64.length * 3) / 4);

  // Hard Constraint: 500 KB Ceiling (512,000 bytes)
  if (decodedBytes > 512000) {
    return sendError(res, 413, 'payload_too_large', 'Image exceeds server 500 KB (512,000 bytes) ceiling.');
  }

  const env = getServerEnv();
  const apiKey = env.IMGBB_API_KEY;

  if (!apiKey) {
    // Fallback: If no ImgBB key provided, store dataUrl directly for local development
    const { db } = getFirebaseAdmin();
    const mediaRef = db.collection('media').doc();
    const docData = {
      kind: 'image',
      title,
      studentId: studentId || null,
      url: dataBase64,
      mime: 'image/jpeg',
      sizeBytes: decodedBytes,
      createdAt: new Date()
    };
    await mediaRef.set(docData);
    return sendJson(res, 201, { id: mediaRef.id, url: dataBase64, sizeBytes: decodedBytes });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', cleanBase64);
    formData.append('name', title.replace(/[^a-zA-Z0-9_-]/g, '_'));

    const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    if (!imgbbRes.ok) {
      throw new Error(`ImgBB API responded with HTTP ${imgbbRes.status}`);
    }

    const data = await imgbbRes.json();
    const remoteUrl = data.data?.url || data.data?.display_url;

    const { db } = getFirebaseAdmin();
    const mediaRef = db.collection('media').doc();
    await mediaRef.set({
      kind: 'image',
      title,
      studentId: studentId || null,
      url: remoteUrl,
      mime: 'image/jpeg',
      sizeBytes: decodedBytes,
      createdAt: new Date()
    });

    return sendJson(res, 201, {
      id: mediaRef.id,
      url: remoteUrl,
      sizeBytes: decodedBytes
    });
  } catch (err) {
    console.error('ImgBB upload error:', err.message);
    return sendError(res, 502, 'upload_failed', `Failed to upload image to ImgBB: ${err.message}`);
  }
}
