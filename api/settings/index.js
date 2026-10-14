/**
 * /api/settings
 * GET: Returns public-safe configuration, or full configuration if admin token is passed.
 * PUT: Validates and updates system or theme settings (Admin only).
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { sessionSettingsSchema, recognitionSettingsSchema } from '../_lib/validate.js';
import { invalidateSignatureCache } from '../_lib/match.js';

export const config = {
  maxDuration: 10
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['GET', 'PUT'])) return;

  const { db } = getFirebaseAdmin();
  const settingsDocRef = db.collection('settings').doc('system');

  if (req.method === 'GET') {
    try {
      const doc = await settingsDocRef.get();
      const current = doc.exists ? doc.data() : {};

      // Check if admin is requesting
      let isAdmin = false;
      try {
        await verifyAdmin(req);
        isAdmin = true;
      } catch (_e) {
        isAdmin = false;
      }

      if (isAdmin) {
        return sendJson(res, 200, current);
      }

      // Return public-safe subset
      const publicSafe = {
        timezone: current.timezone || 'Asia/Kolkata',
        kioskMessage: current.kioskMessage || 'Please look at the camera',
        recognition: {
          requireLiveness: current.recognition?.requireLiveness ?? true,
          requiredConsecutiveFrames: current.recognition?.requiredConsecutiveFrames ?? 3
        },
        sessions: {
          morning: { enabled: current.sessions?.morning?.enabled ?? true, start: current.sessions?.morning?.start || '09:00' },
          afternoon: { enabled: current.sessions?.afternoon?.enabled ?? true, start: current.sessions?.afternoon?.start || '14:00' }
        }
      };

      return sendJson(res, 200, publicSafe);
    } catch (err) {
      console.error('Error fetching settings:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  if (req.method === 'PUT') {
    try {
      await verifyAdmin(req);

      const scope = req.query.scope;

      if (scope === 'theme') {
        const themePayload = req.body?.theme || req.body;
        await db.collection('settings').doc('theme').set({
          ...themePayload,
          updatedAt: new Date()
        }, { merge: true });
        return sendJson(res, 200, { success: true, theme: themePayload });
      }

      const body = req.body || {};

      // If updating sessions or recognition, validate with respective schemas
      if (body.sessions) {
        await sessionSettingsSchema.validate(body, { abortEarly: false });
      }
      if (body.recognition) {
        await recognitionSettingsSchema.validate(body.recognition, { abortEarly: false });
      }

      // Read current settings to increment cacheVersion
      const currentSnap = await settingsDocRef.get();
      const currentVersion = currentSnap.exists ? (currentSnap.data().cacheVersion || 1) : 1;
      const nextVersion = currentVersion + 1;

      const updated = {
        ...body,
        cacheVersion: nextVersion,
        updatedAt: new Date()
      };

      await settingsDocRef.set(updated, { merge: true });

      // Invalidate in-memory server signature cache
      invalidateSignatureCache();

      const finalSnap = await settingsDocRef.get();
      return sendJson(res, 200, {
        success: true,
        settings: finalSnap.data()
      });
    } catch (err) {
      if (err.status) {
        return sendError(res, err.status, err.code, err.message);
      }
      if (err.name === 'ValidationError') {
        return sendError(res, 400, 'validation_error', err.message);
      }
      console.error('Error saving settings:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
}
