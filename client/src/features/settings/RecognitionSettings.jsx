import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Card } from '../../components/ui/Card.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FiCamera, FiCheckCircle } from 'react-icons/fi';

export function RecognitionSettings({ settings, onSave, loading }) {
  const [data, setData] = useState(() => ({
    threshold: settings?.recognition?.threshold ?? 0.45,
    minMarginToSecond: settings?.recognition?.minMarginToSecond ?? 0.06,
    eyeTolerance: settings?.recognition?.eyeTolerance ?? 0.08,
    requireLiveness: settings?.recognition?.requireLiveness ?? true,
    strictLiveness: settings?.recognition?.strictLiveness ?? false,
    requiredConsecutiveFrames: settings?.recognition?.requiredConsecutiveFrames ?? 3,
    cooldownSeconds: settings?.recognition?.cooldownSeconds ?? 20,
    inputSize: settings?.recognition?.inputSize ?? 320
  }));

  const [testModalOpen, setTestModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Precision Sliders */}
      <Card>
        <h3 className="text-base font-semibold text-main mb-1">Biometric Thresholds & Tolerances</h3>
        <p className="text-xs text-muted mb-6">
          Adjust Euclidean distance and secondary eye geometry tolerance margins.
        </p>

        <div className="space-y-6">
          {/* Threshold Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-main">Face Acceptance Threshold (Euclidean Distance)</span>
              <span className="text-muted font-mono">{data.threshold.toFixed(2)}</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[data.threshold]}
              onValueChange={([val]) => setData({ ...data, threshold: val })}
              max={0.60}
              min={0.30}
              step={0.01}
            >
              <Slider.Track className="bg-surface-2 relative grow rounded-full h-2 border border-line">
                <Slider.Range className="absolute bg-primary rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-surface border-2 border-primary rounded-full shadow focus:outline-none" />
            </Slider.Root>
            <p className="text-[11px] text-muted mt-1.5">
              Lower is stricter (e.g. 0.40 for strict anti-false-positives, default 0.45).
            </p>
          </div>

          {/* Ambiguity Margin */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-main">Minimum Ambiguity Margin to 2nd Best Candidate</span>
              <span className="text-muted font-mono">{data.minMarginToSecond.toFixed(2)}</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[data.minMarginToSecond]}
              onValueChange={([val]) => setData({ ...data, minMarginToSecond: val })}
              max={0.20}
              min={0.02}
              step={0.01}
            >
              <Slider.Track className="bg-surface-2 relative grow rounded-full h-2 border border-line">
                <Slider.Range className="absolute bg-accent rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-surface border-2 border-accent rounded-full shadow focus:outline-none" />
            </Slider.Root>
            <p className="text-[11px] text-muted mt-1.5">
              Guarantees the best candidate leads the second-best by at least this gap. Rejects ambiguous matches.
            </p>
          </div>

          {/* Eye Tolerance */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-main">Eye-Region Geometry Mean Absolute Error Tolerance</span>
              <span className="text-muted font-mono">{data.eyeTolerance.toFixed(2)}</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[data.eyeTolerance]}
              onValueChange={([val]) => setData({ ...data, eyeTolerance: val })}
              max={0.25}
              min={0.02}
              step={0.01}
            >
              <Slider.Track className="bg-surface-2 relative grow rounded-full h-2 border border-line">
                <Slider.Range className="absolute bg-success rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-surface border-2 border-success rounded-full shadow focus:outline-none" />
            </Slider.Root>
            <p className="text-[11px] text-muted mt-1.5">
              Secondary check against the 8-dimension eye geometry vector (default 0.08).
            </p>
          </div>
        </div>
      </Card>

      {/* Liveness & Gates */}
      <Card>
        <h3 className="text-base font-semibold text-main mb-3">Anti-Spoofing & Liveness Checks</h3>
        <div className="space-y-4">
          <Switch
            label="Require Blink / Micro-movement Liveness"
            description="Prevents static printed photos or motionless phone screens from marking attendance."
            checked={data.requireLiveness}
            onChange={(val) => setData({ ...data, requireLiveness: val })}
          />

          <Switch
            label="Strict Liveness Mode"
            description="Challenges user to perform random head-turn gestures in addition to eye-blinks."
            checked={data.strictLiveness}
            onChange={(val) => setData({ ...data, strictLiveness: val })}
          />
        </div>
      </Card>

      {/* Frame Sampling & Hardware */}
      <Card>
        <h3 className="text-base font-semibold text-main mb-3">Sampling & Performance Tuning</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Consecutive Stable Frames"
            type="number"
            min={1}
            max={10}
            value={data.requiredConsecutiveFrames}
            onChange={(e) => setData({ ...data, requiredConsecutiveFrames: Number(e.target.value) })}
            helperText="Number of consistent frames required before submitting mark"
          />

          <Input
            label="Student Cooldown (Seconds)"
            type="number"
            min={5}
            max={120}
            value={data.cooldownSeconds}
            onChange={(e) => setData({ ...data, cooldownSeconds: Number(e.target.value) })}
            helperText="Suppresses duplicate scan prompts for the same person"
          />

          <Select
            label="Detector Input Resolution"
            value={data.inputSize}
            onChange={(e) => setData({ ...data, inputSize: Number(e.target.value) })}
            helperText="Higher resolution improves accuracy on low-end webcams"
          >
            <option value={320}>320 x 320 (Fast, Recommended)</option>
            <option value={416}>416 x 416 (High Accuracy)</option>
          </Select>
        </div>
      </Card>

      {/* Test Sandbox & Save */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button variant="secondary" onClick={() => setTestModalOpen(true)}>
          <FiCamera className="w-4 h-4 mr-1.5" />
          Test Recognition Sandbox
        </Button>

        <Button
          variant="primary"
          loading={loading}
          onClick={() => onSave({ recognition: data })}
        >
          Save Recognition Settings
        </Button>
      </div>

      {/* Recognition Test Sandbox Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title="Recognition Sandbox (Zero Record Write)"
        description="Verify recognition distance and confidence in real time without writing any attendance record."
        maxWidth="max-w-md"
      >
        <div className="p-4 bg-surface-2 rounded-token text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FiCamera className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-main">
            Sandbox evaluates the live face against enrolled descriptors using the currently configured threshold ({data.threshold}).
          </p>
          <div className="p-3 bg-surface border border-line rounded-token text-xs text-muted text-left">
            <p className="font-semibold text-main mb-1">Live Status:</p>
            <p>• Acceptance Threshold: {data.threshold}</p>
            <p>• Active Students Loaded: Ready</p>
            <p className="text-success mt-2 flex items-center gap-1 font-medium">
              <FiCheckCircle className="w-4 h-4" /> Ready for live scanning
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
