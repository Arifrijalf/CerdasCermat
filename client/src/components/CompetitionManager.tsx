import { useState } from 'react';
import type { Competition, RoundInfo } from '@quickbuzz/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, Trash2, ChevronDown, ChevronUp, Save, Upload, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showRounds, setShowRounds] = useState(true);
  const [showNewRound, setShowNewRound] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const [importText, setImportText] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" />
          Competitions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {competitions.length > 0 && (
            <div className="space-y-1">
              {competitions.map(c => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    currentCompetition?.id === c.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:bg-bg-subtle'
                  }`}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="flex-1 font-semibold text-sm">{c.name}</span>
                  <span className="text-xs text-text-muted">{c.date}</span>
                  <Button variant="ghost" size="icon-sm" onClick={e => { e.stopPropagation(); onDelete(c.id); }} className="text-danger hover:text-danger">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : <><Plus className="w-3.5 h-3.5" /> New Competition</>}
          </Button>

          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pb-3 border-b border-border">
                  <Input placeholder="Competition name" value={newName} onChange={e => setNewName(e.target.value)} className="h-8" />
                  <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8" />
                  <Button variant="success" size="sm" className="w-full" onClick={() => { if (newName.trim()) { onCreate(newName.trim(), newDate); setNewName(''); setShowCreate(false); } }}>
                    Create
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {currentCompetition && (
            <div className="space-y-2 pt-2 border-t border-border">
              <button className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text transition-colors" onClick={() => setShowRounds(!showRounds)}>
                Rounds ({rounds.length})
                {showRounds ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {showRounds && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1">
                      {rounds.map(r => (
                        <div key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${currentRoundId === r.id ? 'border-success bg-success/5' : 'border-border'}`}>
                          {renameId === r.id ? (
                            <div className="flex gap-1.5 w-full">
                              <Input value={renameVal} onChange={e => setRenameVal(e.target.value)} className="h-7 flex-1" autoFocus />
                              <Button variant="success" size="xs" onClick={() => { onRenameRound(r.id, renameVal); setRenameId(null); }}>
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="xs" onClick={() => setRenameId(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 font-medium" onClick={() => onSelectRound(r.id)}>{r.round_number}: {r.name}</span>
                              {r.winner_name && <span className="text-warning text-xs">won</span>}
                              <Badge variant={r.status === 'open' ? 'success' : 'default'}>{r.status}</Badge>
                              <Button variant="ghost" size="xs" onClick={() => { setRenameId(r.id); setRenameVal(r.name); }}>
                                <Save className="w-3 h-3" />
                              </Button>
                              {r.status === 'open' ? (
                                <Button variant="destructive" size="xs" onClick={() => onCloseRound(r.id)}>Close</Button>
                              ) : (
                                <Button variant="success" size="xs" onClick={() => onOpenRound(r.id)}>Open</Button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {showNewRound ? (
                      <div className="flex gap-1.5 mt-2">
                        <Input placeholder="Round name" value={newRoundName} onChange={e => setNewRoundName(e.target.value)} className="h-7 flex-1" />
                        <Button variant="success" size="xs" onClick={() => { if (newRoundName.trim()) { onCreateRound(newRoundName.trim()); setNewRoundName(''); setShowNewRound(false); } }}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setShowNewRound(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="xs" className="w-full mt-2" onClick={() => setShowNewRound(true)}>
                        <Plus className="w-3 h-3" /> Add Round
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <button className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text transition-colors" onClick={() => setShowBackup(!showBackup)}>
              Backup
              {showBackup ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <AnimatePresence>
              {showBackup && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={onExport}>
                      <Download className="w-3.5 h-3.5" /> Export JSON
                    </Button>
                    <Textarea
                      placeholder="Paste backup JSON here..."
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      rows={3}
                      className="font-mono text-xs"
                    />
                    <Button variant="success" size="sm" className="w-full" onClick={() => { if (importText.trim()) { onImport(importText.trim()); setImportText(''); } }}>
                      <Upload className="w-3.5 h-3.5" /> Import
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
