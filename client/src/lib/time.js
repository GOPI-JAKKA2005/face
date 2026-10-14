/**
 * Client-side time display helpers.
 * Formats timestamps and dates safely in Asia/Kolkata timezone.
 * Handles Date objects, ISO strings, numbers, Firestore Timestamp objects ({ _seconds, seconds }),
 * and safely falls back without throwing RangeError.
 */

export const DEFAULT_TIMEZONE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_TIMEZONE) || 'Asia/Kolkata';

/**
 * Safely parses any date/timestamp representation into a valid JavaScript Date.
 * @param {any} dateInput
 * @returns {Date|null}
 */
export function parseDateInput(dateInput) {
  if (!dateInput) return null;

  // If already a Date instance
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  // Firestore Timestamp instance with .toDate()
  if (typeof dateInput.toDate === 'function') {
    try {
      const d = dateInput.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch (_e) {
      return null;
    }
  }

  // Serialized Firestore timestamp object: { _seconds, _nanoseconds } or { seconds, nanoseconds }
  if (typeof dateInput === 'object') {
    const sec = dateInput._seconds !== undefined ? dateInput._seconds : dateInput.seconds;
    if (typeof sec === 'number' && !isNaN(sec)) {
      const nano = dateInput._nanoseconds !== undefined ? dateInput._nanoseconds : (dateInput.nanoseconds || 0);
      const ms = sec * 1000 + Math.round(nano / 1000000);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Number timestamp (milliseconds or seconds)
  if (typeof dateInput === 'number') {
    if (isNaN(dateInput)) return null;
    const ms = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // String timestamp
  if (typeof dateInput === 'string') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function formatTimeDisplay(dateInput, timeZone = DEFAULT_TIMEZONE) {
  const d = parseDateInput(dateInput);
  if (!d) return '--:--';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d);
  } catch (_e) {
    return '--:--';
  }
}

export function formatDateDisplay(dateInput, timeZone = DEFAULT_TIMEZONE) {
  const d = parseDateInput(dateInput);
  if (!d) return '--';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  } catch (_e) {
    return '--';
  }
}

export function formatDateTimeDisplay(dateInput, timeZone = DEFAULT_TIMEZONE) {
  const d = parseDateInput(dateInput);
  if (!d) return '--';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d);
  } catch (_e) {
    return '--';
  }
}

export function parseTimeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutesToTime(totalMinutes, { hour12 = false } = {}) {
  if (hour12) {
    return formatMinutesTo12Hour(totalMinutes);
  }
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.floor(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats minutes from midnight or 'HH:mm' string to 12-hour format with AM/PM.
 * e.g. 570 or '09:30' -> '09:30 AM'
 * e.g. 810 or '13:30' -> '01:30 PM'
 * e.g. 840 or '14:00' -> '02:00 PM'
 * e.g. 1170 or '19:30' -> '07:30 PM'
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
 * Converts a 24-hour 'HH:mm' string to 12-hour parts { hour12, minute, period }.
 * @param {string} hhmm
 * @returns {{ hour12: number, minute: number, period: 'AM'|'PM' }}
 */
export function parse24To12(hhmm) {
  const mins = parseTimeToMinutes(hhmm);
  const totalH = Math.floor(mins / 60);
  const m = mins % 60;
  const period = totalH >= 12 ? 'PM' : 'AM';
  const h12 = totalH % 12 === 0 ? 12 : totalH % 12;
  return {
    hour12: h12,
    minute: m,
    period
  };
}

/**
 * Converts 12-hour parts back to 24-hour 'HH:mm' string.
 * @param {number|string} hour12
 * @param {number|string} minute
 * @param {'AM'|'PM'} period
 * @returns {string}
 */
export function format12To24(hour12, minute, period) {
  let h = Number(hour12) || 12;
  const m = Math.min(59, Math.max(0, Number(minute) || 0));
  if (h === 12) {
    h = period === 'AM' ? 0 : 12;
  } else if (period === 'PM') {
    h += 12;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats late duration in minutes into a human-friendly string.
 * Under 60 minutes: e.g. "30 min" or "+30 min"
 * 60 minutes and over: converts to hours and minutes, e.g. "1 hr", "2 hr", "3 hr 42 min"
 * @param {number} totalMinutes
 * @param {object} [options]
 * @param {boolean} [options.prefix=false]
 * @returns {string}
 */
export function formatLateDuration(totalMinutes, { prefix = false } = {}) {
  const m = Math.round(Number(totalMinutes) || 0);
  if (m <= 0) return '-';

  let text = '';
  if (m < 60) {
    text = `${m} min`;
  } else {
    const hrs = Math.floor(m / 60);
    const remMins = m % 60;
    if (remMins === 0) {
      text = `${hrs} hr`;
    } else {
      text = `${hrs} hr ${remMins} min`;
    }
  }

  return prefix ? `+${text}` : text;
}
