/**
 * /api/attendance/export
 * Admin endpoint for streaming attendance CSV (with UTF-8 BOM) or JSON export.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/auth.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';

export const config = {
  maxDuration: 15
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
    const { from, to, session, format = 'csv' } = req.query;

    const { db } = getFirebaseAdmin();
    let query = db.collection('attendance');

    if (from && to && from === to) {
      query = query.where('dateKey', '==', from);
    } else if (from && to) {
      query = query.where('dateKey', '>=', from).where('dateKey', '<=', to);
    } else if (from) {
      query = query.where('dateKey', '>=', from);
    } else if (to) {
      query = query.where('dateKey', '<=', to);
    }

    let snap;
    try {
      snap = await query.limit(2000).get();
    } catch (queryErr) {
      console.warn('Export query fallback:', queryErr.message);
      snap = await db.collection('attendance').limit(2000).get();
    }

    let records = [];
    snap.forEach(doc => {
      const data = doc.data();
      records.push({ id: doc.id, ...data });
    });

    if (from) records = records.filter(r => r.dateKey >= from);
    if (to) records = records.filter(r => r.dateKey <= to);
    if (session) records = records.filter(r => r.session === session);

    // Sort by dateKey desc, then markedAt desc
    records.sort((a, b) => {
      if (a.dateKey !== b.dateKey) return (b.dateKey || '').localeCompare(a.dateKey || '');
      const getTime = (val) => {
        if (!val) return 0;
        if (typeof val.toDate === 'function') return val.toDate().getTime();
        return new Date(val).getTime() || 0;
      };
      return getTime(b.markedAt) - getTime(a.markedAt);
    });

    if (format === 'json') {
      return sendJson(res, 200, { records, count: records.length });
    }

    // Generate CSV with UTF-8 BOM for Microsoft Excel compatibility
    const fromLabel = from || 'start';
    const toLabel = to || 'end';
    const filename = `attendance-${fromLabel}-to-${toLabel}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const BOM = '\uFEFF';
    let csv = BOM + 'Date,Session,Roll No,Name,Status,Late Minutes,Marked At,Method\n';

    records.forEach(r => {
      const markedTime = r.markedAt?.toDate
        ? r.markedAt.toDate().toISOString()
        : (r.markedAt || '');

      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

      csv += [
        escapeCsv(r.dateKey),
        escapeCsv(r.session),
        escapeCsv(r.rollNo),
        escapeCsv(r.name),
        escapeCsv(r.status),
        r.lateMinutes || 0,
        escapeCsv(markedTime),
        escapeCsv(r.method || 'face')
      ].join(',') + '\n';
    });

    return res.status(200).send(csv);
  } catch (err) {
    console.error('Error exporting attendance:', err);
    return sendError(res, 500, 'internal_error', err.message);
  }
}
