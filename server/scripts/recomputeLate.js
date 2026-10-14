/**
 * Maintenance Script: Recalculate historical late minutes across attendance records.
 * Uses current system session settings or specified date range.
 * Usage: node server/scripts/recomputeLate.js [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });
dotenv.config();

import { getFirebaseAdmin } from '../../api/_lib/firebaseAdmin.js';
import { getTimeInZone, calculateAttendanceStatus } from '../../api/_lib/time.js';

async function recomputeLate() {
  const { db } = getFirebaseAdmin();

  console.log('=== Recomputing Attendance Late Minutes ===');

  const settingsSnap = await db.collection('settings').doc('system').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const sessions = settings.sessions || {};
  const timezone = settings.timezone || 'Asia/Kolkata';
  const lateCountsFrom = settings.lateCountsFrom || 'start';

  const attSnap = await db.collection('attendance').get();
  let updatedCount = 0;
  const batch = db.batch();

  attSnap.forEach(doc => {
    const data = doc.data();
    if (data.status === 'present' || data.status === 'late') {
      const sessionConfig = sessions[data.session];
      if (sessionConfig && data.markedAt) {
        const markedDate = data.markedAt.toDate ? data.markedAt.toDate() : new Date(data.markedAt);
        const timeInfo = getTimeInZone(markedDate, timezone);

        const statusRes = calculateAttendanceStatus(
          sessionConfig,
          timeInfo.minutesSinceMidnight,
          lateCountsFrom
        );

        if (statusRes.lateMinutes !== data.lateMinutes || statusRes.status !== data.status) {
          batch.update(doc.ref, {
            lateMinutes: statusRes.lateMinutes,
            status: statusRes.status,
            recomputedAt: new Date()
          });
          updatedCount++;
        }
      }
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`✅ Successfully recomputed ${updatedCount} attendance records.`);
  } else {
    console.log('All attendance records match current session calculations.');
  }
}

recomputeLate().catch(err => {
  console.error('❌ Recompute error:', err.message);
  process.exit(1);
});
