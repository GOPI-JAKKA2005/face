/**
 * /api/attendance/list
 * Admin endpoint for querying attendance records with filters and status breakdown summaries.
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

  if (!guardMethod(req, res, ['GET'])) return;

  try {
    await verifyAdmin(req);
  } catch (err) {
    return sendError(res, err.status || 401, err.code || 'unauthorized', err.message);
  }

  try {
    const { from, to, session, status, studentId, q, limit = 50 } = req.query;
    const fetchLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const { db } = getFirebaseAdmin();
    let query = db.collection('attendance');

    // Single-field queries that do not require composite indexes in Firestore
    if (from && to && from === to) {
      query = query.where('dateKey', '==', from);
    } else if (from && to) {
      query = query.where('dateKey', '>=', from).where('dateKey', '<=', to);
    } else if (from) {
      query = query.where('dateKey', '>=', from);
    } else if (to) {
      query = query.where('dateKey', '<=', to);
    } else if (studentId) {
      query = query.where('studentId', '==', studentId);
    }

    let snap;
    try {
      snap = await query.limit(500).get();
    } catch (queryErr) {
      console.warn('Firestore query fallback, fetching base collection:', queryErr.message);
      snap = await db.collection('attendance').limit(500).get();
    }

    let records = [];
    snap.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });

    // In-memory filters for robust multi-criteria filtering without composite index dependencies
    if (studentId) {
      records = records.filter(r => r.studentId === studentId);
    }
    if (session) {
      records = records.filter(r => r.session === session);
    }
    if (status) {
      records = records.filter(r => r.status === status);
    }
    if (from) {
      records = records.filter(r => r.dateKey >= from);
    }
    if (to) {
      records = records.filter(r => r.dateKey <= to);
    }
    if (q && q.trim()) {
      const search = q.trim().toLowerCase();
      records = records.filter(r =>
        (r.name && r.name.toLowerCase().includes(search)) ||
        (r.rollNo && r.rollNo.toLowerCase().includes(search))
      );
    }

    // Sort by markedAt descending in memory
    records.sort((a, b) => {
      const getTime = (val) => {
        if (!val) return 0;
        if (typeof val.toDate === 'function') return val.toDate().getTime();
        return new Date(val).getTime() || 0;
      };
      return getTime(b.markedAt) - getTime(a.markedAt);
    });

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    records.forEach(r => {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'late') lateCount++;
      else if (r.status === 'absent') absentCount++;
    });

    const paginatedRecords = records.slice(0, fetchLimit);

    return sendJson(res, 200, {
      records: paginatedRecords,
      count: paginatedRecords.length,
      summary: {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        total: records.length
      }
    });
  } catch (err) {
    console.error('Error fetching attendance list:', err);
    return sendError(res, 500, 'internal_error', err.message);
  }
}
