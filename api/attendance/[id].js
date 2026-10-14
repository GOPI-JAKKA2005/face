/**
 * /api/attendance/[id]
 * GET: Fetches a single attendance record by document ID.
 * PUT: Updates/edits status, late minutes, session, or reason (with audit log).
 * DELETE: Permanently deletes an attendance record document.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';

export const config = {
  maxDuration: 10
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['GET', 'PUT', 'DELETE'])) return;

  let decodedAdmin;
  try {
    decodedAdmin = await verifyAdmin(req);
  } catch (err) {
    return sendError(res, err.status || 401, err.code || 'unauthorized', err.message);
  }

  const id = req.query?.id || req.params?.id;
  if (!id) {
    return sendError(res, 400, 'bad_request', 'Missing attendance record ID');
  }

  const { db } = getFirebaseAdmin();
  const recordRef = db.collection('attendance').doc(id);

  // GET /api/attendance/[id]
  if (req.method === 'GET') {
    try {
      const snap = await recordRef.get();
      if (!snap.exists) {
        return sendError(res, 404, 'not_found', 'Attendance record not found');
      }
      return sendJson(res, 200, {
        record: { id: snap.id, ...snap.data() }
      });
    } catch (err) {
      console.error('Error fetching attendance record:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // PUT /api/attendance/[id] (Edit and Save)
  if (req.method === 'PUT') {
    try {
      const body = req.body || {};
      const { status, lateMinutes, session, reason } = body;

      const now = new Date();

      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(recordRef);

        if (!snap.exists) {
          // Document does not exist yet (e.g. marking present/late for an unrecorded student)
          let studentId = body.studentId;
          let dateKey = body.dateKey;
          let sessionKey = session || body.session;

          if (!studentId || !dateKey || !sessionKey) {
            const parts = id.split('_');
            if (parts.length >= 3) {
              if (!dateKey) dateKey = parts[0];
              if (!sessionKey) sessionKey = parts[1];
              if (!studentId) studentId = parts.slice(2).join('_');
            }
          }

          let studentName = body.name;
          let studentRollNo = body.rollNo;
          let studentData = {};

          if (studentId) {
            const studentDoc = await transaction.get(db.collection('students').doc(studentId));
            if (studentDoc.exists) {
              studentData = studentDoc.data() || {};
              if (!studentName) studentName = studentData.name;
              if (!studentRollNo) studentRollNo = studentData.rollNo;
            }
          }

          const targetStatus = status || 'present';
          const calcLateMinutes = targetStatus === 'late' ? (Number(lateMinutes) || 0) : 0;

          const newDoc = {
            studentId: studentId || '',
            name: studentName || studentData.name || 'Unknown Student',
            rollNo: studentRollNo || studentData.rollNo || '',
            dateKey: dateKey || now.toISOString().split('T')[0],
            session: sessionKey || 'morning',
            status: targetStatus,
            lateMinutes: calcLateMinutes,
            reason: reason || 'Admin manual mark',
            markedAt: (targetStatus === 'present' || targetStatus === 'late') ? now : null,
            logoutAt: null,
            method: 'manual',
            markedBy: decodedAdmin.uid || decodedAdmin.email || 'admin',
            auditLog: [{
              editedAt: now,
              previousStatus: 'unrecorded',
              previousLateMinutes: 0,
              newStatus: targetStatus,
              editedBy: decodedAdmin.uid || decodedAdmin.email || 'admin',
              reason: reason || 'Admin manual override (initial mark)'
            }],
            createdAt: now,
            updatedAt: now
          };

          if (studentData.timeSlot?.enabled && studentData.timeSlot?.slotLabel) {
            newDoc.slotLabel = studentData.timeSlot.slotLabel;
          }

          transaction.set(recordRef, newDoc);
          return;
        }

        const prevData = snap.data();
        const auditLog = prevData.auditLog || [];

        auditLog.push({
          editedAt: now,
          previousStatus: prevData.status,
          previousLateMinutes: prevData.lateMinutes || 0,
          newStatus: status || prevData.status,
          editedBy: decodedAdmin.uid || decodedAdmin.email || 'admin',
          reason: reason || 'Admin edit'
        });

        const updates = {
          updatedAt: now,
          auditLog
        };

        if (status) {
          updates.status = status;
          if ((status === 'present' || status === 'late') && !prevData.markedAt) {
            updates.markedAt = now;
          }
        }
        if (lateMinutes !== undefined) {
          updates.lateMinutes = status === 'late' ? Number(lateMinutes) || 0 : 0;
        }
        if (session) updates.session = session;
        if (reason) updates.reason = reason;

        transaction.update(recordRef, updates);
      });

      const updatedSnap = await recordRef.get();
      return sendJson(res, 200, {
        success: true,
        record: { id: updatedSnap.id, ...updatedSnap.data() },
        message: 'Attendance record updated successfully.'
      });
    } catch (err) {
      if (err.status) return sendError(res, err.status, err.code, err.message);
      console.error('Error editing attendance record:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }

  // DELETE /api/attendance/[id]
  if (req.method === 'DELETE') {
    try {
      const snap = await recordRef.get();
      if (!snap.exists) {
        return sendError(res, 404, 'not_found', 'Attendance record not found');
      }

      await recordRef.delete();

      return sendJson(res, 200, {
        success: true,
        message: 'Attendance record deleted successfully.'
      });
    } catch (err) {
      console.error('Error deleting attendance record:', err);
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
}
