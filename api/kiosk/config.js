/**
 * /api/kiosk/config
 * Public endpoint providing real-time kiosk operational configuration.
 * Returns server time, active session status, liveness flag, and theme tokens. Zero biometric data.
 */

import { guardMethod, handleOptions, sendError, sendJson, setCors } from '../_lib/http.js';
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { getTimeInZone, resolveActiveSession, isWorkingDay } from '../_lib/time.js';

export const config = {
  maxDuration: 10
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (!guardMethod(req, res, ['GET'])) return;

  try {
    const { db } = getFirebaseAdmin();

    const [settingsSnap, themeSnap] = await Promise.all([
      db.collection('settings').doc('system').get(),
      db.collection('settings').doc('theme').get()
    ]);

    const sys = settingsSnap.exists ? settingsSnap.data() : {};
    const theme = themeSnap.exists ? themeSnap.data() : null;

    const timezone = sys.timezone || 'Asia/Kolkata';
    const timeInfo = getTimeInZone(new Date(), timezone);

    const working = isWorkingDay({
      dateKey: timeInfo.dateKey,
      weekday: timeInfo.weekday,
      weekdays: sys.weekdays || [1, 2, 3, 4, 5, 6],
      holidays: sys.holidays || []
    });

    const sessionResolution = resolveActiveSession(sys, timeInfo.minutesSinceMidnight);

    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');

    return sendJson(res, 200, {
      serverTime: timeInfo.isoString,
      timezone,
      dateKey: timeInfo.dateKey,
      timeString: timeInfo.timeString,
      isWorkingDay: working,
      activeSession: working ? sessionResolution.session : null,
      sessionReason: !working ? 'non_working_day' : sessionResolution.reason,
      sessionMessage: !working ? 'No attendance today (Holiday / Weekend)' : sessionResolution.message,
      nextOpening: sessionResolution.reason === 'between_sessions' ? sys.sessions?.afternoon?.start : null,
      kioskMessage: sys.kioskMessage || 'Please look at the camera',
      recognition: {
        requireLiveness: sys.recognition?.requireLiveness ?? true,
        strictLiveness: sys.recognition?.strictLiveness ?? false,
        requiredConsecutiveFrames: sys.recognition?.requiredConsecutiveFrames ?? 3,
        cooldownSeconds: sys.recognition?.cooldownSeconds ?? 20,
        inputSize: sys.recognition?.inputSize ?? 320
      },
      theme
    });
  } catch (err) {
    console.error('Error fetching kiosk config:', err);
    return sendError(res, 500, 'internal_error', err.message);
  }
}
