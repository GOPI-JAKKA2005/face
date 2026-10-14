/**
 * Maintenance Script: Create Initial Administrator Account & Custom Claim
 * Usage: node server/scripts/createAdmin.js <email> <password>
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });
dotenv.config();

import { getFirebaseAdmin } from '../../api/_lib/firebaseAdmin.js';

async function createAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'Admin@123456';

  console.log(`=== Provisioning Admin Account: ${email} ===`);

  const { auth, db } = getFirebaseAdmin();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`User already exists with UID: ${userRecord.uid}. Updating password & claims...`);
    await auth.updateUser(userRecord.uid, { password });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('Creating new Firebase Auth user...');
      userRecord = await auth.createUser({
        email,
        password,
        emailVerified: true
      });
      console.log(`Created user with UID: ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

  // Set custom claims: { admin: true }
  console.log('Setting custom claim: admin = true...');
  await auth.setCustomUserClaims(userRecord.uid, { admin: true });

  // Ensure default system settings document exists
  const settingsRef = db.collection('settings').doc('system');
  const snap = await settingsRef.get();
  if (!snap.exists) {
    console.log('Initializing default system settings in Cloud Firestore...');
    await settingsRef.set({
      timezone: 'Asia/Kolkata',
      earlyWindowMinutes: 60,
      lateCountsFrom: 'start',
      sessions: {
        morning: { enabled: true, start: '09:00', graceMinutes: 5, cutoff: '11:30' },
        afternoon: { enabled: true, start: '14:00', graceMinutes: 5, cutoff: '16:30' }
      },
      recognition: {
        threshold: 0.45,
        minMarginToSecond: 0.06,
        eyeTolerance: 0.08,
        requireLiveness: true,
        strictLiveness: false,
        requiredConsecutiveFrames: 3,
        cooldownSeconds: 20,
        inputSize: 320
      },
      weekdays: [1, 2, 3, 4, 5, 6],
      holidays: ['2026-10-02'],
      kioskMessage: 'Please look at the camera',
      cacheVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  console.log('\n✅ Admin account successfully created and authorized!');
  console.log(`Email: ${email}`);
  console.log('Custom Claim: admin = true');
}

createAdmin().catch(err => {
  console.error('❌ Error creating admin user:', err.message);
  process.exit(1);
});
