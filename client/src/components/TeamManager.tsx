import { useState } from 'react';
import type { TeamConfig, TeamId } from '@quickbuzz/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamManagerProps {
  teams: TeamConfig[];
  connectedTeams: TeamId[];
  onAdd: (name: string, color: string) => void;
  onEdit: (id: string, name: string, color: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  '#ff1744', '#2979ff', '#00c853', '#ffd600',
  '#d500f9', '#ff6d00', '#00bcd4', '#76ff03',
];

export default function TeamManager({ teams, connectedTeams, onAdd, onEdit, onDelete }: TeamManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(name, newColor);
    setNewName('');
    setNewColor(COLORS[0]);
    setIsAdding(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          Teams
        </CardTitle>
        <Button variant={isAdding ? 'ghost' : 'secondary'} size="xs" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {isAdding ? 'Cancel' : 'Add Team'}
        </Button>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pb-4 border-b border-border">
                <Input
                  placeholder="Team name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 ${newColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-elevated' : ''}`}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
                <Button variant="success" size="sm" onClick={handleAdd} className="w-full">
                  Create Team
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-px mt-2">
          {teams.map(team => (
            <TeamRow
              key={team.id}
              team={team}
              connected={connectedTeams.includes(team.id)}
              onEdit={(name, color, enabled) => onEdit(team.id, name, color, enabled)}
              onDelete={() => onDelete(team.id)}
            />
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-text-muted text-center py-6 italic">No teams configured</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamRowProps {
  team: TeamConfig;
  connected: boolean;
  onEdit: (name: string, color: string, enabled: boolean) => void;
  onDelete: () => void;
}

function TeamRow({ team, connected, onEdit, onDelete }: TeamRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState(team.color);
  const [enabled, setEnabled] = useState(team.enabled);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onEdit(trimmed, color, enabled);
    setEditing(false);
  };

  const handleToggle = () => {
    setEnabled(!enabled);
    onEdit(team.name, team.color, !enabled);
  };

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-2 p-3 rounded-lg bg-bg-subtle"
      >
        <Input value={name} onChange={e => setName(e.target.value)} maxLength={30} autoFocus className="h-8" />
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full cursor-pointer transition-all ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-bg-subtle' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          <Button variant="success" size="xs" onClick={handleSave}>
            <Check className="w-3 h-3" /> Save
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
            <X className="w-3 h-3" /> Cancel
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-bg-subtle transition-colors ${!enabled ? 'opacity-40' : ''}`}>
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="flex-1 font-semibold text-sm truncate">{team.name}</span>
      {connected && <span className="text-success text-xs">●</span>}
      <div className="flex gap-1">
        <Button variant="ghost" size="icon-sm" onClick={handleToggle} title={enabled ? 'Disable' : 'Enable'}>
          {enabled ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-text-muted" />}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => { setName(team.name); setColor(team.color); setEnabled(team.enabled); setEditing(true); }} title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} title="Delete" className="text-danger hover:text-danger">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
