/**
 * Timezone-aware attendance time utilities.
 * Handles server-clock derivation in configured timezone (default: Asia/Kolkata),
 * session window resolution, late-minute calculations, and message formatting.
 */

/**
 * Parses 'HH:mm' string to total minutes since midnight.
 * @param {string} hhmm
 * @returns {number}
 */
export function parseTimeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats minutes since midnight into 'HH:mm'.
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatMinutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.floor(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Derives timezone-aware date, time, weekday, and fractional minutes since midnight.
 * @param {Date} [nowDate]
 * @param {string} [timeZone]
 */
export function getTimeInZone(nowDate = new Date(), timeZone = 'Asia/Kolkata') {
  // Use Intl.DateTimeFormat with parts for robust timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  });

  const parts = formatter.formatToParts(nowDate);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const year = map.year;
  const month = map.month;
  const day = map.day;
  const dateKey = `${year}-${month}-${day}`;

  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  // Exact fractional minutes since midnight (including seconds)
  const minutesSinceMidnight = hour * 60 + minute + second / 60;

  // Convert weekday: Monday = 1 ... Sunday = 7
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = weekdayMap[map.weekday] || 1;

  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return {
    dateKey,
    hour,
    minute,
    second,
    minutesSinceMidnight,
    weekday,
    timeString,
    isoString: nowDate.toISOString()
  };
}

/**
 * Determines whether today is an active working day for attendance.
 * @param {object} params
 * @param {string} params.dateKey - 'YYYY-MM-DD'
 * @param {number} params.weekday - 1 (Mon) to 7 (Sun)
 * @param {number[]} params.weekdays - e.g. [1,2,3,4,5,6]
 * @param {string[]} params.holidays - e.g. ['2026-10-02']
 * @returns {boolean}
 */
export function isWorkingDay({ dateKey, weekday, weekdays = [1, 2, 3, 4, 5, 6], holidays = [] }) {
  if (holidays && holidays.includes(dateKey)) {
    return false;
  }
  return weekdays.includes(weekday);
}

/**
 * Formats late duration into human-readable string.
 * e.g. 1 -> "1 minute", 13 -> "13 minutes", 65 -> "1 hour 5 minutes"
 * @param {number} minutes
 * @returns {string}
 */
export function formatLateDuration(minutes) {
  if (!minutes || minutes <= 0) return '0 minutes';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const minPart = `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  if (hrs === 0) return minPart;

  const hrPart = `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
  if (mins === 0) return hrPart;

  return `${hrPart} ${minPart}`;
}

/**
 * Resolves the currently active attendance session based on the configured windows.
 *
 * Ordered rules from Section 10.2:
 * 1. Current time < morning early window: { session: null, reason: 'too_early', message: 'Attendance has not opened yet' }
 * 2. Current time within morning early window up to morning cutoff: session = 'morning'
 * 3. Between morning cutoff and afternoon early window: { session: null, reason: 'between_sessions', message: 'Morning attendance closed, afternoon opens at HH:mm' }
 * 4. Within afternoon early window up to afternoon cutoff: session = 'afternoon'
 * 5. After afternoon cutoff: { session: null, reason: 'closed', message: 'Attendance closed for today' }
 *
 * @param {object} settings - Settings object with sessions & early window
 * @param {number} minutesNow - Current minutes since midnight
 * @returns {object}
 */
export function resolveActiveSession(settings, minutesNow) {
  const earlyWindow = settings?.earlyWindowMinutes ?? 60;
  const morning = settings?.sessions?.morning;
  const afternoon = settings?.sessions?.afternoon;

  const mEnabled = morning?.enabled !== false;
  const aEnabled = afternoon?.enabled !== false;

  const mStart = mEnabled ? parseTimeToMinutes(morning.start) : null;
  const mCutoff = mEnabled ? parseTimeToMinutes(morning.cutoff) : null;
  const mEarly = mEnabled ? mStart - earlyWindow : null;

  const aStart = aEnabled ? parseTimeToMinutes(afternoon.start) : null;
  const aCutoff = aEnabled ? parseTimeToMinutes(afternoon.cutoff) : null;
  const aEarly = aEnabled ? aStart - earlyWindow : null;

  // Case: Only morning enabled
  if (mEnabled && !aEnabled) {
    if (minutesNow < mEarly) {
      return { session: null, reason: 'too_early', message: 'Attendance has not opened yet' };
    }
    if (minutesNow <= mCutoff) {
      return { session: 'morning', config: morning };
    }
    return { session: null, reason: 'closed', message: 'Attendance closed for today' };
  }

  // Case: Only afternoon enabled
  if (!mEnabled && aEnabled) {
    if (minutesNow < aEarly) {
      return { session: null, reason: 'too_early', message: 'Attendance has not opened yet' };
    }
    if (minutesNow <= aCutoff) {
      return { session: 'afternoon', config: afternoon };
    }
    return { session: null, reason: 'closed', message: 'Attendance closed for today' };
  }

  // Both disabled
  if (!mEnabled && !aEnabled) {
    return { session: null, reason: 'closed', message: 'All attendance sessions are disabled' };
  }

  // Both enabled: evaluate sequentially
  if (minutesNow < mEarly) {
    return { session: null, reason: 'too_early', message: 'Attendance has not opened yet' };
  }

  if (minutesNow <= mCutoff) {
    return { session: 'morning', config: morning };
  }

  if (minutesNow < aEarly) {
    return {
      session: null,
      reason: 'between_sessions',
      message: `Morning attendance closed, afternoon opens at ${afternoon.start}`
    };
  }

  if (minutesNow <= aCutoff) {
    return { session: 'afternoon', config: afternoon };
  }

  return { session: null, reason: 'closed', message: 'Attendance closed for today' };
}

/**
 * Evaluates attendance status and lateness for a student scanning during an active session.
 *
 * Section 10.3:
 * Let S = start, G = grace, N = minutesNow, C = cutoff.
 * - N <= S + G: present, lateMinutes = 0
 * - S + G < N <= C: late. If lateCountsFrom === 'start', lateMinutes = ceil(N - S).
 *                  If lateCountsFrom === 'afterGrace', lateMinutes = ceil(N - (S + G)).
 * - N > C: closed.
 *
 * @param {object} sessionConfig - { start, graceMinutes, cutoff }
 * @param {number} minutesNow - Current minutes since midnight (including seconds)
 * @param {string} [lateCountsFrom='start'] - 'start' | 'afterGrace'
 * @returns {object} { status: 'present'|'late'|'closed', lateMinutes: number, message: string }
 */
export function calculateAttendanceStatus(sessionConfig, minutesNow, lateCountsFrom = 'start') {
  const start = parseTimeToMinutes(sessionConfig.start);
  const grace = sessionConfig.graceMinutes ?? 5;
  const cutoff = parseTimeToMinutes(sessionConfig.cutoff);

  if (minutesNow > cutoff) {
    return {
      status: 'closed',
      lateMinutes: 0,
      message: 'Session attendance cutoff exceeded'
    };
  }

  if (minutesNow <= start + grace) {
    return {
      status: 'present',
      lateMinutes: 0,
      message: 'On time, welcome'
    };
  }

  // Student is late
  const baseMinutes = lateCountsFrom === 'afterGrace' ? (start + grace) : start;
  const lateMinutes = Math.max(1, Math.ceil(minutesNow - baseMinutes));
  const lateFormatted = formatLateDuration(lateMinutes);

  return {
    status: 'late',
    lateMinutes,
    message: `You are late by ${lateFormatted}`
  };
}

/**
 * Formats minutes from midnight or 'HH:mm' string to 12-hour format with AM/PM.
 * @param {number|string} input
 * @returns {string}
 */
export function formatMinutesTo12Hour(input) {
  let mins = typeof input === 'string' ? parseTimeToMinutes(input) : Number(input) || 0;
  mins = ((mins % 1440) + 1440) % 1440;
  const totalH = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const period = totalH >= 12 ? 'PM' : 'AM';
  const h12 = totalH % 12 === 0 ? 12 : totalH % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Evaluates student attendance against either their custom time slot or the institutional session.
 * If the student has a custom timeSlot (e.g. login at 10:00, logout at 19:30), lateness is calculated
 * specifically against their designated login time and grace window.
 *
 * @param {object} params
 * @param {object} params.student - The student object (with optional timeSlot)
 * @param {object} [params.sessionRes] - Result from resolveActiveSession (session, config)
 * @param {number} params.minutesNow - Current time in minutes since midnight
 * @param {object} [params.settings] - System settings (earlyWindowMinutes, lateCountsFrom)
 * @returns {object}
 */
export function evaluateStudentAttendance({ student, sessionRes, minutesNow, settings }) {
  const hasCustomSlot = Boolean(
    student?.timeSlot &&
    student.timeSlot.enabled &&
    student.timeSlot.loginTime
  );

  const earlyWindow = settings?.earlyWindowMinutes ?? 60;
  const lateCountsFrom = settings?.lateCountsFrom || 'start';

  if (hasCustomSlot) {
    const slot = student.timeSlot;
    const morningStartM = parseTimeToMinutes(slot.loginTime || '10:00');
    // Afternoon login time (post-lunch): defaults to afternoonLoginTime, or 14:00 (02:00 PM), or 4 hours after morning login
    const afternoonStartM = slot.afternoonLoginTime
      ? parseTimeToMinutes(slot.afternoonLoginTime)
      : Math.min(1380, Math.max(780, morningStartM + 240));
    const logoutM = slot.logoutTime ? parseTimeToMinutes(slot.logoutTime) : 1439;
    const graceM = slot.graceMinutes !== undefined ? Number(slot.graceMinutes) : 5;

    // Split point: halfway between morning and afternoon login, or afternoonStartM - earlyWindow
    const lunchThreshold = Math.max(
      morningStartM + 60,
      Math.min(Math.floor((morningStartM + afternoonStartM) / 2), afternoonStartM - earlyWindow)
    );

    const isAfternoon = minutesNow >= lunchThreshold;
    const sessionKey = isAfternoon ? 'afternoon' : 'morning';
    const activeStartM = isAfternoon ? afternoonStartM : morningStartM;
    const earlyM = Math.max(0, activeStartM - earlyWindow);
    const sessionName = isAfternoon ? 'Afternoon (Post-Lunch)' : 'Morning';

    const slotLabel = slot.slotLabel || `${formatMinutesTo12Hour(morningStartM)} - ${formatMinutesTo12Hour(logoutM)}`;

    // Too early for morning session
    if (!isAfternoon && minutesNow < earlyM) {
      return {
        allowed: false,
        reason: 'too_early',
        message: `Your morning shift (${formatMinutesTo12Hour(morningStartM)}) opens at ${formatMinutesTo12Hour(earlyM)}.`,
        isCustomSlot: true,
        slotLabel,
        sessionKey: 'morning'
      };
    }

    // Past logout time for the entire day
    if (minutesNow > logoutM) {
      return {
        allowed: false,
        reason: 'closed',
        message: `Your designated shift closed at ${formatMinutesTo12Hour(logoutM)}.`,
        isCustomSlot: true,
        slotLabel,
        sessionKey: 'afternoon'
      };
    }

    // Calculate Present or Late for the active session (Morning or Afternoon)
    let status = 'present';
    let lateMinutes = 0;
    let message = `On time for ${sessionName} session, welcome`;

    if (minutesNow > activeStartM + graceM) {
      status = 'late';
      const base = lateCountsFrom === 'afterGrace' ? (activeStartM + graceM) : activeStartM;
      lateMinutes = Math.max(1, Math.ceil(minutesNow - base));
      message = `You are late by ${formatLateDuration(lateMinutes)} for your ${formatMinutesTo12Hour(activeStartM)} ${sessionName} slot`;
    }

    return {
      allowed: true,
      isCustomSlot: true,
      sessionKey,
      scheduledStart: isAfternoon
        ? (slot.afternoonLoginTime || formatMinutesToTime(afternoonStartM))
        : slot.loginTime,
      scheduledEnd: isAfternoon
        ? slot.logoutTime
        : (slot.afternoonLoginTime || formatMinutesToTime(afternoonStartM)),
      graceMinutes: graceM,
      status,
      lateMinutes,
      message,
      slotLabel: `${slotLabel} (${sessionName})`
    };
  }

  // Fallback: Global institutional session
  if (!sessionRes || !sessionRes.session) {
    return {
      allowed: false,
      reason: sessionRes?.reason || 'closed',
      message: sessionRes?.message || 'Attendance closed for today.',
      isCustomSlot: false
    };
  }

  const sessionConfig = sessionRes.config;
  const statusEval = calculateAttendanceStatus(sessionConfig, minutesNow, lateCountsFrom);

  if (statusEval.status === 'closed') {
    return {
      allowed: false,
      reason: 'closed',
      message: 'Attendance window closed for this session.',
      isCustomSlot: false
    };
  }

  return {
    allowed: true,
    isCustomSlot: false,
    sessionKey: sessionRes.session,
    scheduledStart: sessionConfig.start,
    scheduledEnd: sessionConfig.cutoff,
    graceMinutes: sessionConfig.graceMinutes ?? 5,
    status: statusEval.status,
    lateMinutes: statusEval.lateMinutes,
    message: statusEval.message,
    slotLabel: `${sessionRes.session.toUpperCase()} Session`
  };
}
