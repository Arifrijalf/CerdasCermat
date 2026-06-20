import { useState } from 'react';
import type { TeamConfig, TeamId } from '@quickbuzz/shared';

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

export default function TeamManager({
  teams,
  connectedTeams,
  onAdd,
  onEdit,
  onDelete,
}: TeamManagerProps) {
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
    <div className="team-manager">
      <div className="team-manager-header">
        <h3>Teams</h3>
        <button className="btn btn-small btn-add" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Team'}
        </button>
      </div>

      {isAdding && (
        <div className="team-add-form">
          <input
            type="text"
            placeholder="Team name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input"
            maxLength={30}
            autoFocus
          />
          <div className="color-picker">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${newColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <button className="btn btn-small btn-start" onClick={handleAdd}>
            Create Team
          </button>
        </div>
      )}

      <div className="team-list-manager">
        {teams.map((team) => (
          <TeamRow
            key={team.id}
            team={team}
            connected={connectedTeams.includes(team.id)}
            onEdit={(name, color, enabled) => onEdit(team.id, name, color, enabled)}
            onDelete={() => onDelete(team.id)}
          />
        ))}
        {teams.length === 0 && (
          <div className="no-teams-msg">No teams configured</div>
        )}
      </div>
    </div>
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
      <div className="team-row editing">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input input-sm"
          maxLength={30}
          autoFocus
        />
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch-sm ${color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="team-row-actions">
          <button className="btn btn-tiny btn-start" onClick={handleSave}>Save</button>
          <button className="btn btn-tiny btn-reset" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`team-row ${!enabled ? 'disabled' : ''}`}>
      <span className="team-row-color" style={{ background: color }} />
      <span className="team-row-name">{team.name}</span>
      {connected && <span className="team-row-status">●</span>}
      <div className="team-row-actions">
        <button className="btn btn-tiny btn-toggle" onClick={handleToggle}>
          {enabled ? 'Disable' : 'Enable'}
        </button>
        <button className="btn btn-tiny btn-edit" onClick={() => { setName(team.name); setColor(team.color); setEnabled(team.enabled); setEditing(true); }}>
          Edit
        </button>
        <button className="btn btn-tiny btn-danger" onClick={onDelete}>Del</button>
      </div>
    </div>
  );
}
