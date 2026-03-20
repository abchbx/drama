import { describe, it, expect } from 'vitest';
import {
  validateIncomingMessage,
  validatePayload,
  SceneStartPayloadSchema,
  SceneEndPayloadSchema,
  YourTurnPayloadSchema,
  DialoguePayloadSchema,
  ReactionPayloadSchema,
  HeartbeatPayloadSchema,
  FallbackPayloadSchema,
  ActorUnavailablePayloadSchema,
  ActorReconnectedPayloadSchema,
  FactCheckRequestPayloadSchema,
  FactCheckResponsePayloadSchema,
  ArbitrationRequestPayloadSchema,
  ArbitrationResponsePayloadSchema,
} from '../src/types/routing';

describe('Protocol message validation', () => {
  describe('RoutingMessage validation', () => {
    it('should validate valid routing messages', () => {
      const validMessage = {
        id: '1234-5678',
        type: 'scene_start',
        from: 'director-123',
        to: ['actor-456', 'actor-789'],
        payload: { sceneId: 'scene-1', directorId: 'director-123', dramaId: 'drama-1' },
        scenePhase: 'setup',
        cognitiveState: { tokensUsed: 150 },
        timestamp: Date.now(),
        sequenceNum: 1,
      };

      const result = validateIncomingMessage(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject messages with missing required fields', () => {
      const invalidMessage = {
        type: 'scene_start',
        from: 'director-123',
        to: ['actor-456'],
      };

      const result = validateIncomingMessage(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject messages with invalid types', () => {
      const invalidMessage = {
        id: '1234-5678',
        type: 'invalid-type',
        from: 'director-123',
        to: ['actor-456'],
        payload: {},
        timestamp: Date.now(),
        sequenceNum: 1,
      };

      const result = validateIncomingMessage(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject messages with invalid cognitiveState', () => {
      const invalidMessage = {
        id: '1234-5678',
        type: 'scene_start',
        from: 'director-123',
        to: ['actor-456'],
        payload: {},
        cognitiveState: { invalidField: 'value' },
        timestamp: Date.now(),
        sequenceNum: 1,
      };

      const result = validateIncomingMessage(invalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('Payload validation by type', () => {
    it('should validate scene_start payload', () => {
      const payload = {
        sceneId: 'scene-1',
        directorId: 'director-123',
        dramaId: 'drama-1',
        sceneDescription: 'A dark and stormy night in the castle',
      };

      const result = validatePayload('scene_start', payload);
      expect(result.success).toBe(true);
    });

    it('should validate scene_end payload', () => {
      const payload = {
        sceneId: 'scene-1',
        directorId: 'director-123',
        status: 'completed',
        beats: ['The hero arrives', 'The villain escapes'],
        conflicts: ['Hero vs Villain'],
      };

      const result = validatePayload('scene_end', payload);
      expect(result.success).toBe(true);
    });

    it('should validate your_turn payload', () => {
      const payload = {
        sceneId: 'scene-1',
        turnNumber: 1,
        directorId: 'director-123',
        timeoutMs: 30000,
        instructions: 'Start the dialogue',
      };

      const result = validatePayload('your_turn', payload);
      expect(result.success).toBe(true);
    });

    it('should validate dialogue payload', () => {
      const payload = {
        sceneId: 'scene-1',
        exchangeId: 'exchange-1',
        entries: [
          { speaker: 'Hero', text: 'I am here to save the day!', unverifiedFacts: false },
          { speaker: 'Villain', text: 'You will never defeat me!', unverifiedFacts: false },
        ],
      };

      const result = validatePayload('dialogue', payload);
      expect(result.success).toBe(true);
    });

    it('should validate reaction payload', () => {
      const payload = {
        sceneId: 'scene-1',
        exchangeId: 'exchange-1',
        reactingToAgentId: 'actor-456',
        reactionType: 'disagree',
        text: 'I disagree with that statement!',
      };

      const result = validatePayload('reaction', payload);
      expect(result.success).toBe(true);
    });

    it('should validate heartbeat payload', () => {
      const payload = {
        agentId: 'actor-456',
        role: 'actor',
        timestamp: Date.now(),
      };

      const result = validatePayload('heartbeat', payload);
      expect(result.success).toBe(true);
    });

    it('should validate fallback payload', () => {
      const payload = {
        sceneId: 'scene-1',
        skippedActorId: 'actor-456',
        reason: 'timeout',
        retryAttempt: 1,
      };

      const result = validatePayload('fallback', payload);
      expect(result.success).toBe(true);
    });

    it('should validate actor_unavailable payload', () => {
      const payload = {
        agentId: 'actor-456',
        reason: 'disconnect',
        since: Date.now(),
      };

      const result = validatePayload('actor_unavailable', payload);
      expect(result.success).toBe(true);
    });

    it('should validate actor_reconnected payload', () => {
      const payload = {
        agentId: 'actor-456',
        socketId: 'socket-789',
        reconnectedAt: Date.now(),
      };

      const result = validatePayload('actor_reconnected', payload);
      expect(result.success).toBe(true);
    });

    it('should reject payloads with invalid data types', () => {
      const invalidPayload = {
        sceneId: 123, // Should be string
        directorId: 'director-123',
        dramaId: 'drama-1',
      };

      const result = validatePayload('scene_start', invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payloads with missing required fields', () => {
      const invalidPayload = {
        directorId: 'director-123',
      };

      const result = validatePayload('scene_start', invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('Zod schema validation directly', () => {
    it('SceneStartPayloadSchema should validate correctly', () => {
      const valid = SceneStartPayloadSchema.safeParse({
        sceneId: 'scene-1',
        directorId: 'director-123',
        dramaId: 'drama-1',
      });
      expect(valid.success).toBe(true);

      const invalid = SceneStartPayloadSchema.safeParse({
        directorId: 'director-123',
      });
      expect(invalid.success).toBe(false);
    });

    it('SceneEndPayloadSchema should validate correctly', () => {
      const valid = SceneEndPayloadSchema.safeParse({
        sceneId: 'scene-1',
        directorId: 'director-123',
        status: 'completed',
      });
      expect(valid.success).toBe(true);

      const invalid = SceneEndPayloadSchema.safeParse({
        sceneId: 'scene-1',
        directorId: 'director-123',
        status: 'invalid-status',
      });
      expect(invalid.success).toBe(false);
    });

    it('DialoguePayloadSchema should validate correctly', () => {
      const valid = DialoguePayloadSchema.safeParse({
        sceneId: 'scene-1',
        exchangeId: 'exchange-1',
        entries: [{ speaker: 'Hero', text: 'Hello' }],
      });
      expect(valid.success).toBe(true);

      const invalid = DialoguePayloadSchema.safeParse({
        sceneId: 'scene-1',
        exchangeId: 'exchange-1',
      });
      expect(invalid.success).toBe(false);
    });
  });
});
