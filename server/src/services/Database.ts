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

      CREATE TABLE IF NOT EXISTS team_profiles (
        team_id TEXT PRIMARY KEY,
        institution TEXT DEFAULT '',
        members TEXT DEFAULT '[]',
        logo TEXT DEFAULT '',
        photo TEXT DEFAULT '',
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS competition_settings (
        competition_id TEXT PRIMARY KEY,
        penalty_config TEXT DEFAULT '{"wrongAnswer":-10,"falseStart":-5,"ruleViolation":-15,"custom":0}',
        false_start_action TEXT DEFAULT 'warning',
        false_start_lock_duration INTEGER DEFAULT 3000,
        question_reading_duration INTEGER DEFAULT 5000,
        rebuttal_lock_duration INTEGER DEFAULT 3000,
        max_rebuttals INTEGER DEFAULT 1,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        competition_id TEXT NOT NULL,
        team_ids TEXT DEFAULT '[]',
        judge_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS brackets (
        id TEXT PRIMARY KEY,
        competition_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        matches TEXT DEFAULT '[]',
        qualifiers TEXT DEFAULT '[]',
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS buzz_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        response_time REAL NOT NULL,
        round_id TEXT,
        correct INTEGER,
        competition_id TEXT
      );

      CREATE TABLE IF NOT EXISTS penalty_records (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        type TEXT NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT DEFAULT '',
        timestamp TEXT NOT NULL,
        applied_by TEXT DEFAULT 'judge',
        competition_id TEXT
      );

      CREATE TABLE IF NOT EXISTS hardware_inputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        device_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    this.migrateSchema();
  }

  private migrateSchema(): void {
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = new Set(tables.map((t: any) => t.name));

    if (tableNames.has('teams')) {
      const cols = this.db.prepare("PRAGMA table_info(teams)").all() as any[];
      const colNames = new Set(cols.map((c: any) => c.name));
      if (!colNames.has('room_id')) {
        this.db.exec("ALTER TABLE teams ADD COLUMN room_id TEXT DEFAULT NULL");
      }
    }

    if (tableNames.has('rounds')) {
      const cols = this.db.prepare("PRAGMA table_info(rounds)").all() as any[];
      const colNames = new Set(cols.map((c: any) => c.name));
      if (!colNames.has('room_id')) {
        this.db.exec("ALTER TABLE rounds ADD COLUMN room_id TEXT DEFAULT NULL");
      }
    }
  }

  // --- Competitions ---
  createCompetition(name: string, date: string) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const stmt = this.db.prepare('INSERT INTO competitions (id, name, date) VALUES (?, ?, ?)');
    stmt.run(id, name, date);
    const defaultSettings = JSON.stringify({
      penaltyConfig: { wrongAnswer: -10, falseStart: -5, ruleViolation: -15, custom: 0 },
      falseStartAction: 'warning',
      falseStartLockDuration: 3000,
      questionReadingDuration: 5000,
      rebuttalLockDuration: 3000,
      maxRebuttals: 1,
    });
    this.db.prepare('INSERT OR IGNORE INTO competition_settings (competition_id, penalty_config) VALUES (?, ?)').run(id, defaultSettings);
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

  updateTeam(id: string, data: { name?: string; color?: string; enabled?: boolean; score?: number; room_id?: string | null }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.score !== undefined) { fields.push('score = ?'); values.push(data.score); }
    if (data.room_id !== undefined) { fields.push('room_id = ?'); values.push(data.room_id); }
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

  // --- Team Profiles ---
  getTeamProfile(teamId: string) {
    const row = this.db.prepare('SELECT * FROM team_profiles WHERE team_id = ?').get(teamId) as any;
    if (!row) return null;
    return {
      teamId: row.team_id,
      institution: row.institution || '',
      members: JSON.parse(row.members || '[]'),
      logo: row.logo || '',
      photo: row.photo || '',
    };
  }

  getTeamProfiles(competitionId: string) {
    const rows = this.db.prepare(`
      SELECT tp.* FROM team_profiles tp
      JOIN teams t ON tp.team_id = t.id
      WHERE t.competition_id = ?
    `).all(competitionId) as any[];
    const profiles: Record<string, any> = {};
    for (const row of rows) {
      profiles[row.team_id] = {
        teamId: row.team_id,
        institution: row.institution || '',
        members: JSON.parse(row.members || '[]'),
        logo: row.logo || '',
        photo: row.photo || '',
      };
    }
    return profiles;
  }

  upsertTeamProfile(teamId: string, data: { institution?: string; members?: string[]; logo?: string; photo?: string }) {
    const existing = this.db.prepare('SELECT team_id FROM team_profiles WHERE team_id = ?').get(teamId);
    if (existing) {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.institution !== undefined) { fields.push('institution = ?'); values.push(data.institution); }
      if (data.members !== undefined) { fields.push('members = ?'); values.push(JSON.stringify(data.members)); }
      if (data.logo !== undefined) { fields.push('logo = ?'); values.push(data.logo); }
      if (data.photo !== undefined) { fields.push('photo = ?'); values.push(data.photo); }
      if (fields.length === 0) return;
      values.push(teamId);
      this.db.prepare(`UPDATE team_profiles SET ${fields.join(', ')} WHERE team_id = ?`).run(...values);
    } else {
      this.db.prepare('INSERT INTO team_profiles (team_id, institution, members, logo, photo) VALUES (?, ?, ?, ?, ?)').run(
        teamId,
        data.institution || '',
        JSON.stringify(data.members || []),
        data.logo || '',
        data.photo || ''
      );
    }
  }

  // --- Competition Settings ---
  getCompetitionSettings(competitionId: string) {
    const row = this.db.prepare('SELECT * FROM competition_settings WHERE competition_id = ?').get(competitionId) as any;
    if (!row) return null;
    return {
      penaltyConfig: JSON.parse(row.penalty_config || '{"wrongAnswer":-10,"falseStart":-5,"ruleViolation":-15,"custom":0}'),
      falseStartAction: row.false_start_action || 'warning',
      falseStartLockDuration: row.false_start_lock_duration || 3000,
      questionReadingDuration: row.question_reading_duration || 5000,
      rebuttalLockDuration: row.rebuttal_lock_duration || 3000,
      maxRebuttals: row.max_rebuttals || 1,
    };
  }

  updateCompetitionSettings(competitionId: string, data: {
    penalty_config?: string;
    false_start_action?: string;
    false_start_lock_duration?: number;
    question_reading_duration?: number;
    rebuttal_lock_duration?: number;
    max_rebuttals?: number;
  }) {
    const existing = this.db.prepare('SELECT competition_id FROM competition_settings WHERE competition_id = ?').get(competitionId);
    if (existing) {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.penalty_config !== undefined) { fields.push('penalty_config = ?'); values.push(data.penalty_config); }
      if (data.false_start_action !== undefined) { fields.push('false_start_action = ?'); values.push(data.false_start_action); }
      if (data.false_start_lock_duration !== undefined) { fields.push('false_start_lock_duration = ?'); values.push(data.false_start_lock_duration); }
      if (data.question_reading_duration !== undefined) { fields.push('question_reading_duration = ?'); values.push(data.question_reading_duration); }
      if (data.rebuttal_lock_duration !== undefined) { fields.push('rebuttal_lock_duration = ?'); values.push(data.rebuttal_lock_duration); }
      if (data.max_rebuttals !== undefined) { fields.push('max_rebuttals = ?'); values.push(data.max_rebuttals); }
      if (fields.length === 0) return;
      values.push(competitionId);
      this.db.prepare(`UPDATE competition_settings SET ${fields.join(', ')} WHERE competition_id = ?`).run(...values);
    }
  }

  // --- Rooms ---
  createRoom(id: string, name: string, competitionId: string, teamIds: string[]) {
    this.db.prepare('INSERT INTO rooms (id, name, competition_id, team_ids) VALUES (?, ?, ?, ?)').run(id, name, competitionId, JSON.stringify(teamIds));
  }

  getRooms(competitionId: string) {
    const rows = this.db.prepare('SELECT * FROM rooms WHERE competition_id = ?').all(competitionId) as any[];
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      competitionId: r.competition_id,
      teamIds: JSON.parse(r.team_ids || '[]'),
      judgeId: r.judge_id,
      createdAt: r.created_at,
    }));
  }

  getRoom(id: string) {
    const row = this.db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      competitionId: row.competition_id,
      teamIds: JSON.parse(row.team_ids || '[]'),
      judgeId: row.judge_id,
      createdAt: row.created_at,
    };
  }

  updateRoom(id: string, data: { name?: string; teamIds?: string[]; judgeId?: string | null }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.teamIds !== undefined) { fields.push('team_ids = ?'); values.push(JSON.stringify(data.teamIds)); }
    if (data.judgeId !== undefined) { fields.push('judge_id = ?'); values.push(data.judgeId); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteRoom(id: string) {
    this.db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  }

  // --- Brackets ---
  createBracket(id: string, competitionId: string, phase: string, matches: any[], qualifiers: string[]) {
    this.db.prepare('INSERT INTO brackets (id, competition_id, phase, matches, qualifiers) VALUES (?, ?, ?, ?, ?)').run(id, competitionId, phase, JSON.stringify(matches), JSON.stringify(qualifiers));
  }

  getBracket(competitionId: string) {
    const row = this.db.prepare('SELECT * FROM brackets WHERE competition_id = ? ORDER BY rowid DESC LIMIT 1').get(competitionId) as any;
    if (!row) return null;
    return {
      id: row.id,
      competitionId: row.competition_id,
      phase: row.phase,
      matches: JSON.parse(row.matches || '[]'),
      qualifiers: JSON.parse(row.qualifiers || '[]'),
    };
  }

  updateBracket(id: string, data: { matches?: any[]; qualifiers?: string[]; phase?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.matches !== undefined) { fields.push('matches = ?'); values.push(JSON.stringify(data.matches)); }
    if (data.qualifiers !== undefined) { fields.push('qualifiers = ?'); values.push(JSON.stringify(data.qualifiers)); }
    if (data.phase !== undefined) { fields.push('phase = ?'); values.push(data.phase); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE brackets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // --- Buzz Records ---
  addBuzzRecord(teamId: string, timestamp: number, responseTime: number, roundId: string | null, correct: boolean | null, competitionId: string | null) {
    try {
      this.db.prepare('INSERT INTO buzz_records (team_id, timestamp, response_time, round_id, correct, competition_id) VALUES (?, ?, ?, ?, ?, ?)').run(
        teamId, timestamp, responseTime, roundId, correct === null ? null : (correct ? 1 : 0), competitionId
      );
    } catch {
      // FK constraint may fail if team doesn't exist in DB yet; ignore silently
    }
  }

  getBuzzRecords(competitionId: string) {
    const rows = this.db.prepare('SELECT * FROM buzz_records WHERE competition_id = ? ORDER BY timestamp').all(competitionId) as any[];
    return rows.map((r: any) => ({
      teamId: r.team_id,
      timestamp: r.timestamp,
      responseTime: r.response_time,
      roundId: r.round_id,
      correct: r.correct === null ? null : !!r.correct,
    }));
  }

  // --- Penalty Records ---
  addPenaltyRecord(id: string, teamId: string, type: string, points: number, reason: string, competitionId: string | null) {
    const ts = new Date().toISOString();
    this.db.prepare('INSERT INTO penalty_records (id, team_id, type, points, reason, timestamp, competition_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, teamId, type, points, reason, ts, competitionId);
  }

  getPenaltyRecords(competitionId: string) {
    const rows = this.db.prepare('SELECT * FROM penalty_records WHERE competition_id = ? ORDER BY timestamp DESC').all(competitionId) as any[];
    return rows.map((r: any) => ({
      id: r.id,
      teamId: r.team_id,
      type: r.type,
      points: r.points,
      reason: r.reason,
      timestamp: r.timestamp,
      appliedBy: r.applied_by,
    }));
  }

  removePenaltyRecord(id: string) {
    this.db.prepare('DELETE FROM penalty_records WHERE id = ?').run(id);
  }

  // --- Hardware Inputs ---
  addHardwareInput(source: string, deviceId: string, teamId: string, timestamp: number) {
    this.db.prepare('INSERT INTO hardware_inputs (source, device_id, team_id, timestamp) VALUES (?, ?, ?, ?)').run(source, deviceId, teamId, timestamp);
  }

  getHardwareInputs(limit = 100) {
    return this.db.prepare('SELECT * FROM hardware_inputs ORDER BY id DESC LIMIT ?').all(limit) as any[];
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
    const teamProfiles = this.db.prepare('SELECT * FROM team_profiles').all();
    const competitionSettings = this.db.prepare('SELECT * FROM competition_settings').all();
    const rooms = this.db.prepare('SELECT * FROM rooms').all();
    const brackets = this.db.prepare('SELECT * FROM brackets').all();
    const buzzRecords = this.db.prepare('SELECT * FROM buzz_records').all();
    const penaltyRecords = this.db.prepare('SELECT * FROM penalty_records').all();
    return JSON.stringify({
      competitions, teams, rounds, auditLog, settings, buzzerState,
      teamProfiles, competitionSettings, rooms, brackets, buzzRecords, penaltyRecords,
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
    }, null, 2);
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
        if (parsed.teamProfiles?.length) {
          this.db.prepare('DELETE FROM team_profiles').run();
          const ins = this.db.prepare('INSERT INTO team_profiles (team_id, institution, members, logo, photo) VALUES (?, ?, ?, ?, ?)');
          for (const p of parsed.teamProfiles) ins.run(p.team_id, p.institution, p.members, p.logo, p.photo);
        }
        if (parsed.competitionSettings?.length) {
          this.db.prepare('DELETE FROM competition_settings').run();
          const ins = this.db.prepare('INSERT INTO competition_settings (competition_id, penalty_config, false_start_action, false_start_lock_duration, question_reading_duration, rebuttal_lock_duration, max_rebuttals) VALUES (?, ?, ?, ?, ?, ?, ?)');
          for (const s of parsed.competitionSettings) ins.run(s.competition_id, s.penalty_config, s.false_start_action, s.false_start_lock_duration, s.question_reading_duration, s.rebuttal_lock_duration, s.max_rebuttals);
        }
        if (parsed.rooms?.length) {
          this.db.prepare('DELETE FROM rooms').run();
          const ins = this.db.prepare('INSERT INTO rooms (id, name, competition_id, team_ids, judge_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
          for (const r of parsed.rooms) ins.run(r.id, r.name, r.competition_id, r.team_ids, r.judge_id, r.created_at);
        }
        if (parsed.brackets?.length) {
          this.db.prepare('DELETE FROM brackets').run();
          const ins = this.db.prepare('INSERT INTO brackets (id, competition_id, phase, matches, qualifiers) VALUES (?, ?, ?, ?, ?)');
          for (const b of parsed.brackets) ins.run(b.id, b.competition_id, b.phase, b.matches, b.qualifiers);
        }
        if (parsed.buzzRecords?.length) {
          this.db.prepare('DELETE FROM buzz_records').run();
          const ins = this.db.prepare('INSERT INTO buzz_records (team_id, timestamp, response_time, round_id, correct, competition_id) VALUES (?, ?, ?, ?, ?, ?)');
          for (const br of parsed.buzzRecords) ins.run(br.team_id, br.timestamp, br.response_time, br.round_id, br.correct, br.competition_id);
        }
        if (parsed.penaltyRecords?.length) {
          this.db.prepare('DELETE FROM penalty_records').run();
          const ins = this.db.prepare('INSERT INTO penalty_records (id, team_id, type, points, reason, timestamp, applied_by, competition_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
          for (const pr of parsed.penaltyRecords) ins.run(pr.id, pr.team_id, pr.type, pr.points, pr.reason, pr.timestamp, pr.applied_by, pr.competition_id);
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
