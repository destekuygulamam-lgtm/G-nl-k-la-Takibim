import { useState, useEffect } from 'react';

export interface Settings {
  lowStockThreshold: number;
  userName?: string;
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  reminderSound?: string;
  chartPalette?: string;
}

const DEFAULT_SETTINGS: Settings = {
  lowStockThreshold: 10,
  userName: '',
  birthDate: '',
  gender: '',
  bloodType: '',
  reminderSound: 'default',
  chartPalette: 'modern',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('medtrack-settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('medtrack-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting, setSettings };
}
