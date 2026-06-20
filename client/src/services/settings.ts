import { AppSettings } from '@quickbuzz/shared';

const STORAGE_KEY = 'quickbuzz-settings';

const DEFAULT_SETTINGS: AppSettings = {
  competitionName: 'QuickBuzz Competition',
  soundEnabled: true,
  soundVolume: 0.7,
  fullscreen: true,
  theme: 'dark',
};

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}
