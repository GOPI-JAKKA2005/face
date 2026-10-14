import React from 'react';
import { FiClock } from 'react-icons/fi';
import { parse24To12, format12To24, formatMinutesTo12Hour } from '../../lib/time.js';

export function TimeInput({
  label,
  value = '09:00',
  onChange,
  is12Hour = true,
  helperText,
  error,
  disabled = false,
  className = ''
}) {
  const { hour12, minute, period } = React.useMemo(() => {
    return parse24To12(value || '09:00');
  }, [value]);

  const handleHourChange = (newHour) => {
    if (disabled || !onChange) return;
    const hhmm = format12To24(newHour, minute, period);
    onChange(hhmm);
  };

  const handleMinuteChange = (newMinute) => {
    if (disabled || !onChange) return;
    const hhmm = format12To24(hour12, newMinute, period);
    onChange(hhmm);
  };

  const handlePeriodChange = (newPeriod) => {
    if (disabled || !onChange) return;
    const hhmm = format12To24(hour12, minute, newPeriod);
    onChange(hhmm);
  };

  const formattedBadge = React.useMemo(() => {
    return formatMinutesTo12Hour(value || '09:00');
  }, [value]);

  if (!is12Hour) {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-xs font-semibold text-main uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative rounded-token">
          <input
            type="time"
            value={value || '09:00'}
            disabled={disabled}
            onChange={(e) => onChange && onChange(e.target.value)}
            className="block w-full rounded-token border border-line bg-surface text-main placeholder-muted text-sm px-3.5 py-2 min-h-[40px] focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-surface-2 disabled:text-muted disabled:cursor-not-allowed font-mono"
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-muted">{helperText}</p>}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-main uppercase tracking-wider">
            {label}
          </label>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
            <FiClock className="w-3 h-3" />
            {formattedBadge}
          </span>
        </div>
      )}

      <div className={`flex items-center gap-1.5 p-1 rounded-token border bg-surface min-h-[40px] ${
        error ? 'border-danger' : 'border-line'
      } ${disabled ? 'opacity-60 cursor-not-allowed bg-surface-2' : ''}`}>
        {/* Hours Selector (01 - 12) */}
        <div className="relative flex-1">
          <select
            value={String(hour12).padStart(2, '0')}
            disabled={disabled}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            className="w-full bg-surface-2/60 hover:bg-surface-2 text-main text-sm py-1.5 px-2.5 rounded-token font-mono font-bold text-center border border-line/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer transition-colors"
            title="Select Hour (1-12)"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
              const val = String(h).padStart(2, '0');
              return (
                <option key={val} value={val}>
                  {val} hr
                </option>
              );
            })}
          </select>
        </div>

        <span className="text-muted font-bold font-mono text-sm px-0.5">:</span>

        {/* Minutes Selector (00 - 59) */}
        <div className="relative flex-1">
          <select
            value={String(minute).padStart(2, '0')}
            disabled={disabled}
            onChange={(e) => handleMinuteChange(Number(e.target.value))}
            className="w-full bg-surface-2/60 hover:bg-surface-2 text-main text-sm py-1.5 px-2.5 rounded-token font-mono font-bold text-center border border-line/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer transition-colors"
            title="Select Minutes (00-59)"
          >
            {Array.from({ length: 60 }, (_, i) => i).map((m) => {
              const val = String(m).padStart(2, '0');
              return (
                <option key={val} value={val}>
                  {val} min
                </option>
              );
            })}
          </select>
        </div>

        {/* AM / PM Segmented Toggle */}
        <div className="flex items-center p-0.5 rounded-token bg-surface-2 border border-line ml-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePeriodChange('AM')}
            className={`px-2.5 py-1 text-xs font-bold rounded-token transition-all ${
              period === 'AM'
                ? 'bg-primary text-primary-contrast shadow-sm scale-100'
                : 'text-muted hover:text-main'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePeriodChange('PM')}
            className={`px-2.5 py-1 text-xs font-bold rounded-token transition-all ${
              period === 'PM'
                ? 'bg-primary text-primary-contrast shadow-sm scale-100'
                : 'text-muted hover:text-main'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-muted">{helperText}</p>}
    </div>
  );
}
