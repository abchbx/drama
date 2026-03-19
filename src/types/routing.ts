import { z } from 'zod';

// === Core message types ===

export const MessageType = [
  'scene_start',
  'scene_end',
  'your_turn',
  'dialogue',
  'reaction',
  'heartbeat',
  'fallback',
  'actor_unavailable',
  'actor_reconnected',
] as const;
export type MessageType = (typeof MessageType)[number];

export const ScenePhase = ['setup', 'rising', 'climax', 'falling', 'resolution'] as const;
export type ScenePhase = (typeof ScenePhase)[number];

// === Core Message schema ===

export const RoutingMessageSchema = z.object({
  id: z.string(), // uuid
  type: z.enum(MessageType),
  from: z.string(), // agent ID
  to: z.array(z.string()), // recipient agent IDs or room names
  payload: z.record(z.unknown()),
  scenePhase: z.enum(ScenePhase).optional(),
  cognitiveState: z
    .object({
      tokensUsed: z.number(),
    })
    .optional(),
  timestamp: z.number(), // epoch ms
  sequenceNum: z.number(), // FIFO sequence number per sender
});

export type RoutingMessage = z.infer<typeof RoutingMessageSchema>;

// === Scene signal payloads ===

export const SceneStartPayloadSchema = z.object({
  sceneId: z.string(),
  directorId: z.string(),
  dramaId: z.string(),
  sceneDescription: z.string().optional(),
});

export type SceneStartPayload = z.infer<typeof SceneStartPayloadSchema>;

export const SceneEndPayloadSchema = z.object({
  sceneId: z.string(),
  directorId: z.string(),
  status: z.enum(['completed', 'interrupted', 'timeout']),
  beats: z.array(z.string()).optional(),
  conflicts: z.array(z.string()).optional(),
});

export type SceneEndPayload = z.infer<typeof SceneEndPayloadSchema>;

// === your_turn payload ===

export const YourTurnPayloadSchema = z.object({
  sceneId: z.string(),
  turnNumber: z.number(),
  directorId: z.string(),
  timeoutMs: z.number(),
  instructions: z.string().optional(),
});

export type YourTurnPayload = z.infer<typeof YourTurnPayloadSchema>;

// === dialogue payload ===

export const DialoguePayloadSchema = z.object({
  sceneId: z.string(),
  exchangeId: z.string(),
  entries: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
      unverifiedFacts: z.boolean().optional(),
    }),
  ),
});

export type DialoguePayload = z.infer<typeof DialoguePayloadSchema>;

// === heartbeat payload ===

export const HeartbeatPayloadSchema = z.object({
  agentId: z.string(),
  role: z.enum(['director', 'actor']),
  timestamp: z.number(),
});

export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;

// === fallback payload ===

export const FallbackPayloadSchema = z.object({
  sceneId: z.string(),
  skippedActorId: z.string(),
  reason: z.enum(['timeout', 'disconnect', 'dead']),
  retryAttempt: z.number(),
});

export type FallbackPayload = z.infer<typeof FallbackPayloadSchema>;

// === Connection state ===

export type AgentRole = 'director' | 'actor';

export interface ConnectedAgent {
  socketId: string;
  agentId: string;
  role: AgentRole;
  connectedAt: number; // epoch ms
  lastPong: number; // epoch ms
}

// === Router events emitted to consumers ===

export type RouterEventMap = {
  'agent:connected': { agentId: string; role: AgentRole; socketId: string };
  'agent:disconnected': { agentId: string; role: AgentRole; socketId: string; graceful: boolean };
  'agent:unavailable': { agentId: string; reason: 'timeout' | 'disconnect' | 'dead' };
  'agent:reconnected': { agentId: string };
  'message:received': RoutingMessage;
  'scene:started': SceneStartPayload;
  'scene:ended': SceneEndPayload;
  'actor:skipped': { sceneId: string; actorId: string; reason: string };
};

export type RouterEventType = keyof RouterEventMap;
