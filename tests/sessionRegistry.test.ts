import { describe, it, expect, beforeEach } from 'vitest';
import { SessionRegistry } from '../src/services/sessionRegistry.js';
import { SessionStatus } from '../src/types/session.js';

describe('SessionRegistry', () => {
  let registry: SessionRegistry;

  beforeEach(() => {
    registry = new SessionRegistry();
  });

  describe('create', () => {
    it('should create a new session with CREATED status', () => {
      const input = {
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      };

      const session = registry.create(input);

      expect(session).toBeDefined();
      expect(session.dramaId).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.sceneDurationMinutes).toBe(10);
      expect(session.agentCount).toBe(3);
      expect(session.status).toBe(SessionStatus.CREATED);
      expect(session.activeSceneId).toBeNull();
      expect(session.lastResult).toBeNull();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('get', () => {
    it('should return session by dramaId', () => {
      const input = {
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      };

      const created = registry.create(input);
      const retrieved = registry.get(created.dramaId);

      expect(retrieved).toBe(created);
    });

    it('should throw NotFoundError for non-existent dramaId', () => {
      expect(() => registry.get('non-existent')).toThrow('Session not found');
    });
  });

  describe('list', () => {
    it('should return all sessions', () => {
      registry.create({ name: 'Session 1', sceneDurationMinutes: 5, agentCount: 2 });
      registry.create({ name: 'Session 2', sceneDurationMinutes: 10, agentCount: 3 });
      registry.create({ name: 'Session 3', sceneDurationMinutes: 15, agentCount: 4 });

      const sessions = registry.list();

      expect(sessions).toHaveLength(3);
    });

    it('should return empty array when no sessions exist', () => {
      const sessions = registry.list();
      expect(sessions).toEqual([]);
    });
  });

  describe('startScene', () => {
    it('should transition CREATED -> RUNNING', () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      const result = registry.startScene(session.dramaId, 'scene-1');

      expect(result.status).toBe(SessionStatus.RUNNING);
      expect(result.activeSceneId).toBe('scene-1');
    });

    it('should not allow starting if already running', () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      registry.startScene(session.dramaId, 'scene-1');

      expect(() => registry.startScene(session.dramaId, 'scene-2'))
        .toThrow('Cannot start scene: session is already running');
    });

    it('should throw NotFoundError for non-existent session', () => {
      expect(() => registry.startScene('non-existent', 'scene-1'))
        .toThrow('Session not found');
    });
  });

  describe('stopScene', () => {
    it('should transition RUNNING -> COMPLETED', () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      registry.startScene(session.dramaId, 'scene-1');
      const result = registry.stopScene(session.dramaId, 'completed');

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(result.activeSceneId).toBeNull();
      expect(result.lastResult).toBeDefined();
      expect(result.lastResult!.sceneId).toBe('scene-1');
      expect(result.lastResult!.status).toBe('completed');
    });

    it('should transition RUNNING -> INTERRUPTED', () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      registry.startScene(session.dramaId, 'scene-1');
      const result = registry.stopScene(session.dramaId, 'interrupted');

      expect(result.status).toBe(SessionStatus.INTERRUPTED);
      expect(result.activeSceneId).toBeNull();
      expect(result.lastResult!.status).toBe('interrupted');
    });

    it('should not allow stopping if not running', () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      expect(() => registry.stopScene(session.dramaId, 'completed'))
        .toThrow('Cannot stop scene: session is not running');
    });

    it('should throwNotFoundError for non-existent session', () => {
      expect(() => registry.stopScene('non-existent', 'completed'))
        .toThrow('Session not found');
    });
  });

  describe('updateStatus', () => {
    it('should allow valid status transitions', () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      // CREATED -> IDLE is allowed
      const updated1 = registry.updateStatus(session.dramaId, SessionStatus.IDLE);
      expect(updated1.status).toBe(SessionStatus.IDLE);
    });

    it('should reject invalid status transitions', () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      // CREATED -> RUNNING directly is not allowed (must go through startScene)
      expect(() => registry.updateStatus(session.dramaId, SessionStatus.RUNNING))
        .toThrow('Invalid status transition: cannot transition from created to running');
    });
  });
});
