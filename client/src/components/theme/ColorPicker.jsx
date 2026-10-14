import React from 'react';
import { parseRgb, rgbToHex } from '../../lib/theme.js';

export function ColorPicker({ label, value, onChange }) {
  const hex = rgbToHex(parseRgb(value));

  const handleColorChange = (e) => {
    const newHex = e.target.value;
    const r = parseInt(newHex.substring(1, 3), 16);
    const g = parseInt(newHex.substring(3, 5), 16);
    const b = parseInt(newHex.substring(5, 7), 16);
    onChange(`${r} ${g} ${b}`);
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-token border border-line bg-surface">
      <span className="text-xs font-semibold text-main uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={handleColorChange}
          className="w-8 h-8 rounded-full border border-line cursor-pointer p-0 bg-transparent"
        />
        <span className="text-xs font-mono text-muted">{hex}</span>
      </div>
    </div>
  );
}
