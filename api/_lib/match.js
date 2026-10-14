/**
 * Biometric signature matching engine.
 * Computes Euclidean distances, evaluates gap to second-best candidate,
 * enforces eye-vector tolerance, and maintains a high-performance in-memory cache.
 */

import { eyeVectorDifference } from './eye.js';
import { getFirebaseAdmin } from './firebaseAdmin.js';

// In-memory student signatures cache for fast serverless matching
let cachedSignatures = null;
let cacheExpiresAt = 0;
let cachedVersion = 0;

/**
 * Computes Euclidean distance between two numeric arrays.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return 999.0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculates match confidence normalized to [0, 1].
 * @param {number} distance
 * @param {number} threshold
 * @returns {number}
 */
export function calculateConfidence(distance, threshold) {
  if (threshold <= 0) return 0;
  const raw = 1.0 - (distance / threshold);
  const clamped = Math.max(0.0, Math.min(1.0, raw));
  return Math.round(clamped * 100) / 100;
}

/**
 * Invalidates the module's signature cache.
 */
export function invalidateSignatureCache() {
  cachedSignatures = null;
  cacheExpiresAt = 0;
}

/**
 * Fetches all active students and signatures, caching them in module memory for 60 seconds.
 */
export async function getActiveStudentSignatures() {
  const now = Date.now();
  const { db } = getFirebaseAdmin();

  // Check cache version
  let currentVersion = 1;
  try {
    const settingsDoc = await db.collection('settings').doc('system').get();
    if (settingsDoc.exists) {
      currentVersion = settingsDoc.data().cacheVersion || 1;
    }
  } catch (_e) {
    // If settings not yet created, default to 1
  }

  if (cachedSignatures && now < cacheExpiresAt && cachedVersion === currentVersion) {
    return cachedSignatures;
  }

  // Fetch active students
  const studentsSnap = await db.collection('students')
    .where('active', '==', true)
    .get();

  const activeStudents = new Map();
  studentsSnap.forEach(doc => {
    activeStudents.set(doc.id, { id: doc.id, ...doc.data() });
  });

  if (activeStudents.size === 0) {
    cachedSignatures = [];
    cacheExpiresAt = now + 60000;
    cachedVersion = currentVersion;
    return cachedSignatures;
  }

  // Fetch signatures
  const signaturesSnap = await db.collection('signatures').get();
  const list = [];

  signaturesSnap.forEach(doc => {
    const student = activeStudents.get(doc.id);
    if (!student) return;

    const data = doc.data();
    if (data.mean && data.mean.descriptor) {
      list.push({
        studentId: doc.id,
        student,
        mean: data.mean,
        samples: data.samples || []
      });
    }
  });

  cachedSignatures = list;
  cacheExpiresAt = now + 60000;
  cachedVersion = currentVersion;

  return cachedSignatures;
}

/**
 * Evaluates an incoming biometric signature against all enrolled active students.
 *
 * Matching Algorithm (Section 9.6):
 * 1. Calculate distance from incoming descriptor to each student's mean descriptor.
 * 2. Pick top 3 candidates.
 * 3. For the best candidate, calculate min distance across individual samples.
 * 4. Verify: bestDistance <= threshold
 * 5. Verify: secondBestDistance - bestDistance >= minMarginToSecond
 * 6. Verify: eye MAE <= eyeTolerance
 *
 * @param {object} params
 * @param {number[]} params.descriptor - 128 float values
 * @param {number[]} params.eye - 8 float values
 * @param {object} params.recognitionSettings - { threshold, minMarginToSecond, eyeTolerance }
 * @returns {Promise<object>} Match result
 */
export async function matchBiometricSignature({
  descriptor,
  eye,
  recognitionSettings = {}
}) {
  const threshold = recognitionSettings.threshold ?? 0.45;
  const minMarginToSecond = recognitionSettings.minMarginToSecond ?? 0.06;
  const eyeTolerance = recognitionSettings.eyeTolerance ?? 0.12;

  const signatures = await getActiveStudentSignatures();

  if (signatures.length === 0) {
    return { matched: false, reason: 'no_match' };
  }

  // Compute distances to mean descriptors
  const candidates = signatures.map(entry => {
    const meanDist = euclideanDistance(descriptor, entry.mean.descriptor);
    return {
      entry,
      meanDist
    };
  });

  // Sort ascending by distance
  candidates.sort((a, b) => a.meanDist - b.meanDist);

  const bestCandidate = candidates[0];
  let bestDistance = bestCandidate.meanDist;

  // Check individual samples of best candidate to see if any sample is an even closer match
  if (bestCandidate.entry.samples && bestCandidate.entry.samples.length > 0) {
    for (const sample of bestCandidate.entry.samples) {
      if (sample.descriptor) {
        const sampleDist = euclideanDistance(descriptor, sample.descriptor);
        if (sampleDist < bestDistance) {
          bestDistance = sampleDist;
        }
      }
    }
  }

  // Check 1: Must be under threshold
  if (bestDistance > threshold) {
    return { matched: false, reason: 'no_match', bestDistance };
  }

  // Check 2: Ambiguity margin to second best candidate
  if (candidates.length > 1) {
    const secondCandidate = candidates[1];
    const margin = secondCandidate.meanDist - bestDistance;
    if (margin < minMarginToSecond) {
      return {
        matched: false,
        reason: 'ambiguous',
        margin,
        minMarginToSecond
      };
    }
  }

  // Check 3: Eye vector secondary verification
  if (eye && eye.length === 8 && bestCandidate.entry.mean.eye) {
    const eyeDiff = eyeVectorDifference(eye, bestCandidate.entry.mean.eye);
    const effectiveTolerance = bestDistance < 0.38 ? Math.max(eyeTolerance, 0.16) : eyeTolerance;
    if (eyeDiff > effectiveTolerance) {
      return {
        matched: false,
        reason: 'no_match',
        eyeDiff,
        eyeTolerance: effectiveTolerance
      };
    }
  }

  const confidence = calculateConfidence(bestDistance, threshold);

  return {
    matched: true,
    studentId: bestCandidate.entry.studentId,
    student: bestCandidate.entry.student,
    distance: Math.round(bestDistance * 10000) / 10000,
    confidence
  };
}
