import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CameraView } from '../../components/camera/CameraView.jsx';
import { FaceOverlay } from '../../components/camera/FaceOverlay.jsx';
import { ResultCard } from './ResultCard.jsx';
import { useRecognitionLoop } from './useRecognitionLoop.js';
import { playSuccessChime, playLateChime, playErrorTone } from './sound.js';
import { loadModels } from '../../lib/faceEngine.js';
import { api } from '../../lib/api.js';
import { applyTheme } from '../../lib/theme.js';
import { formatTimeDisplay } from '../../lib/time.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import {
  FiSettings,
  FiMaximize,
  FiClock,
  FiUsers,
  FiCheckCircle
} from 'react-icons/fi';

const KIOSK_SETTINGS_KEY = 'faceattend_kiosk_device_settings';

export function KioskPage() {
  const [searchParams] = useSearchParams();
  const cameraRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Kiosk device settings stored in localStorage
  const [deviceSettings, setDeviceSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(KIOSK_SETTINGS_KEY);
      return saved ? JSON.parse(saved) : { sound: true, mirror: true, deviceId: null };
    } catch (_e) {
      return { sound: true, mirror: true, deviceId: null };
    }
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devices, setDevices] = useState([]);

  // Server kiosk configuration
  const [kioskConfig, setKioskConfig] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [recentMarks, setRecentMarks] = useState([]);

  // Save device settings to localStorage
  const updateDeviceSetting = (key, val) => {
    setDeviceSettings(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem(KIOSK_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // 1. Digital Clock in configured timezone
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fullscreen query parameter handling
  useEffect(() => {
    if (searchParams.get('fullscreen') === '1') {
      const handleFirstInteraction = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        window.removeEventListener('click', handleFirstInteraction);
      };
      window.addEventListener('click', handleFirstInteraction);
      return () => window.removeEventListener('click', handleFirstInteraction);
    }
  }, [searchParams]);

  // 3. Load Models & Kiosk Config
  useEffect(() => {
    let isMounted = true;

    loadModels()
      .then(() => { if (isMounted) setModelLoading(false); })
      .catch((e) => console.error('Model load error:', e));

    async function pollConfig() {
      try {
        const conf = await api.get('/kiosk/config');
        if (isMounted) {
          setKioskConfig(conf);
          if (conf.theme) {
            applyTheme(conf.theme);
          }
        }
      } catch (err) {
        console.warn('Failed to load kiosk configuration:', err);
      }
    }

    pollConfig();
    const pollInterval = setInterval(pollConfig, 60000); // 60s poll

    // Enumerate video devices
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      if (isMounted) {
        setDevices(devs.filter(d => d.kind === 'videoinput'));
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // 4. Sound & Result Handler
  const handleScanResult = (res) => {
    if (!res) return;

    if (deviceSettings.sound) {
      if (res.matched && res.status === 'present') {
        playSuccessChime();
      } else if (res.matched && res.status === 'late') {
        playLateChime();
      } else if (!res.matched) {
        playErrorTone();
      }
    }

    if (res.matched && res.student) {
      setRecentMarks(prev => {
        const item = {
          name: res.student.name,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
        };
        const updated = [item, ...prev.filter(p => p.name !== item.name)].slice(0, 5);
        return updated;
      });
    }
  };

  // 5. Recognition Loop
  const { overlayState, prompt, currentResult } = useRecognitionLoop({
    videoRef: { current: cameraRef.current?.getVideoElement() },
    isActive: !modelLoading,
    config: kioskConfig?.recognition || {},
    soundEnabled: deviceSettings.sound,
    onResult: handleScanResult
  });

  const timezone = kioskConfig?.timezone || 'Asia/Kolkata';
  const activeSession = kioskConfig?.activeSession;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white flex flex-col select-none">
      {/* Top Status Bar */}
      <header className="absolute inset-x-0 top-0 z-30 h-16 bg-gradient-to-b from-black/80 to-transparent px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-token bg-primary text-primary-contrast font-bold flex items-center justify-center font-poppins shadow-md">
            FA
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight font-poppins">
            {import.meta.env.VITE_APP_NAME || 'FaceAttend'}
          </span>
        </div>

        {/* Live Digital Clock in configured timezone */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            <FiClock className="w-4 h-4 text-primary" />
            <span className="font-mono font-bold text-sm sm:text-base tracking-wider">
              {formatTimeDisplay(currentTime, timezone)}
            </span>
          </div>

          {/* Active Session Badge */}
          {activeSession ? (
            <Badge variant="success" className="text-xs uppercase tracking-wider">
              {activeSession} session
            </Badge>
          ) : (
            <Badge variant="danger" className="text-xs uppercase tracking-wider">
              {kioskConfig?.sessionMessage || 'Closed'}
            </Badge>
          )}

          {/* Local Device Settings Drawer Button */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Kiosk Settings"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors text-white"
          >
            <FiSettings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Camera Area */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center">
        {modelLoading ? (
          <div className="text-center space-y-3 z-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-base font-semibold">Initializing Neural Biometric Models...</p>
            <p className="text-xs text-gray-400">Loading WebGL Vision Shards</p>
          </div>
        ) : (
          <CameraView
            ref={cameraRef}
            mirrored={deviceSettings.mirror}
            deviceId={deviceSettings.deviceId}
            className="w-full h-full object-cover"
          >
            <FaceOverlay
              state={currentResult ? (currentResult.matched ? (currentResult.status === 'late' ? 'recognized' : 'recognized') : 'not_recognized') : overlayState}
              prompt={prompt}
            />
          </CameraView>
        )}

        {/* Big Animated Result Card */}
        {currentResult && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-none">
            <ResultCard result={currentResult} />
          </div>
        )}
      </main>

      {/* Bottom Strip: Last 5 people marked today */}
      <footer className="absolute inset-x-0 bottom-0 z-30 h-14 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 sm:px-6 flex items-center justify-between pb-safe">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <FiUsers className="w-3.5 h-3.5 text-primary" />
            Recent:
          </span>
          {recentMarks.length === 0 ? (
            <span className="text-xs text-gray-400 italic">No attendance marked yet today</span>
          ) : (
            recentMarks.map((m, idx) => (
              <span
                key={idx}
                className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white font-medium"
              >
                <FiCheckCircle className="w-3 h-3 text-success" />
                <span>{m.name}</span>
                <span className="text-[10px] text-gray-400 font-mono">({m.time})</span>
              </span>
            ))
          )}
        </div>

        <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
          {kioskConfig?.kioskMessage || 'Please look directly at camera'}
        </span>
      </footer>

      {/* Device Settings Modal */}
      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Kiosk Terminal Settings"
        description="Configuration saved to local device browser storage."
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 py-2">
          <Switch
            label="Chime Audio Feedback"
            description="Play audio cues on success, lateness, or rejection"
            checked={deviceSettings.sound}
            onChange={(val) => updateDeviceSetting('sound', val)}
          />

          <Switch
            label="Mirror Camera View"
            description="Flips video feed horizontally for intuitive user alignment"
            checked={deviceSettings.mirror}
            onChange={(val) => updateDeviceSetting('mirror', val)}
          />

          {devices.length > 1 && (
            <div>
              <label htmlFor="kiosk-cam-source" className="block text-xs font-semibold text-main uppercase tracking-wider mb-1.5">
                Camera Source
              </label>
              <select
                id="kiosk-cam-source"
                value={deviceSettings.deviceId || ''}
                onChange={(e) => updateDeviceSetting('deviceId', e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-token px-3 py-2 text-xs text-main"
              >
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-token text-xs font-semibold bg-surface-2 hover:bg-line text-main transition-colors"
            >
              <FiMaximize className="w-4 h-4" />
              <span>Toggle Fullscreen Display</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
