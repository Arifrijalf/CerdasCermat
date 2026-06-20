import { useState } from 'react';
import type { Competition, RoundInfo } from '@quickbuzz/shared';

interface CompetitionManagerProps {
  competitions: Competition[];
  currentCompetition: Competition | null;
  rounds: RoundInfo[];
  currentRoundId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, date: string) => void;
  onDelete: (id: string) => void;
  onCreateRound: (name: string) => void;
  onRenameRound: (id: string, name: string) => void;
  onCloseRound: (id: string) => void;
  onOpenRound: (id: string) => void;
  onSelectRound: (id: string) => void;
  onExport: () => void;
  onImport: (json: string) => void;
}

export default function CompetitionManager({
  competitions, currentCompetition, rounds, currentRoundId,
  onSelect, onCreate, onDelete, onCreateRound, onRenameRound,
  onCloseRound, onOpenRound, onSelectRound, onExport, onImport,
}: CompetitionManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [showNewRound, setShowNewRound] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [importText, setImportText] = useState('');

  return (
    <div className="competition-manager">
      <h3>Competitions</h3>

      {competitions.length > 0 && (
        <div className="comp-list">
          {competitions.map(c => (
            <div key={c.id} className={`comp-row ${currentCompetition?.id === c.id ? 'active' : ''}`}>
              <span className="comp-name" onClick={() => onSelect(c.id)}>{c.name}</span>
              <span className="comp-date">{c.date}</span>
              <button className="btn btn-tiny btn-danger" onClick={() => onDelete(c.id)}>Del</button>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-small btn-add" onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'Cancel' : '+ New Competition'}
      </button>

      {showCreate && (
        <div className="comp-create-form">
          <input type="text" placeholder="Competition name" value={newName} onChange={e => setNewName(e.target.value)} className="input input-sm" />
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input input-sm" />
          <button className="btn btn-small btn-start" onClick={() => { if (newName.trim()) { onCreate(newName.trim(), newDate); setNewName(''); setShowCreate(false); } }}>Create</button>
        </div>
      )}

      {currentCompetition && (
        <div className="rounds-section">
          <h4>Rounds</h4>
          <div className="rounds-list">
            {rounds.map(r => (
              <div key={r.id} className={`round-row ${currentRoundId === r.id ? 'active' : ''}`}>
                {renameId === r.id ? (
                  <div className="round-rename">
                    <input type="text" value={renameVal} onChange={e => setRenameVal(e.target.value)} className="input input-sm" autoFocus />
                    <button className="btn btn-tiny btn-start" onClick={() => { onRenameRound(r.id, renameVal); setRenameId(null); }}>Save</button>
                    <button className="btn btn-tiny btn-reset" onClick={() => setRenameId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="round-name" onClick={() => onSelectRound(r.id)}>
                      R{r.round_number}: {r.name}
                      {r.winner_name && <span className="round-winner"> - {r.winner_name} won</span>}
                    </span>
                    <span className={`round-status ${r.status}`}>{r.status}</span>
                    <button className="btn btn-tiny btn-edit" onClick={() => { setRenameId(r.id); setRenameVal(r.name); }}>Rename</button>
                    {r.status === 'open' ? (
                      <button className="btn btn-tiny btn-danger" onClick={() => onCloseRound(r.id)}>Close</button>
                    ) : (
                      <button className="btn btn-tiny btn-start" onClick={() => onOpenRound(r.id)}>Open</button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {showNewRound ? (
            <div className="round-create">
              <input type="text" placeholder="Round name" value={newRoundName} onChange={e => setNewRoundName(e.target.value)} className="input input-sm" />
              <button className="btn btn-tiny btn-start" onClick={() => { if (newRoundName.trim()) { onCreateRound(newRoundName.trim()); setNewRoundName(''); setShowNewRound(false); } }}>Add</button>
              <button className="btn btn-tiny btn-reset" onClick={() => setShowNewRound(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-small btn-add" onClick={() => setShowNewRound(true)}>+ Add Round</button>
          )}
        </div>
      )}

      <div className="backup-section">
        <h4>Backup</h4>
        <button className="btn btn-small btn-export" onClick={onExport}>Export JSON</button>
        <div className="backup-import">
          <textarea placeholder="Paste backup JSON here..." value={importText} onChange={e => setImportText(e.target.value)} className="input" rows={3} />
          <button className="btn btn-small btn-start" onClick={() => { if (importText.trim()) { onImport(importText.trim()); setImportText(''); } }}>Import</button>
        </div>
      </div>
    </div>
  );
}
