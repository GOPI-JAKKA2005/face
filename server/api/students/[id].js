/**
 * /api/students/[id]
 * GET: Get single student profile.
 * PUT: Update details (uniqueness checked, optional past records cascade).
 * DELETE: Deletes student, signatures, rollIndex; anonymizes or deletes attendance.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { invalidateSignatureCache } from '../_lib/match.js';

export const config = {
  maxDuration: 10
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['GET', 'PUT', 'DELETE'])) return;

  try {
    await verifyAdmin(req);
  } catch (err) {
    return sendError(res, err.status || 401, err.code || 'unauthorized', err.message);
  }

  const { id } = req.query;
  if (!id) {
    return sendError(res, 400, 'bad_request', 'Missing student ID');
  }

  const { db } = getFirebaseAdmin();
  const studentRef = db.collection('students').doc(id);

  // GET /api/students/[id]
  if (req.method === 'GET') {
    try {
      const snap = await studentRef.get();
      if (!snap.exists) {
        return sendError(res, 404, 'not_found', 'Student not found');
      }

      const sigSnap = await db.collection('signatures').doc(id).get();
      const studentData = { id: snap.id, ...snap.data() };

      return sendJson(res, 200, {
        student: studentData,
        hasSignature: sigSnap.exists,
        signatureSamples: sigSnap.exists ? (sigSnap.data().samples?.length || 0) : 0
      });
    } catch (err) {
      console.error('Error fetching student:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // PUT /api/students/[id]
  if (req.method === 'PUT') {
    try {
      const body = req.body || {};
      const { name, rollNo, mobile, className, photoUrl, active, updatePastRecords } = body;

      const normRoll = rollNo ? rollNo.trim().toUpperCase() : null;

      await db.runTransaction(async (transaction) => {
        const studentDoc = await transaction.get(studentRef);
        if (!studentDoc.exists) {
          const err = new Error('Student not found');
          err.status = 404;
          err.code = 'not_found';
          throw err;
        }

        const oldData = studentDoc.data();
        const oldRoll = oldData.rollNo;

        // If roll number changed, verify new roll uniqueness & update rollIndex
        if (normRoll && normRoll !== oldRoll) {
          const newRollRef = db.collection('rollIndex').doc(normRoll);
          const newRollDoc = await transaction.get(newRollRef);
          if (newRollDoc.exists) {
            const err = new Error(`Roll number ${normRoll} is already in use by another student.`);
            err.status = 409;
            err.code = 'duplicate_roll';
            throw err;
          }

          // Delete old rollIndex and set new
          const oldRollRef = db.collection('rollIndex').doc(oldRoll);
          transaction.delete(oldRollRef);
          transaction.set(newRollRef, { studentId: id, updatedAt: new Date() });
        }

        const updates = {
          updatedAt: new Date()
        };

        if (name !== undefined) updates.name = name.trim();
        if (normRoll !== undefined) updates.rollNo = normRoll;
        if (mobile !== undefined) updates.mobile = mobile.replace(/\s+/g, '');
        if (className !== undefined) updates.className = className.trim();
        if (photoUrl !== undefined) updates.photoUrl = photoUrl;
        if (active !== undefined) updates.active = Boolean(active);
        if (body.timeSlot !== undefined) updates.timeSlot = body.timeSlot;

        transaction.update(studentRef, updates);
      });

      // Optional cascade to past attendance records
      if (updatePastRecords) {
        const batch = db.batch();
        const pastMarks = await db.collection('attendance').where('studentId', '==', id).get();
        pastMarks.forEach(doc => {
          batch.update(doc.ref, {
            name: name ? name.trim() : undefined,
            rollNo: normRoll || undefined
          });
        });
        await batch.commit();
      }

      invalidateSignatureCache();

      const finalSnap = await studentRef.get();
      return sendJson(res, 200, {
        success: true,
        student: { id: finalSnap.id, ...finalSnap.data() }
      });
    } catch (err) {
      if (err.status) return sendError(res, err.status, err.code, err.message);
      console.error('Error updating student:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // DELETE /api/students/[id]
  if (req.method === 'DELETE') {
    try {
      const deleteHistory = req.query.deleteHistory === 'true';

      const snap = await studentRef.get();
      if (!snap.exists) {
        return sendError(res, 404, 'not_found', 'Student not found');
      }

      const rollNo = snap.data().rollNo;

      // 1. Delete student & signature & rollIndex
      const batch = db.batch();
      batch.delete(studentRef);
      batch.delete(db.collection('signatures').doc(id));
      if (rollNo) {
        batch.delete(db.collection('rollIndex').doc(rollNo));
      }

      // 2. Attendance handling: either delete or anonymize
      const attendanceSnap = await db.collection('attendance').where('studentId', '==', id).get();
      attendanceSnap.forEach(doc => {
        if (deleteHistory) {
          batch.delete(doc.ref);
        } else {
          batch.update(doc.ref, {
            name: 'Deleted student',
            anonymized: true
          });
        }
      });

      // 3. Delete linked media documents
      const mediaSnap = await db.collection('media').where('studentId', '==', id).get();
      mediaSnap.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      invalidateSignatureCache();

      return sendJson(res, 200, {
        success: true,
        message: 'Student deleted successfully.'
      });
    } catch (err) {
      console.error('Error deleting student:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
}
