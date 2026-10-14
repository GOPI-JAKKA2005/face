/**
 * /api/students
 * GET: Lists students with search, filters, and pagination (Admin only).
 * POST: Enrolls a new student and biometric signature atomically (Admin only).
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { studentSchema, samplesSchema } from '../_lib/validate.js';
import { matchBiometricSignature, invalidateSignatureCache } from '../_lib/match.js';

export const config = {
  maxDuration: 10
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['GET', 'POST'])) return;

  try {
    await verifyAdmin(req);
  } catch (err) {
    return sendError(res, err.status || 401, err.code || 'unauthorized', err.message);
  }

  const { db } = getFirebaseAdmin();

  // GET /api/students
  if (req.method === 'GET') {
    try {
      const { q, active, className, limit = 50 } = req.query;
      const fetchLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

      let query = db.collection('students');

      if (active !== undefined && active !== '') {
        const isActive = active === 'true' || active === true;
        query = query.where('active', '==', isActive);
      }

      if (className) {
        query = query.where('className', '==', className);
      }

      const snap = await query.limit(fetchLimit).get();
      let students = [];

      snap.forEach(doc => {
        students.push({ id: doc.id, ...doc.data() });
      });

      // In-memory fuzzy filter if q is passed
      if (q && q.trim()) {
        const search = q.trim().toLowerCase();
        students = students.filter(s =>
          (s.name && s.name.toLowerCase().includes(search)) ||
          (s.rollNo && s.rollNo.toLowerCase().includes(search)) ||
          (s.mobile && s.mobile.includes(search))
        );
      }

      return sendJson(res, 200, {
        students,
        count: students.length
      });
    } catch (err) {
      console.error('Error fetching students:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // POST /api/students
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // 1. Validate fields with Yup
      const validatedStudent = await studentSchema.validate(body, { abortEarly: false });
      const validatedSamples = await samplesSchema.validate(body.samples, { abortEarly: false });

      const normRoll = validatedStudent.rollNo.toUpperCase();

      // 2. Duplicate Face Check across existing active students (unless forced)
      if (!body.force) {
        // Calculate incoming mean descriptor
        const meanDesc = new Array(128).fill(0);
        for (const s of validatedSamples) {
          for (let i = 0; i < 128; i++) {
            meanDesc[i] += s.descriptor[i];
          }
        }
        for (let i = 0; i < 128; i++) {
          meanDesc[i] /= validatedSamples.length;
        }

        const matchResult = await matchBiometricSignature({
          descriptor: meanDesc,
          recognitionSettings: { threshold: 0.40, minMarginToSecond: 0.01, eyeTolerance: 0.50 }
        });

        if (matchResult.matched && matchResult.student) {
          return sendError(
            res,
            409,
            'duplicate_face',
            `Biometric signature matches existing student ${matchResult.student.name} (Roll: ${matchResult.student.rollNo}) with distance ${matchResult.distance}.`
          );
        }
      }

      // 3. Atomic Transaction for Roll Uniqueness & Document Creation
      const studentRef = db.collection('students').doc();
      const rollRef = db.collection('rollIndex').doc(normRoll);
      const sigRef = db.collection('signatures').doc(studentRef.id);
      const settingsRef = db.collection('settings').doc('system');

      await db.runTransaction(async (transaction) => {
        const rollDoc = await transaction.get(rollRef);
        if (rollDoc.exists) {
          const error = new Error(`Roll number ${normRoll} is already registered.`);
          error.status = 409;
          error.code = 'duplicate_roll';
          throw error;
        }

        // Calculate mean descriptor & mean eye vector
        const meanDesc = new Array(128).fill(0);
        const meanEye = new Array(8).fill(0);

        for (const s of validatedSamples) {
          for (let i = 0; i < 128; i++) meanDesc[i] += s.descriptor[i];
          for (let i = 0; i < 8; i++) meanEye[i] += s.eye[i];
        }

        for (let i = 0; i < 128; i++) meanDesc[i] = Math.round((meanDesc[i] / validatedSamples.length) * 10000) / 10000;
        for (let i = 0; i < 8; i++) meanEye[i] = Math.round((meanEye[i] / validatedSamples.length) * 10000) / 10000;

        const now = new Date();

        // Write student doc
        transaction.set(studentRef, {
          name: validatedStudent.name,
          rollNo: normRoll,
          mobile: validatedStudent.mobile,
          className: validatedStudent.className || '',
          photoUrl: validatedStudent.photoUrl || null,
          timeSlot: validatedStudent.timeSlot || null,
          active: true,
          signatureCount: validatedSamples.length,
          enrolledAt: now,
          createdAt: now,
          updatedAt: now
        });

        // Write roll index doc
        transaction.set(rollRef, {
          studentId: studentRef.id,
          createdAt: now
        });

        // Write biometric signature doc
        transaction.set(sigRef, {
          studentId: studentRef.id,
          version: 2,
          samples: validatedSamples.map(s => ({
            ...s,
            capturedAt: now
          })),
          mean: {
            descriptor: meanDesc,
            eye: meanEye
          },
          updatedAt: now
        });

        // Bump cacheVersion
        transaction.set(settingsRef, {
          cacheVersion: (now.getTime())
        }, { merge: true });
      });

      // Invalidate server in-memory match cache
      invalidateSignatureCache();

      return sendJson(res, 201, {
        success: true,
        studentId: studentRef.id,
        rollNo: normRoll,
        message: 'Student and biometric signature enrolled successfully.'
      });
    } catch (err) {
      if (err.status) {
        return sendError(res, err.status, err.code, err.message);
      }
      if (err.name === 'ValidationError') {
        return sendError(res, 400, 'validation_error', err.message);
      }
      console.error('Error creating student:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
}
