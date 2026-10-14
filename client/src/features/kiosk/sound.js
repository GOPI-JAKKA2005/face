/**
 * Web Audio API synthesizer for kiosk feedback cues.
 * Zero external audio files required.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a pleasant ascending two-tone success chime.
 */
export function playSuccessChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc1.connect(gain);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
  osc2.connect(gain);

  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.15);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.45);
}

/**
 * Plays a soft alert chime for late arrival.
 */
export function playLateChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, now); // A4
  osc.frequency.setValueAtTime(392, now + 0.2); // G4

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.5);
}

/**
 * Plays a low double-buzz tone for rejection / unrecognized face.
 */
export function playErrorTone() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now); // A3
  osc.frequency.setValueAtTime(196, now + 0.15); // G3

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
}
