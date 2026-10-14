/**
 * /api/attendance/mark
 * Public unauthenticated endpoint for entrance Kiosk biometric marking.
 * Matches 128-D descriptor and 8-D eye vector, checks sessions & working day,
 * and writes deterministic attendance record in a Firestore transaction.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { kioskMarkSchema } from '../_lib/validate.js';
import { matchBiometricSignature } from '../_lib/match.js';
import {
  getTimeInZone,
  resolveActiveSession,
  calculateAttendanceStatus,
  evaluateStudentAttendance,
  isWorkingDay
} from '../_lib/time.js';

export const config = {
  maxDuration: 10
};

// In-memory sliding window rate limiting
const ipRateMap = new Map();

function checkRateLimit(ip, limitPerMinute = 30) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  let timestamps = ipRateMap.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= limitPerMinute) {
    ipRateMap.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  ipRateMap.set(ip, timestamps);
  return true;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['POST'])) return;

  // 1. IP Rate Limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(clientIp, 40)) {
    return sendError(res, 429, 'too_many_requests', 'Rate limit exceeded. Please wait a moment.');
  }

  try {
    const body = req.body || {};
    const validated = await kioskMarkSchema.validate(body, { abortEarly: false });

    const { db } = getFirebaseAdmin();

    // 2. Fetch System & Recognition Configuration
    const settingsDoc = await db.collection('settings').doc('system').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    const timezone = settings.timezone || 'Asia/Kolkata';
    const recognitionSettings = settings.recognition || {};

    // 3. Match Incoming Biometric Signature against active students
    const match = await matchBiometricSignature({
      descriptor: validated.descriptor,
      eye: validated.eye,
      recognitionSettings
    });

    if (!match.matched) {
      // Log rejected attempts to kioskEvents (capped at 500)
      db.collection('kioskEvents').add({
        type: 'rejected',
        reason: match.reason || 'no_match',
        distance: match.distance || null,
        clientIp: String(clientIp).slice(0, 16),
        timestamp: new Date()
      }).catch(() => {});

      return sendJson(res, 200, {
        matched: false,
        reason: match.reason || 'no_match'
      });
    }

    const student = match.student;

    // Check if student is active
    if (student.active === false) {
      return sendJson(res, 200, {
        matched: false,
        reason: 'inactive'
      });
    }

    // 4. Derive Server Time & Active Session in Target Timezone
    const now = new Date();
    const timeInfo = getTimeInZone(now, timezone);

    // Working day check
    const isWorking = isWorkingDay({
      dateKey: timeInfo.dateKey,
      weekday: timeInfo.weekday,
      weekdays: settings.weekdays || [1, 2, 3, 4, 5, 6],
      holidays: settings.holidays || []
    });

    if (!isWorking) {
      return sendJson(res, 200, {
        matched: true,
        recorded: false,
        reason: 'non_working_day',
        student: { name: student.name, rollNo: student.rollNo, photoUrl: student.photoUrl },
        message: 'No attendance scheduled for today (Holiday / Off day).'
      });
    }

    // Resolve session & evaluate attendance (supports per-student time slots and global sessions)
    const sessionRes = resolveActiveSession(settings, timeInfo.minutesSinceMidnight);
    const evaluation = evaluateStudentAttendance({
      student,
      sessionRes,
      minutesNow: timeInfo.minutesSinceMidnight,
      settings
    });

    if (!evaluation.allowed) {
      return sendJson(res, 200, {
        matched: true,
        recorded: false,
        reason: evaluation.reason || 'closed',
        student: { name: student.name, rollNo: student.rollNo, photoUrl: student.photoUrl },
        message: evaluation.message
      });
    }

    const sessionKey = evaluation.sessionKey || (sessionRes ? sessionRes.session : 'custom');

    // 5. Deterministic Document ID: ${dateKey}_${session}_${studentId}
    const recordId = `${timeInfo.dateKey}_${sessionKey}_${match.studentId}`;
    const attendanceRef = db.collection('attendance').doc(recordId);

    let recorded = false;
    let existingRecord = null;
    let logoutRecorded = false;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(attendanceRef);

      if (doc.exists) {
        existingRecord = doc.data();

        // Check if student is scanning again for checkout / logout
        const markedTime = existingRecord.markedAt?.toDate
          ? existingRecord.markedAt.toDate()
          : new Date(existingRecord.markedAt);
        const elapsedMinutes = (now.getTime() - markedTime.getTime()) / (1000 * 60);

        // If scanned 15+ minutes after check-in and haven't logged out yet:
        if (elapsedMinutes >= 15 && !existingRecord.logoutAt) {
          transaction.update(attendanceRef, {
            logoutAt: now,
            updatedAt: now
          });
          logoutRecorded = true;
        }
        return;
      }

      // New mark write (check-in / login)
      const newAttendanceDoc = {
        studentId: match.studentId,
        name: student.name,
        rollNo: student.rollNo,
        dateKey: timeInfo.dateKey,
        session: sessionKey,
        status: evaluation.status,
        markedAt: now,
        logoutAt: null,
        scheduledStart: evaluation.scheduledStart,
        scheduledEnd: evaluation.scheduledEnd || null,
        isCustomSlot: Boolean(evaluation.isCustomSlot),
        slotLabel: evaluation.slotLabel || null,
        graceMinutes: evaluation.graceMinutes ?? 5,
        lateMinutes: evaluation.lateMinutes,
        lateCountsFrom: settings.lateCountsFrom || 'start',
        method: 'face',
        confidence: match.confidence,
        distance: match.distance,
        markedBy: 'kiosk'
      };

      transaction.set(attendanceRef, newAttendanceDoc);
      recorded = true;
    });

    if (logoutRecorded) {
      const logoutTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return sendJson(res, 200, {
        matched: true,
        recorded: true,
        action: 'logout',
        student: { name: student.name, rollNo: student.rollNo, photoUrl: student.photoUrl },
        session: sessionKey,
        message: `Logout recorded at ${logoutTimeStr}. Have a great evening!`,
        logoutAt: now.toISOString()
      });
    }

    if (!recorded && existingRecord) {
      const markedTimeStr = existingRecord.markedAt?.toDate
        ? existingRecord.markedAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : timeInfo.timeString;

      return sendJson(res, 200, {
        matched: true,
        recorded: false,
        reason: 'already_marked',
        student: { name: student.name, rollNo: student.rollNo, photoUrl: student.photoUrl },
        session: sessionKey,
        status: existingRecord.status,
        lateMinutes: existingRecord.lateMinutes,
        markedAt: existingRecord.markedAt,
        logoutAt: existingRecord.logoutAt || null,
        message: `Already marked at ${markedTimeStr} (${sessionKey})`
      });
    }

    return sendJson(res, 200, {
      matched: true,
      recorded: true,
      action: 'login',
      student: { name: student.name, rollNo: student.rollNo, photoUrl: student.photoUrl },
      session: sessionKey,
      status: evaluation.status,
      lateMinutes: evaluation.lateMinutes,
      message: evaluation.message,
      markedAt: now.toISOString()
    });
  } catch (err) {
    if (err.name === 'ValidationError') return sendError(res, 400, 'validation_error', err.message);
    console.error('Error recording kiosk attendance:', err);
    return sendError(res, 500, 'internal_error', err.message);
  }
}
