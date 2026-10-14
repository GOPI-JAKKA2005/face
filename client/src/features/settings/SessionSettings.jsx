import React from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { TimeInput } from '../../components/ui/TimeInput.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FiClock } from 'react-icons/fi';
import { parseTimeToMinutes, formatMinutesToTime } from '../../lib/time.js';

export function SessionSettings({ settings, onSave, loading }) {
  const [is12Hour, setIs12Hour] = React.useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('faceattend_time_format') : null;
    return saved ? saved === '12h' : true; // Default to 12-hour format
  });

  const handleToggleFormat = (to12h) => {
    setIs12Hour(to12h);
    if (typeof window !== 'undefined') {
      localStorage.setItem('faceattend_time_format', to12h ? '12h' : '24h');
    }
  };

  const [data, setData] = React.useState(() => ({
    earlyWindowMinutes: settings?.earlyWindowMinutes ?? 60,
    lateCountsFrom: settings?.lateCountsFrom || 'start',
    sessions: {
      morning: {
        enabled: settings?.sessions?.morning?.enabled ?? true,
        start: settings?.sessions?.morning?.start || '09:00',
        graceMinutes: settings?.sessions?.morning?.graceMinutes ?? 5,
        cutoff: settings?.sessions?.morning?.cutoff || '11:30'
      },
      afternoon: {
        enabled: settings?.sessions?.afternoon?.enabled ?? true,
        start: settings?.sessions?.afternoon?.start || '14:00',
        graceMinutes: settings?.sessions?.afternoon?.graceMinutes ?? 5,
        cutoff: settings?.sessions?.afternoon?.cutoff || '16:30'
      }
    }
  }));

  const updateSession = (sessionKey, field, val) => {
    setData(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionKey]: {
          ...prev.sessions[sessionKey],
          [field]: val
        }
      }
    }));
  };

  const getSessionPreview = (session) => {
    if (!session.enabled) return 'Session disabled.';
    const startM = parseTimeToMinutes(session.start);
    const openM = Math.max(0, startM - (data.earlyWindowMinutes || 60));
    const graceM = startM + (Number(session.graceMinutes) || 0);
    const cutoffM = parseTimeToMinutes(session.cutoff);

    return `Opens ${formatMinutesToTime(openM, { hour12: is12Hour })}, on time until ${formatMinutesToTime(graceM, { hour12: is12Hour })}, late from ${formatMinutesToTime(graceM, { hour12: is12Hour })}, closes ${formatMinutesToTime(cutoffM, { hour12: is12Hour })}.`;
  };

  return (
    <div className="space-y-6">
      {/* 12-Hour vs 24-Hour Timing Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface rounded-token border border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FiClock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-main font-poppins">Time Display Format</span>
            <p className="text-[11px] text-muted">Switch between 12-hour (AM/PM) and 24-hour timing mode</p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-token border border-line">
          <button
            type="button"
            onClick={() => handleToggleFormat(true)}
            className={`px-3 py-1.5 text-xs font-bold rounded-token transition-all ${
              is12Hour
                ? 'bg-primary text-primary-contrast shadow-sm'
                : 'text-muted hover:text-main'
            }`}
          >
            12-Hour (AM/PM)
          </button>
          <button
            type="button"
            onClick={() => handleToggleFormat(false)}
            className={`px-3 py-1.5 text-xs font-bold rounded-token transition-all ${
              !is12Hour
                ? 'bg-primary text-primary-contrast shadow-sm'
                : 'text-muted hover:text-main'
            }`}
          >
            24-Hour (Military)
          </button>
        </div>
      </div>

      {/* Morning Session */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <div>
            <h3 className="text-base font-semibold text-main">Morning Session</h3>
            <p className="text-xs text-muted mt-0.5">{getSessionPreview(data.sessions.morning)}</p>
          </div>
          <Switch
            checked={data.sessions.morning.enabled}
            onChange={(val) => updateSession('morning', 'enabled', val)}
          />
        </div>

        {data.sessions.morning.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TimeInput
              label="Start Time"
              value={data.sessions.morning.start}
              is12Hour={is12Hour}
              onChange={(val) => updateSession('morning', 'start', val)}
            />
            <Input
              label="Grace Minutes"
              type="number"
              min={0}
              max={120}
              value={data.sessions.morning.graceMinutes}
              onChange={(e) => updateSession('morning', 'graceMinutes', Number(e.target.value))}
            />
            <TimeInput
              label="Cutoff Time"
              value={data.sessions.morning.cutoff}
              is12Hour={is12Hour}
              onChange={(val) => updateSession('morning', 'cutoff', val)}
            />
          </div>
        )}
      </Card>

      {/* Afternoon Session */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <div>
            <h3 className="text-base font-semibold text-main">Afternoon Session</h3>
            <p className="text-xs text-muted mt-0.5">{getSessionPreview(data.sessions.afternoon)}</p>
          </div>
          <Switch
            checked={data.sessions.afternoon.enabled}
            onChange={(val) => updateSession('afternoon', 'enabled', val)}
          />
        </div>

        {data.sessions.afternoon.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TimeInput
              label="Start Time"
              value={data.sessions.afternoon.start}
              is12Hour={is12Hour}
              onChange={(val) => updateSession('afternoon', 'start', val)}
            />
            <Input
              label="Grace Minutes"
              type="number"
              min={0}
              max={120}
              value={data.sessions.afternoon.graceMinutes}
              onChange={(e) => updateSession('afternoon', 'graceMinutes', Number(e.target.value))}
            />
            <TimeInput
              label="Cutoff Time"
              value={data.sessions.afternoon.cutoff}
              is12Hour={is12Hour}
              onChange={(val) => updateSession('afternoon', 'cutoff', val)}
            />
          </div>
        )}
      </Card>

      {/* Global Windows & Rules */}
      <Card>
        <h3 className="text-base font-semibold text-main mb-3">Global Session Policies</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Early Opening Window (Minutes)"
            type="number"
            min={0}
            max={180}
            helperText="How many minutes prior to scheduled start the kiosk starts accepting attendance"
            value={data.earlyWindowMinutes}
            onChange={(e) => setData({ ...data, earlyWindowMinutes: Number(e.target.value) })}
          />

          <Select
            label="Late Minute Calculation Mode"
            value={data.lateCountsFrom}
            onChange={(e) => setData({ ...data, lateCountsFrom: e.target.value })}
            helperText="Choose whether lateness is counted from scheduled start or from the end of grace period"
          >
            <option value="start">Count from Scheduled Start (Default)</option>
            <option value="afterGrace">Count after Grace Period ends</option>
          </Select>
        </div>
      </Card>

      <div className="flex justify-end pt-2">
        <Button variant="primary" loading={loading} onClick={() => onSave(data)}>
          Save Session Settings
        </Button>
      </div>
    </div>
  );
}
