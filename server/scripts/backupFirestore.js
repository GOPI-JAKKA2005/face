/**
 * Maintenance Script: Export Firestore Collections to Dated JSON Files
 * Usage: node server/scripts/backupFirestore.js [--include-signatures]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });
dotenv.config();

import { getFirebaseAdmin } from '../../api/_lib/firebaseAdmin.js';

async function backup() {
  const includeSignatures = process.argv.includes('--include-signatures');

  if (includeSignatures) {
    console.warn('\n⚠️ CAUTION: --include-signatures flag detected. Biometric signature vectors will be exported.');
    console.warn('Treat the resulting backup file as highly sensitive biometric data.\n');
  }

  const { db } = getFirebaseAdmin();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(`./backup-${dateStr}`);

  fs.mkdirSync(backupDir, { recursive: true });

  const collections = ['students', 'attendance', 'settings', 'media'];
  if (includeSignatures) {
    collections.push('signatures');
  }

  console.log(`=== Exporting Firestore Collections to ${backupDir} ===`);

  for (const col of collections) {
    console.log(`Exporting collection: ${col}...`);
    const snap = await db.collection(col).get();
    const data = [];

    snap.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    const filePath = path.join(backupDir, `${col}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ Exported ${data.length} documents to ${col}.json`);
  }

  console.log('\n✅ Firestore backup completed successfully.');
}

backup().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
