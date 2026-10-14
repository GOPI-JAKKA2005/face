import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  getTimeInZone,
  isWorkingDay,
  formatLateDuration,
  resolveActiveSession,
  calculateAttendanceStatus
} from '../api/_lib/time.js';
import {
  euclideanDistance,
  calculateConfidence
} from '../api/_lib/match.js';
import {
  computeEyeVector,
  eyeVectorDifference,
  rotateLandmarksToHorizontal
} from '../api/_lib/eye.js';
import {
  studentSchema,
  sessionSettingsSchema,
  recognitionSettingsSchema,
  manualMarkSchema
} from '../api/_lib/validate.js';
import {
  formatLateDuration as formatClientLateDuration,
  formatMinutesTo12Hour,
  parse24To12,
  format12To24,
  formatMinutesToTime as formatClientMinutesToTime
} from '../client/src/lib/time.js';

describe('Time Module (api/_lib/time.js)', () => {
  it('parses and formats HH:mm time correctly', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540);
    expect(parseTimeToMinutes('14:30')).toBe(870);
    expect(formatMinutesToTime(540)).toBe('09:00');
    expect(formatMinutesToTime(875)).toBe('14:35');
  });

  it('correctly shifts date across UTC to Asia/Kolkata boundary', () => {
    // 2026-10-13 23:30:00 UTC is 2026-10-14 05:00:00 IST (+5:30)
    const utcDate = new Date('2026-10-13T23:30:00Z');
    const zoneTime = getTimeInZone(utcDate, 'Asia/Kolkata');
    expect(zoneTime.dateKey).toBe('2026-10-14');
    expect(zoneTime.hour).toBe(5);
    expect(zoneTime.minute).toBe(0);
  });

  it('checks working day status correctly', () => {
    // Mon-Sat: [1,2,3,4,5,6], Sun: 7
    expect(isWorkingDay({ dateKey: '2026-10-13', weekday: 2 })).toBe(true);
    expect(isWorkingDay({ dateKey: '2026-10-18', weekday: 7 })).toBe(false);
    expect(isWorkingDay({ dateKey: '2026-10-02', weekday: 5, holidays: ['2026-10-02'] })).toBe(false);
  });

  it('formats late duration with correct singular and plural grammar', () => {
    expect(formatLateDuration(1)).toBe('1 minute');
    expect(formatLateDuration(13)).toBe('13 minutes');
    expect(formatLateDuration(60)).toBe('1 hour');
    expect(formatLateDuration(65)).toBe('1 hour 5 minutes');
    expect(formatLateDuration(121)).toBe('2 hours 1 minute');
  });

  it('formats client late duration in hours/minutes (under 60 min as min, >= 60 min as hr/min)', () => {
    expect(formatClientLateDuration(0)).toBe('-');
    expect(formatClientLateDuration(-5)).toBe('-');
    expect(formatClientLateDuration(30)).toBe('30 min');
    expect(formatClientLateDuration(45, { prefix: true })).toBe('+45 min');
    expect(formatClientLateDuration(60)).toBe('1 hr');
    expect(formatClientLateDuration(120)).toBe('2 hr');
    expect(formatClientLateDuration(90)).toBe('1 hr 30 min');
    expect(formatClientLateDuration(222, { prefix: true })).toBe('+3 hr 42 min');
  });

  it('converts and formats 12-hour timing accurately for morning and afternoon sessions', () => {
    // 12-hour string conversions
    expect(formatMinutesTo12Hour('09:30')).toBe('09:30 AM');
    expect(formatMinutesTo12Hour('13:30')).toBe('01:30 PM');
    expect(formatMinutesTo12Hour('14:00')).toBe('02:00 PM');
    expect(formatMinutesTo12Hour('19:30')).toBe('07:30 PM');
    expect(formatMinutesTo12Hour(510)).toBe('08:30 AM');
    expect(formatMinutesTo12Hour(780)).toBe('01:00 PM');

    // formatMinutesToTime with hour12 option
    expect(formatClientMinutesToTime(570, { hour12: true })).toBe('09:30 AM');
    expect(formatClientMinutesToTime(810, { hour12: true })).toBe('01:30 PM');
    expect(formatClientMinutesToTime(840, { hour12: true })).toBe('02:00 PM');
    expect(formatClientMinutesToTime(1170, { hour12: true })).toBe('07:30 PM');

    // parse24To12
    expect(parse24To12('09:30')).toEqual({ hour12: 9, minute: 30, period: 'AM' });
    expect(parse24To12('13:30')).toEqual({ hour12: 1, minute: 30, period: 'PM' });
    expect(parse24To12('14:00')).toEqual({ hour12: 2, minute: 0, period: 'PM' });
    expect(parse24To12('19:30')).toEqual({ hour12: 7, minute: 30, period: 'PM' });

    // format12To24
    expect(format12To24(9, 30, 'AM')).toBe('09:30');
    expect(format12To24(1, 30, 'PM')).toBe('13:30');
    expect(format12To24(2, 0, 'PM')).toBe('14:00');
    expect(format12To24(7, 30, 'PM')).toBe('19:30');
    expect(format12To24(12, 0, 'AM')).toBe('00:00');
    expect(format12To24(12, 0, 'PM')).toBe('12:00');
  });

  it('resolves active session for every region of the day', () => {
    const settings = {
      earlyWindowMinutes: 60,
      sessions: {
        morning: { enabled: true, start: '09:00', graceMinutes: 5, cutoff: '11:30' },
        afternoon: { enabled: true, start: '14:00', graceMinutes: 5, cutoff: '16:30' }
      }
    };

    // 07:30 (450 min) - before morning early window (08:00)
    expect(resolveActiveSession(settings, 450).reason).toBe('too_early');

    // 08:30 (510 min) - morning early window
    expect(resolveActiveSession(settings, 510).session).toBe('morning');

    // 09:15 (555 min) - morning session
    expect(resolveActiveSession(settings, 555).session).toBe('morning');

    // 12:00 (720 min) - between morning cutoff (11:30) and afternoon early (13:00)
    expect(resolveActiveSession(settings, 720).reason).toBe('between_sessions');

    // 14:15 (855 min) - afternoon session
    expect(resolveActiveSession(settings, 855).session).toBe('afternoon');

    // 17:00 (1020 min) - after afternoon cutoff (16:30)
    expect(resolveActiveSession(settings, 1020).reason).toBe('closed');
  });

  it('calculates status and late minutes with lateCountsFrom="start"', () => {
    const session = { start: '09:00', graceMinutes: 5, cutoff: '11:30' };

    // 09:00 - on time
    expect(calculateAttendanceStatus(session, 540, 'start')).toEqual({
      status: 'present',
      lateMinutes: 0,
      message: 'On time, welcome'
    });

    // 09:04 - within grace
    expect(calculateAttendanceStatus(session, 544, 'start')).toEqual({
      status: 'present',
      lateMinutes: 0,
      message: 'On time, welcome'
    });

    // 09:06 - 1 minute after grace, measured from start (09:00) = 6 minutes late
    expect(calculateAttendanceStatus(session, 546, 'start')).toEqual({
      status: 'late',
      lateMinutes: 6,
      message: 'You are late by 6 minutes'
    });

    // 09:12:30 (552.5 min) - ceil(552.5 - 540) = 13 minutes late
    expect(calculateAttendanceStatus(session, 552.5, 'start')).toEqual({
      status: 'late',
      lateMinutes: 13,
      message: 'You are late by 13 minutes'
    });

    // 11:31 (691 min) - after cutoff
    expect(calculateAttendanceStatus(session, 691, 'start').status).toBe('closed');
  });

  it('calculates status and late minutes with lateCountsFrom="afterGrace"', () => {
    const session = { start: '09:00', graceMinutes: 5, cutoff: '11:30' };

    // 09:06 (546 min) - base is start + grace = 545. 546 - 545 = 1 min late
    expect(calculateAttendanceStatus(session, 546, 'afterGrace')).toEqual({
      status: 'late',
      lateMinutes: 1,
      message: 'You are late by 1 minute'
    });
  });

  it('evaluates individual student timeSlot correctly (10:00 AM - 07:30 PM shift)', async () => {
    const { evaluateStudentAttendance } = await import('../api/_lib/time.js');

    const customStudent = {
      id: 'student_custom_1',
      name: 'Rohan Sharma',
      timeSlot: {
        enabled: true,
        loginTime: '10:00', // 600 min
        logoutTime: '19:30', // 1170 min
        graceMinutes: 5,
        slotLabel: '10:00 AM - 07:30 PM Shift'
      }
    };

    const settings = {
      sessions: {
        morning: { enabled: true, start: '09:00', graceMinutes: 5, cutoff: '11:30' }
      }
    };

    // 1. Arrived early at 09:45 AM (585 min) -> Present, 0 late
    const earlyRes = evaluateStudentAttendance({
      student: customStudent,
      sessionRes: { session: 'morning', reason: 'ok' },
      minutesNow: 585,
      settings
    });
    expect(earlyRes.status).toBe('present');
    expect(earlyRes.lateMinutes).toBe(0);
    expect(earlyRes.isCustomSlot).toBe(true);

    // 2. Arrived within grace period at 10:04 AM (604 min) -> Present, 0 late
    const onTimeRes = evaluateStudentAttendance({
      student: customStudent,
      sessionRes: { session: 'morning', reason: 'ok' },
      minutesNow: 604,
      settings
    });
    expect(onTimeRes.status).toBe('present');
    expect(onTimeRes.lateMinutes).toBe(0);

    // 3. Arrived late at 10:25 AM (625 min) -> Late by 25 min for Morning
    const lateRes = evaluateStudentAttendance({
      student: customStudent,
      sessionRes: { session: 'morning', reason: 'ok' },
      minutesNow: 625,
      settings
    });
    expect(lateRes.status).toBe('late');
    expect(lateRes.lateMinutes).toBe(25);
    expect(lateRes.sessionKey).toBe('morning');
    expect(lateRes.message).toBe('You are late by 25 minutes for your 10:00 AM Morning slot');

    // 4. Arrived late at 11:30 AM (690 min) -> Late by 90 min (1 hr 30 min)
    const veryLateRes = evaluateStudentAttendance({
      student: customStudent,
      sessionRes: { session: 'morning', reason: 'ok' },
      minutesNow: 690,
      settings
    });
    expect(veryLateRes.status).toBe('late');
    expect(veryLateRes.lateMinutes).toBe(90);
    expect(veryLateRes.sessionKey).toBe('morning');

    // 5. Arrived after lunch for Afternoon Session at 02:00 PM (840 min) -> Present for Afternoon
    const afternoonOnTime = evaluateStudentAttendance({
      student: customStudent,
      sessionRes: { session: 'afternoon', reason: 'ok' },
      minutesNow: 840,
      settings
    });
    expect(afternoonOnTime.status).toBe('present');
    expect(afternoonOnTime.lateMinutes).toBe(0);
    expect(afternoonOnTime.sessionKey).toBe('afternoon');
    expect(afternoonOnTime.message).toBe('On time for Afternoon (Post-Lunch) session, welcome');

    // 6. Arrived late after lunch at 02:25 PM (865 min) -> Late by 25 min for Afternoon
    const afternoonLate = evaluateStudentAttendance({
      student: customStudent,
      sessionRes: { session: 'afternoon', reason: 'ok' },
      minutesNow: 865,
      settings
    });
    expect(afternoonLate.status).toBe('late');
    expect(afternoonLate.lateMinutes).toBe(25);
    expect(afternoonLate.sessionKey).toBe('afternoon');
    expect(afternoonLate.message).toBe('You are late by 25 minutes for your 02:00 PM Afternoon (Post-Lunch) slot');

    // 7. Arrived after logout time at 08:00 PM (1200 min) -> Closed
    const closedRes = evaluateStudentAttendance({
      student: customStudent,
      sessionRes: { session: null, reason: 'closed' },
      minutesNow: 1200,
      settings
    });
    expect(closedRes.allowed).toBe(false);
    expect(closedRes.reason).toBe('closed');

    // 6. Student without custom time slot falls back to global session evaluation
    const defaultStudent = { id: 'student_default_1', name: 'Default Student' };
    const fallbackRes = evaluateStudentAttendance({
      student: defaultStudent,
      sessionRes: {
        session: 'morning',
        reason: 'ok',
        config: settings.sessions.morning
      },
      minutesNow: 540,
      settings
    });
    expect(fallbackRes.isCustomSlot).toBe(false);
    expect(fallbackRes.sessionKey).toBe('morning');
    expect(fallbackRes.status).toBe('present');
  });
});

describe('Matching & Metrics Module (api/_lib/match.js)', () => {
  it('calculates Euclidean distance accurately', () => {
    const a = [0, 0, 0];
    const b = [3, 4, 0];
    expect(euclideanDistance(a, b)).toBe(5);
  });

  it('calculates and clamps confidence correctly', () => {
    expect(calculateConfidence(0.225, 0.45)).toBe(0.5);
    expect(calculateConfidence(0.0, 0.45)).toBe(1.0);
    expect(calculateConfidence(0.50, 0.45)).toBe(0.0);
  });
});

describe('Eye Signature Module (api/_lib/eye.js)', () => {
  // Generate synthetic 68 landmark points
  function createSyntheticLandmarks(rollAngleRad = 0) {
    const points = [];
    for (let i = 0; i < 68; i++) {
      // Default face coordinates
      let x = 100 + (i % 10) * 10;
      let y = 100 + Math.floor(i / 10) * 10;

      // Fix eye and nose positions
      if (i >= 36 && i <= 41) { x = 120 + (i - 36) * 5; y = 140; } // right eye
      if (i >= 42 && i <= 47) { x = 180 + (i - 42) * 5; y = 140; } // left eye
      if (i === 30) { x = 150; y = 170; } // nose tip
      if (i >= 17 && i <= 21) { x = 120 + (i - 17) * 5; y = 125; } // right brow
      if (i >= 22 && i <= 26) { x = 180 + (i - 22) * 5; y = 125; } // left brow

      // Apply roll rotation
      if (rollAngleRad !== 0) {
        const cos = Math.cos(rollAngleRad);
        const sin = Math.sin(rollAngleRad);
        const rx = (x - 150) * cos - (y - 150) * sin + 150;
        const ry = (x - 150) * sin + (y - 150) * cos + 150;
        points.push({ x: rx, y: ry });
      } else {
        points.push({ x, y });
      }
    }
    return points;
  }

  it('computes 8-element normalized eye vector', () => {
    const landmarks = createSyntheticLandmarks(0);
    const vector = computeEyeVector(landmarks);
    expect(vector).toHaveLength(8);
    for (const val of vector) {
      expect(typeof val).toBe('number');
      expect(Number.isFinite(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
    }
  });

  it('normalizes roll rotation so eye vector is invariant to head tilt', () => {
    const flatLandmarks = createSyntheticLandmarks(0);
    const tiltedLandmarks = createSyntheticLandmarks(0.2); // ~11 degrees tilt

    const v1 = computeEyeVector(flatLandmarks);
    const v2 = computeEyeVector(tiltedLandmarks);

    const diff = eyeVectorDifference(v1, v2);
    expect(diff).toBeLessThan(0.05); // Minimal variance under rotation
  });
});

describe('Yup Validation Schemas (api/_lib/validate.js)', () => {
  it('validates student registration payload', async () => {
    const valid = {
      name: 'Aditi Sharma',
      rollNo: 'cs-101',
      mobile: '9876543210',
      consent: true
    };
    const parsed = await studentSchema.validate(valid);
    expect(parsed.rollNo).toBe('CS-101'); // Uppercase normalized

    // Invalid phone
    await expect(studentSchema.validate({ ...valid, mobile: '12345' })).rejects.toThrow();

    // Missing consent
    await expect(studentSchema.validate({ ...valid, consent: false })).rejects.toThrow();
  });

  it('validates session settings and rejects overlapping windows', async () => {
    const valid = {
      timezone: 'Asia/Kolkata',
      sessions: {
        morning: { enabled: true, start: '09:00', graceMinutes: 5, cutoff: '11:30' },
        afternoon: { enabled: true, start: '14:00', graceMinutes: 5, cutoff: '16:30' }
      }
    };
    await expect(sessionSettingsSchema.validate(valid)).resolves.toBeTruthy();

    // Overlapping: morning cutoff 14:30 > afternoon start 14:00
    const overlapping = {
      timezone: 'Asia/Kolkata',
      sessions: {
        morning: { enabled: true, start: '09:00', graceMinutes: 5, cutoff: '14:30' },
        afternoon: { enabled: true, start: '14:00', graceMinutes: 5, cutoff: '16:30' }
      }
    };
    await expect(sessionSettingsSchema.validate(overlapping)).rejects.toThrow();
  });

  it('validates recognition settings boundaries', async () => {
    const valid = { threshold: 0.45, minMarginToSecond: 0.06, requiredConsecutiveFrames: 3 };
    await expect(recognitionSettingsSchema.validate(valid)).resolves.toBeTruthy();

    // Threshold out of bounds (> 0.60)
    await expect(recognitionSettingsSchema.validate({ threshold: 0.75 })).rejects.toThrow();
  });

  it('validates manual mark payload', async () => {
    const valid = {
      studentId: 'std_123',
      dateKey: '2026-10-13',
      session: 'morning',
      status: 'present',
      reason: 'Network issue during scan'
    };
    await expect(manualMarkSchema.validate(valid)).resolves.toBeTruthy();

    // Short reason (< 5 chars)
    await expect(manualMarkSchema.validate({ ...valid, reason: 'bad' })).rejects.toThrow();
  });
});

describe('Client Time Display Functions (client/src/lib/time.js)', () => {
  it('safely formats Firestore serialized timestamps, dates, strings and invalid inputs without throwing RangeError', async () => {
    const { formatTimeDisplay, formatDateDisplay, formatDateTimeDisplay, parseDateInput } = await import('../client/src/lib/time.js');

    // 1. null / undefined / empty
    expect(formatTimeDisplay(null)).toBe('--:--');
    expect(formatTimeDisplay(undefined)).toBe('--:--');
    expect(formatDateDisplay(null)).toBe('--');
    expect(formatDateTimeDisplay(null)).toBe('--');

    // 2. Serialized Firestore Timestamp with _seconds
    const firestoreTimestamp = { _seconds: 1728800000, _nanoseconds: 0 };
    expect(parseDateInput(firestoreTimestamp)).toBeInstanceOf(Date);
    expect(formatTimeDisplay(firestoreTimestamp)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(formatDateDisplay(firestoreTimestamp)).toMatch(/\d{1,2} [A-Za-z]+ \d{4}/);

    // 3. Serialized Firestore Timestamp with seconds
    const firestoreTimestamp2 = { seconds: 1728800000, nanoseconds: 0 };
    expect(parseDateInput(firestoreTimestamp2)).toBeInstanceOf(Date);
    expect(formatTimeDisplay(firestoreTimestamp2)).toMatch(/^\d{2}:\d{2}:\d{2}$/);

    // 4. Firestore Timestamp object with .toDate() method
    const firestoreObj = { toDate: () => new Date('2026-10-13T10:30:00Z') };
    expect(parseDateInput(firestoreObj)).toBeInstanceOf(Date);
    expect(formatTimeDisplay(firestoreObj)).toBe('16:00:00');

    // 5. Invalid values that would throw RangeError in naive implementations
    expect(formatTimeDisplay('invalid-date-string')).toBe('--:--');
    expect(formatTimeDisplay(NaN)).toBe('--:--');
    expect(formatTimeDisplay({})).toBe('--:--');
    expect(formatDateDisplay('invalid-date-string')).toBe('--');
    expect(formatDateTimeDisplay('invalid-date-string')).toBe('--');
  });
});
