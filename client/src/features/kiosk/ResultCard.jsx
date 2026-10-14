import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../components/ui/Badge.jsx';
import { FiCheckCircle, FiClock, FiAlertTriangle, FiInfo, FiLogOut } from 'react-icons/fi';

export function ResultCard({ result }) {
  if (!result) return null;

  const isLogout = result.action === 'logout' || result.status === 'logged_out';
  const isLate = result.status === 'late';
  const isAlreadyMarked = result.reason === 'already_marked';
  const isUnrecognized = result.matched === false;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', damping: 20, stiffness: 250 }}
      className="w-full max-w-lg bg-surface/95 backdrop-blur-md border border-line rounded-token shadow-2xl p-6 sm:p-8 text-center mx-auto"
    >
      {isUnrecognized ? (
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-full bg-danger/15 text-danger flex items-center justify-center mx-auto">
            <FiAlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-main font-poppins">Face Not Recognised</h3>
          <p className="text-sm text-muted max-w-xs mx-auto">
            Please contact your administrator to verify your enrollment or re-scan with better lighting.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Student Profile Photo or Avatar */}
          <div className="w-24 h-24 rounded-full border-4 border-surface shadow-xl bg-primary/10 text-primary font-bold text-3xl flex items-center justify-center mx-auto overflow-hidden">
            {result.student?.photoUrl ? (
              <img
                src={result.student.photoUrl}
                alt={result.student.name}
                className="w-full h-full object-cover"
              />
            ) : (
              result.student?.name?.charAt(0).toUpperCase() || 'S'
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-main font-poppins tracking-tight">
              {result.student?.name}
            </h3>
            <p className="text-sm text-muted font-mono mt-0.5">
              Roll No: {result.student?.rollNo} • {result.slotLabel || (result.session ? `${result.session.toUpperCase()} Session` : 'Shift Log')}
            </p>
          </div>

          {/* Status Badge & Message */}
          <div className="flex flex-col items-center gap-2 pt-1">
            {isLogout ? (
              <Badge variant="primary" size="md" className="text-sm px-3.5 py-1">
                <FiLogOut className="w-4 h-4 mr-1" />
                Check-Out Recorded
              </Badge>
            ) : isAlreadyMarked ? (
              <Badge variant="accent" size="md" className="text-sm px-3.5 py-1">
                <FiInfo className="w-4 h-4 mr-1" />
                Already Marked
              </Badge>
            ) : isLate ? (
              <Badge variant="warning" size="md" className="text-sm px-3.5 py-1">
                <FiClock className="w-4 h-4 mr-1" />
                Late Arrival
              </Badge>
            ) : (
              <Badge variant="success" size="md" className="text-sm px-3.5 py-1">
                <FiCheckCircle className="w-4 h-4 mr-1" />
                Present
              </Badge>
            )}

            <p className={`text-base font-semibold mt-1 ${isLogout ? 'text-primary' : isLate ? 'text-warning' : isAlreadyMarked ? 'text-accent' : 'text-success'}`}>
              {result.message}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
