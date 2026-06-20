import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateService } from '../src/services/GameState';

describe('GameStateService', () => {
  let gameState: GameStateService;

  beforeEach(() => {
    gameState = new GameStateService();
  });

  describe('Winner Selection', () => {
    it('should select the first team that buzzes', () => {
      gameState.startRound();
      gameState.connectTeam('socket1', 'A');
      const result = gameState.buzz('socket1');
      expect(result.success).toBe(true);
      expect(result.winner).toBe('A');
    });

    it('should reject buzz when game is LOCKED', () => {
      gameState.startRound();
      gameState.connectTeam('socket1', 'A');
      gameState.connectTeam('socket2', 'B');
      gameState.buzz('socket1');
      const result = gameState.buzz('socket2');
      expect(result.success).toBe(false);
      expect(result.winner).toBe('A');
    });

    it('should enforce only one winner per round', () => {
      gameState.startRound();
      gameState.connectTeam('socket1', 'A');
      gameState.connectTeam('socket2', 'B');
      gameState.buzz('socket1');
      const second = gameState.buzz('socket2');
      expect(second.success).toBe(false);
      expect(gameState.getWinner()).toBe('A');
      expect(gameState.isLocked()).toBe(true);
    });

    it('should reject buzz when game is not READY', () => {
      gameState.connectTeam('socket1', 'A');
      const result = gameState.buzz('socket1');
      expect(result.success).toBe(false);
    });

    it('should reject buzz from unconnected socket', () => {
      gameState.startRound();
      const result = gameState.buzz('unknown');
      expect(result.success).toBe(false);
      expect(result.winner).toBeNull();
    });
  });

  describe('Lock Logic', () => {
    it('should be LOCKED after a winner is found', () => {
      gameState.startRound();
      gameState.connectTeam('s1', 'A');
      gameState.buzz('s1');
      expect(gameState.isLocked()).toBe(true);
      expect(gameState.getStatus().state).toBe('LOCKED');
    });

    it('should be READY after startRound', () => {
      gameState.startRound();
      expect(gameState.getStatus().state).toBe('READY');
    });

    it('should allow reset after lock', () => {
      gameState.startRound();
      gameState.connectTeam('s1', 'A');
      gameState.buzz('s1');
      gameState.resetRound();
      expect(gameState.getStatus().state).toBe('READY');
      expect(gameState.getWinner()).toBeNull();
    });
  });

  describe('Score Calculation', () => {
    it('should add points correctly', () => {
      gameState.addScore('A', 10);
      const team = gameState.getTeams().find(t => t.id === 'A');
      expect(team?.score).toBe(10);
    });

    it('should subtract points correctly', () => {
      gameState.addScore('A', 20);
      gameState.addScore('A', -5);
      const team = gameState.getTeams().find(t => t.id === 'A');
      expect(team?.score).toBe(15);
    });

    it('should set score directly', () => {
      gameState.setScore('A', 100);
      const team = gameState.getTeams().find(t => t.id === 'A');
      expect(team?.score).toBe(100);
    });
  });

  describe('Answer Validation', () => {
    it('should track awaitingAnswer state after buzz', () => {
      gameState.startRound();
      gameState.connectTeam('s1', 'A');
      gameState.buzz('s1');
      expect(gameState.getStatus().awaitingAnswer).toBe(true);
    });

    it('should clear awaitingAnswer on correct', () => {
      gameState.startRound();
      gameState.connectTeam('s1', 'A');
      gameState.buzz('s1');
      gameState.answerCorrect('A', 10);
      expect(gameState.getStatus().awaitingAnswer).toBe(false);
    });

    it('should add score on correct answer', () => {
      gameState.startRound();
      gameState.connectTeam('s1', 'A');
      gameState.buzz('s1');
      gameState.answerCorrect('A', 10);
      const team = gameState.getTeams().find(t => t.id === 'A');
      expect(team?.score).toBe(10);
    });
  });

  describe('Rebuttal Mode', () => {
    it('should activate rebuttal state', () => {
      gameState.startRebuttal(100);
      expect(gameState.getStatus().state).toBe('REBUTTAL');
      expect(gameState.getStatus().rebuttalActive).toBe(true);
    });

    it('should return to READY after rebuttal lock duration', async () => {
      gameState.startRebuttal(50);
      await new Promise(r => setTimeout(r, 100));
      // After the lock duration, state should return to READY
      const status = gameState.getStatus();
      expect(status.state).toBe('READY');
    });
  });

  describe('Timer', () => {
    it('should set timer duration', () => {
      gameState.setTimerDuration(30);
      const timer = gameState.getTimerState();
      expect(timer.duration).toBe(30);
      expect(timer.remaining).toBe(30);
    });

    it('should track running state', () => {
      gameState.startTimer();
      expect(gameState.getTimerState().running).toBe(true);
      gameState.pauseTimer();
      expect(gameState.getTimerState().running).toBe(false);
    });

    it('should reset timer', () => {
      gameState.setTimerDuration(15);
      gameState.startTimer();
      gameState.resetTimer();
      const timer = gameState.getTimerState();
      expect(timer.running).toBe(false);
      expect(timer.remaining).toBe(15);
    });
  });

  describe('Duplicate Protection', () => {
    it('should reject rapid duplicate buzz from same team', () => {
      gameState.startRound();
      gameState.connectTeam('s1', 'A');
      // First buzz succeeds
      gameState.buzz('s1');
      // But it sets state to LOCKED, so second buzz from anyone fails
      gameState.startRound();
      gameState.connectTeam('s1', 'A');
      gameState.buzz('s1');
      // Now LOCKED
      const second = gameState.buzz('s1');
      expect(second.success).toBe(false);
    });
  });

  describe('Competition Management', () => {
    it('should create competition', () => {
      const comp = gameState.createCompetition('Test Comp', '2024-01-01');
      expect(comp.name).toBe('Test Comp');
      expect(gameState.getCompetitions().length).toBeGreaterThan(0);
    });

    it('should load competition and its teams', () => {
      const comp = gameState.createCompetition('Test', '2024-01-01');
      const loaded = gameState.getCompetition();
      expect(loaded?.name).toBe('Test');
    });
  });
});
