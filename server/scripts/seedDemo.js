/**
 * DEMO SEED SCRIPT (server/scripts/seedDemo.js)
 * CLEARLY LABELLED FOR DEVELOPMENT / DEMONSTRATION USE ONLY.
 * Inserts sample students and attendance records to visualize dashboard charts.
 * Usage: node server/scripts/seedDemo.js
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });
dotenv.config();

import { getFirebaseAdmin } from '../../api/_lib/firebaseAdmin.js';

async function seedDemo() {
  console.log('=== SEEDING DEMO DATA (FOR DEVELOPMENT/DEMO ONLY) ===');

  const { db } = getFirebaseAdmin();
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  const demoStudents = [
    { name: 'Aditi Sharma', rollNo: 'CS-101', mobile: '9876543210', className: 'Batch 2026-A' },
    { name: 'Rohan Verma', rollNo: 'CS-102', mobile: '9876543211', className: 'Batch 2026-A' },
    { name: 'Priya Patel', rollNo: 'CS-103', mobile: '9876543212', className: 'Batch 2026-B' },
    { name: 'Kavya Nair', rollNo: 'CS-104', mobile: '9876543213', className: 'Batch 2026-B' },
    { name: 'Aryan Singh', rollNo: 'CS-105', mobile: '9876543214', className: 'Batch 2026-A' }
  ];

  for (const s of demoStudents) {
    const studentRef = db.collection('students').doc();
    const rollRef = db.collection('rollIndex').doc(s.rollNo);

    await studentRef.set({
      name: s.name,
      rollNo: s.rollNo,
      mobile: s.mobile,
      className: s.className,
      photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=4F46E5&color=fff&size=512`,
      active: true,
      signatureCount: 8,
      enrolledAt: now,
      createdAt: now,
      updatedAt: now,
      isDemoData: true
    });

    await rollRef.set({
      studentId: studentRef.id,
      createdAt: now
    });

    // Create attendance record
    const attRef = db.collection('attendance').doc(`${dateKey}_morning_${studentRef.id}`);
    await attRef.set({
      studentId: studentRef.id,
      name: s.name,
      rollNo: s.rollNo,
      dateKey,
      session: 'morning',
      status: s.rollNo === 'CS-102' ? 'late' : 'present',
      markedAt: now,
      scheduledStart: '09:00',
      graceMinutes: 5,
      lateMinutes: s.rollNo === 'CS-102' ? 12 : 0,
      method: 'face',
      confidence: 0.94,
      distance: 0.28,
      markedBy: 'kiosk',
      isDemoData: true
    });

    console.log(`✓ Seeded demo student: ${s.name} (${s.rollNo})`);
  }

  console.log('\n✅ Demo dataset seeded successfully.');
}

seedDemo().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
