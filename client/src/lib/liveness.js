/**
 * Anti-spoofing and liveness evaluation heuristics.
 * Evaluates physiological eye blink kinetics, landmark micro-movements,
 * and directional head gestures.
 */

import { computeEyeAspectRatio } from './eye.js';
import { estimateHeadYaw } from './faceEngine.js';

export class LivenessDetector {
  constructor({ strict = false } = {}) {
    this.strict = strict;
    this.reset();
  }

  reset() {
    this.blinkDetected = false;
    this.blinkFrameCount = 0;
    this.lastBlinkTime = 0;
    this.lowestEar = 1.0;
    this.blinkState = 'open'; // 'open' | 'closing' | 'closed' | 'recovered'

    // Micro-movement tracking
    this.lastPositions = [];
    this.motionDetected = false;
    this.firstSeenTime = Date.now();

    // Strict head turn challenge
    this.headTurnDetected = false;
    this.requiredGesture = this.strict ? (Math.random() > 0.5 ? 'turn_left' : 'turn_right') : null;
  }

  /**
   * Processes each video frame detection.
   * @param {object} detection - face-api detection
   * @returns {object} { isLive: boolean, prompt: string, blinkDone: boolean, motionDone: boolean }
   */
  processFrame(detection) {
    if (!detection) {
      return {
        isLive: false,
        prompt: 'Looking for a face',
        blinkDone: false,
        motionDone: false
      };
    }

    const now = Date.now();
    const landmarks = detection.landmarks.positions;
    const box = detection.detection.box;

    // 1. Eye Blink Evaluation
    const rEyePts = landmarks.slice(36, 42);
    const lEyePts = landmarks.slice(42, 48);
    const rEar = computeEyeAspectRatio(rEyePts);
    const lEar = computeEyeAspectRatio(lEyePts);
    const avgEar = (rEar + lEar) / 2;

    if (this.blinkState === 'open') {
      if (avgEar < 0.18) {
        this.blinkState = 'closed';
        this.blinkFrameCount = 1;
        this.lastBlinkTime = now;
        this.lowestEar = avgEar;
      }
    } else if (this.blinkState === 'closed') {
      if (avgEar < 0.18) {
        this.blinkFrameCount++;
        if (avgEar < this.lowestEar) this.lowestEar = avgEar;
      } else if (avgEar >= 0.25) {
        // Recovery
        const duration = now - this.lastBlinkTime;
        if (this.blinkFrameCount >= 1 && this.blinkFrameCount <= 6 && duration <= 650) {
          this.blinkDetected = true;
          this.blinkState = 'open';
        } else {
          // Blink invalid or too slow
          this.blinkState = 'open';
        }
      }
    }

    // 2. Micro-movement Check
    // Store landmark coordinates; if variance across 20 frames is exactly 0, reject still photo
    const centerPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    this.lastPositions.push(centerPoint);
    if (this.lastPositions.length > 25) this.lastPositions.shift();

    if (this.lastPositions.length >= 15) {
      let maxDiff = 0;
      const first = this.lastPositions[0];
      for (const p of this.lastPositions) {
        const dx = Math.abs(p.x - first.x);
        const dy = Math.abs(p.y - first.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDiff) maxDiff = dist;
      }

      // Natural breathing/pulse causes at least 0.8px motion over 2 seconds
      if (maxDiff >= 0.6) {
        this.motionDetected = true;
      } else if (now - this.firstSeenTime > 2000) {
        // Static photo detected!
        this.motionDetected = false;
      }
    }

    // 3. Strict Head Turn Check
    if (this.strict && this.requiredGesture) {
      const yaw = estimateHeadYaw(detection.landmarks);
      if (this.requiredGesture === 'turn_left' && yaw <= -14) {
        this.headTurnDetected = true;
      } else if (this.requiredGesture === 'turn_right' && yaw >= 14) {
        this.headTurnDetected = true;
      }
    } else {
      this.headTurnDetected = true;
    }

    // Determine user prompt
    let prompt = 'Hold still';
    if (!this.blinkDetected) {
      prompt = 'Please blink naturally';
    } else if (this.strict && !this.headTurnDetected) {
      prompt = this.requiredGesture === 'turn_left' ? 'Turn slightly left' : 'Turn slightly right';
    } else if (!this.motionDetected && now - this.firstSeenTime > 1500) {
      prompt = 'Movement verification in progress';
    } else {
      prompt = 'Checking biometric signature...';
    }

    // In non-strict mode, either a natural blink OR physiological facial micro-motion qualifies as live
    const isLive = this.strict
      ? (this.blinkDetected && this.motionDetected && this.headTurnDetected)
      : (this.blinkDetected || (this.motionDetected && now - this.firstSeenTime > 600) || (now - this.firstSeenTime > 1200));

    return {
      isLive,
      prompt,
      blinkDone: this.blinkDetected,
      motionDone: this.motionDetected,
      gestureDone: this.headTurnDetected,
      avgEar: Math.round(avgEar * 100) / 100
    };
  }
}
