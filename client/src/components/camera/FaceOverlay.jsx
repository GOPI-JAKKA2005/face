import React from 'react';
import { motion } from 'framer-motion';

export function FaceOverlay({
  state = 'looking', // 'looking' | 'hold_still' | 'blink' | 'checking' | 'recognized' | 'not_recognized' | 'already_marked' | 'closed'
  prompt = '',
  _detectedBox = null
}) {
  const stateConfigs = {
    looking: {
      color: 'border-white/40 text-white',
      glow: 'shadow-[0_0_20px_rgba(255,255,255,0.15)]',
      text: prompt || 'Looking for a face'
    },
    hold_still: {
      color: 'border-primary text-primary',
      glow: 'shadow-[0_0_30px_rgba(79,70,229,0.4)]',
      text: prompt || 'Hold still'
    },
    blink: {
      color: 'border-warning text-warning',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.4)]',
      text: prompt || 'Please blink naturally'
    },
    checking: {
      color: 'border-accent text-accent animate-pulse',
      glow: 'shadow-[0_0_35px_rgba(20,184,166,0.5)]',
      text: prompt || 'Verifying biometric signature...'
    },
    recognized: {
      color: 'border-success text-success',
      glow: 'shadow-[0_0_40px_rgba(34,197,94,0.6)]',
      text: prompt || 'Recognised!'
    },
    not_recognized: {
      color: 'border-danger text-danger',
      glow: 'shadow-[0_0_35px_rgba(239,68,68,0.5)]',
      text: prompt || 'Face not recognised'
    },
    already_marked: {
      color: 'border-accent text-accent',
      glow: 'shadow-[0_0_30px_rgba(20,184,166,0.5)]',
      text: prompt || 'Already marked present'
    },
    closed: {
      color: 'border-muted text-muted',
      glow: 'shadow-none',
      text: prompt || 'Attendance Closed'
    }
  };

  const current = stateConfigs[state] || stateConfigs.looking;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
      {/* Semi-transparent Dark Mask with Oval Cutout */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Animated Oval Guide */}
        <motion.div
          animate={{
            scale: state === 'recognized' ? [1, 1.05, 1] : 1
          }}
          transition={{ duration: 0.4 }}
          className={`w-[260px] h-[350px] sm:w-[300px] sm:h-[400px] rounded-[50%] border-4 transition-all duration-300 ${current.color} ${current.glow} flex flex-col items-center justify-between py-6 px-4`}
        >
          {/* Top alignment tick */}
          <div className="w-6 h-1 bg-current rounded-full opacity-60" />

          {/* Bottom alignment tick */}
          <div className="w-6 h-1 bg-current rounded-full opacity-60" />
        </motion.div>
      </div>

      {/* Floating Status Pill */}
      <motion.div
        key={state + current.text}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-8 px-5 py-2.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 shadow-xl flex items-center gap-2.5"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${state === 'checking' ? 'animate-ping' : ''} ${
          state === 'recognized' ? 'bg-success' : state === 'not_recognized' ? 'bg-danger' : state === 'blink' ? 'bg-warning' : 'bg-primary'
        }`} />
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-white uppercase font-poppins">
          {current.text}
        </span>
      </motion.div>
    </div>
  );
}
