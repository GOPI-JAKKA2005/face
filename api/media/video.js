/**
 * /api/media/video
 * POST: Stores compressed video (<500 KB) as base64 in media document.
 * GET: Lists metadata or streams base64 video payload.
 * DELETE: Deletes video media record.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';

export const config = {
  maxDuration: 20
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    await verifyAdmin(req);
  } catch (err) {
    return sendError(res, err.status || 401, err.code || 'unauthorized', err.message);
  }

  const { db } = getFirebaseAdmin();

  // GET /api/media/video
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (id) {
        const doc = await db.collection('media').doc(id).get();
        if (!doc.exists) return sendError(res, 404, 'not_found', 'Video not found');
        return sendJson(res, 200, { id: doc.id, ...doc.data() });
      }

      // List metadata only (omit dataBase64 to keep response compact)
      const snap = await db.collection('media').orderBy('createdAt', 'desc').limit(100).get();
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          kind: data.kind,
          title: data.title,
          studentId: data.studentId,
          url: data.url,
          posterBase64: data.posterBase64,
          mime: data.mime,
          sizeBytes: data.sizeBytes,
          durationSec: data.durationSec,
          createdAt: data.createdAt
        });
      });

      return sendJson(res, 200, { media: list });
    } catch (err) {
      console.error('Error fetching media:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // POST /api/media/video
  if (req.method === 'POST') {
    try {
      const { title = 'Short Clip', dataBase64, posterBase64, durationSec = 5, studentId = null, mime = 'video/mp4' } = req.body || {};

      if (!dataBase64) {
        return sendError(res, 400, 'bad_request', 'Missing video dataBase64');
      }

      // Hard constraint: Base64 character length must not exceed 900,000 chars (Firestore 1 MiB boundary)
      if (dataBase64.length > 900000) {
        return sendError(res, 413, 'payload_too_large', 'Base64 video exceeds 900,000 characters ceiling.');
      }

      const cleanBase64 = dataBase64.replace(/^data:video\/\w+;base64,/, '');
      const decodedBytes = Math.floor((cleanBase64.length * 3) / 4);

      if (decodedBytes > 512000) {
        return sendError(res, 413, 'payload_too_large', 'Video decoded size exceeds 500 KB limit.');
      }

      const mediaRef = db.collection('media').doc();
      const docData = {
        kind: 'video',
        title,
        studentId: studentId || null,
        dataBase64,
        posterBase64: posterBase64 || null,
        mime,
        sizeBytes: decodedBytes,
        durationSec,
        createdAt: new Date()
      };

      await mediaRef.set(docData);

      return sendJson(res, 201, {
        id: mediaRef.id,
        sizeBytes: decodedBytes,
        durationSec
      });
    } catch (err) {
      console.error('Error saving video:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // DELETE /api/media/video
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return sendError(res, 400, 'bad_request', 'Missing media id');

      await db.collection('media').doc(id).delete();
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error('Error deleting media:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
}
