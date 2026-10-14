/**
 * Validates and exposes server environment variables.
 * Uses Yup schema at initialization time to ensure all required secrets exist.
 */

import * as yup from 'yup';

const serverEnvSchema = yup.object({
  FIREBASE_PROJECT_ID: yup.string().required('FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: yup.string().required('FIREBASE_CLIENT_EMAIL is required'),
  FIREBASE_PRIVATE_KEY: yup.string().required('FIREBASE_PRIVATE_KEY is required'),
  ADMIN_EMAILS: yup.string().default('admin@example.com'),
  IMGBB_API_KEY: yup.string().default(''),
  CHAT_PROVIDER_API_KEY: yup.string().default(''),
  CHAT_MODEL: yup.string().default('gemini-1.5-flash'),
  MATCH_THRESHOLD_DEFAULT: yup.number().default(0.45),
  KIOSK_RATE_LIMIT_PER_MIN: yup.number().default(30),
  APP_TIMEZONE: yup.string().default('Asia/Kolkata'),
  CORS_ALLOWED_ORIGINS: yup.string().default('http://localhost:5173')
});

let cachedEnv = null;

export function getServerEnv() {
  if (cachedEnv) return cachedEnv;

  const raw = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS || 'admin@example.com',
    IMGBB_API_KEY: process.env.IMGBB_API_KEY || '',
    CHAT_PROVIDER_API_KEY: process.env.CHAT_PROVIDER_API_KEY || '',
    CHAT_MODEL: process.env.CHAT_MODEL || 'gemini-1.5-flash',
    MATCH_THRESHOLD_DEFAULT: process.env.MATCH_THRESHOLD_DEFAULT ? Number(process.env.MATCH_THRESHOLD_DEFAULT) : 0.45,
    KIOSK_RATE_LIMIT_PER_MIN: process.env.KIOSK_RATE_LIMIT_PER_MIN ? Number(process.env.KIOSK_RATE_LIMIT_PER_MIN) : 30,
    APP_TIMEZONE: process.env.APP_TIMEZONE || 'Asia/Kolkata',
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173'
  };

  try {
    cachedEnv = serverEnvSchema.validateSync(raw, { abortEarly: false, stripUnknown: true });
    return cachedEnv;
  } catch (err) {
    if (err.inner && err.inner.length > 0) {
      const messages = err.inner.map(e => e.message).join(', ');
      throw new Error(`Server environment configuration error: ${messages}`);
    }
    throw err;
  }
}
