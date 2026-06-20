import { useState } from 'react';
import type { AppSettings } from '@quickbuzz/shared';
import { saveSettings } from '../services/settings';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (partial: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function SettingsPanel({
  settings,
  onUpdate,
  onClose,
}: SettingsPanelProps) {
  const [competitionName, setCompetitionName] = useState(settings.competitionName);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [soundVolume, setSoundVolume] = useState(settings.soundVolume);
  const [fullscreen, setFullscreen] = useState(settings.fullscreen);
  const [theme, setTheme] = useState(settings.theme);

  const handleSave = () => {
    const updated: AppSettings = {
      competitionName,
      soundEnabled,
      soundVolume,
      fullscreen,
      theme,
    };
    saveSettings(updated);
    onUpdate(updated as unknown as Record<string, unknown>);
    onClose();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="btn btn-tiny btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="setting-row">
            <label>Competition Name</label>
            <input
              type="text"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
              className="input"
              maxLength={50}
            />
          </div>

          <div className="setting-row">
            <label>Sound Effects</label>
            <div className="setting-inline">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
              <span>{soundEnabled ? 'On' : 'Off'}</span>
            </div>
          </div>

          {soundEnabled && (
            <div className="setting-row">
              <label>Volume: {Math.round(soundVolume * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                className="range-input"
              />
            </div>
          )}

          <div className="setting-row">
            <label>Theme</label>
            <div className="setting-inline">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                className="select"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <label>Fullscreen</label>
            <button className="btn btn-small btn-toggle" onClick={toggleFullscreen}>
              {document.fullscreenElement ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn btn-start" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
