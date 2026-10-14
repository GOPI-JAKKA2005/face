/**
 * Eye-region signature calculations based on 68 facial landmarks.
 * Performs roll angle correction, inter-ocular distance normalization,
 * and extracts an 8-dimensional geometric descriptor.
 */

/**
 * Calculates Euclidean distance between two 2D points [x, y].
 */
export function pointDist(p1, p2) {
  const dx = p1.x !== undefined ? p1.x - p2.x : p1[0] - p2[0];
  const dy = p1.y !== undefined ? p1.y - p2.y : p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates centroid of an array of points.
 */
export function centerOf(points) {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    const x = p.x !== undefined ? p.x : p[0];
    const y = p.y !== undefined ? p.y : p[1];
    sx += x;
    sy += y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

/**
 * Normalizes 68 landmarks by rotating them so the eye axis is horizontal.
 * @param {Array<{x: number, y: number}>|Array<[number, number]>} landmarks - 68 points
 * @returns {Array<{x: number, y: number}>}
 */
export function rotateLandmarksToHorizontal(landmarks) {
  const pts = landmarks.map(p => ({
    x: p.x !== undefined ? p.x : p[0],
    y: p.y !== undefined ? p.y : p[1]
  }));

  // Right eye landmarks: 36-41 (indices in 68-point model)
  // Left eye landmarks: 42-47
  // Note: in face-api landmark indexing, right eye (viewer's left) is 36-41, left eye is 42-47
  const rEyeCenter = centerOf(pts.slice(36, 42));
  const lEyeCenter = centerOf(pts.slice(42, 48));

  const dy = lEyeCenter.y - rEyeCenter.y;
  const dx = lEyeCenter.x - rEyeCenter.x;
  const angle = Math.atan2(dy, dx); // roll angle

  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  // Rotate around midpoint of the two eye centers
  const midX = (rEyeCenter.x + lEyeCenter.x) / 2;
  const midY = (rEyeCenter.y + lEyeCenter.y) / 2;

  return pts.map(p => {
    const x = p.x - midX;
    const y = p.y - midY;
    return {
      x: x * cos - y * sin + midX,
      y: x * sin + y * cos + midY
    };
  });
}

/**
 * Computes Eye Aspect Ratio (EAR) for blink detection.
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 */
export function computeEyeAspectRatio(eyePts) {
  const pts = eyePts.map(p => ({
    x: p.x !== undefined ? p.x : p[0],
    y: p.y !== undefined ? p.y : p[1]
  }));
  const v1 = pointDist(pts[1], pts[5]);
  const v2 = pointDist(pts[2], pts[4]);
  const h = pointDist(pts[0], pts[3]);
  if (h === 0) return 0;
  return (v1 + v2) / (2.0 * h);
}

/**
 * Computes the 8-value eye-region signature vector.
 *
 * Vector components normalized by Inter-ocular Distance D:
 * 1. Left eye width / D
 * 2. Right eye width / D
 * 3. Left eye height / D
 * 4. Right eye height / D
 * 5. Left eye center to left eyebrow center / D
 * 6. Right eye center to right eyebrow center / D
 * 7. Eye-line midpoint to nose tip / D
 * 8. Left eye center to nose tip / Right eye center to nose tip (symmetry ratio)
 *
 * @param {Array<{x: number, y: number}>|Array<[number, number]>} landmarks - 68 points
 * @returns {number[]} 8 numbers rounded to 4 decimals
 */
export function computeEyeVector(landmarks) {
  if (!landmarks || landmarks.length < 68) {
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }

  // Roll-correction rotation
  const pts = rotateLandmarksToHorizontal(landmarks);

  const rEyePts = pts.slice(36, 42);
  const lEyePts = pts.slice(42, 48);
  const rBrowPts = pts.slice(17, 22);
  const lBrowPts = pts.slice(22, 27);
  const noseTip = pts[30]; // Landmark 30 is nose tip

  const rEyeCenter = centerOf(rEyePts);
  const lEyeCenter = centerOf(lEyePts);
  const rBrowCenter = centerOf(rBrowPts);
  const lBrowCenter = centerOf(lBrowPts);

  const eyeMidpoint = {
    x: (rEyeCenter.x + lEyeCenter.x) / 2,
    y: (rEyeCenter.y + lEyeCenter.y) / 2
  };

  const D = pointDist(rEyeCenter, lEyeCenter);
  if (D <= 0.0001) {
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }

  // 1. Left eye width / D (pts 42 to 45)
  const lWidth = pointDist(lEyePts[0], lEyePts[3]) / D;

  // 2. Right eye width / D (pts 36 to 39)
  const rWidth = pointDist(rEyePts[0], rEyePts[3]) / D;

  // 3. Left eye height / D (average of vertical points)
  const lHeight = ((pointDist(lEyePts[1], lEyePts[5]) + pointDist(lEyePts[2], lEyePts[4])) / 2) / D;

  // 4. Right eye height / D
  const rHeight = ((pointDist(rEyePts[1], rEyePts[5]) + pointDist(rEyePts[2], rEyePts[4])) / 2) / D;

  // 5. Left eye center to left brow center / D
  const lBrowDist = pointDist(lEyeCenter, lBrowCenter) / D;

  // 6. Right eye center to right brow center / D
  const rBrowDist = pointDist(rEyeCenter, rBrowCenter) / D;

  // 7. Eye midpoint to nose tip / D
  const noseDist = pointDist(eyeMidpoint, noseTip) / D;

  // 8. Symmetry ratio: Left eye to nose tip / Right eye to nose tip
  const distLToNose = pointDist(lEyeCenter, noseTip);
  const distRToNose = pointDist(rEyeCenter, noseTip);
  const symmetry = distRToNose > 0.0001 ? (distLToNose / distRToNose) : 1;

  const vector = [
    lWidth,
    rWidth,
    lHeight,
    rHeight,
    lBrowDist,
    rBrowDist,
    noseDist,
    symmetry
  ];

  return vector.map(v => Math.round(v * 10000) / 10000);
}

/**
 * Calculates Mean Absolute Error between two 8-element eye vectors.
 * @param {number[]} v1
 * @param {number[]} v2
 * @returns {number}
 */
export function eyeVectorDifference(v1, v2) {
  if (!v1 || !v2 || v1.length !== 8 || v2.length !== 8) return 1.0;
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Math.abs(v1[i] - v2[i]);
  }
  return sum / 8;
}
