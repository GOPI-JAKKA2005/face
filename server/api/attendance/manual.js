/**
 * /api/attendance/manual
 * Admin endpoint for manual attendance overrides, audit logs, and absentee batch closure.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { manualMarkSchema } from '../_lib/validate.js';

export const config = {
  maxDuration: 10
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['POST'])) return;

  let decodedAdmin;
  try {
    decodedAdmin = await verifyAdmin(req);
  } catch (err) {
    return sendError(res, err.status || 401, err.code || 'unauthorized', err.message);
  }

  const { db } = getFirebaseAdmin();
  const body = req.body || {};

  // Case 1: Close session and mark absentees (Section 10.5)
  if (body.action === 'close_session_absentees') {
    try {
      const { dateKey, session } = body;
      if (!dateKey || !session) {
        return sendError(res, 400, 'bad_request', 'Missing dateKey or session');
      }

      // Fetch all active students
      const studentsSnap = await db.collection('students').where('active', '==', true).get();
      const activeStudents = [];
      studentsSnap.forEach(doc => activeStudents.push({ id: doc.id, ...doc.data() }));

      // Fetch already marked attendance for this date & session
      const existingSnap = await db.collection('attendance')
        .where('dateKey', '==', dateKey)
        .where('session', '==', session)
        .get();

      const markedStudentIds = new Set();
      existingSnap.forEach(doc => {
        markedStudentIds.add(doc.data().studentId);
      });

      // Filter who is missing
      const absentStudents = activeStudents.filter(s => !markedStudentIds.has(s.id));

      if (absentStudents.length === 0) {
        return sendJson(res, 200, {
          success: true,
          count: 0,
          message: 'All enrolled students are already marked for this session.'
        });
      }

      const batch = db.batch();
      const now = new Date();

      absentStudents.forEach(s => {
        const recordId = `${dateKey}_${session}_${s.id}`;
        const ref = db.collection('attendance').doc(recordId);
        batch.set(ref, {
          studentId: s.id,
          name: s.name,
          rollNo: s.rollNo,
          dateKey,
          session,
          status: 'absent',
          markedAt: now,
          lateMinutes: 0,
          method: 'manual',
          markedBy: decodedAdmin.uid || 'admin',
          reason: 'Auto-closed session absentee'
        });
      });

      await batch.commit();

      return sendJson(res, 200, {
        success: true,
        count: absentStudents.length,
        message: `Marked ${absentStudents.length} students absent for ${session} session.`
      });
    } catch (err) {
      console.error('Error closing session absentees:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // Case 2: Individual Manual Override / Mark (Section 10.6)
  try {
    const validated = await manualMarkSchema.validate(body, { abortEarly: false });
    const { studentId, dateKey, session, status, reason, customMarkedAt } = validated;

    // Fetch student profile
    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) {
      return sendError(res, 404, 'not_found', 'Student not found');
    }
    const studentData = studentDoc.data();

    const recordId = `${dateKey}_${session}_${studentId}`;
    const recordRef = db.collection('attendance').doc(recordId);

    const now = new Date();
    const markedTime = customMarkedAt ? new Date(customMarkedAt) : now;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(recordRef);
      const auditLog = doc.exists ? (doc.data().auditLog || []) : [];

      if (doc.exists) {
        const previousData = doc.data();
        auditLog.push({
          overwrittenAt: now,
          previousStatus: previousData.status,
          previousMethod: previousData.method,
          overwrittenBy: decodedAdmin.uid || 'admin',
          reason: reason
        });
      }

      transaction.set(recordRef, {
        studentId,
        name: studentData.name,
        rollNo: studentData.rollNo,
        dateKey,
        session,
        status,
        markedAt: markedTime,
        lateMinutes: status === 'late' ? (Number(body.lateMinutes) || 10) : 0,
        method: 'manual',
        markedBy: decodedAdmin.uid || 'admin',
        reason,
        auditLog,
        updatedAt: now
      }, { merge: true });
    });

    return sendJson(res, 200, {
      success: true,
      message: `Attendance record successfully saved as ${status}.`
    });
  } catch (err) {
    if (err.name === 'ValidationError') return sendError(res, 400, 'validation_error', err.message);
    console.error('Error in manual attendance mark:', err);
    return sendError(res, 500, 'internal_error', err.message);
  }
}
