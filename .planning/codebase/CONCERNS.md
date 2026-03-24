# Concerns

## Technical Debt

### Known Issues

#### 1. Type Safety Issues
**Location**: `src/routes/sessions.ts`, `src/services/actor.ts`, `src/index.ts`

**Issues**:
- Multiple uses of `as any` type assertions in route handlers
- `req.app.locals as any` pattern used extensively instead of proper typing
- `routerService: null as any` initialization in `index.ts` with TODO comment

**Impact**: Reduced type safety, potential runtime errors not caught by TypeScript

**Example**:
```typescript
// src/routes/sessions.ts:29
const registry = (req.app.locals as any).sessionRegistry as SessionRegistry;

// src/index.ts:58
routerService: null as any, // Will be initialized after httpServer
```

**Recommendation**: Define proper interface for `app.locals` and use type guards

#### 2. Console Logging in Production Code
**Location**: `src/routes/sessions.ts`, `src/routes/config.ts`

**Issues**: Direct `console.log()` and `console.error()` calls instead of structured logging

**Impact**: 
- Logs bypass Pino logger configuration
- No log level control
- Inconsistent log format (mix of console and Pino)

**Examples**:
```typescript
// src/routes/sessions.ts
console.log('[API GET /sessions] Returning sessions:', ...);
console.error('[API GET /sessions/agents] Error:', err);
```

**Recommendation**: Replace with `req.app.locals.logger` or inject logger dependency

#### 3. Incomplete Feature: Faction Matching
**Location**: `src/services/blackboard.ts:238`

```typescript
return true; // TODO: Implement faction matching
```

**Impact**: Visibility filtering for "faction" type not implemented; all faction entries visible

**Recommendation**: Implement faction-based visibility rules or remove the feature

#### 4. Actor Response Parsing Resilience
**Location**: `src/services/actor.ts:130-140`

**Issues**:
```typescript
const parsedAny = parsed as any;
const output: DialogueOutput = {
  exchangeId: parsedAny?.exchangeId || exchangeId,
  entries: parsedAny?.entries || [],
  // ...
};
output.entries = output.entries.map((entry: any) => ({
```

**Impact**: Multiple `any` casts defeat type safety; missing validation for LLM response structure

**Recommendation**: Use Zod schema validation for LLM responses instead of type casting

### Security Concerns

#### 1. JWT Secret Validation
**Location**: `src/config.ts`

Secret length validated (min 32 chars) but no additional security checks:
- No entropy validation
- No check against common/weak secrets
- Development secrets may be committed (risk of .env file leakage)

#### 2. CORS Configuration
**Location**: `src/app.ts:32-36`, `src/services/router.ts`

```typescript
app.use(cors({
  origin: '*',  // Allows all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
```

**Impact**: Open CORS policy may be overly permissive for production

**Recommendation**: Restrict to known frontend origins in production

#### 3. No Rate Limiting
**Location**: API routes (`src/routes/*.ts`)

**Impact**: Susceptible to:
- LLM API abuse (cost attacks)
- Brute force on JWT endpoints
- Resource exhaustion

**Recommendation**: Implement rate limiting middleware

#### 4. File System Path Traversal
**Location**: `src/services/snapshot.ts`, `src/services/auditLog.ts`

File operations use user-influenced paths without sanitization:
```typescript
const filePath = path.join(this.dataDir, `${sessionId}-snapshot.json`);
```

If `sessionId` is not properly validated, could lead to path traversal

**Recommendation**: Validate session IDs against UUID format before file operations

### Performance Concerns

#### 1. Synchronous Token Counting
**Location**: `src/services/blackboard.ts:61-63`

```typescript
countTokens(text: string): number {
  return getEncoder().encode(text).length; // Synchronous
}
```

**Impact**: CPU-intensive operation on main thread; may block event loop for large texts

**Mitigation**: Currently acceptable for typical use; monitor for large content

#### 2. Memory Leaks
**Location**: `src/services/router.ts`, `src/services/sessionRegistry.ts`

**Concerns**:
- Agent disconnection cleanup may not remove all references
- Event listeners may accumulate on repeated connect/disconnect
- Session registry holds references indefinitely

**Recommendation**: Add periodic audit of Map sizes; implement session TTL

#### 3. LLM Timeout Handling
**Location**: `src/services/llm/openai.ts`, `src/services/llm/anthropic.ts`

No explicit request timeouts on LLM calls (relies on global actor timeout):
```typescript
const response = await this.client.chat.completions.create({
  // ...no timeout specified
});
```

**Impact**: Hanging LLM requests may consume resources

**Recommendation**: Add explicit timeout with AbortController

### Reliability Concerns

#### 1. Error Handling Inconsistency
**Location**: Multiple route files

**Pattern observed**:
```typescript
try {
  // ... operation
} catch (err: any) {
  res.status(500).json({ error: err.message });
}
```

**Issues**:
- Error type not checked before accessing `.message`
- Stack traces may leak to client
- No structured error logging

#### 2. Snapshot File Corruption
**Location**: `src/services/snapshot.ts`

**Issues**:
- Write is not atomic (read-modify-write pattern)
- No checksum validation
- Corrupted files may crash on restore

**Recommendation**: Write to temp file, then rename for atomicity

#### 3. Audit Log File Rotation
**Location**: `src/services/auditLog.ts`

**Issues**:
- Audit logs append indefinitely
- No automatic rotation or cleanup
- Files may grow unbounded

### Maintainability Concerns

#### 1. Large Files
| File | Lines | Concern |
|------|-------|---------|
| `src/session.ts` | 800+ | Multiple responsibilities (orchestration, state machine, chaos hooks) |
| `src/services/llm.ts` | 500+ | Prompt building, provider management, utilities |
| `src/services/directorMemory.ts` | 580+ | Complex memory management logic |
| `src/services/actorMemory.ts` | 697+ | Large memory system implementation |

#### 2. Complex Dependencies
**Location**: `src/index.ts`

Service initialization has complex wiring order:
1. SnapshotService (needs dataDir)
2. AuditLogService (needs dataDir)
3. BlackboardService (needs snapshot)
4. CapabilityService
5. SessionRegistry
6. HTTP Server + Express app
7. RouterService (needs HTTP server)
8. MemoryManagerService (needs blackboard + LLM)

**Impact**: Difficult to test in isolation; circular dependency risk

#### 3. Magic Numbers
**Location**: Throughout codebase

Examples:
```typescript
// src/services/directorMemory.ts
maxAnchors: 15,
maxThreads: 8,
compressionThreshold: 3,

// src/services/blackboard.ts
BUDGET_ALERT_THRESHOLD = 0.6;

// src/services/actorMemory.ts
maxEpisodic: 50,
maxRelationships: 10,
```

**Recommendation**: Extract to configuration with documentation

### Testing Gaps

#### 1. Missing Test Coverage
| Component | Status |
|-----------|--------|
| Frontend React components | No automated tests |
| WebSocket real-time scenarios | Limited coverage |
| LLM provider fallback logic | Partial |
| Snapshot corruption recovery | None |
| Audit log rotation | None |

#### 2. Flaky Tests
**Location**: `tests/chaos.test.ts`

Chaos tests use timing-dependent operations that may be flaky in CI

#### 3. No Browser/Visual Testing
**Location**: `frontend/`

No Playwright, Cypress, or similar for UI testing

### Documentation Gaps

#### 1. API Documentation
- OpenAPI/Swagger spec not generated
- API changes not versioned

#### 2. Architecture Decision Records
- No ADRs for major decisions
- "Why" behind designs not documented

#### 3. Operational Documentation
- No runbook for common incidents
- Alerting/observability not documented

## Risk Assessment

| Risk | Likelihood | Impact | Priority |
|------|------------|--------|----------|
| CORS misconfiguration in production | Medium | Medium | High |
| Memory leak in long-running sessions | Medium | High | High |
| Type safety issues causing runtime errors | Medium | Medium | Medium |
| Audit log disk exhaustion | Low | High | Medium |
| LLM API abuse (cost) | Low | High | Medium |
| Console logging noise | High | Low | Low |
| Incomplete faction feature | Low | Low | Low |

## Recommended Actions

### Immediate (High Priority)
1. Add proper typing for `app.locals` to eliminate `as any` casts
2. Replace console.log with structured logger in routes
3. Implement rate limiting for LLM endpoints
4. Add explicit timeouts to LLM calls

### Short Term (Medium Priority)
5. Restrict CORS origins for production
6. Implement audit log rotation
7. Add atomic snapshot writes
8. Extract magic numbers to config

### Long Term (Low Priority)
9. Add frontend browser tests (Playwright)
10. Generate OpenAPI spec
11. Implement ADR process
12. Create operational runbooks
