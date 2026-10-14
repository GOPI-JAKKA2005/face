/**
 * Shared Yup validation schemas for server and client.
 * Enforces strict input validation, strips unknown properties.
 */

import * as yup from 'yup';

// HH:mm regex for 24-hour time
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Student Schema
export const studentSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must not exceed 80 characters')
    .matches(/^[A-Za-z\s.'-]+$/, 'Name can only contain letters, spaces, dots, hyphens, and apostrophes')
    .required('Name is required'),
  rollNo: yup
    .string()
    .trim()
    .transform(v => (v ? v.toUpperCase() : v))
    .min(1, 'Roll number is required')
    .max(20, 'Roll number must not exceed 20 characters')
    .matches(/^[A-Z0-9-]+$/, 'Roll number must contain uppercase letters, numbers, and hyphens only')
    .required('Roll number is required'),
  mobile: yup
    .string()
    .transform(v => (v ? v.replace(/\s+/g, '') : v))
    .matches(/^[6-9]\d{9}$/, 'Mobile number must be a valid 10-digit Indian phone number starting with 6-9')
    .required('Mobile number is required'),
  className: yup
    .string()
    .trim()
    .max(40, 'Class/Batch must not exceed 40 characters')
    .default(''),
  photoUrl: yup.string().url().nullable(),
  active: yup.boolean().default(true),
  timeSlot: yup.object({
    enabled: yup.boolean().default(false),
    loginTime: yup.string().matches(timeRegex, 'Must be valid HH:mm time').nullable(),
    afternoonLoginTime: yup.string().matches(timeRegex, 'Must be valid HH:mm time').nullable(),
    logoutTime: yup.string().matches(timeRegex, 'Must be valid HH:mm time').nullable(),
    graceMinutes: yup.number().integer().min(0).max(120).default(5),
    slotLabel: yup.string().max(80).nullable()
  }).nullable().default(null),
  consent: yup
    .boolean()
    .oneOf([true], 'Biometric collection consent must be accepted')
    .required('Consent is required')
});

// Enrolled Signature Samples Schema
export const samplesSchema = yup.array().of(
  yup.object({
    descriptor: yup
      .array()
      .of(yup.number().test('is-finite', 'Must be finite', v => typeof v === 'number' && Number.isFinite(v)).required())
      .length(128, 'Face descriptor must have exactly 128 dimensions')
      .required(),
    eye: yup
      .array()
      .of(yup.number().test('is-finite', 'Must be finite', v => typeof v === 'number' && Number.isFinite(v)).required())
      .length(8, 'Eye vector must have exactly 8 dimensions')
      .required(),
    quality: yup.number().min(0).max(1).default(1)
  })
).min(5, 'Minimum 5 samples required').max(12, 'Maximum 12 samples allowed');

// Login Schema
export const loginSchema = yup.object({
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required')
});

// Session Configuration Schema
const singleSessionSchema = yup.object({
  enabled: yup.boolean().default(true),
  start: yup.string().matches(timeRegex, 'Must be valid HH:mm time').required(),
  graceMinutes: yup.number().integer().min(0).max(120).default(5),
  cutoff: yup.string().matches(timeRegex, 'Must be valid HH:mm time').required()
}).test('start-before-cutoff', 'Start time must be strictly before cutoff time', function (session) {
  if (!session || !session.start || !session.cutoff) return true;
  const [sh, sm] = session.start.split(':').map(Number);
  const [ch, cm] = session.cutoff.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const cutoffMin = ch * 60 + cm;
  return startMin < cutoffMin;
});

export const sessionSettingsSchema = yup.object({
  timezone: yup.string().default('Asia/Kolkata'),
  timeFormat: yup.string().oneOf(['12h', '24h']).default('12h'),
  earlyWindowMinutes: yup.number().integer().min(0).max(180).default(60),
  lateCountsFrom: yup.string().oneOf(['start', 'afterGrace']).default('start'),
  sessions: yup.object({
    morning: singleSessionSchema.required(),
    afternoon: singleSessionSchema.required()
  }).test('no-session-overlap', 'Morning cutoff must not overlap afternoon opening window', function (sessions) {
    if (!sessions || !sessions.morning || !sessions.afternoon) return true;
    if (sessions.morning.enabled === false || sessions.afternoon.enabled === false) return true;
    const [mh, mm] = sessions.morning.cutoff.split(':').map(Number);
    const [ah, am] = sessions.afternoon.start.split(':').map(Number);
    const morningCutoff = mh * 60 + mm;
    const afternoonStart = ah * 60 + am;
    return morningCutoff <= afternoonStart;
  }),
  weekdays: yup.array().of(yup.number().integer().min(1).max(7)).default([1, 2, 3, 4, 5, 6]),
  holidays: yup.array().of(yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Holidays must be YYYY-MM-DD')).default([]),
  kioskMessage: yup.string().default('Please look at the camera')
});

// Recognition Settings Schema
export const recognitionSettingsSchema = yup.object({
  threshold: yup.number().min(0.30).max(0.60).default(0.45),
  minMarginToSecond: yup.number().min(0.02).max(0.20).default(0.06),
  eyeTolerance: yup.number().min(0.02).max(0.25).default(0.08),
  requireLiveness: yup.boolean().default(true),
  strictLiveness: yup.boolean().default(false),
  requiredConsecutiveFrames: yup.number().integer().min(1).max(10).default(3),
  cooldownSeconds: yup.number().integer().min(5).max(120).default(20),
  inputSize: yup.number().oneOf([320, 416, 512, 608]).default(320)
});

// Manual Mark Schema
export const manualMarkSchema = yup.object({
  studentId: yup.string().required('Student ID is required'),
  dateKey: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').required(),
  session: yup.string().oneOf(['morning', 'afternoon']).required('Session is required'),
  status: yup.string().oneOf(['present', 'late', 'absent']).required('Status is required'),
  customMarkedAt: yup.string().nullable(),
  reason: yup.string().trim().min(5, 'Reason must be at least 5 characters').required('Reason is required')
});

// Media Schema
export const mediaSchema = yup.object({
  title: yup.string().trim().min(1).max(80).required('Title is required'),
  sizeBytes: yup.number().max(512000, 'Media size cannot exceed 500 KB (512,000 bytes)').required(),
  mime: yup.string().oneOf(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']).required()
});

// Public Kiosk Mark Schema
export const kioskMarkSchema = yup.object({
  descriptor: yup
    .array()
    .of(yup.number().test('is-finite', 'Must be finite', v => typeof v === 'number' && Number.isFinite(v)).required())
    .length(128, 'Descriptor must be exactly 128 finite numbers')
    .required(),
  eye: yup
    .array()
    .of(yup.number().test('is-finite', 'Must be finite', v => typeof v === 'number' && Number.isFinite(v)).required())
    .length(8, 'Eye vector must be exactly 8 numbers')
    .required(),
  liveness: yup.boolean().default(false),
  frames: yup.number().integer().min(1).default(1)
});
