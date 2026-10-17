import { useState, useEffect, useRef } from 'react';
import { detectFaceWithFeatures, extractBiometricSignature, evaluateQuality } from '../../lib/faceEngine.js';
import { LivenessDetector } from '../../lib/liveness.js';
import { api } from '../../lib/api.js';

export function useRecognitionLoop({
  cameraRef,
  videoRef,
  videoEl: propVideoEl,
  isActive = true,
  config = {},
  _soundEnabled = true,
  onResult = () => {}
}) {
  const [overlayState, setOverlayState] = useState('looking');
  const [prompt, setPrompt] = useState('Position face inside the oval');
  const [currentResult, setCurrentResult] = useState(null);

  // Buffer of consecutive stable frames
  const frameBuffer = useRef([]);
  const livenessDetector = useRef(new LivenessDetector({ strict: Boolean(config.strictLiveness) }));
  const cooldownMap = useRef(new Map()); // studentId -> expiresAt
  const submitting = useRef(false);
  const resultDisplayUntil = useRef(0);

  const requiredFrames = config.requiredConsecutiveFrames || 3;
  const cooldownSecs = config.cooldownSeconds || 20;

  useEffect(() => {
    livenessDetector.current = new LivenessDetector({ strict: Boolean(config.strictLiveness) });
  }, [config.strictLiveness]);

  // Helper to dynamically obtain the video element from prop or refs
  const getVideo = () => {
    if (propVideoEl && propVideoEl.readyState >= 2) return propVideoEl;
    const ref = cameraRef || videoRef;
    if (!ref) return propVideoEl || null;
    if (typeof ref === 'function') {
      try { return ref(); } catch (_e) { return null; }
    }
    if (ref.current) {
      if (typeof ref.current.getVideoElement === 'function') {
        return ref.current.getVideoElement();
      }
      return ref.current;
    }
    return propVideoEl || null;
  };

  useEffect(() => {
    if (!isActive) return;

    let animId = null;
    let isRunning = true;
    let lastFrameTime = 0;

    const loop = async () => {
      const now = Date.now();
      const videoEl = getVideo();

      // Clean expired cooldown entries
      for (const [id, expires] of cooldownMap.current.entries()) {
        if (now > expires) cooldownMap.current.delete(id);
      }

      // If a result card is currently being displayed, hold state
      if (now < resultDisplayUntil.current) {
        if (isRunning) animId = requestAnimationFrame(loop);
        return;
      } else if (currentResult && now >= resultDisplayUntil.current) {
        setCurrentResult(null);
        setOverlayState('looking');
        setPrompt('Looking for a face');
        frameBuffer.current = [];
        livenessDetector.current.reset();
      }

      // 8 FPS gate (~125ms)
      if (videoEl && videoEl.readyState >= 2 && !submitting.current && (now - lastFrameTime >= 125)) {
        lastFrameTime = now;
        try {
          const detection = await detectFaceWithFeatures(videoEl, config.inputSize || 320);

          if (detection) {
            const quality = evaluateQuality(detection, videoEl);

            if (!quality.metrics.isSizeGood) {
              setOverlayState('looking');
              setPrompt('Please step closer');
              frameBuffer.current = [];
            } else {
              // Liveness gate
              const liveness = livenessDetector.current.processFrame(detection);

              if (config.requireLiveness && !liveness.isLive) {
                setOverlayState(liveness.blinkDone ? 'hold_still' : 'blink');
                setPrompt(liveness.prompt);
              } else {
                setOverlayState('checking');
                setPrompt('Verifying face and eye signature...');

                const sig = extractBiometricSignature(detection);
                frameBuffer.current.push(sig);

                // When consecutive frames collected, submit averaged descriptor
                if (frameBuffer.current.length >= requiredFrames) {
                  submitting.current = true;
                  await submitAveragedMark(frameBuffer.current);
                  frameBuffer.current = [];
                  submitting.current = false;
                }
              }
            }
          } else {
            setOverlayState('looking');
            setPrompt('Position face inside the oval');
            frameBuffer.current = [];
            livenessDetector.current.reset();
          }
        } catch (_err) {
          // Ignore transient capture hiccups
        }
      }

      if (isRunning) {
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isActive, config, currentResult, propVideoEl]);

  const submitAveragedMark = async (samples) => {
    // Average descriptors and eye vectors
    const avgDescriptor = new Array(128).fill(0);
    const avgEye = new Array(8).fill(0);

    for (const s of samples) {
      for (let i = 0; i < 128; i++) avgDescriptor[i] += s.descriptor[i];
      for (let i = 0; i < 8; i++) avgEye[i] += s.eye[i];
    }
    for (let i = 0; i < 128; i++) avgDescriptor[i] = Math.round((avgDescriptor[i] / samples.length) * 10000) / 10000;
    for (let i = 0; i < 8; i++) avgEye[i] = Math.round((avgEye[i] / samples.length) * 10000) / 10000;

    try {
      const res = await api.post('/attendance/mark', {
        descriptor: avgDescriptor,
        eye: avgEye,
        liveness: true,
        frames: samples.length
      });

      // Handle match result
      if (res.matched && res.student) {
        const studentId = res.student.rollNo;
        const now = Date.now();

        // Check if under cooldown
        if (cooldownMap.current.has(studentId)) {
          // Suppress repeat popups during cooldown
          return;
        }

        cooldownMap.current.set(studentId, now + cooldownSecs * 1000);

        setCurrentResult(res);
        setOverlayState(res.reason === 'already_marked' ? 'already_marked' : 'recognized');
        setPrompt(res.student.name);

        resultDisplayUntil.current = now + 4000; // Show result card for 4s
        onResult(res);
      } else {
        // Not matched
        setCurrentResult({ matched: false, reason: res.reason });
        setOverlayState('not_recognized');
        setPrompt('Face not recognised');
        resultDisplayUntil.current = Date.now() + 3000;
        onResult({ matched: false });
      }
    } catch (_err) {
      setCurrentResult({ matched: false });
      setOverlayState('not_recognized');
      resultDisplayUntil.current = Date.now() + 2500;
    }
  };

  return {
    overlayState,
    prompt,
    currentResult
  };
}
