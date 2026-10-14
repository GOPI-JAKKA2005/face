import React from 'react';
import { Switch } from '../ui/Switch.jsx';
import { TimeInput } from '../ui/TimeInput.jsx';
import { Input } from '../ui/Input.jsx';
import { FiClock, FiCalendar, FiCheckCircle } from 'react-icons/fi';
import { formatMinutesTo12Hour, parseTimeToMinutes, formatLateDuration } from '../../lib/time.js';

export function TimeSlotConfig({
  value = {
    enabled: false,
    loginTime: '10:00',
    afternoonLoginTime: '14:00',
    logoutTime: '19:30',
    graceMinutes: 5,
    slotLabel: '10:00 AM - 07:30 PM Shift'
  },
  onChange,
  disabled = false
}) {
  const isEnabled = Boolean(value?.enabled);
  const loginTime = value?.loginTime || '10:00';
  const afternoonLoginTime = value?.afternoonLoginTime || '14:00';
  const logoutTime = value?.logoutTime || '19:30';
  const graceMinutes = value?.graceMinutes ?? 5;
  const slotLabel = value?.slotLabel || '';

  const updateField = (field, val) => {
    if (disabled || !onChange) return;
    const next = {
      ...value,
      enabled: isEnabled,
      loginTime,
      afternoonLoginTime,
      logoutTime,
      graceMinutes,
      slotLabel,
      [field]: val
    };

    // Auto-update label if user hasn't explicitly entered a custom name
    if (field === 'loginTime' || field === 'logoutTime' || field === 'afternoonLoginTime') {
      const start12 = formatMinutesTo12Hour(field === 'loginTime' ? val : loginTime);
      const end12 = formatMinutesTo12Hour(field === 'logoutTime' ? val : logoutTime);
      if (!slotLabel || slotLabel.includes(' - ') || slotLabel.includes('Shift')) {
        next.slotLabel = `${start12} - ${end12} Shift`;
      }
    }

    onChange(next);
  };

  const applyPreset = (presetLogin, presetAfternoon, presetLogout, presetTitle) => {
    if (disabled || !onChange) return;
    onChange({
      ...value,
      enabled: true,
      loginTime: presetLogin,
      afternoonLoginTime: presetAfternoon,
      logoutTime: presetLogout,
      graceMinutes,
      slotLabel: presetTitle
    });
  };

  const durationText = React.useMemo(() => {
    const startM = parseTimeToMinutes(loginTime);
    const endM = parseTimeToMinutes(logoutTime);
    let diff = endM - startM;
    if (diff < 0) diff += 1440;
    return formatLateDuration(diff);
  }, [loginTime, logoutTime]);

  const presets = [
    { label: '10:00 AM - 07:30 PM (Lunch 2 PM)', login: '10:00', afternoon: '14:00', logout: '19:30', title: '10:00 AM - 07:30 PM Shift' },
    { label: '09:00 AM - 05:00 PM (Lunch 1:30 PM)', login: '09:00', afternoon: '13:30', logout: '17:00', title: '09:00 AM - 05:00 PM Shift' },
    { label: '08:30 AM - 04:30 PM (Lunch 1 PM)', login: '08:30', afternoon: '13:00', logout: '16:30', title: '08:30 AM - 04:30 PM Shift' },
    { label: '11:00 AM - 08:00 PM (Lunch 2:30 PM)', login: '11:00', afternoon: '14:30', logout: '20:00', title: '11:00 AM - 08:00 PM Shift' }
  ];

  return (
    <div className="p-4 rounded-token border border-line bg-surface-2/40 space-y-4">
      {/* Header & Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <FiClock className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-main uppercase tracking-wider font-poppins">
              Individual Time Slot & Shift (Morning + Afternoon)
            </span>
          </div>
          <p className="text-xs text-muted">
            Define morning login, afternoon post-lunch login, and evening logout times. Lateness is calculated against both morning and afternoon slots.
          </p>
        </div>
        <Switch
          checked={isEnabled}
          disabled={disabled}
          onChange={(checked) => updateField('enabled', checked)}
        />
      </div>

      {!isEnabled ? (
        <div className="p-2.5 rounded-token bg-surface border border-line/70 text-xs text-muted flex items-center gap-2">
          <FiCalendar className="w-3.5 h-3.5 text-primary" />
          <span>
            Currently following standard institutional sessions (Morning: 09:30 AM / Afternoon: 02:00 PM).
          </span>
        </div>
      ) : (
        <div className="space-y-4 pt-2 border-t border-line/60">
          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Quick Shift Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const isSelected = loginTime === p.login && logoutTime === p.logout && afternoonLoginTime === p.afternoon;
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => applyPreset(p.login, p.afternoon, p.logout, p.title)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-token border transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-contrast border-primary shadow-sm'
                        : 'bg-surface text-main border-line hover:border-primary/50'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TimeInput
              label="1. Morning Login"
              value={loginTime}
              is12Hour={true}
              disabled={disabled}
              onChange={(val) => updateField('loginTime', val)}
              helperText="Morning check-in time"
            />

            <TimeInput
              label="2. Afternoon Login (Post-Lunch)"
              value={afternoonLoginTime}
              is12Hour={true}
              disabled={disabled}
              onChange={(val) => updateField('afternoonLoginTime', val)}
              helperText="Login again after lunch"
            />

            <TimeInput
              label="3. Evening Logout"
              value={logoutTime}
              is12Hour={true}
              disabled={disabled}
              onChange={(val) => updateField('logoutTime', val)}
              helperText="Final daily check-out"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Grace Minutes"
              type="number"
              min={0}
              max={60}
              value={graceMinutes}
              disabled={disabled}
              onChange={(e) => updateField('graceMinutes', Number(e.target.value))}
              helperText="Grace window for both morning & afternoon"
            />

            <Input
              label="Slot Label / Shift Name"
              type="text"
              placeholder="e.g. 10:00 AM - 07:30 PM Shift"
              value={slotLabel}
              disabled={disabled}
              onChange={(e) => updateField('slotLabel', e.target.value)}
              helperText="Identifies this shift in reports & kiosk"
            />
          </div>

          {/* Real-time Summary Card */}
          <div className="p-3 rounded-token bg-primary/5 border border-primary/20 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-primary">
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="w-3.5 h-3.5" />
                Active Schedule: {slotLabel || `${formatMinutesTo12Hour(loginTime)} - ${formatMinutesTo12Hour(logoutTime)}`}
              </span>
              <span className="font-mono">{durationText} total</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-primary/10 text-[11px] text-muted">
              <div>
                <strong className="text-main block">Morning Check-In:</strong>
                <span>{formatMinutesTo12Hour(loginTime)} (Grace: +{graceMinutes}m)</span>
              </div>
              <div>
                <strong className="text-main block">Afternoon Login:</strong>
                <span>{formatMinutesTo12Hour(afternoonLoginTime)} (Grace: +{graceMinutes}m)</span>
              </div>
              <div>
                <strong className="text-main block">Evening Check-Out:</strong>
                <span>{formatMinutesTo12Hour(logoutTime)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
