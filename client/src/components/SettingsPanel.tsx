import { useState } from 'react';
import type { AppSettings } from '@quickbuzz/shared';
import { saveSettings } from '../services/settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Save, Maximize, Minimize } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (partial: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onUpdate, onClose }: SettingsPanelProps) {
  const [competitionName, setCompetitionName] = useState(settings.competitionName);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [soundVolume, setSoundVolume] = useState(settings.soundVolume);
  const [fullscreen, setFullscreen] = useState(settings.fullscreen);
  const [theme, setTheme] = useState(settings.theme);

  const handleSave = () => {
    const updated: AppSettings = { competitionName, soundEnabled, soundVolume, fullscreen, theme };
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>Competition Name</Label>
            <Input value={competitionName} onChange={e => setCompetitionName(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-2">
            <Label>Sound Effects</Label>
            <div className="flex items-center gap-3">
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              <span className="text-sm text-text-secondary">{soundEnabled ? 'On' : 'Off'}</span>
            </div>
          </div>
          {soundEnabled && (
            <div className="space-y-2">
              <Label>Volume: {Math.round(soundVolume * 100)}%</Label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={e => setSoundVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onChange={e => setTheme(e.target.value as 'dark' | 'light')}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fullscreen</Label>
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {document.fullscreenElement ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              {document.fullscreenElement ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            </Button>
          </div>
          <Button variant="success" className="w-full" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
