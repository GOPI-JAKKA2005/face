import React from 'react';
import { THEME_PRESETS } from '../../lib/theme.js';

export function PresetGrid({ activePresetId, isDark, onSelectPreset }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {THEME_PRESETS.map((preset) => {
        const tokens = isDark ? preset.dark : preset.light;
        const isSelected = activePresetId === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className={`p-3 rounded-token border text-left transition-all relative ${
              isSelected
                ? 'border-primary ring-2 ring-primary bg-primary/5'
                : 'border-line hover:border-primary/50 bg-surface'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: `rgb(${tokens.primary})` }}
              />
              <span
                className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: `rgb(${tokens.accent})` }}
              />
              <span
                className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: `rgb(${tokens.bg})` }}
              />
            </div>
            <p className="text-xs font-semibold text-main truncate">{preset.name}</p>
          </button>
        );
      })}
    </div>
  );
}
