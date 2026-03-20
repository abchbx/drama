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

// === reaction payload ===

export const ReactionPayloadSchema = z.object({
  sceneId: z.string(),
  exchangeId: z.string(),
  reactingToAgentId: z.string(),
  reactionType: z.enum(['agree', 'disagree', 'question', 'support', 'challenge']),
  text: z.string(),
});

export type ReactionPayload = z.infer<typeof ReactionPayloadSchema>;

// === actor_unavailable payload ===

export const ActorUnavailablePayloadSchema = z.object({
  agentId: z.string(),
  reason: z.enum(['timeout', 'disconnect', 'dead']),
  since: z.number(),
});

export type ActorUnavailablePayload = z.infer<typeof ActorUnavailablePayloadSchema>;

// === actor_reconnected payload ===

export const ActorReconnectedPayloadSchema = z.object({
  agentId: z.string(),
  socketId: z.string(),
  reconnectedAt: z.number(),
});

export type ActorReconnectedPayload = z.infer<typeof ActorReconnectedPayloadSchema>;

// === fact-check request/response payloads ===

export const FactCheckRequestPayloadSchema = z.object({
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

export type FactCheckRequestPayload = z.infer<typeof FactCheckRequestPayloadSchema>;

export const FactCheckResponsePayloadSchema = z.object({
  sceneId: z.string(),
  exchangeId: z.string(),
  contradictions: z.array(
    z.object({
      sourceAgentId: z.string(),
      claim: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      contradiction: z.string(),
    }),
  ),
});

export type FactCheckResponsePayload = z.infer<typeof FactCheckResponsePayloadSchema>;

// === arbitration request/response payloads ===

export const ArbitrationRequestPayloadSchema = z.object({
  sceneId: z.string(),
  conflicts: z.array(
    z.object({
      actorA: z.string(),
      actorB: z.string(),
      claimA: z.string(),
      claimB: z.string(),
    }),
  ),
});

export type ArbitrationRequestPayload = z.infer<typeof ArbitrationRequestPayloadSchema>;

export const ArbitrationResponsePayloadSchema = z.object({
  sceneId: z.string(),
  conflicts: z.array(
    z.object({
      conflictId: z.string(),
      conflictingClaims: z.object({
        actorA: z.string(),
        actorB: z.string(),
        claimA: z.string(),
        claimB: z.string(),
      }),
      canonicalOutcome: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
    }),
  ),
});

export type ArbitrationResponsePayload = z.infer<typeof ArbitrationResponsePayloadSchema>;

// === disconnect/reconnect signals ===

export const DisconnectSignalPayloadSchema = z.object({
  agentId: z.string(),
  reason: z.string().optional(),
  timestamp: z.number(),
});

export type DisconnectSignalPayload = z.infer<typeof DisconnectSignalPayloadSchema>;

export const ReconnectSignalPayloadSchema = z.object({
  agentId: z.string(),
  previousSocketId: z.string().optional(),
  timestamp: z.number(),
});

export type ReconnectSignalPayload = z.infer<typeof ReconnectSignalPayloadSchema>;

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

// === Validation functions ===

/**
 * Validate incoming routing message
 * @param message Raw message to validate
 * @returns Safe parse result with type inference
 */
export function validateIncomingMessage(message: unknown): z.SafeParseReturnType<RoutingMessage, RoutingMessage> {
  return RoutingMessageSchema.safeParse(message);
}

/**
 * Validate outgoing routing message
 * @param message Raw message to validate
 * @returns Safe parse result with type inference
 */
export function validateOutgoingMessage(message: unknown): z.SafeParseReturnType<RoutingMessage, RoutingMessage> {
  return RoutingMessageSchema.safeParse(message);
}

/**
 * Validate payload based on message type
 * @param messageType Type of message to validate payload for
 * @param payload Raw payload to validate
 * @returns Safe parse result with type inference
 */
export function validatePayload(messageType: MessageType, payload: unknown): z.SafeParseReturnType<unknown, unknown> {
  const payloadSchemas: Record<string, z.ZodSchema> = {
    scene_start: SceneStartPayloadSchema,
    scene_end: SceneEndPayloadSchema,
    your_turn: YourTurnPayloadSchema,
    dialogue: DialoguePayloadSchema,
    reaction: ReactionPayloadSchema,
    heartbeat: HeartbeatPayloadSchema,
    fallback: FallbackPayloadSchema,
    actor_unavailable: ActorUnavailablePayloadSchema,
    actor_reconnected: ActorReconnectedPayloadSchema,
  };

  const schema = payloadSchemas[messageType];
  if (!schema) {
    return {
      success: false,
      error: new Error(`Unknown message type: ${messageType}`),
    } as z.SafeParseReturnType<unknown, unknown>;
  }

  return schema.safeParse(payload);
}
