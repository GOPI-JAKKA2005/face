/**
 * /api/students/signature
 * POST: Handles duplicate face verification (?check=1) and sample updates/replacements.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { matchBiometricSignature, invalidateSignatureCache } from '../_lib/match.js';
import { samplesSchema } from '../_lib/validate.js';

export const config = {
  maxDuration: 10
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

  const { check, mode = 'replace', studentId } = req.query;
  const body = req.body || {};

  // Duplicate check mode: ?check=1
  if (check === '1' || check === 'true') {
    try {
      const descriptor = body.descriptor || body.meanDescriptor;
      if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
        return sendError(res, 400, 'bad_request', 'Invalid 128-D descriptor array');
      }

      const match = await matchBiometricSignature({
        descriptor,
        recognitionSettings: {
          threshold: 0.40, // Stricter threshold for duplicate prevention
          minMarginToSecond: 0.01,
          eyeTolerance: 0.50
        }
      });

      if (match.matched && match.student) {
        return sendJson(res, 200, {
          isDuplicate: true,
          match: {
            studentId: match.studentId,
            name: match.student.name,
            rollNo: match.student.rollNo,
            distance: match.distance
          }
        });
      }

      return sendJson(res, 200, {
        isDuplicate: false,
        message: 'No duplicate biometric signatures detected.'
      });
    } catch (err) {
      console.error('Error during duplicate check:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // Update or append samples for existing student
  if (!studentId) {
    return sendError(res, 400, 'bad_request', 'Missing studentId for signature update');
  }

  try {
    const validatedSamples = await samplesSchema.validate(body.samples, { abortEarly: false });
    const { db } = getFirebaseAdmin();
    const sigRef = db.collection('signatures').doc(studentId);
    const studentRef = db.collection('students').doc(studentId);

    await db.runTransaction(async (transaction) => {
      const sigDoc = await transaction.get(sigRef);
      let samples = validatedSamples;

      if (sigDoc.exists && mode === 'append') {
        const existing = sigDoc.data().samples || [];
        samples = [...existing, ...validatedSamples].slice(-12); // Cap at 12 samples
      }

      // Compute new mean descriptor and eye vector
      const meanDesc = new Array(128).fill(0);
      const meanEye = new Array(8).fill(0);

      for (const s of samples) {
        for (let i = 0; i < 128; i++) meanDesc[i] += s.descriptor[i];
        for (let i = 0; i < 8; i++) meanEye[i] += s.eye[i];
      }

      for (let i = 0; i < 128; i++) meanDesc[i] = Math.round((meanDesc[i] / samples.length) * 10000) / 10000;
      for (let i = 0; i < 8; i++) meanEye[i] = Math.round((meanEye[i] / samples.length) * 10000) / 10000;

      const now = new Date();

      transaction.set(sigRef, {
        studentId,
        version: 2,
        samples,
        mean: {
          descriptor: meanDesc,
          eye: meanEye
        },
        updatedAt: now
      }, { merge: true });

      transaction.update(studentRef, {
        signatureCount: samples.length,
        updatedAt: now
      });

      transaction.set(db.collection('settings').doc('system'), {
        cacheVersion: now.getTime()
      }, { merge: true });
    });

    invalidateSignatureCache();

    return sendJson(res, 200, {
      success: true,
      message: 'Signature samples updated successfully.'
    });
  } catch (err) {
    if (err.name === 'ValidationError') return sendError(res, 400, 'validation_error', err.message);
    console.error('Error saving signature samples:', err);
    return sendError(res, 500, 'internal_error', err.message);
  }
}
