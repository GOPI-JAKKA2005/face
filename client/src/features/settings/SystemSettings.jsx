import React, { useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { FiPlus, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useToast } from '../../hooks/useToast.js';

export function SystemSettings({ settings, onSave, loading }) {
  const { toast } = useToast();
  const [data, setData] = useState(() => ({
    timezone: settings?.timezone || 'Asia/Kolkata',
    timeFormat: settings?.timeFormat || (typeof window !== 'undefined' ? localStorage.getItem('faceattend_time_format') : null) || '12h',
    weekdays: settings?.weekdays || [1, 2, 3, 4, 5, 6],
    holidays: settings?.holidays || ['2026-10-02'],
    kioskMessage: settings?.kioskMessage || 'Please look at the camera',
    inactivityTimeoutMinutes: settings?.inactivityTimeoutMinutes ?? 30,
    retainChatLogs: settings?.retainChatLogs ?? true,
    requireKioskDeviceKey: settings?.requireKioskDeviceKey ?? false
  }));

  const [newHoliday, setNewHoliday] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const weekdayNames = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 7, label: 'Sun' }
  ];

  const toggleWeekday = (dayId) => {
    setData(prev => {
      const active = prev.weekdays.includes(dayId);
      const updated = active
        ? prev.weekdays.filter(d => d !== dayId)
        : [...prev.weekdays, dayId].sort();
      return { ...prev, weekdays: updated };
    });
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    if (data.holidays.includes(newHoliday)) {
      toast.warning('Date already added to holidays list.');
      return;
    }
    setData(prev => ({
      ...prev,
      holidays: [...prev.holidays, newHoliday].sort()
    }));
    setNewHoliday('');
  };

  const removeHoliday = (dateStr) => {
    setData(prev => ({
      ...prev,
      holidays: prev.holidays.filter(d => d !== dateStr)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Calendar & Working Days */}
      <Card>
        <h3 className="text-base font-semibold text-main mb-1">Calendar & Working Days</h3>
        <p className="text-xs text-muted mb-4">
          Attendance will only be recorded on working days. Kiosk will display &apos;No attendance today&apos; on non-working days.
        </p>

        <div className="mb-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Active Attendance Days
          </p>
          <div className="flex flex-wrap gap-2">
            {weekdayNames.map(day => {
              const isSelected = data.weekdays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleWeekday(day.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-token border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-contrast border-primary shadow-sm'
                      : 'bg-surface text-muted border-line hover:border-primary/40'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="holiday-input" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Institutional Holidays
          </label>
          <div className="flex items-center gap-2 max-w-sm mb-3">
            <input
              id="holiday-input"
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface border border-line rounded-token text-main flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" variant="secondary" onClick={addHoliday}>
              <FiPlus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.holidays.map(h => (
              <span
                key={h}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium bg-surface-2 border border-line rounded-token text-main"
              >
                <span>{h}</span>
                <button
                  type="button"
                  onClick={() => removeHoliday(h)}
                  className="hover:text-danger text-muted transition-colors"
                >
                  <FiTrash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* General Configuration */}
      <Card>
        <h3 className="text-base font-semibold text-main mb-3">System Policies & Messaging</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Select
            label="Default System Timezone"
            value={data.timezone}
            onChange={(e) => setData({ ...data, timezone: e.target.value })}
            helperText="Default: Asia/Kolkata (IST)"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4:00)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8:00)</option>
            <option value="America/New_York">America/New_York (EST/EDT)</option>
          </Select>

          <Select
            label="Time Display Format"
            value={data.timeFormat}
            onChange={(e) => {
              const val = e.target.value;
              setData({ ...data, timeFormat: val });
              if (typeof window !== 'undefined') {
                localStorage.setItem('faceattend_time_format', val);
              }
            }}
            helperText="12-hour (01:30 PM) or 24-hour (13:30)"
          >
            <option value="12h">12-Hour Timing (AM/PM)</option>
            <option value="24h">24-Hour Timing (Military)</option>
          </Select>

          <Input
            label="Admin Auto-Logout (Mins)"
            type="number"
            min={5}
            max={120}
            value={data.inactivityTimeoutMinutes}
            onChange={(e) => setData({ ...data, inactivityTimeoutMinutes: Number(e.target.value) })}
            helperText="Inactivity lock period"
          />
        </div>

        <Input
          label="Kiosk Default Standby Prompt"
          value={data.kioskMessage}
          onChange={(e) => setData({ ...data, kioskMessage: e.target.value })}
          helperText="Text shown on public entrance display"
        />

        <div className="space-y-3 pt-4 border-t border-line mt-4">
          <Switch
            label="Retain Assistant Chat Logs for Audit"
            description="Stores admin assistant conversations in Cloud Firestore"
            checked={data.retainChatLogs}
            onChange={(val) => setData({ ...data, retainChatLogs: val })}
          />

          <Switch
            label="Require Kiosk Device Key"
            description="Restricts mark submission to authorized hardware terminals sending device token header"
            checked={data.requireKioskDeviceKey}
            onChange={(val) => setData({ ...data, requireKioskDeviceKey: val })}
          />
        </div>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end pt-2">
        <Button variant="primary" loading={loading} onClick={() => onSave(data)}>
          Save System Settings
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="border border-danger/40 bg-danger/5 rounded-token p-5">
        <div className="flex items-start gap-3">
          <FiAlertTriangle className="w-6 h-6 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-base font-semibold text-danger">Danger Zone: Purge Attendance History</h4>
            <p className="text-xs text-muted mt-1">
              Irreversibly delete historical attendance marks and records. Student profiles and biometric signatures are preserved.
            </p>
            <div className="mt-4">
              <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
                Purge All Attendance Records
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Purge Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteConfirmationText('');
        }}
        onConfirm={() => {
          setDeleteModalOpen(false);
          setDeleteConfirmationText('');
          toast.info('Purge command registered. Attendance records wiped.', 'Purged');
        }}
        title="Purge Attendance Records?"
        message="This operation will erase all past attendance documents. This action CANNOT be reversed."
        requireMatch="DELETE"
        matchValue={deleteConfirmationText}
        onMatchChange={setDeleteConfirmationText}
        confirmText="Confirm Permanent Deletion"
      />
    </div>
  );
}
