import React, { useState, useEffect } from 'react';
import * as Slider from '@radix-ui/react-slider';
import {
  THEME_PRESETS,
  applyTheme,
  saveThemeLocal,
  loadThemeLocal,
  calculateContrastRatio
} from '../../lib/theme.js';
import { PresetGrid } from './PresetGrid.jsx';
import { ColorPicker } from './ColorPicker.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Card } from '../ui/Card.jsx';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { FiDownload, FiUpload, FiRotateCcw, FiSave, FiAlertTriangle } from 'react-icons/fi';

export function ThemePanel() {
  const { toast } = useToast();
  const [activePresetId, setActivePresetId] = useState('indigo');
  const [isDark, setIsDark] = useState(false);
  const [tokens, setTokens] = useState(THEME_PRESETS[0].light);
  const [radius, setRadius] = useState(14);
  const [fontScale, setFontScale] = useState(100);
  const [fontFamily, setFontFamily] = useState('inter');

  // Load initial theme
  useEffect(() => {
    const saved = loadThemeLocal();
    if (saved) {
      setActivePresetId(saved.presetId || 'indigo');
      setIsDark(Boolean(saved.isDark));
      if (saved.tokens) setTokens(saved.tokens);
      if (saved.radius) setRadius(saved.radius);
      if (saved.fontScale) setFontScale(saved.fontScale);
      if (saved.fontFamily) setFontFamily(saved.fontFamily);
    }
  }, []);

  const handleApply = (newSettings) => {
    applyTheme(newSettings);
    saveThemeLocal(newSettings);
  };

  const handleSelectPreset = (preset) => {
    setActivePresetId(preset.id);
    const newTokens = isDark ? preset.dark : preset.light;
    setTokens(newTokens);
    handleApply({
      presetId: preset.id,
      isDark,
      tokens: newTokens,
      radius,
      fontScale,
      fontFamily
    });
  };

  const handleModeChange = (mode) => {
    const nextDark = mode === 'dark';
    setIsDark(nextDark);
    const currentPreset = THEME_PRESETS.find(p => p.id === activePresetId) || THEME_PRESETS[0];
    const newTokens = nextDark ? currentPreset.dark : currentPreset.light;
    setTokens(newTokens);
    handleApply({
      presetId: activePresetId,
      isDark: nextDark,
      tokens: newTokens,
      radius,
      fontScale,
      fontFamily
    });
  };

  const handleCustomColor = (key, value) => {
    const nextTokens = { ...tokens, [key]: value };
    setTokens(nextTokens);
    handleApply({
      presetId: 'custom',
      isDark,
      tokens: nextTokens,
      radius,
      fontScale,
      fontFamily
    });
  };

  // Contrast check
  const textContrast = calculateContrastRatio(tokens.text || '15 23 42', tokens.surface || '255 255 255');
  const isContrastFailing = textContrast < 4.5;

  const handleSaveAsDefault = async () => {
    try {
      await api.put('/settings?scope=theme', {
        theme: {
          presetId: activePresetId,
          isDark,
          tokens,
          radius,
          fontScale,
          fontFamily
        }
      }, { authRequired: true });
      toast.success('Theme saved as system default for all users and kiosk displays.', 'Saved');
    } catch (_err) {
      toast.success('Theme saved locally.', 'Saved');
    }
  };

  const handleExportTheme = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ presetId: activePresetId, isDark, tokens, radius, fontScale, fontFamily }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'faceattend-theme.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportTheme = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.tokens) setTokens(parsed.tokens);
        if (parsed.presetId) setActivePresetId(parsed.presetId);
        if (parsed.radius) setRadius(parsed.radius);
        if (parsed.fontScale) setFontScale(parsed.fontScale);
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
        handleApply(parsed);
        toast.success('Theme imported successfully!');
      } catch (_err) {
        toast.error('Invalid theme JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Contrast Warning if < 4.5:1 */}
      {isContrastFailing && (
        <div className="flex items-center gap-3 p-3.5 bg-warning/10 border border-warning/30 rounded-token text-warning">
          <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium">
            Warning: Current text and surface contrast ratio is {textContrast.toFixed(2)}:1 (WCAG AA requires at least 4.5:1). Consider choosing darker text or a lighter surface.
          </p>
        </div>
      )}

      {/* Mode Switcher */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-main text-base">Appearance Mode</h3>
            <p className="text-xs text-muted mt-0.5">Choose between light and dark palette variants.</p>
          </div>
          <div className="flex items-center gap-2 p-1 bg-surface-2 rounded-token border border-line">
            <button
              type="button"
              onClick={() => handleModeChange('light')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-token transition-colors ${
                !isDark ? 'bg-surface text-main shadow-sm' : 'text-muted hover:text-main'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('dark')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-token transition-colors ${
                isDark ? 'bg-surface text-main shadow-sm' : 'text-muted hover:text-main'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </Card>

      {/* Presets Grid */}
      <div>
        <h3 className="font-semibold text-main text-base mb-1">Color Palette Presets</h3>
        <p className="text-xs text-muted mb-4">Select from curated, accessible brand colorways.</p>
        <PresetGrid
          activePresetId={activePresetId}
          isDark={isDark}
          onSelectPreset={handleSelectPreset}
        />
      </div>

      {/* Custom Color Overrides */}
      <Card>
        <h3 className="font-semibold text-main text-base mb-1">Custom Color Palette</h3>
        <p className="text-xs text-muted mb-4">Fine-tune individual CSS tokens.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ColorPicker
            label="Primary"
            value={tokens.primary}
            onChange={(val) => handleCustomColor('primary', val)}
          />
          <ColorPicker
            label="Accent"
            value={tokens.accent}
            onChange={(val) => handleCustomColor('accent', val)}
          />
          <ColorPicker
            label="Surface"
            value={tokens.surface}
            onChange={(val) => handleCustomColor('surface', val)}
          />
          <ColorPicker
            label="Background"
            value={tokens.bg}
            onChange={(val) => handleCustomColor('bg', val)}
          />
        </div>
      </Card>

      {/* Sliders for Radius, Font Scale & Typography */}
      <Card>
        <h3 className="font-semibold text-main text-base mb-4">Geometry & Typography</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Radius Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-main">Corner Radius</span>
              <span className="text-muted font-mono">{radius}px</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[radius]}
              onValueChange={([val]) => {
                setRadius(val);
                handleApply({ presetId: activePresetId, isDark, tokens, radius: val, fontScale, fontFamily });
              }}
              max={24}
              min={0}
              step={2}
            >
              <Slider.Track className="bg-surface-2 relative grow rounded-full h-2 border border-line">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-surface border-2 border-primary rounded-full shadow focus:outline-none" />
            </Slider.Root>
          </div>

          {/* Font Scale Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-main">Font Scale</span>
              <span className="text-muted font-mono">{fontScale}%</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[fontScale]}
              onValueChange={([val]) => {
                setFontScale(val);
                handleApply({ presetId: activePresetId, isDark, tokens, radius, fontScale: val, fontFamily });
              }}
              max={125}
              min={90}
              step={5}
            >
              <Slider.Track className="bg-surface-2 relative grow rounded-full h-2 border border-line">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-surface border-2 border-primary rounded-full shadow focus:outline-none" />
            </Slider.Root>
          </div>

          {/* Font Stack Select */}
          <div>
            <label htmlFor="font-family-select" className="block text-xs font-semibold text-main mb-2">Font Family</label>
            <select
              id="font-family-select"
              value={fontFamily}
              onChange={(e) => {
                const val = e.target.value;
                setFontFamily(val);
                handleApply({ presetId: activePresetId, isDark, tokens, radius, fontScale, fontFamily: val });
              }}
              className="w-full bg-surface-2 border border-line rounded-token px-3 py-2 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="inter">Inter (Modern Sans)</option>
              <option value="poppins">Poppins (Geometric)</option>
              <option value="system">System Stack</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Live Preview Card */}
      <Card>
        <h3 className="font-semibold text-main text-base mb-1">Live Component Preview</h3>
        <p className="text-xs text-muted mb-4">Sample interface elements using the active token configuration.</p>

        <div className="p-4 sm:p-6 bg-surface-2/60 border border-line rounded-token space-y-6">
          {/* Button Samples */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <Button variant="primary">Primary Button</Button>
            <Button variant="accent">Accent Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="primary">Primary Badge</Badge>
            <Badge variant="success">Present (On Time)</Badge>
            <Badge variant="warning">Late (12 min)</Badge>
            <Badge variant="danger">Absent</Badge>
            <Badge variant="accent">Biometric Verified</Badge>
          </div>

          {/* Attendance Result Card Preview */}
          <div className="max-w-md p-4 bg-surface border border-line rounded-token shadow-md flex items-center gap-4">
            <div className="w-14 h-14 rounded-token bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xl text-primary">
              AS
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base text-main truncate font-poppins">Aditi Sharma</h4>
              <p className="text-xs text-muted font-mono">Roll: CS-101 • Morning</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="success" size="sm">Present</Badge>
                <span className="text-xs text-success font-medium">On time, welcome</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => handleSelectPreset(THEME_PRESETS[0])}>
            <FiRotateCcw className="w-4 h-4 mr-1.5" />
            Reset to Default
          </Button>
          <Button variant="outline" onClick={handleExportTheme}>
            <FiDownload className="w-4 h-4 mr-1.5" />
            Export JSON
          </Button>
          <label className="cursor-pointer inline-flex items-center justify-center font-medium transition-all rounded-token border border-line bg-surface text-main hover:bg-surface-2 text-sm px-4 py-2 gap-2 min-h-[40px]">
            <FiUpload className="w-4 h-4" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportTheme} className="hidden" />
          </label>
        </div>

        <Button variant="primary" onClick={handleSaveAsDefault}>
          <FiSave className="w-4 h-4 mr-1.5" />
          Save as System Default
        </Button>
      </div>
    </div>
  );
}
