import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { SessionSettings } from './SessionSettings.jsx';
import { RecognitionSettings } from './RecognitionSettings.jsx';
import { SystemSettings } from './SystemSettings.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

export function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchSettings() {
      try {
        const data = await api.get('/settings', { authRequired: true });
        if (isMounted) setSettings(data);
      } catch (err) {
        console.error('Failed to load settings:', err);
        // Fallback default structure
        if (isMounted) {
          setSettings({
            timezone: 'Asia/Kolkata',
            earlyWindowMinutes: 60,
            lateCountsFrom: 'start',
            sessions: {
              morning: { enabled: true, start: '09:00', graceMinutes: 5, cutoff: '11:30' },
              afternoon: { enabled: true, start: '14:00', graceMinutes: 5, cutoff: '16:30' }
            },
            recognition: {
              threshold: 0.45,
              minMarginToSecond: 0.06,
              eyeTolerance: 0.08,
              requireLiveness: true,
              strictLiveness: false,
              requiredConsecutiveFrames: 3,
              cooldownSeconds: 20,
              inputSize: 320
            },
            weekdays: [1, 2, 3, 4, 5, 6],
            holidays: ['2026-10-02'],
            kioskMessage: 'Please look at the camera'
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (updatedFields) => {
    const previous = { ...settings };
    const optimistic = { ...settings, ...updatedFields };

    setSettings(optimistic);
    setSaving(true);

    try {
      const res = await api.put('/settings', optimistic, { authRequired: true });
      if (res.settings) {
        setSettings(res.settings);
      }
      toast.success('Settings saved and synchronized with kiosk network.', 'Saved');
    } catch (err) {
      setSettings(previous); // Rollback
      toast.error(err.message, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const tabs = ['Sessions & Windows', 'Biometric Recognition', 'Calendar & System'];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-token" />
        <Skeleton className="h-64 w-full rounded-token" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="System Configuration"
        description="Configure attendance sessions, lateness thresholds, biometric precision, and institutional policies."
      />

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-token bg-surface-2 p-1 border border-line mb-6 max-w-xl">
          {tabs.map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                `w-full rounded-token py-2.5 text-xs font-semibold tracking-tight transition-all focus:outline-none ${
                  selected
                    ? 'bg-surface text-main shadow-sm'
                    : 'text-muted hover:text-main hover:bg-surface/50'
                }`
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            <SessionSettings settings={settings} onSave={handleSave} loading={saving} />
          </Tab.Panel>

          <Tab.Panel>
            <RecognitionSettings settings={settings} onSave={handleSave} loading={saving} />
          </Tab.Panel>

          <Tab.Panel>
            <SystemSettings settings={settings} onSave={handleSave} loading={saving} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
