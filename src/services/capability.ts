import jwt from 'jsonwebtoken';
import express from 'express';
import {
  LAYER_NAMES,
  type BlackboardLayer,
  type AgentRole,
  type ViolationType,
  type BoundaryOperation,
  BoundaryViolationError,
} from '../types/blackboard.js';

// === JWT Payload type ===
export interface AgentJwtPayload {
  agentId: string;
  role: AgentRole;
  iat?: number;
  exp?: number;
}

// === Capability map type ===
export type CapabilityMap = Record<AgentRole, BlackboardLayer[]>;

/**
 * Load capability map from environment variables.
 * Validates each layer name against LAYER_NAMES.
 * Throws if any env var is missing or contains an invalid layer.
 */
export function loadCapabilityMap(): CapabilityMap {
  const rawActor = process.env.CAPABILITY_ACTOR;
  const rawDirector = process.env.CAPABILITY_DIRECTOR;
  const rawAdmin = process.env.CAPABILITY_ADMIN;

  if (!rawActor || !rawDirector || !rawAdmin) {
    throw new Error('Missing capability environment variables: CAPABILITY_ACTOR, CAPABILITY_DIRECTOR, CAPABILITY_ADMIN must all be set');
  }

  function parseLayers(raw: string, role: string): BlackboardLayer[] {
    const layers = raw.split(',').map(l => l.trim()) as BlackboardLayer[];
    for (const layer of layers) {
      if (!LAYER_NAMES.includes(layer)) {
        throw new Error(`Invalid layer '${layer}' in ${role} capability map. Must be one of: ${LAYER_NAMES.join(', ')}`);
      }
    }
    return layers;
  }

  return {
    Actor: parseLayers(rawActor, 'CAPABILITY_ACTOR'),
    Director: parseLayers(rawDirector, 'CAPABILITY_DIRECTOR'),
    Admin: parseLayers(rawAdmin, 'CAPABILITY_ADMIN'),
  };
}

/**
 * Check if a role has capability for a given layer and operation.
 */
export function checkCapability(
  role: AgentRole,
  layer: BlackboardLayer,
  operation: BoundaryOperation,
  capabilityMap: CapabilityMap,
): { allowed: boolean; violationType?: ViolationType } {
  const allowedLayers = capabilityMap[role];

  if (allowedLayers.includes(layer)) {
    return { allowed: true };
  }

  // Determine violation type based on operation
  if (operation === 'write') {
    return { allowed: false, violationType: 'CAPABILITY_CLOSED' };
  }
  return { allowed: false, violationType: 'NAMESPACE_VIOLATION' };
}

/**
 * Verify an agent JWT token using HS256 algorithm.
 * Re-throws on failure.
 */
export function verifyAgentToken(token: string, secret: string): AgentJwtPayload {
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  return payload as AgentJwtPayload;
}

/**
 * Extract Bearer token from Authorization header.
 * Returns null if header is missing or malformed.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

// === CapabilityService class ===
export class CapabilityService {
  readonly jwtSecret: string;
  readonly capabilityMap: CapabilityMap;

  constructor(jwtSecret: string, capabilityMap: CapabilityMap) {
    this.jwtSecret = jwtSecret;
    this.capabilityMap = capabilityMap;
  }

  /**
   * Verify a request's Bearer token and return the agent payload.
   * Throws if token is missing or invalid.
   */
  verify(req: express.Request): AgentJwtPayload {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);
    if (!token) {
      const err = new Error('Missing or invalid Authorization header');
      (err as NodeJS.ErrnoException).code = 'UNAUTHORIZED';
      throw err;
    }
    return verifyAgentToken(token, this.jwtSecret);
  }

  /**
   * Check whether an agent can perform an operation on a layer.
   */
  check(
    agent: AgentJwtPayload,
    layer: BlackboardLayer,
    operation: BoundaryOperation,
  ): { allowed: boolean; violationType?: ViolationType; allowedLayers: BlackboardLayer[] } {
    const allowedLayers = this.capabilityMap[agent.role];
    const result = checkCapability(agent.role, layer, operation, this.capabilityMap);
    return {
      allowed: result.allowed,
      violationType: result.violationType,
      allowedLayers,
    };
  }
}

// === Factory ===
/**
 * Create a fully initialized CapabilityService from environment variables.
 * Reads JWT_SECRET, CAPABILITY_ACTOR, CAPABILITY_DIRECTOR, CAPABILITY_ADMIN.
 */
export function createCapabilityService(): CapabilityService {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  const capabilityMap = loadCapabilityMap();
  return new CapabilityService(secret, capabilityMap);
}
