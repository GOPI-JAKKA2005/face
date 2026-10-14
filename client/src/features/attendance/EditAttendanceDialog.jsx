import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';

export function EditAttendanceDialog({ isOpen, onClose, record, onSaveSuccess }) {
  const { toast } = useToast();

  const [status, setStatus] = useState('present');
  const [lateMinutes, setLateMinutes] = useState(0);
  const [session, setSession] = useState('morning');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setStatus(record.status || 'present');
      setLateMinutes(record.lateMinutes || 0);
      setSession(record.session || 'morning');
      setReason(record.reason || '');
    }
  }, [record]);

  if (!record) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const targetSession = session || record.session || 'morning';
      const isUnrecorded = record.isNew === true || record.isRecorded === false;
      const targetId = isUnrecorded && record.dateKey && record.studentId
        ? `${record.dateKey}_${targetSession}_${record.studentId}`
        : record.id;

      await api.put(`/attendance/${targetId}`, {
        studentId: record.studentId,
        name: record.name,
        rollNo: record.rollNo,
        dateKey: record.dateKey,
        status,
        lateMinutes: status === 'late' ? Number(lateMinutes) || 0 : 0,
        session: targetSession,
        reason: reason.trim() || 'Admin manual override'
      }, { authRequired: true });

      toast.success(`Attendance updated for ${record.name}.`, 'Changes Saved');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update attendance record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Attendance Record"
      description={`Update status, lateness, or notes for ${record.name} (${record.rollNo})`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="p-3 bg-surface-2 rounded-token border border-line text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted">Student:</span>
            <span className="font-semibold text-main">{record.name} ({record.rollNo})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Date:</span>
            <span className="font-mono text-main">{record.dateKey}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Current Status:</span>
            <span className="capitalize font-semibold text-primary">{record.status}</span>
          </div>
        </div>

        {/* Status selection */}
        <div>
          <span className="block text-xs font-semibold text-muted mb-1.5">
            Attendance Status
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'present', label: 'Present', icon: FiCheckCircle, color: 'text-success border-success/40 bg-success/5' },
              { id: 'late', label: 'Late', icon: FiClock, color: 'text-warning border-warning/40 bg-warning/5' },
              { id: 'absent', label: 'Absent', icon: FiXCircle, color: 'text-danger border-danger/40 bg-danger/5' }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = status === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id)}
                  className={`p-2.5 rounded-token border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                    isSelected
                      ? `${item.color} shadow-sm ring-1 ring-primary`
                      : 'border-line text-muted hover:text-main hover:bg-surface-2'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Late minutes if status is late */}
        {status === 'late' && (
          <Input
            label="Lateness in Minutes"
            type="number"
            min="1"
            max="300"
            value={lateMinutes}
            onChange={(e) => setLateMinutes(e.target.value)}
            placeholder="e.g. 15"
          />
        )}

        {/* Session selector */}
        <Select
          label="Session"
          value={session}
          onChange={(e) => setSession(e.target.value)}
        >
          <option value="morning">Morning Session</option>
          <option value="afternoon">Afternoon Session</option>
        </Select>

        {/* Reason / Admin note */}
        <Input
          label="Reason / Notes for Change"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Verified by class teacher / Late bus"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Save Attendance
          </Button>
        </div>
      </form>
    </Modal>
  );
}
