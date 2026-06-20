import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(__dirname, '../../../data');
const DB_PATH = path.join(DB_DIR, 'quickbuzz.db');

export class AppDatabase {
  private db: Database.Database;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS competitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        competition_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#ff1744',
        enabled INTEGER DEFAULT 1,
        score INTEGER DEFAULT 0,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        competition_id TEXT NOT NULL,
        name TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        status TEXT DEFAULT 'open',
        winner_id TEXT,
        winner_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        team TEXT,
        action TEXT NOT NULL,
        message TEXT,
        score_change INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS buzzer_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state TEXT DEFAULT 'LOCKED',
        winner_id TEXT,
        round_id TEXT
      );

      INSERT OR IGNORE INTO buzzer_state (id, state) VALUES (1, 'LOCKED');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('competitionName', '"QuickBuzz Competition"');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('soundEnabled', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('soundVolume', '0.7');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('fullscreen', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '"dark"');
    `);
  }

  // --- Competitions ---
  createCompetition(name: string, date: string) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const stmt = this.db.prepare('INSERT INTO competitions (id, name, date) VALUES (?, ?, ?)');
    stmt.run(id, name, date);
    return this.getCompetition(id);
  }

  getCompetition(id: string) {
    return this.db.prepare('SELECT * FROM competitions WHERE id = ?').get(id) as any;
  }

  getCompetitions() {
    return this.db.prepare('SELECT * FROM competitions ORDER BY created_at DESC').all() as any[];
  }

  updateCompetition(id: string, data: { name?: string; date?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE competitions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteCompetition(id: string) {
    this.db.prepare('DELETE FROM competitions WHERE id = ?').run(id);
  }

  // --- Teams ---
  addTeam(competitionId: string, name: string, color: string, id?: string) {
    const tid = id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 4));
    this.db.prepare('INSERT INTO teams (id, competition_id, name, color) VALUES (?, ?, ?, ?)').run(tid, competitionId, name, color);
    return this.getTeam(tid);
  }

  getTeam(id: string) {
    return this.db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as any;
  }

  getTeams(competitionId: string) {
    return this.db.prepare('SELECT * FROM teams WHERE competition_id = ? ORDER BY rowid').all(competitionId) as any[];
  }

  updateTeam(id: string, data: { name?: string; color?: string; enabled?: boolean; score?: number }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.score !== undefined) { fields.push('score = ?'); values.push(data.score); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  addScore(teamId: string, points: number) {
    this.db.prepare('UPDATE teams SET score = score + ? WHERE id = ?').run(points, teamId);
    const team = this.getTeam(teamId);
    return team?.score ?? 0;
  }

  setScore(teamId: string, score: number) {
    this.db.prepare('UPDATE teams SET score = ? WHERE id = ?').run(score, teamId);
  }

  deleteTeam(id: string) {
    this.db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  }

  // --- Rounds ---
  createRound(competitionId: string, name: string, roundNumber: number) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
    this.db.prepare('INSERT INTO rounds (id, competition_id, name, round_number) VALUES (?, ?, ?, ?)').run(id, competitionId, name, roundNumber);
    return this.getRound(id);
  }

  getRound(id: string) {
    return this.db.prepare('SELECT * FROM rounds WHERE id = ?').get(id) as any;
  }

  getRounds(competitionId: string) {
    return this.db.prepare('SELECT * FROM rounds WHERE competition_id = ? ORDER BY round_number').all(competitionId) as any[];
  }

  updateRound(id: string, data: { name?: string; status?: string; winner_id?: string; winner_name?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.winner_id !== undefined) { fields.push('winner_id = ?'); values.push(data.winner_id); }
    if (data.winner_name !== undefined) { fields.push('winner_name = ?'); values.push(data.winner_name); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE rounds SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteRound(id: string) {
    this.db.prepare('DELETE FROM rounds WHERE id = ?').run(id);
  }

  // --- Buzzer State ---
  getBuzzerState() {
    return this.db.prepare('SELECT * FROM buzzer_state WHERE id = 1').get() as any;
  }

  setBuzzerState(data: { state?: string; winner_id?: string | null; round_id?: string | null }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.state !== undefined) { fields.push('state = ?'); values.push(data.state); }
    if (data.winner_id !== undefined) { fields.push('winner_id = ?'); values.push(data.winner_id); }
    if (data.round_id !== undefined) { fields.push('round_id = ?'); values.push(data.round_id); }
    if (fields.length === 0) return;
    values.push(1);
    this.db.prepare(`UPDATE buzzer_state SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // --- Audit Log ---
  addAuditLog(team: string, action: string, message?: string, scoreChange?: number) {
    const ts = new Date().toISOString();
    this.db.prepare('INSERT INTO audit_log (timestamp, team, action, message, score_change) VALUES (?, ?, ?, ?, ?)').run(ts, team, action, message || null, scoreChange || 0);
  }

  getAuditLogs(limit = 200) {
    return this.db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(limit) as any[];
  }

  getAuditLogsCSV() {
    const rows = this.db.prepare('SELECT * FROM audit_log ORDER BY id ASC').all() as any[];
    const header = 'ID,Timestamp,Team,Action,Message,ScoreChange';
    const data = rows.map((r: any) => `"${r.id}","${r.timestamp}","${r.team || ''}","${r.action}","${(r.message || '').replace(/"/g, '""')}","${r.score_change}"`);
    return [header, ...data].join('\n');
  }

  // --- Settings ---
  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row?.value ?? null;
  }

  setSetting(key: string, value: string) {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  getAllSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT * FROM settings').all() as any[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  // --- Backup ---
  exportAll(): string {
    const competitions = this.db.prepare('SELECT * FROM competitions').all();
    const teams = this.db.prepare('SELECT * FROM teams').all();
    const rounds = this.db.prepare('SELECT * FROM rounds').all();
    const auditLog = this.db.prepare('SELECT * FROM audit_log').all();
    const settings = this.db.prepare('SELECT * FROM settings').all();
    const buzzerState = this.db.prepare('SELECT * FROM buzzer_state').get();
    return JSON.stringify({ competitions, teams, rounds, auditLog, settings, buzzerState, exportedAt: new Date().toISOString() }, null, 2);
  }

  importAll(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      this.db.exec('BEGIN TRANSACTION');
      try {
        if (parsed.competitions?.length) {
          this.db.prepare('DELETE FROM competitions').run();
          const ins = this.db.prepare('INSERT INTO competitions (id, name, date, created_at) VALUES (?, ?, ?, ?)');
          for (const c of parsed.competitions) ins.run(c.id, c.name, c.date, c.created_at);
        }
        if (parsed.teams?.length) {
          this.db.prepare('DELETE FROM teams').run();
          const ins = this.db.prepare('INSERT INTO teams (id, competition_id, name, color, enabled, score) VALUES (?, ?, ?, ?, ?, ?)');
          for (const t of parsed.teams) ins.run(t.id, t.competition_id, t.name, t.color, t.enabled, t.score);
        }
        if (parsed.rounds?.length) {
          this.db.prepare('DELETE FROM rounds').run();
          const ins = this.db.prepare('INSERT INTO rounds (id, competition_id, name, round_number, status, winner_id, winner_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
          for (const r of parsed.rounds) ins.run(r.id, r.competition_id, r.name, r.round_number, r.status, r.winner_id, r.winner_name, r.created_at);
        }
        if (parsed.auditLog?.length) {
          this.db.prepare('DELETE FROM audit_log').run();
          const ins = this.db.prepare('INSERT INTO audit_log (id, timestamp, team, action, message, score_change) VALUES (?, ?, ?, ?, ?, ?)');
          for (const l of parsed.auditLog) ins.run(l.id, l.timestamp, l.team, l.action, l.message, l.score_change);
        }
        if (parsed.settings?.length) {
          this.db.prepare('DELETE FROM settings').run();
          const ins = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
          for (const s of parsed.settings) ins.run(s.key, s.value);
        }
        this.db.exec('COMMIT');
        return true;
      } catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
      }
    } catch {
      return false;
    }
  }

  close(): void {
    this.db.close();
  }
}

export const db = new AppDatabase();
