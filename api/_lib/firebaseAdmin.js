/**
 * Firebase Admin SDK Singleton for Vercel Serverless Functions.
 * Caches instance on globalThis to optimize cold start performance.
 */

import admin from 'firebase-admin';
import { getServerEnv } from './env.js';
import { localDb, localAuth } from './localDb.js';

let appInstance = null;

export function getFirebaseAdmin() {
  const env = getServerEnv();

  // If Firebase project credentials are not supplied, fallback gracefully to local store
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return {
      admin,
      app: null,
      db: localDb,
      auth: localAuth,
      isLocalFallback: true
    };
  }

  if (globalThis._firebaseAdminApp) {
    appInstance = globalThis._firebaseAdminApp;
  }

  if (!appInstance) {
    if (admin.apps.length > 0) {
      appInstance = admin.apps[0];
    } else {
      const privateKey = env.FIREBASE_PRIVATE_KEY
        ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      appInstance = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      });
    }
    globalThis._firebaseAdminApp = appInstance;
  }

  const db = appInstance.firestore();
  const auth = appInstance.auth();

  return { admin, app: appInstance, db, auth };
}
